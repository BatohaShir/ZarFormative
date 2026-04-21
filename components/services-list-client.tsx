"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { ListingCard, type ListingWithRelations } from "@/components/listing-card";
import { ListingCardSkeletonGrid } from "@/components/listing-card-skeleton";
import { BillboardSlot } from "@/components/billboard";
import { BillboardCard } from "@/components/billboard/billboard-card";
import { getMockBillboards } from "@/components/billboard/mock-data";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
import { ServicesFilters, type ProviderType } from "@/components/services-filters";
import {
  ChevronLeft,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MapPin,
  Loader2,
} from "lucide-react";
import { ServicesMap } from "@/components/services-map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useInfiniteFindManylistings } from "@/lib/hooks/listings";
import { useFindManylisting_boosts } from "@/lib/hooks/listing-boosts";

type SortOption = "popular" | "price_asc" | "price_desc" | "newest";

// Shared with app/services/page.tsx so SSR and client see the exact
// same filter shape — that's what lets us skip re-fetching on hydration
// when the URL hasn't changed.
export interface ServicesFilters {
  categorySlugs: string[];
  priceMin: number;
  priceMax: number;
  sort: SortOption;
  aimagId: string;
  districtId: string;
  provider: ProviderType;
  q: string;
}

interface ServicesListClientProps {
  initialListings: ListingWithRelations[];
  initialBoostedIds: string[];
  initialFilters: ServicesFilters;
}

function ServicesListContent({
  initialListings,
  initialBoostedIds,
  initialFilters,
}: ServicesListClientProps) {
  const t = useTranslations("listings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track if URL was updated by user interaction (skip first render)
  const isFirstRender = React.useRef(true);

  // Ref для Intersection Observer
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Для debounce URL updates
  const urlUpdateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Filter state seeded from the SSR-parsed initialFilters. SSR already
  // parsed the URL; reading it again here would just duplicate that work
  // and risk drift if parsing rules diverge.
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    () => initialFilters.categorySlugs
  );
  const [localPriceRange, setLocalPriceRange] = React.useState<[number, number]>(() => [
    initialFilters.priceMin,
    initialFilters.priceMax,
  ]);
  const [committedPriceRange, setCommittedPriceRange] =
    React.useState<[number, number]>(localPriceRange);
  const [sortBy, setSortBy] = React.useState<SortOption>(() => initialFilters.sort);
  const [selectedAimagId, setSelectedAimagId] = React.useState(() => initialFilters.aimagId);
  const [selectedAimagName, setSelectedAimagName] = React.useState("");
  const [selectedDistrictId, setSelectedDistrictId] = React.useState(
    () => initialFilters.districtId
  );
  const [selectedDistrictName, setSelectedDistrictName] = React.useState("");
  const [providerType, setProviderType] = React.useState<ProviderType>(
    () => initialFilters.provider
  );
  const [searchQuery, setSearchQuery] = React.useState(() => initialFilters.q);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  // Filter by specific listing IDs (from map cluster click)
  const [selectedListingIds, setSelectedListingIds] = React.useState<string[]>([]);

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

    // Фильтр по конкретным ID объявлений (из клика на кластер карты)
    if (selectedListingIds.length > 0) {
      conditions.id = { in: selectedListingIds };
    }
    // Фильтр по локации (аймаг и дүүрэг) - только если нет фильтра по ID
    else if (selectedDistrictId) {
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

    // Текстовый поиск (q) — токенизируем по словам; каждое слово должно
    // найтись в одном из полей (title, description, category.name,
    // user.first_name / last_name / company_name). Все слова должны найтись.
    const q = searchQuery.trim();
    if (q.length >= 2) {
      const tokens = q
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
      const targets = tokens.length > 0 ? tokens : [q];
      const ins = (field: string, token: string) => ({
        [field]: { contains: token, mode: "insensitive" as const },
      });
      const perTokenAnd = targets.map((token) => ({
        OR: [
          ins("title", token),
          ins("description", token),
          { category: { name: { contains: token, mode: "insensitive" as const } } },
          {
            user: {
              OR: [ins("first_name", token), ins("last_name", token), ins("company_name", token)],
            },
          },
        ],
      }));
      const existingAnd = (conditions.AND as unknown[] | undefined) ?? [];
      conditions.AND = [...existingAnd, ...perTokenAnd];
    }

    return conditions;
  }, [
    selectedCategories,
    committedPriceRange,
    selectedAimagId,
    selectedDistrictId,
    providerType,
    selectedListingIds,
    searchQuery,
  ]);

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

  // True when current state still matches the filters SSR rendered with.
  // While true we can reuse initialListings as React Query's initialData,
  // avoiding a re-fetch on mount. Cluster-map selection is a client-only
  // state not represented in the SSR filters, so any selection forces a
  // fresh query.
  const matchesInitialFilters =
    selectedListingIds.length === 0 &&
    searchQuery === initialFilters.q &&
    sortBy === initialFilters.sort &&
    selectedAimagId === initialFilters.aimagId &&
    selectedDistrictId === initialFilters.districtId &&
    providerType === initialFilters.provider &&
    committedPriceRange[0] === initialFilters.priceMin &&
    committedPriceRange[1] === initialFilters.priceMax &&
    selectedCategories.length === initialFilters.categorySlugs.length &&
    selectedCategories.every((c) => initialFilters.categorySlugs.includes(c));

  // Legacy name kept because downstream code (count display, UI affordances)
  // still reads it.
  const hasFilters =
    selectedCategories.length > 0 ||
    committedPriceRange[0] > 0 ||
    committedPriceRange[1] < 1000000 ||
    selectedAimagId !== "" ||
    selectedDistrictId !== "" ||
    providerType !== "all" ||
    sortBy !== "newest" ||
    selectedListingIds.length > 0 ||
    searchQuery.trim().length >= 2;

  // Загружаем объявления с cursor-based пагинацией
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteFindManylistings(
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
              latitude: true,
              longitude: true,
            },
          },
          district: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
            },
          },
          // OPTIMIZED: khoroo не нужен для списка - показывается только на детальной странице
          // Экономит ~5% payload на каждой карточке
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
        // Seed from SSR whenever the filter state still matches what SSR
        // rendered with. Previously we only seeded when NO filters were
        // applied, so /services?q=X landed cold and paid a client-side
        // round-trip to refetch the exact same rows SSR just returned.
        initialData: matchesInitialFilters
          ? {
              pages: [initialListings],
              pageParams: [undefined],
            }
          : undefined,
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
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
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
  }, [
    categoriesKey,
    priceMin,
    priceMax,
    sortBy,
    selectedAimagId,
    selectedDistrictId,
    providerType,
    searchQuery,
  ]);

  // Callback for CitySelect
  const handleLocationSelect = React.useCallback(
    (aimagId: string, aimagName: string, districtId: string, districtName: string) => {
      setSelectedAimagId(aimagId);
      setSelectedAimagName(aimagName);
      setSelectedDistrictId(districtId);
      setSelectedDistrictName(districtName);
    },
    []
  );

  // Handle location selection from map - filter by district/aimag
  const handleLocationSelectFromMap = React.useCallback(
    (districtId: string | null, aimagId: string | null) => {
      // Clear listing IDs filter when using location filter
      setSelectedListingIds([]);
      // Set location filters
      if (districtId) {
        setSelectedDistrictId(districtId);
      } else {
        setSelectedDistrictId("");
      }

      if (aimagId) {
        setSelectedAimagId(aimagId);
      } else if (!districtId) {
        setSelectedAimagId("");
      }
    },
    []
  );

  // Handle cluster selection from map - filter by listing IDs
  const handleClusterSelectFromMap = React.useCallback((listingIds: string[]) => {
    // Clear location filters when using listing IDs filter
    setSelectedDistrictId("");
    setSelectedAimagId("");
    setSelectedAimagName("");
    setSelectedDistrictName("");
    // Set listing IDs filter
    setSelectedListingIds(listingIds);
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
    setSelectedListingIds([]);
  }, []);

  const activeFiltersCount =
    selectedCategories.length +
    (committedPriceRange[0] > 0 || committedPriceRange[1] < 1000000 ? 1 : 0) +
    (selectedAimagId ? 1 : 0) +
    (providerType !== "all" ? 1 : 0) +
    (selectedListingIds.length > 0 ? 1 : 0);

  const listingsData = (listings || []) as ListingWithRelations[];

  // OPTIMIZATION: Round date to 5-min intervals for stable query key.
  // Value changes at next re-render after a 5-min boundary passes (not on a timer).
  // On this page, infinite scroll and filters cause frequent re-renders, so the value stays fresh.
  const boostDateThreshold = React.useMemo(() => {
    const fiveMin = 5 * 60 * 1000;
    return new Date(Math.floor(Date.now() / fiveMin) * fiveMin).toISOString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(Date.now() / (5 * 60 * 1000))]);

  // Load active boosts to identify VIP listings
  const { data: activeBoosts } = useFindManylisting_boosts(
    {
      where: {
        status: "boost_active",
        expires_at: { gt: boostDateThreshold },
      },
      select: { listing_id: true },
    },
    { staleTime: 60 * 1000 }
  );

  // Prefer freshly-fetched boosts, fall back to SSR-seeded ids until
  // the query resolves. Keeps VIP badges visible on first paint instead
  // of flickering in once the client query finishes.
  const boostedIds = React.useMemo(() => {
    if (activeBoosts) return new Set(activeBoosts.map((b) => b.listing_id));
    return new Set(initialBoostedIds);
  }, [activeBoosts, initialBoostedIds]);

  // Split into VIP and regular
  const { vipListings, regularListings } = React.useMemo(() => {
    const vip: ListingWithRelations[] = [];
    const regular: ListingWithRelations[] = [];
    for (const listing of listingsData) {
      if (boostedIds.has(listing.id)) vip.push(listing);
      else regular.push(listing);
    }
    return { vipListings: vip, regularListings: regular };
  }, [listingsData, boostedIds]);

  // OPTIMIZATION: Memoize billboard data to avoid calling getMockBillboards on every render
  const inlineBillboards = React.useMemo(() => getMockBillboards("services_inline"), []);

  // Show what's actually loaded on screen. Previously we did a separate
  // COUNT(*) on SSR for the no-filter case just so the header could say
  // "(1,243 results)" vs "(12 results)" — an extra DB round-trip for a
  // vanity label. Drop the dedicated count and report the loaded count;
  // infinite scroll will bump it as more pages stream in.
  const displayTotalCount = listingsData.length;

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
                <span className="text-[#015197]">Tsogts</span>
                <span className="text-[#c4272f]">.mn</span>
              </h1>
            </Link>
          </div>
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

      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Page Title with Total Count */}
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="text-xl md:text-2xl font-bold">{t("allServices")}</h2>
          <span className="text-sm text-muted-foreground">
            ({displayTotalCount} {t("results")})
          </span>
        </div>

        {/* Desktop Search & City */}
        <div className="hidden md:flex w-full gap-2 mb-6">
          <SearchInput
            className="flex-1"
            value={searchQuery}
            onValueChange={setSearchQuery}
            onSubmit={(v) => setSearchQuery(v)}
            showSubmit
          />
          <CitySelect
            onSelect={handleLocationSelect}
            value={{ aimagId: selectedAimagId, districtId: selectedDistrictId }}
          />
        </div>

        {/* Mobile: Search, City (full width), Collapsible Filters */}
        <div className="md:hidden space-y-3 mb-4">
          {/* Search */}
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            onSubmit={(v) => setSearchQuery(v)}
            showSubmit
          />

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
                  <span>{t("filters")}</span>
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
                {t("filters")}
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
            {/* Billboard — before map */}
            <BillboardSlot placement="services_top" className="px-0 mb-4" />

            {/* Map Section */}
            <ServicesMap
              listings={listingsData}
              className="mb-4 h-50 md:h-70"
              onLocationSelect={handleLocationSelectFromMap}
              onClusterSelect={handleClusterSelectFromMap}
            />

            {/* Results header with sort */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? t("loading") : `${listingsData.length} ${t("services")}`}
              </p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-36 md:w-44">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t("sort")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("sortNewest")}</SelectItem>
                  <SelectItem value="popular">{t("sortPopular")}</SelectItem>
                  <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
                  <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <ListingCardSkeletonGrid count={6} />
            ) : listingsData.length > 0 ? (
              <>
                {/* All listings: VIP first with gold border, then regular */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                  {vipListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} priority isVip />
                  ))}
                  {regularListings.map((listing, index) => {
                    const items = [
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        priority={vipListings.length === 0 && index < 6}
                      />,
                    ];
                    // Insert inline billboard card after every 8th listing
                    if ((index + 1) % 8 === 0) {
                      const bbIndex = Math.floor(index / 8) % Math.max(inlineBillboards.length, 1);
                      const bb = inlineBillboards[bbIndex];
                      if (bb) {
                        items.push(<BillboardCard key={`bb-inline-${index}`} billboard={bb} />);
                      }
                    }
                    return items;
                  })}
                </div>

                {/* Skeleton при загрузке следующей страницы */}
                {isFetchingNextPage && (
                  <div className="mt-4">
                    <ListingCardSkeletonGrid count={3} />
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
                        {t("loadMore")}
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Image
                  src="/icons/7486744.webp"
                  alt={t("noResults")}
                  width={80}
                  height={80}
                  className="mb-4 opacity-70"
                />
                <p className="text-muted-foreground mb-2">{t("noResults")}</p>
                <p className="text-muted-foreground/70 text-sm mb-4">{t("noResultsHint")}</p>
                <div className="flex gap-2">
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" onClick={resetFilters}>
                      {t("clearFilters")}
                    </Button>
                  )}
                  <Link href="/services/create">
                    <Button>{t("addListing")}</Button>
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
