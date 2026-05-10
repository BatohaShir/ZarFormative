"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { ListingCard, type ListingWithRelations } from "@/components/listing-card";
import { ListingCardSkeletonGrid } from "@/components/listing-card-skeleton";
import { BillboardSlot } from "@/components/billboard";
import { BillboardCard } from "@/components/billboard/billboard-card";
import { getMockBillboards } from "@/components/billboard/mock-data";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
// Alias the Filters panel component so its name doesn't shadow the
// ServicesFilters value/type we expose from this module.
import {
  ServicesFilters as ServicesFiltersPanel,
  type ProviderType,
} from "@/components/services-filters";
import { SlidersHorizontal, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { ServicesMap } from "@/components/services-map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  filtersToSearchParams,
  PAGE_SIZE as SERVER_PAGE_SIZE,
  type ServicesFilters,
  type ServicesQueryResult,
  type ServicesReferenceData,
  type SortOption,
} from "@/lib/services/query";

// Re-export the shared types so downstream imports from this module
// (of which there are several) don't need to be rewritten.
export type { ServicesFilters } from "@/lib/services/query";

interface ServicesListClientProps {
  initialListings: ListingWithRelations[];
  initialBoostedIds: string[];
  initialFilters: ServicesFilters;
  initialNextCursor: { createdAt: string; id: string } | null;
  initialReferenceData: ServicesReferenceData;
}

function ServicesListContent({
  initialListings,
  initialBoostedIds,
  initialFilters,
  initialNextCursor,
  initialReferenceData,
}: ServicesListClientProps) {
  const t = useTranslations("listings");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");
  const router = useRouter();

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

  // When the site-wide aimag selector changes the cookie and triggers
  // router.refresh(), the server re-renders this page with a new
  // initialFilters.aimagId. But this component is a client boundary —
  // useState's initializer only runs on mount, so without this sync
  // the old selection would stick and the grid would keep showing the
  // previous city.
  React.useEffect(() => {
    setSelectedAimagId(initialFilters.aimagId);
    setSelectedDistrictId(initialFilters.districtId);
  }, [initialFilters.aimagId, initialFilters.districtId]);
  const [selectedDistrictName, setSelectedDistrictName] = React.useState("");
  const [providerType, setProviderType] = React.useState<ProviderType>(
    () => initialFilters.provider
  );
  const [searchQuery, setSearchQuery] = React.useState(() => initialFilters.q);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  // Filter by specific listing IDs (from map cluster click)
  const [selectedListingIds, setSelectedListingIds] = React.useState<string[]>([]);

  // Debounce search typing before it reaches the query key. Without this
  // each keystroke spawned a /api/services fetch — typing "Сантехник"
  // used to fire 9 serial ~2s round-trips. 400ms covers fast typists
  // and still keeps the feedback loop snappy once they pause.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400);

  // Active filters shape mirrors ServicesFilters so we can feed the same
  // values into filtersToSearchParams() for both the API call and the
  // URL sync effect. The listingIds field is client-only (from cluster
  // map click) and travels as its own request parameter.
  //
  // `q` uses the debounced value specifically so intermediate keystrokes
  // don't invalidate the query cache.
  const activeFilters: ServicesFilters = React.useMemo(
    () => ({
      categorySlugs: selectedCategories,
      priceMin: committedPriceRange[0],
      priceMax: committedPriceRange[1],
      sort: sortBy,
      aimagId: selectedAimagId,
      districtId: selectedDistrictId,
      provider: providerType,
      q: debouncedSearchQuery.trim(),
    }),
    [
      selectedCategories,
      committedPriceRange,
      sortBy,
      selectedAimagId,
      selectedDistrictId,
      providerType,
      debouncedSearchQuery,
    ]
  );

  const PAGE_SIZE = SERVER_PAGE_SIZE;

  // True when current state still matches the filters SSR rendered with.
  // While true we can reuse initialListings as React Query's initialData,
  // avoiding a re-fetch on mount. selectedListingIds is now filtered
  // client-side (see listingsData below) so it doesn't participate in
  // the SSR-match check — the SSR data stays valid even when the user
  // narrows the grid to a map cluster.
  const matchesInitialFilters =
    debouncedSearchQuery === initialFilters.q &&
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

  // Fetch through our /api/services CTE instead of the generic ZenStack
  // REST endpoint. Same query the SSR loader uses, so filter changes
  // and "load more" never go through the slower ZenStack middleware
  // and can't diverge from what SSR rendered.
  // Note: selectedListingIds is deliberately *not* in the queryKey or
  // the fetch params. Clicking a map cluster narrows the grid to a
  // subset of listings that are already in memory — firing a round-
  // trip to re-fetch them would waste ~600ms on MN→Seoul for data we
  // already have. The narrowing happens client-side below.
  const queryKey = React.useMemo(() => ["services", activeFilters] as const, [activeFilters]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
    ServicesQueryResult,
    Error
  >({
    queryKey,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const params = filtersToSearchParams(activeFilters);
      const cursor = pageParam as { createdAt: string; id: string } | undefined;
      if (cursor) {
        params.set("cursorCreatedAt", cursor.createdAt);
        params.set("cursorId", cursor.id);
      }
      const res = await fetch(`/api/services?${params.toString()}`, { signal });
      if (!res.ok) throw new Error(`/api/services ${res.status}`);
      return (await res.json()) as ServicesQueryResult;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // 5 min staleTime — listings don't need sub-minute freshness for
    // the "Сантехник → Хол → Сантехник" typing cycle to hit cache
    // instantly on repeat queries.
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // Seed from SSR whenever current filter state still matches what
    // SSR rendered with. Previously we only seeded on "no filters",
    // so /services?q=X landed cold and paid an extra client round-trip
    // to fetch the exact rows SSR just produced.
    initialData: matchesInitialFilters
      ? {
          pages: [
            {
              listings: initialListings,
              boostedIds: initialBoostedIds,
              nextCursor: initialNextCursor,
            },
          ],
          pageParams: [undefined],
        }
      : undefined,
  });

  // Flatten all pages into a single list for rendering.
  const listings = React.useMemo(() => {
    if (!data?.pages) return initialListings;
    return data.pages.flatMap((p) => p.listings);
  }, [data, initialListings]);

  // Live boosts come from the same page payload. Fall back to the SSR
  // seed until the first page resolves so VIP badges don't flicker.
  const boostedIdsFromQuery = React.useMemo(() => {
    const first = data?.pages?.[0];
    return first ? first.boostedIds : initialBoostedIds;
  }, [data, initialBoostedIds]);

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

  // Handle cluster selection from map. The narrowing is purely
  // client-side now — selectedListingIds doesn't touch the queryKey,
  // so no server round-trip fires. We also *don't* clear the aimag/
  // district filters: the cluster the user clicked lives inside the
  // already-filtered dataset, so there's no reason to blow those
  // filters away (doing so used to trigger an unrelated refetch
  // before the narrowing even ran).
  const handleClusterSelectFromMap = React.useCallback((listingIds: string[]) => {
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

  // Everything returned by the server. Fed to <ServicesMap /> so the
  // map can keep drawing all clusters/markers even when the grid is
  // narrowed to one of them.
  const listingsData = (listings || []) as ListingWithRelations[];

  // Client-side narrowing when the user clicked a map cluster. This
  // used to be a server round-trip (~600ms); since the cluster's
  // listings are already in listingsData, we just filter in memory.
  // O(n) over a small array (< PAGE_SIZE * pages loaded), so it's
  // effectively free.
  const visibleListings = React.useMemo(() => {
    if (selectedListingIds.length === 0) return listingsData;
    const idSet = new Set(selectedListingIds);
    return listingsData.filter((l) => idSet.has(l.id));
  }, [listingsData, selectedListingIds]);

  // Boosts now arrive in the same /api/services response as the listings
  // (same CTE), so we don't need a separate listing_boosts query here —
  // the old useFindManylisting_boosts call was 1 extra round-trip on
  // every mount. boostedIdsFromQuery comes from data.pages[0].
  const boostedIds = React.useMemo(() => new Set(boostedIdsFromQuery), [boostedIdsFromQuery]);

  // Split into VIP and regular — applied to the *visible* list (post
  // cluster-narrowing), so clicking a cluster doesn't leak VIP cards
  // from outside it.
  const { vipListings, regularListings } = React.useMemo(() => {
    const vip: ListingWithRelations[] = [];
    const regular: ListingWithRelations[] = [];
    for (const listing of visibleListings) {
      if (boostedIds.has(listing.id)) vip.push(listing);
      else regular.push(listing);
    }
    return { vipListings: vip, regularListings: regular };
  }, [visibleListings, boostedIds]);

  // OPTIMIZATION: Memoize billboard data to avoid calling getMockBillboards on every render
  const inlineBillboards = React.useMemo(() => getMockBillboards("services_inline"), []);

  // Show what's actually visible on screen. Previously we did a separate
  // COUNT(*) on SSR for the no-filter case just so the header could say
  // "(1,243 results)" vs "(12 results)" — an extra DB round-trip for a
  // vanity label. Drop the dedicated count and report the visible count;
  // infinite scroll will bump it as more pages stream in.
  const displayTotalCount = visibleListings.length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Editorial page header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              {t("allServices")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 tabular">
              {isLoading ? t("loading") : `${displayTotalCount} ${t("results")}`}
            </p>
          </div>
        </div>

        {/* Desktop Search & City — stacked side-by-side matching hero tokens */}
        <div className="hidden md:flex gap-2 mb-8">
          <SearchInput
            className="flex-1"
            value={searchQuery}
            onValueChange={setSearchQuery}
            onSubmit={(v) => setSearchQuery(v)}
            showSubmit
          />
          <CitySelect
            onSelect={handleLocationSelect}
            scopesGlobalCookie={false}
            value={{ aimagId: selectedAimagId, districtId: selectedDistrictId }}
            initialAimags={initialReferenceData.aimags}
            initialDistrictsForAimag={
              initialReferenceData.districtsAimagId
                ? {
                    aimagId: initialReferenceData.districtsAimagId,
                    districts: initialReferenceData.districts,
                  }
                : undefined
            }
          />
        </div>

        {/* Mobile: Search → Location (full width) → Filters (full width) */}
        <div className="md:hidden space-y-2.5 mb-5">
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            onSubmit={(v) => setSearchQuery(v)}
            showSubmit
          />

          {/* Location — full width */}
          <CitySelect
            onSelect={handleLocationSelect}
            scopesGlobalCookie={false}
            value={{ aimagId: selectedAimagId, districtId: selectedDistrictId }}
            initialAimags={initialReferenceData.aimags}
            initialDistrictsForAimag={
              initialReferenceData.districtsAimagId
                ? {
                    aimagId: initialReferenceData.districtsAimagId,
                    districts: initialReferenceData.districts,
                  }
                : undefined
            }
            trigger={(displayText) => (
              <button
                type="button"
                className="w-full inline-flex items-center justify-between gap-2 h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{displayText}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          />

          {/* Filters — full width, collapsible */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full inline-flex items-center justify-between gap-2 h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("filters")}</span>
                  {activeFiltersCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold tabular">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>
                {filtersOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="rounded-2xl ring-1 ring-border p-4">
                <ServicesFiltersPanel
                  variant="mobile"
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                  priceRange={localPriceRange}
                  onPriceRangeChange={setLocalPriceRange}
                  onPriceRangeCommit={setCommittedPriceRange}
                  providerType={providerType}
                  onProviderTypeChange={setProviderType}
                  onReset={resetFilters}
                  initialCategories={initialReferenceData.categories}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex gap-8 md:gap-10">
          {/* Desktop Filters Sidebar — editorial, no box */}
          <aside className="hidden md:block w-60 shrink-0">
            <div className="sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <h3 className="font-display font-bold text-lg tracking-tight">{t("filters")}</h3>
                {activeFiltersCount > 0 && (
                  <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold tabular">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ServicesFiltersPanel
                variant="desktop"
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                priceRange={localPriceRange}
                onPriceRangeChange={setLocalPriceRange}
                onPriceRangeCommit={setCommittedPriceRange}
                providerType={providerType}
                onProviderTypeChange={setProviderType}
                onReset={resetFilters}
                initialCategories={initialReferenceData.categories}
              />
            </div>
          </aside>

          {/* Services Grid */}
          <div className="flex-1">
            {/* Billboard — before map */}
            <BillboardSlot placement="services_top" className="px-0 mb-5" />

            {/* Map Section */}
            <div className="mb-6 rounded-2xl overflow-hidden ring-1 ring-border">
              <ServicesMap
                listings={listingsData}
                boostedIds={boostedIdsFromQuery}
                className="h-50 md:h-70"
                onLocationSelect={handleLocationSelectFromMap}
                onClusterSelect={handleClusterSelectFromMap}
              />
            </div>

            {/* Results header with sort. Count reflects what's
                actually visible post map-cluster narrowing. */}
            <div className="flex items-end justify-between mb-5 md:mb-6">
              <p className="text-sm md:text-base">
                <span className="font-display font-semibold tabular">{visibleListings.length}</span>{" "}
                <span className="text-muted-foreground">{t("services")}</span>
              </p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="h-9 w-auto min-w-32 md:min-w-44 rounded-full border-border bg-muted/60 hover:bg-muted text-sm">
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
            ) : visibleListings.length > 0 ? (
              <>
                {vipListings.length > 0 && (
                  <div className="mb-6 md:mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block w-6 h-px bg-linear-to-r from-amber-400 to-yellow-600" />
                      <span className="text-[11px] uppercase tracking-widest font-semibold bg-linear-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
                        {tHome("vipListingsLabel")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                      {vipListings.map((listing) => (
                        <ListingCard key={listing.id} listing={listing} priority isVip />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
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
                  <div className="mt-5">
                    <ListingCardSkeletonGrid count={3} />
                  </div>
                )}

                {/* Intersection Observer target для auto infinite scroll */}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex justify-center mt-8 py-4">
                    {!isFetchingNextPage && (
                      <button
                        onClick={() => fetchNextPage()}
                        className="h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
                      >
                        {t("loadMore")}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 md:py-24 text-center rounded-2xl bg-muted/40">
                <Image
                  src="/icons/7486744.webp"
                  alt=""
                  width={72}
                  height={72}
                  className="mb-4 opacity-50"
                />
                <p className="font-display text-lg font-semibold">{t("noResults")}</p>
                <p className="text-muted-foreground text-sm mt-1">{t("noResultsHint")}</p>
                <div className="flex gap-2 mt-5">
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
                    >
                      {t("clearFilters")}
                    </button>
                  )}
                  <Link href="/services/create">
                    <span className="inline-flex items-center h-10 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
                      {t("addListing")}
                    </span>
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
