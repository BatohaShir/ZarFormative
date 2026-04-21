import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
import { Footer } from "@/components/footer";
import { CategoriesSectionSSR } from "@/components/categories-section-ssr";
import { RecommendedListingsSSR } from "@/components/recommended-listings-ssr";
import { AdStories } from "@/components/billboard";
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
      )
      SELECT
        COALESCE(cat.data, '[]'::jsonb) AS categories,
        COALESCE(list.data, '[]'::jsonb) AS listings,
        boost.ids AS boosted_ids
      FROM cat, list, boost
    `;

    const row = rows[0] ?? { categories: [], listings: [], boosted_ids: [] };

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
    };
  } catch (error) {
    console.error("Failed to load home page data:", error);
    return {
      categories: fallbackCategories as unknown as CategoryWithChildren[],
      listings: [] as ListingWithRelations[],
      boostedIds: [] as string[],
    };
  }
}

export default async function Home() {
  const [{ categories, listings, boostedIds }, t] = await Promise.all([
    getHomePageData(),
    getTranslations(),
  ]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <span className="text-lg md:text-2xl font-bold" aria-label="Tsogts.mn">
            <span className="text-[#015197]">Tsogts</span>
            <span className="text-[#c4272f]">.mn</span>
          </span>
          {/* Mobile Nav - theme toggle + notifications bell */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <NotificationsButton />
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <NotificationsButton />
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-8 md:py-12 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">
          {t("home.title")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto">
          {t("home.subtitle")}
        </p>
        {/* Search - один компонент, responsive */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <SearchInput className="flex-1" />
          <CitySelect />
        </div>
      </section>

      {/* Ad Stories — Instagram-style */}
      <AdStories />

      {/* Categories - SSR с предзагруженными данными (только roots; модалка
          с подкатегориями лениво тянет остальное client-side) */}
      <CategoriesSectionSSR categories={categories} />

      {/* Recommendations - SSR с предзагруженными данными */}
      <RecommendedListingsSSR listings={listings} boostedIds={boostedIds} />

      {/* Footer - Desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Create Service FAB - Desktop only */}
      <Link
        href="/services/create"
        className="hidden md:flex fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 group"
      >
        <div className="relative">
          {/* Tooltip - Desktop only */}
          <div className="hidden md:block absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            {t("home.addService")}
            <div className="absolute top-full right-4 border-4 border-transparent border-t-foreground" />
          </div>
          {/* Button - Smaller on mobile */}
          <Button
            size="lg"
            className="h-12 md:h-14 px-3 md:pl-4 md:pr-5 rounded-full shadow-lg hover:shadow-xl transition-all bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 gap-1.5 md:gap-2"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-medium text-sm md:text-base">{t("home.postAd")}</span>
          </Button>
          {/* OPTIMIZATION: Убрана постоянная pulse animation для экономии GPU */}
        </div>
      </Link>
    </div>
  );
}
