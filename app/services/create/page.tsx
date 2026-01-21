import { prisma } from "@/lib/prisma";
import { CreateListingClient } from "@/components/create-listing-client";

// SSR on every request
export const dynamic = "force-dynamic";

// Prefetch active categories on server
async function getActiveCategories() {
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

  return categories;
}

export default async function CreateListingPage() {
  const categories = await getActiveCategories();

  return <CreateListingClient categories={categories} />;
}
