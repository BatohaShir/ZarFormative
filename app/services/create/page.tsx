import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CreateListingClient } from "@/components/create-listing-client";

// Dynamic because we need the user's session to load their drafts.
// Categories are cached 30 min via unstable_cache below, so the
// per-request cost is ~one round-trip for drafts (and none at all
// for guests — we short-circuit before querying the DB).
export const revalidate = 0;

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  children?: Category[];
}

interface DraftImage {
  id: string;
  url: string;
  sort_order: number;
  is_cover: boolean;
}

export interface DraftListing {
  id: string;
  title: string;
  slug: string;
  description: string;
  category_id: string | null;
  price: string | number | null;
  currency: string;
  is_negotiable: boolean;
  service_type: string | null;
  address: string | null;
  aimag_id: string | null;
  district_id: string | null;
  khoroo_id: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  phone: string | null;
  duration_minutes: number | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string; slug: string } | null;
  images: DraftImage[];
}

/**
 * Build the category tree from the flat Prisma result. Kept outside
 * the cached function so the tree is rebuilt from the cached flat
 * list (categoriesFlat) rather than storing two shapes in the cache.
 */
function buildCategoryTree(flat: Omit<Category, "children">[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];
  for (const cat of flat) {
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const cat of flat) {
    const node = map.get(cat.id)!;
    if (cat.parent_id) {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/**
 * Fetch active categories + the current user's drafts in a single
 * $queryRaw CTE. Previously the client re-fetched drafts on mount
 * via useFindManylistings — one extra ~2s round-trip from Mongolia
 * for no reason, since SSR already had the session.
 *
 * Anonymous users skip the drafts branch entirely (empty array).
 */
async function getCreatePageData(userId: string | null): Promise<{
  categories: Category[];
  drafts: DraftListing[];
}> {
  try {
    const rows = await prisma.$queryRaw<
      {
        categories: Omit<Category, "children">[];
        drafts: DraftListing[];
      }[]
    >`
      WITH cat AS (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', id, 'name', name, 'slug', slug,
            'parent_id', parent_id, 'is_active', is_active,
            'sort_order', sort_order
          ) ORDER BY sort_order ASC
        ), '[]'::jsonb) AS data
        FROM categories
        WHERE is_active = true
      ),
      draft AS (
        SELECT COALESCE(jsonb_agg(row ORDER BY updated_at DESC), '[]'::jsonb) AS data
        FROM (
          SELECT
            l.id, l.title, l.slug, l.description,
            l.category_id, l.price, l.currency, l.is_negotiable,
            l.service_type::text AS service_type,
            l.address, l.aimag_id, l.district_id, l.khoroo_id,
            l.latitude, l.longitude, l.phone,
            l.duration_minutes, l.work_hours_start, l.work_hours_end,
            l.created_at, l.updated_at,
            CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', c.id, 'name', c.name, 'slug', c.slug
            ) END AS category,
            COALESCE(
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'id', li.id, 'url', li.url,
                  'sort_order', li.sort_order, 'is_cover', li.is_cover
                ) ORDER BY li.sort_order ASC
              )
              FROM listings_images li
              WHERE li.listing_id = l.id),
              '[]'::jsonb
            ) AS images
          FROM listings l
          LEFT JOIN categories c ON c.id = l.category_id
          WHERE ${userId ? Prisma.sql`l.user_id = ${userId}::uuid` : Prisma.sql`false`}
            AND l.status = 'draft'
          ORDER BY l.updated_at DESC
          LIMIT 10
        ) row
      )
      SELECT cat.data AS categories, draft.data AS drafts FROM cat, draft
    `;

    const row = rows[0] ?? { categories: [], drafts: [] };
    return {
      categories: buildCategoryTree(row.categories ?? []),
      drafts: (row.drafts ?? []).map((d) => ({
        ...d,
        price: d.price != null ? Number(d.price) : null,
        latitude: d.latitude != null ? Number(d.latitude) : null,
        longitude: d.longitude != null ? Number(d.longitude) : null,
      })),
    };
  } catch (error) {
    console.error("getCreatePageData failed:", error);
    return { categories: [], drafts: [] };
  }
}

export default async function CreateListingPage() {
  // Read the session server-side so we can seed the draft list. For
  // anon users we skip the draft subquery entirely so the page is
  // equally fast without logging in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { categories, drafts } = await getCreatePageData(user?.id ?? null);

  return <CreateListingClient categories={categories} initialDrafts={drafts} />;
}
