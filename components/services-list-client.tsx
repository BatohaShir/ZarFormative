"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { ListingCard, type ListingWithRelations } from "@/components/listing-card";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
import { ServicesFilters, type ProviderType } from "@/components/services-filters";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MapPin,
  Loader2,
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
import { useInfiniteFindManylistings } from "@/lib/hooks/listings";

type SortOption = "popular" | "price_asc" | "price_desc" | "newest";

interface ServicesListClientProps {
  initialListings: ListingWithRelations[];
  initialTotalCount: number;
}

function ServicesListContent({ initialListings, initialTotalCount }: ServicesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track if URL was updated by user interaction (skip first render)
  const isFirstRender = React.useRef(true);

  // Ref для Intersection Observer
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Для debounce URL updates
  const urlUpdateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Use lazy initializers to read URL params only once
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(() => {
    const initialCategory = searchParams.get("category") || "";
    return initialCategory ? [initialCategory] : (searchParams.get("categories")?.split(",").filter(Boolean) || []);
  });

  // Локальное состояние для визуального отображения слайдера (без debounce)
  const [localPriceRange, setLocalPriceRange] = React.useState<[number, number]>(() => [
    parseInt(searchParams.get("priceMin") || "0", 10),
    parseInt(searchParams.get("priceMax") || "1000000", 10),
  ]);

  // Состояние для запросов (с debounce через onValueCommit)
  const [committedPriceRange, setCommittedPriceRange] = React.useState<[number, number]>(localPriceRange);

  const [sortBy, setSortBy] = React.useState<SortOption>(() =>
    (searchParams.get("sort") as SortOption) || "newest"
  );
  const [selectedAimagId, setSelectedAimagId] = React.useState(() =>
    searchParams.get("aimag") || ""
  );
  const [selectedAimagName, setSelectedAimagName] = React.useState("");
  const [selectedDistrictId, setSelectedDistrictId] = React.useState(() =>
    searchParams.get("district") || ""
  );
  const [selectedDistrictName, setSelectedDistrictName] = React.useState("");
  const [providerType, setProviderType] = React.useState<ProviderType>(() =>
    (searchParams.get("provider") as ProviderType) || "all"
  );
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

    // Фильтр по цене (используем committed значения)
    if (committedPriceRange[0] > 0 || committedPriceRange[1] < 1000000) {
      conditions.price = {};
      if (committedPriceRange[0] > 0) {
        (conditions.price as Record<string, number>).gte = committedPriceRange[0];
      }
      if (committedPriceRange[1] < 1000000) {
        (conditions.price as Record<string, number>).lte = committedPriceRange[1];
      }
    }

    // Фильтр по локации (аймаг и дүүрэг)
    if (selectedDistrictId) {
      conditions.district_id = selectedDistrictId;
    } else if (selectedAimagId) {
      conditions.aimag_id = selectedAimagId;
    }

    // Фильтр по типу поставщика (компания или частное лицо)
    if (providerType !== "all") {
      conditions.user = {
        is_company: providerType === "company",
      };
    }

    return conditions;
  }, [selectedCategories, committedPriceRange, selectedAimagId, selectedDistrictId, providerType]);

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

  const PAGE_SIZE = 12;

  // Проверяем нужно ли делать запрос (есть ли фильтры отличные от дефолтных)
  const hasFilters = selectedCategories.length > 0 ||
    committedPriceRange[0] > 0 ||
    committedPriceRange[1] < 1000000 ||
    selectedAimagId ||
    selectedDistrictId ||
    providerType !== "all" ||
    sortBy !== "newest";

  // Загружаем объявления с cursor-based пагинацией
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteFindManylistings(
    {
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
          where: {
            is_cover: true,
          },
          select: {
            id: true,
            url: true,
            sort_order: true,
            is_cover: true,
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
        khoroo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: orderByCondition,
      take: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage) => {
        if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
        const lastItem = lastPage[lastPage.length - 1];
        return { cursor: { id: lastItem.id }, skip: 1 };
      },
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Используем initial data только если нет фильтров
      initialData: !hasFilters ? {
        pages: [initialListings],
        pageParams: [undefined],
      } : undefined,
    }
  );

  // Собираем все объявления из всех страниц
  const listings = React.useMemo(() => {
    if (!data?.pages) return initialListings;
    return data.pages.flat();
  }, [data, initialListings]);

  // Intersection Observer для auto infinite scroll
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Extract primitive values for stable dependencies
  const priceMin = committedPriceRange[0];
  const priceMax = committedPriceRange[1];
  const categoriesKey = selectedCategories.join(",");

  // Debounced URL update (300ms)
  React.useEffect(() => {
    // Skip URL update on initial render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear previous timeout
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    // Set new debounced update
    urlUpdateTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();

      if (categoriesKey) {
        params.set("categories", categoriesKey);
      }
      if (priceMin > 0) {
        params.set("priceMin", priceMin.toString());
      }
      if (priceMax < 1000000) {
        params.set("priceMax", priceMax.toString());
      }
      if (sortBy !== "newest") {
        params.set("sort", sortBy);
      }
      if (selectedAimagId) {
        params.set("aimag", selectedAimagId);
      }
      if (selectedDistrictId) {
        params.set("district", selectedDistrictId);
      }
      if (providerType !== "all") {
        params.set("provider", providerType);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `/services?${queryString}` : "/services";

      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesKey, priceMin, priceMax, sortBy, selectedAimagId, selectedDistrictId, providerType]);

  // Callback for CitySelect
  const handleLocationSelect = React.useCallback((aimagId: string, aimagName: string, districtId: string, districtName: string) => {
    setSelectedAimagId(aimagId);
    setSelectedAimagName(aimagName);
    setSelectedDistrictId(districtId);
    setSelectedDistrictName(districtName);
  }, []);

  const resetFilters = React.useCallback(() => {
    setSelectedCategories([]);
    setLocalPriceRange([0, 1000000]);
    setCommittedPriceRange([0, 1000000]);
    setSortBy("newest");
    setSelectedAimagId("");
    setSelectedAimagName("");
    setSelectedDistrictId("");
    setSelectedDistrictName("");
    setProviderType("all");
  }, []);

  const activeFiltersCount =
    selectedCategories.length +
    (committedPriceRange[0] > 0 || committedPriceRange[1] < 1000000 ? 1 : 0) +
    (selectedAimagId ? 1 : 0) +
    (providerType !== "all" ? 1 : 0);

  const listingsData = (listings || []) as ListingWithRelations[];

  // Total count: используем initial если нет фильтров, иначе текущий список
  const displayTotalCount = !hasFilters ? initialTotalCount : listingsData.length;

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
          {/* Mobile Nav - notifications bell */}
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

      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Page Title with Total Count */}
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="text-xl md:text-2xl font-bold">Бүх үйлчилгээ</h2>
          <span className="text-sm text-muted-foreground">
            ({displayTotalCount} үр дүн)
          </span>
        </div>

        {/* Desktop Search & City */}
        <div className="hidden md:flex w-full gap-2 mb-6">
          <SearchInput className="flex-1" />
          <CitySelect
            onSelect={handleLocationSelect}
            value={{ aimagId: selectedAimagId, districtId: selectedDistrictId }}
          />
        </div>

        {/* Mobile: Search, City (full width), Collapsible Filters */}
        <div className="md:hidden space-y-3 mb-4">
          {/* Search */}
          <SearchInput />

          {/* City Select - Full Width */}
          <CitySelect
            onSelect={handleLocationSelect}
            value={{ aimagId: selectedAimagId, districtId: selectedDistrictId }}
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
              <div className="border rounded-lg p-4">
                <ServicesFilters
                  variant="mobile"
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                  priceRange={localPriceRange}
                  onPriceRangeChange={setLocalPriceRange}
                  onPriceRangeCommit={setCommittedPriceRange}
                  providerType={providerType}
                  onProviderTypeChange={setProviderType}
                  onReset={resetFilters}
                />
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
              <ServicesFilters
                variant="desktop"
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                priceRange={localPriceRange}
                onPriceRangeChange={setLocalPriceRange}
                onPriceRangeCommit={setCommittedPriceRange}
                providerType={providerType}
                onProviderTypeChange={setProviderType}
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
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {listingsData.map((listing, index) => (
                    <ListingCard key={listing.id} listing={listing} priority={index < 6} />
                  ))}
                </div>

                {/* Skeleton при загрузке следующей страницы */}
                {isFetchingNextPage && (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`loading-${i}`} className="rounded-xl md:rounded-2xl overflow-hidden border">
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
                )}

                {/* Intersection Observer target для auto infinite scroll */}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex justify-center mt-6 py-4">
                    {!isFetchingNextPage && (
                      <Button
                        variant="outline"
                        onClick={() => fetchNextPage()}
                        className="min-w-40"
                      >
                        Дараагийнхыг харах
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Image
                  src="/icons/7486744.png"
                  alt="Пустая коробка"
                  width={80}
                  height={80}
                  className="mb-4 opacity-70"
                />
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

export function ServicesListClient(props: ServicesListClientProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ServicesListContent {...props} />
    </Suspense>
  );
}
