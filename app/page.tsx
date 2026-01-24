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
import { Plus } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildCategoryTree, fallbackCategories, type CategoryWithChildren } from "@/lib/categories";
import type { ListingWithRelations } from "@/components/listing-card";

// Принудительно динамический рендеринг - SSR на каждый запрос
export const dynamic = 'force-dynamic';

// Функция загрузки данных на сервере
async function getHomePageData() {
  // Параллельно загружаем категории и объявления
  const [categoriesData, listingsData] = await Promise.all([
    prisma.categories.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    }),
    prisma.listings.findMany({
      where: {
        status: "active",
        is_active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            company_name: true,
            is_company: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: {
            is_cover: true,
          },
          select: {
            id: true,
            url: true,
            sort_order: true,
            // OPTIMIZED: is_cover не нужен - уже фильтруем по нему в where
          },
          take: 1,
        },
        aimag: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        // OPTIMIZED: khoroo не нужен на главной странице - показывается только на детальной
      },
      orderBy: {
        created_at: "desc",
      },
      take: 8,
    }),
  ]);

  // Строим дерево категорий
  const categoryTree = categoriesData.length > 0
    ? buildCategoryTree(categoriesData)
    : fallbackCategories as unknown as CategoryWithChildren[];

  // Сериализуем Decimal в number для Client Components
  const serializedListings = listingsData.map((listing) => ({
    ...listing,
    price: listing.price ? Number(listing.price) : null,
  }));

  return {
    categories: categoryTree,
    allCategories: categoriesData,
    listings: serializedListings as ListingWithRelations[],
  };
}

export default async function Home() {
  const { categories, allCategories, listings } = await getHomePageData();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold">
            <span className="text-[#c4272f]">Uilc</span>
            <span className="text-[#015197]">hilge</span>
            <span className="text-[#c4272f]">e.mn</span>
          </h1>
          {/* Mobile Nav - only notifications bell */}
          <div className="flex md:hidden items-center gap-2">
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
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">Хэрэгтэй үйлчилгээгээ олоорой</h2>
        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto">
          Мянга мянган мэргэжилтнүүд танд туслахад бэлэн байна
        </p>
        {/* Search - один компонент, responsive */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <SearchInput className="flex-1" />
          <CitySelect />
        </div>
      </section>

      {/* Categories - SSR с предзагруженными данными */}
      <CategoriesSectionSSR
        categories={categories}
        allCategories={allCategories}
      />

      {/* Recommendations - SSR с предзагруженными данными */}
      <RecommendedListingsSSR listings={listings} />

      {/* Footer - Desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Create Service FAB - Desktop only */}
      <Link href="/services/create" className="hidden md:flex fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 group">
        <div className="relative">
          {/* Tooltip - Desktop only */}
          <div className="hidden md:block absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Үйлчилгээ нэмэх
            <div className="absolute top-full right-4 border-4 border-transparent border-t-foreground" />
          </div>
          {/* Button - Smaller on mobile */}
          <Button
            size="lg"
            className="h-12 md:h-14 px-3 md:pl-4 md:pr-5 rounded-full shadow-lg hover:shadow-xl transition-all bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 gap-1.5 md:gap-2"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-medium text-sm md:text-base">Зарлах</span>
          </Button>
          {/* Pulse animation */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
          </span>
        </div>
      </Link>
    </div>
  );
}
