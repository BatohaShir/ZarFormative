"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { ListingCard, type ListingWithRelations } from "@/components/listing-card";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
import { CategoryFilterModal } from "@/components/category-filter-modal";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MapPin,
  Package,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatPrice } from "@/lib/utils";
import { useFindManylistings } from "@/lib/hooks/listings";

type SortOption = "popular" | "price_asc" | "price_desc" | "newest";

// Desktop Sidebar Filters Component
function FiltersContent({
  selectedCategories,
  setSelectedCategories,
  priceRange,
  setPriceRange,
  onReset,
}: {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h4 className="font-medium mb-3">Ангилал</h4>
        <CategoryFilterModal
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          trigger={
            <Button variant="outline" className="w-full justify-between">
              <span>
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} ангилал сонгосон`
                  : "Ангилал сонгох"}
              </span>
              <span className="text-muted-foreground">→</span>
            </Button>
          }
        />
        {selectedCategories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedCategories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              >
                {cat}
              </span>
            ))}
            {selectedCategories.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{selectedCategories.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-medium mb-3">Үнэ</h4>
        <div className="px-1">
          <Slider
            value={priceRange}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            max={1000000}
            min={0}
            step={10000}
            className="mb-2"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatPrice(priceRange[0])}₮</span>
            <span>{formatPrice(priceRange[1])}₮</span>
          </div>
        </div>
      </div>

      {/* Reset button */}
      <Button variant="outline" className="w-full" onClick={onReset}>
        <X className="w-4 h-4 mr-2" />
        Шүүлтүүр цэвэрлэх
      </Button>
    </div>
  );
}

function ServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial values from URL
  const initialCategory = searchParams.get("category") || "";
  const initialCategories = initialCategory ? [initialCategory] : (searchParams.get("categories")?.split(",").filter(Boolean) || []);
  const initialPriceMin = parseInt(searchParams.get("priceMin") || "0", 10);
  const initialPriceMax = parseInt(searchParams.get("priceMax") || "1000000", 10);
  const initialSort = (searchParams.get("sort") as SortOption) || "newest";
  const initialCity = searchParams.get("city") || "";

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(initialCategories);
  const [priceRange, setPriceRange] = React.useState<[number, number]>([initialPriceMin, initialPriceMax]);
  const [sortBy, setSortBy] = React.useState<SortOption>(initialSort);
  const [selectedCity, setSelectedCity] = React.useState(initialCity);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Строим where условие для запроса
  const whereCondition = React.useMemo(() => {
    const conditions: Record<string, unknown> = {
      status: "active",
      is_active: true,
    };

    // Фильтр по категориям (slug)
    if (selectedCategories.length > 0) {
      conditions.category = {
        slug: { in: selectedCategories },
      };
    }

    // Фильтр по цене
    if (priceRange[0] > 0 || priceRange[1] < 1000000) {
      conditions.price = {};
      if (priceRange[0] > 0) {
        (conditions.price as Record<string, number>).gte = priceRange[0];
      }
      if (priceRange[1] < 1000000) {
        (conditions.price as Record<string, number>).lte = priceRange[1];
      }
    }

    // Фильтр по городу
    if (selectedCity) {
      conditions.city = selectedCity;
    }

    return conditions;
  }, [selectedCategories, priceRange, selectedCity]);

  // Строим orderBy для сортировки
  const orderByCondition = React.useMemo(() => {
    switch (sortBy) {
      case "price_asc":
        return { price: "asc" as const };
      case "price_desc":
        return { price: "desc" as const };
      case "popular":
        return { views_count: "desc" as const };
      case "newest":
      default:
        return { created_at: "desc" as const };
    }
  }, [sortBy]);

  // Загружаем объявления из БД
  const { data: listings, isLoading } = useFindManylistings({
    where: whereCondition,
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
        select: {
          id: true,
          url: true,
          sort_order: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
    },
    orderBy: orderByCondition,
  });

  // Update URL when filters change
  const updateURL = React.useCallback(() => {
    const params = new URLSearchParams();

    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","));
    }
    if (priceRange[0] > 0) {
      params.set("priceMin", priceRange[0].toString());
    }
    if (priceRange[1] < 1000000) {
      params.set("priceMax", priceRange[1].toString());
    }
    if (sortBy !== "newest") {
      params.set("sort", sortBy);
    }
    if (selectedCity) {
      params.set("city", selectedCity);
    }

    const queryString = params.toString();
    router.replace(queryString ? `/services?${queryString}` : "/services", { scroll: false });
  }, [selectedCategories, priceRange, sortBy, selectedCity, router]);

  React.useEffect(() => {
    updateURL();
  }, [updateURL]);

  const resetFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 1000000]);
    setSortBy("newest");
    setSelectedCity("");
  };

  const activeFiltersCount =
    selectedCategories.length +
    (priceRange[0] > 0 || priceRange[1] < 1000000 ? 1 : 0) +
    (selectedCity ? 1 : 0);

  const listingsData = (listings || []) as ListingWithRelations[];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <Link href="/">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
              </h1>
            </Link>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Page Title */}
        <h2 className="text-xl md:text-2xl font-bold mb-4">Бүх үйлчилгээ</h2>

        {/* Desktop Search & City */}
        <div className="hidden md:flex w-full gap-2 mb-6">
          <SearchInput className="flex-1" />
          <CitySelect />
        </div>

        {/* Mobile: Search, City (full width), Collapsible Filters */}
        <div className="md:hidden space-y-3 mb-4">
          {/* Search */}
          <SearchInput />

          {/* City Select - Full Width */}
          <CitySelect
            trigger={(displayText) => (
              <Button variant="outline" className="w-full justify-between h-11">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {displayText}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            )}
          />

          {/* Collapsible Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-11">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Шүүлтүүр</span>
                  {activeFiltersCount > 0 && (
                    <span className="h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>
                {filtersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="border rounded-lg p-4 space-y-5">
                {/* Categories */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Ангилал</h4>
                  <CategoryFilterModal
                    selectedCategories={selectedCategories}
                    onCategoriesChange={setSelectedCategories}
                    trigger={
                      <Button variant="outline" className="w-full justify-between text-sm">
                        <span>
                          {selectedCategories.length > 0
                            ? `${selectedCategories.length} сонгосон`
                            : "Ангилал сонгох"}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    }
                  />
                  {selectedCategories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedCategories.map((cat) => (
                        <span
                          key={cat}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Үнэ</h4>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    max={1000000}
                    min={0}
                    step={10000}
                    className="mb-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatPrice(priceRange[0])}₮</span>
                    <span>{formatPrice(priceRange[1])}₮</span>
                  </div>
                </div>

                {/* Reset button */}
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Цэвэрлэх
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24 border rounded-lg p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Шүүлтүүр
                {activeFiltersCount > 0 && (
                  <span className="ml-auto h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                    {activeFiltersCount}
                  </span>
                )}
              </h3>
              <FiltersContent
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                onReset={resetFilters}
              />
            </div>
          </aside>

          {/* Services Grid */}
          <div className="flex-1">
            {/* Results header with sort */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Ачааллаж байна..." : `${listingsData.length} үйлчилгээ`}
              </p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-36 md:w-44">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Эрэмбэлэх" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Шинэ</SelectItem>
                  <SelectItem value="popular">Эрэлттэй</SelectItem>
                  <SelectItem value="price_asc">Үнэ ↑</SelectItem>
                  <SelectItem value="price_desc">Үнэ ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl md:rounded-2xl overflow-hidden border">
                    <Skeleton className="aspect-4/3" />
                    <div className="p-3 md:p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex items-center gap-2 mt-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : listingsData.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {listingsData.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-2">Үйлчилгээ олдсонгүй</p>
                <p className="text-muted-foreground/70 text-sm mb-4">
                  Шүүлтүүр өөрчилж үзнэ үү эсвэл эхний зараа нэмээрэй
                </p>
                <div className="flex gap-2">
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" onClick={resetFilters}>
                      Шүүлтүүр цэвэрлэх
                    </Button>
                  )}
                  <Link href="/services/create">
                    <Button>Зар нэмэх</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ServicesPageContent />
    </Suspense>
  );
}
