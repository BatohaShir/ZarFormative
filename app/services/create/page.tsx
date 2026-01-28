import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateListingClient } from "@/components/create-listing-client";

// OPTIMIZATION: Revalidate каждые 30 минут вместо force-dynamic
// Категории редко меняются, не нужно запрашивать каждый раз
export const revalidate = 1800; // 30 минут

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  children?: Category[];
}

// OPTIMIZATION: Кэшируем категории на 30 минут - они редко меняются
const getActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const categories = await prisma.categories.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        sort_order: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
        is_active: true,
        sort_order: true,
      },
    });

  // Build tree structure: add children to parent categories
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  // First pass: create map of all categories
  for (const cat of categories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }

  // Second pass: build tree
  for (const cat of categories) {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  }

    return rootCategories;
  },
  ["active-categories-tree"],
  { revalidate: 1800, tags: ["categories"] } // 30 минут кэш
);

export default async function CreateListingPage() {
  const categories = await getActiveCategories();

  return <CreateListingClient categories={categories} />;
}
