"use client";

import * as React from "react";
import { MapPin, ChevronDown, Search, Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import type { aimags, districts } from "@prisma/client";
import { writeAimagCookie, readAimagCookie, ALL_AIMAGS_CODE } from "@/lib/aimag/cookie-client";
import { setSelectedAimagAction } from "@/lib/aimag/actions";

interface CitySelectProps {
  trigger?: React.ReactNode | ((displayText: string) => React.ReactNode);
  onSelect?: (aimagId: string, aimagName: string, districtId: string, districtName: string) => void;
  value?: { aimagId: string; districtId: string };
  /**
   * Optional SSR-seeded aimags list. When provided, React Query uses
   * it as initialData and skips the mount-time findMany — saves one
   * round-trip on pages that can ship this data in the SSR payload
   * (e.g. /services).
   */
  initialAimags?: aimags[];
  /**
   * Districts pre-fetched for a specific aimag. When the user lands on
   * /services?aimag=X the page already knows which aimag; seeding its
   * districts here means CitySelect doesn't fire its own findMany on
   * mount. Ignored if the runtime-selected aimag differs.
   */
  initialDistrictsForAimag?: { aimagId: string; districts: districts[] };
  /**
   * When true (default) the selector writes the global
   * `selected_aimag` cookie and calls router.refresh() so every
   * SSR-rendered grid on the site follows the user's pick. The
   * hero-search on `/` uses this mode — picking "Darkhan" here
   * means every page should filter to Darkhan.
   *
   * Pass false when CitySelect is used as a *page-local* filter
   * (e.g. the /services sidebar) where the user expects changes to
   * apply only to the current page. In that mode the component
   * writes nothing global: it just fires onSelect and the caller
   * drives the grid via its own state. The existing URL-param flow
   * on /services keeps doing its thing.
   */
  scopesGlobalCookie?: boolean;
}

/**
 * localStorage key for the last-picked (aimag, district) tuple.
 * Exported so sibling components (hero-search etc.) don't hard-code
 * the same string and drift.
 */
export const CITY_SELECT_STORAGE_KEY = "tsogts_selected_location";
const STORAGE_KEY = CITY_SELECT_STORAGE_KEY;

interface StoredLocation {
  aimagId: string;
  aimagName: string;
  districtId: string;
  districtName: string;
}

function getStoredLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeLocation(location: StoredLocation) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Ignore storage errors
  }
}

function clearStoredLocation() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export const CitySelect = React.memo(function CitySelect({
  trigger,
  onSelect,
  value,
  initialAimags,
  initialDistrictsForAimag,
  scopesGlobalCookie = true,
}: CitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedAimag, setSelectedAimag] = React.useState<aimags | null>(null);
  const [selectedDistrict, setSelectedDistrict] = React.useState<districts | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAimagList, setShowAimagList] = React.useState(true);

  // Aimags are near-static; cache for 24h. When the parent has already
  // fetched them in SSR (initialAimags prop), feed them as initialData
  // so React Query considers the query fresh and skips the mount-time
  // network request. One less round-trip on pages that can seed.
  const { data: aimagsData, isLoading: isLoadingAimags } = useQuery(
    orpc.locations.aimags.queryOptions({
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 48 * 60 * 60 * 1000,
      initialData: initialAimags,
    })
  );

  // Districts are fetched lazily only for the selected aimag (~10-15 rows).
  // When the page already knows which aimag the URL pins and has seeded
  // that aimag's districts via SSR, use them as initialData so the first
  // render has the list ready with no client round-trip.
  const seededDistricts =
    initialDistrictsForAimag && initialDistrictsForAimag.aimagId === selectedAimag?.id
      ? initialDistrictsForAimag.districts
      : undefined;

  const { data: districtsData, isLoading: isLoadingDistricts } = useQuery(
    orpc.locations.districts.queryOptions({
      input: { aimagId: selectedAimag?.id ?? "" },
      enabled: !!selectedAimag?.id,
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 48 * 60 * 60 * 1000,
      initialData: seededDistricts,
    })
  );

  const aimags = aimagsData || [];
  const districts = districtsData || [];

  // Извлекаем значения для стабильных зависимостей
  const valueAimagId = value?.aimagId;
  const valueDistrictId = value?.districtId;

  // Ref для отслеживания первой инициализации
  const mountedRef = React.useRef(false);

  // Определяем режим работы: controlled (value передан) или uncontrolled (localStorage)
  const isControlled = value !== undefined;

  // Initialize on mount - runs only once
  React.useEffect(() => {
    if (mountedRef.current) return;
    if (aimags.length === 0) return;

    mountedRef.current = true;

    if (isControlled) {
      // Controlled mode - синхронизируем с value prop
      if (valueAimagId) {
        const aimag = aimags.find((a) => a.id === valueAimagId) || null;
        setSelectedAimag(aimag);
      }
    } else {
      // Uncontrolled mode - fallback на localStorage
      const stored = getStoredLocation();
      if (stored) {
        const aimag = aimags.find((a) => a.id === stored.aimagId) || null;
        setSelectedAimag(aimag);

        // One-time migration: users who picked a city before the
        // cookie existed still have their choice in localStorage but
        // the SSR grid doesn't see it. Hydrate the cookie on the
        // server so *every* route revalidates — not just the current
        // one. Without that, a refresh gets the fix for the page
        // they're on while sibling routes in the Client Router Cache
        // stay stale.
        //
        // Only runs in global mode and only when the cookie is
        // genuinely absent; we never overwrite a fresher choice from
        // another tab.
        if (scopesGlobalCookie && aimag?.code && !readAimagCookie()) {
          writeAimagCookie(aimag.code);
          void setSelectedAimagAction(aimag.code);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aimags.length]);

  // Sync aimag with controlled value (after initial mount)
  React.useEffect(() => {
    if (!mountedRef.current) return;
    if (!isControlled) return;

    if (valueAimagId) {
      const aimag = aimags.find((a) => a.id === valueAimagId) || null;
      if (aimag?.id !== selectedAimag?.id) {
        setSelectedAimag(aimag);
      }
    } else if (selectedAimag !== null) {
      setSelectedAimag(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueAimagId]);

  // Load district after aimag is selected
  React.useEffect(() => {
    if (districts.length === 0) return;

    if (isControlled) {
      // Controlled mode
      if (valueDistrictId) {
        const district = districts.find((d) => d.id === valueDistrictId) || null;
        if (district?.id !== selectedDistrict?.id) {
          setSelectedDistrict(district);
        }
      } else if (selectedDistrict !== null) {
        setSelectedDistrict(null);
      }
    } else if (mountedRef.current && !selectedDistrict) {
      // Uncontrolled mode - load from storage only once
      const stored = getStoredLocation();
      if (stored?.districtId) {
        const district = districts.find((d) => d.id === stored.districtId) || null;
        setSelectedDistrict(district);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueDistrictId, districts.length]);

  const filteredAimags = aimags.filter((aimag) =>
    aimag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAimagSelect = (aimag: aimags) => {
    setSelectedAimag(aimag);
    setSelectedDistrict(null);
    setShowAimagList(false);
  };

  // In global mode we call the server action, which both writes the
  // cookie and calls revalidatePath() for every aimag-sensitive
  // route. We also mirror the cookie into document.cookie so in-page
  // reads (like the one-time migration below, or components that
  // peek at the current aimag before the next SSR) see the fresh
  // value immediately instead of waiting for the action to land.
  //
  // Plain router.refresh() used to be enough when the user only cared
  // about the page they were on — but it doesn't bust the Client
  // Router Cache for sibling routes. So picking a city on /services
  // left a stale / in the router cache; navigating home showed the
  // pre-switch grid. revalidatePath() fixes that.
  //
  // In page-local mode we stay silent — the hosting page drives its
  // own grid via onSelect.
  const applyGlobalCookieChange = React.useCallback(
    (code: string) => {
      if (!scopesGlobalCookie) return;
      writeAimagCookie(code);
      void setSelectedAimagAction(code);
    },
    [scopesGlobalCookie]
  );

  const handleDistrictSelect = (district: districts) => {
    setSelectedDistrict(district);
    const location: StoredLocation = {
      aimagId: selectedAimag?.id || "",
      aimagName: selectedAimag?.name || "",
      districtId: district.id,
      districtName: district.name,
    };
    storeLocation(location);
    if (selectedAimag?.code) applyGlobalCookieChange(selectedAimag.code);
    onSelect?.(location.aimagId, location.aimagName, location.districtId, location.districtName);
    setOpen(false);
  };

  const handleSelectWholeAimag = () => {
    if (selectedAimag) {
      const location: StoredLocation = {
        aimagId: selectedAimag.id,
        aimagName: selectedAimag.name,
        districtId: "",
        districtName: "",
      };
      storeLocation(location);
      applyGlobalCookieChange(selectedAimag.code);
      onSelect?.(location.aimagId, location.aimagName, "", "");
      setOpen(false);
    }
  };

  const handleReset = () => {
    setSelectedAimag(null);
    setSelectedDistrict(null);
    setSearchQuery("");
    setShowAimagList(true);
    clearStoredLocation();
    // "Reset" in global mode = "show me everything on every page".
    // In page-local mode it just unsets the filter on the host page.
    applyGlobalCookieChange(ALL_AIMAGS_CODE);
    onSelect?.("", "", "", "");
  };

  const handleChangeAimag = () => {
    setShowAimagList(true);
    setSearchQuery("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (selectedAimag) {
        setShowAimagList(false);
      } else {
        setShowAimagList(true);
      }
    }
  };

  const displayText = selectedDistrict
    ? `${selectedAimag?.name}, ${selectedDistrict.name}`
    : selectedAimag
      ? selectedAimag.name
      : "Бүх хот";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {typeof trigger === "function" ? (
          trigger(displayText)
        ) : trigger ? (
          trigger
        ) : (
          <Button variant="outline" className="min-w-44 justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate max-w-32">{displayText}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Аймаг эсвэл хот</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search - only show when aimag list is visible */}
          {showAimagList && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Аймаг хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Reset button */}
          {(selectedAimag || selectedDistrict) && showAimagList && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
              Бүгдийг сонгох
            </Button>
          )}

          {/* Loading state */}
          {isLoadingAimags && showAimagList && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Aimags list */}
          {showAimagList && !isLoadingAimags && (
            <div className="max-h-72 overflow-y-auto space-y-1">
              <p className="text-sm font-medium text-muted-foreground px-2 py-1">Аймаг, хотууд</p>
              {filteredAimags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Аймаг олдсонгүй</p>
              ) : (
                filteredAimags.map((aimag) => (
                  <button
                    key={aimag.id}
                    onClick={() => handleAimagSelect(aimag)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between transition-colors ${
                      selectedAimag?.id === aimag.id ? "bg-accent" : ""
                    }`}
                  >
                    <span>{aimag.name}</span>
                    {selectedAimag?.id === aimag.id ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected aimag header with change button */}
          {selectedAimag && !showAimagList && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{selectedAimag.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleChangeAimag}>
                  Өөрчлөх
                </Button>
              </div>

              {/* Loading districts */}
              {isLoadingDistricts && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Districts list */}
              {!isLoadingDistricts && districts.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  <p className="text-sm font-medium text-muted-foreground px-2 py-1">
                    Дүүрэг / Сум
                  </p>
                  {districts.map((district) => (
                    <button
                      key={district.id}
                      onClick={() => handleDistrictSelect(district)}
                      className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between transition-colors ${
                        selectedDistrict?.id === district.id ? "bg-accent" : ""
                      }`}
                    >
                      <span>{district.name}</span>
                      {selectedDistrict?.id === district.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* No districts message */}
              {!isLoadingDistricts && districts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Дүүрэг/сум олдсонгүй
                </p>
              )}

              {/* Confirm button - select whole aimag */}
              <Button onClick={handleSelectWholeAimag} variant="outline" className="w-full">
                Бүх {selectedAimag.name} сонгох
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
