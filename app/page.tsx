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

// Данные для главной: только то, что реально видно в карточках/секциях.
// Любое лишнее поле улетает в HTML payload (serialized RSC props) и замедляет
// гидратацию, поэтому SELECT жёстко совпадает с тем, что читает ListingCard.
async function getHomePageData() {
  try {
    const [rootCategories, listingsData, activeBoosts] = await Promise.all([
      // Для главной показываем только root (parent_id IS NULL) — 10 штук.
      // Подкатегории грузит <CategoriesModal> по open через client hook, поэтому
      // нет смысла таскать 80+ строк в HTML каждый раз.
      prisma.categories.findMany({
        where: { is_active: true, parent_id: null },
        orderBy: { sort_order: "asc" },
        take: 10,
      }),
      // Narrow select: 25+ колонок listings (description full, search_vector,
      // completion_photos, proposed_price, рабочие часы и т.д.) не нужны
      // карточке. Урезаем примерно в 2-3 раза transfer от БД.
      prisma.listings.findMany({
        where: { status: "active", is_active: true },
        select: {
          id: true,
          user_id: true,
          title: true,
          slug: true,
          // description — обрезаем ниже в map до DESCRIPTION_PREVIEW_LEN
          description: true,
          price: true,
          currency: true,
          is_negotiable: true,
          service_type: true,
          address: true,
          latitude: true,
          longitude: true,
          views_count: true,
          favorites_count: true,
          created_at: true,
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
          category: { select: { id: true, name: true, slug: true } },
          aimag: { select: { id: true, name: true } },
          district: { select: { id: true, name: true } },
          khoroo: { select: { id: true, name: true } },
          // Cover image (единственная) — без sort_order, без лишних полей.
          images: {
            where: { is_cover: true },
            select: { id: true, url: true },
            take: 1,
          },
        },
        orderBy: { created_at: "desc" },
        take: 8,
      }),
      prisma.listing_boosts.findMany({
        where: { status: "boost_active", expires_at: { gt: new Date() } },
        select: { listing_id: true },
        distinct: ["listing_id"],
      }),
    ]);

    const boostedIds = activeBoosts.map((b) => b.listing_id);

    // Decimal → number + обрезка description до DESCRIPTION_PREVIEW_LEN.
    // ListingCard использует line-clamp-1, поэтому смысла слать полный
    // description (до нескольких KB) в RSC payload нет.
    const listings = listingsData.map((l) => ({
      ...l,
      description:
        l.description.length > DESCRIPTION_PREVIEW_LEN
          ? l.description.slice(0, DESCRIPTION_PREVIEW_LEN) + "…"
          : l.description,
      price: l.price ? Number(l.price) : null,
      latitude: l.latitude ? Number(l.latitude) : null,
      longitude: l.longitude ? Number(l.longitude) : null,
      // images приходят без sort_order — добавляем 0 для совместимости с типом.
      images: l.images.map((img) => ({ ...img, sort_order: 0 })),
    })) as unknown as ListingWithRelations[];

    return {
      categories: rootCategories as unknown as CategoryWithChildren[],
      listings,
      boostedIds,
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
