import { SiteHeader } from "@/components/site-header";
import { HeroTitle } from "@/components/hero-title";
import { HeroSearch } from "@/components/hero-search";
import { Footer } from "@/components/footer";
import { CategoriesSectionSSR } from "@/components/categories-section-ssr";
import { RecommendedListingsSSR } from "@/components/recommended-listings-ssr";
import { AdStories } from "@/components/billboard";
import type { DbAdStory } from "@/components/billboard/types";
import { Plus } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fallbackCategories, type CategoryWithChildren } from "@/lib/categories";
import type { ListingWithRelations } from "@/components/listing-card";
import { getTranslations } from "next-intl/server";

// ISR: обновляем данные каждые 60 секунд вместо force-dynamic
// Это кэширует страницу и снижает нагрузку на БД
export const revalidate = 60;

// Description preview length for card — with line-clamp-1 we never show more.
const DESCRIPTION_PREVIEW_LEN = 140;

// Shapes of the JSON rows returned by the single $queryRaw below.
// Keep in sync with the SQL; these are what downstream components consume.
interface RawListingRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  price: string | number | null; // pg numeric → string via JSON, coerced below
  currency: string;
  is_negotiable: boolean;
  service_type: string | null;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  views_count: number;
  favorites_count: number;
  created_at: Date | string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    company_name: string | null;
    is_company: boolean;
  } | null;
  category: { id: string; name: string; slug: string } | null;
  aimag: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  khoroo: { id: string; name: string } | null;
  images: { id: string; url: string }[];
}

interface HomeDataRow {
  categories: unknown[];
  listings: RawListingRow[];
  boosted_ids: string[];
  ad_stories: DbAdStory[];
}

// Single round-trip fetch. Previously Prisma issued 5+ sequential queries
// (listings + 4 relation dataloader lookups + boosts + categories). On the
// Seoul Supabase region with ~2s per-round-trip from Mongolia that cost
// 10-15s cold. Here we collapse everything into one json-building query
// and pay one round-trip.
async function getHomePageData() {
  try {
    const rows = await prisma.$queryRaw<HomeDataRow[]>`
      WITH cat AS (
        SELECT jsonb_agg(
          to_jsonb(c.*) ORDER BY c.sort_order ASC
        ) FILTER (WHERE c.id IS NOT NULL) AS data
        FROM (
          SELECT *
          FROM categories
          WHERE is_active = true AND parent_id IS NULL
          ORDER BY sort_order ASC
          LIMIT 10
        ) c
      ),
      list AS (
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data
        FROM (
          SELECT
            l.id, l.user_id, l.title, l.slug, l.description,
            l.price, l.currency, l.is_negotiable,
            l.service_type::text AS service_type,
            l.address, l.latitude, l.longitude,
            l.views_count, l.favorites_count, l.created_at,
            CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', u.id,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'avatar_url', u.avatar_url,
              'company_name', u.company_name,
              'is_company', u.is_company
            ) END AS "user",
            CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', c.id, 'name', c.name, 'slug', c.slug
            ) END AS category,
            CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', a.id, 'name', a.name
            ) END AS aimag,
            CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', d.id, 'name', d.name
            ) END AS district,
            CASE WHEN k.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', k.id, 'name', k.name
            ) END AS khoroo,
            COALESCE(
              (SELECT jsonb_agg(jsonb_build_object('id', li.id, 'url', li.url))
               FROM listings_images li
               WHERE li.listing_id = l.id AND li.is_cover = true
               LIMIT 1),
              '[]'::jsonb
            ) AS images,
            to_jsonb(l.*) AS row_full
          FROM listings l
          LEFT JOIN profiles u ON u.id = l.user_id
          LEFT JOIN categories c ON c.id = l.category_id
          LEFT JOIN aimags a ON a.id = l.aimag_id
          LEFT JOIN districts d ON d.id = l.district_id
          LEFT JOIN khoroos k ON k.id = l.khoroo_id
          WHERE l.status = 'active' AND l.is_active = true
          ORDER BY l.created_at DESC
          LIMIT 8
        ) row
      ),
      boost AS (
        SELECT COALESCE(array_agg(DISTINCT listing_id), ARRAY[]::uuid[]) AS ids
        FROM listing_boosts
        WHERE status = 'active' AND expires_at > NOW()
      ),
      -- Instagram-style ad stories for the carousel. Same CTE so we
      -- don't pay an extra round-trip just to render story circles;
      -- user is embedded via jsonb_build_object to avoid Prisma's
      -- dataloader firing a second IN(...) query for profiles.
      stories AS (
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data FROM (
          SELECT
            s.id, s.user_id, s.image_url, s.plan, s.status::text AS status,
            s.editor_data, s.views_count, s.created_at, s.expires_at,
            jsonb_build_object(
              'id', su.id,
              'first_name', su.first_name,
              'last_name', su.last_name,
              'avatar_url', su.avatar_url,
              'company_name', su.company_name,
              'is_company', su.is_company
            ) AS "user"
          FROM ad_stories s
          LEFT JOIN profiles su ON su.id = s.user_id
          WHERE s.status = 'active' AND s.expires_at > NOW()
          ORDER BY s.created_at DESC
          LIMIT 50
        ) row
      )
      SELECT
        COALESCE(cat.data, '[]'::jsonb) AS categories,
        COALESCE(list.data, '[]'::jsonb) AS listings,
        boost.ids AS boosted_ids,
        COALESCE(stories.data, '[]'::jsonb) AS ad_stories
      FROM cat, list, boost, stories
    `;

    const row = rows[0] ?? {
      categories: [],
      listings: [],
      boosted_ids: [],
      ad_stories: [],
    };

    // Trim description and coerce pg numerics to number for client props.
    const listings = (row.listings ?? []).map((l) => ({
      ...l,
      description:
        (l.description ?? "").length > DESCRIPTION_PREVIEW_LEN
          ? l.description.slice(0, DESCRIPTION_PREVIEW_LEN) + "…"
          : l.description,
      price: l.price != null ? Number(l.price) : null,
      latitude: l.latitude != null ? Number(l.latitude) : null,
      longitude: l.longitude != null ? Number(l.longitude) : null,
      // ListingCard's type expects sort_order on images; cover is always 0.
      images: (l.images ?? []).map((img) => ({ ...img, sort_order: 0 })),
    })) as unknown as ListingWithRelations[];

    return {
      categories: (row.categories ?? []) as unknown as CategoryWithChildren[],
      listings,
      boostedIds: row.boosted_ids ?? [],
      adStories: row.ad_stories ?? [],
    };
  } catch (error) {
    console.error("Failed to load home page data:", error);
    return {
      categories: fallbackCategories as unknown as CategoryWithChildren[],
      listings: [] as ListingWithRelations[],
      boostedIds: [] as string[],
      adStories: [] as DbAdStory[],
    };
  }
}

export default async function Home() {
  const [{ categories, listings, boostedIds, adStories }, t] = await Promise.all([
    getHomePageData(),
    getTranslations(),
  ]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader />

      {/* Hero — editorial, search-first */}
      <section className="container mx-auto px-4 md:px-6 pt-10 md:pt-20 pb-8 md:pb-14">
        <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12 reveal-up">
          <HeroTitle line1={t("home.heroLine1")} line2={t("home.heroLine2")} />
        </div>
        <div className="reveal-up" style={{ animationDelay: "100ms" }}>
          <HeroSearch />
        </div>
      </section>

      {/* Ad Stories — Instagram-style. SSR-seeded so circles render
          immediately instead of waiting on a client findMany after hydration. */}
      <AdStories initialStories={adStories} />

      {/* Categories - SSR с предзагруженными данными (только roots; модалка
          с подкатегориями лениво тянет остальное client-side) */}
      <CategoriesSectionSSR categories={categories} />

      {/* Recommendations - SSR с предзагруженными данными */}
      <RecommendedListingsSSR listings={listings} boostedIds={boostedIds} />

      <Footer />

      {/* Desktop FAB */}
      <Link
        href="/services/create"
        aria-label={t("home.addService")}
        className="hidden md:inline-flex fixed bottom-6 right-6 z-50 items-center gap-2 h-12 px-5 rounded-full bg-foreground text-background font-medium text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
        style={{ transitionTimingFunction: "var(--ease-brand)" }}
      >
        <Plus className="h-4 w-4" />
        <span>{t("home.postAd")}</span>
      </Link>

      {/* Mobile sticky bottom CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 bg-linear-to-t from-background via-background/90 to-transparent pointer-events-none">
        <Link
          href="/services/create"
          className="pointer-events-auto flex items-center justify-center gap-2 h-12 rounded-full bg-foreground text-background font-medium shadow-xl active:scale-[0.98] transition-transform"
        >
          <Plus className="h-5 w-5" />
          <span>{t("home.postAd")}</span>
        </Link>
      </div>
    </div>
  );
}
