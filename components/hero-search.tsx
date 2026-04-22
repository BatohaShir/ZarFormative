"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { CitySelect } from "@/components/city-select";
import { useSearch } from "@/hooks/use-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatListingPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const POPULAR_QUERIES = ["Сантехник", "Цэвэрлэгээ", "Засвар", "Тээвэр", "Цахилгаанчин", "IT"];
const LOCATION_KEY = "tsogts_selected_location";
const DROPDOWN_LIMIT = 5;

export function HeroSearch() {
  const t = useTranslations("home");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 250ms debounce so fast typists ("Санте..." → "Сантехник") don't
  // fire a fetch per keystroke. Each hop to Seoul is ~2s uncached;
  // hitting 5 min edge cache is ~20ms on Vercel.
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  // Trigger the dropdown fetch only once the user has a meaningful
  // prefix (2+ chars) and the field is focused.
  const dropdownOpen = isFocused && debouncedQuery.length >= 2;
  const { data: searchData, isFetching } = useSearch({
    query: debouncedQuery,
    limit: DROPDOWN_LIMIT,
    enabled: dropdownOpen,
  });

  const results = searchData?.results ?? [];

  const locationParamsFromStorage = React.useCallback(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem(LOCATION_KEY);
      if (!stored) return "";
      const parsed = JSON.parse(stored) as { aimagId?: string; districtId?: string };
      const p = new URLSearchParams();
      if (parsed.aimagId) p.set("aimag", parsed.aimagId);
      if (parsed.districtId) p.set("district", parsed.districtId);
      return p.toString();
    } catch {
      return "";
    }
  }, []);

  const submit = React.useCallback(
    (q: string) => {
      const params = new URLSearchParams();
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      const loc = locationParamsFromStorage();
      if (loc) {
        const locParams = new URLSearchParams(loc);
        locParams.forEach((v, k) => params.set(k, v));
      }
      const qs = params.toString();
      router.push(qs ? `/services?${qs}` : "/services");
    },
    [router, locationParamsFromStorage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFocused(false);
    submit(query);
  };

  // Close the dropdown when the user clicks outside the container —
  // blur-only closure loses clicks on dropdown items (onMouseDown
  // would race the blur), so we track pointer events at the document.
  React.useEffect(() => {
    if (!isFocused) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isFocused]);

  // Prefetch hot popular queries when the user hovers the chip — by the
  // time they actually click, /api/search has already answered, and
  // the chip's result appears instantly from React Query cache.
  const prefetchPopular = React.useCallback(
    (q: string) => {
      queryClient.prefetchQuery({
        queryKey: ["search", q, DROPDOWN_LIMIT, 0],
        queryFn: async ({ signal }) => {
          const params = new URLSearchParams({
            q,
            limit: String(DROPDOWN_LIMIT),
            offset: "0",
          });
          const res = await fetch(`/api/search?${params}`, {
            credentials: "include",
            signal,
          });
          if (!res.ok) throw new Error("search prefetch failed");
          return res.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto relative">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative flex flex-col md:flex-row items-stretch bg-card rounded-2xl border border-border shadow-sm overflow-hidden",
          "transition-shadow duration-200",
          isFocused && "shadow-lg"
        )}
      >
        {/* Query input */}
        <label className="flex-1 flex items-center gap-3 px-5 py-4 min-w-0 group cursor-text">
          {isFetching && dropdownOpen ? (
            <Loader2 className="h-5 w-5 text-muted-foreground shrink-0 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground shrink-0 group-focus-within:text-foreground transition-colors" />
          )}
          <input
            type="text"
            placeholder="Танд юу хэрэгтэй вэ?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-muted-foreground"
          />
        </label>

        {/* Divider */}
        <div className="hidden md:block w-px bg-border my-2" />
        <div className="md:hidden h-px bg-border mx-5" />

        {/* City */}
        <div className="flex items-center px-2 py-2">
          <CitySelect
            trigger={(displayText) => (
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted transition-colors min-w-0"
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-sm md:text-base">{displayText}</span>
              </button>
            )}
          />
        </div>

        {/* CTA */}
        <button
          type="submit"
          className={cn(
            "flex items-center justify-center gap-2 bg-foreground text-background px-6 py-4 md:m-2 md:rounded-xl",
            "font-medium text-sm md:text-base hover:bg-foreground/90 active:scale-[0.98] transition-all"
          )}
          aria-label={t("searchCta")}
        >
          <span>{t("searchCta")}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Live results dropdown. Shown only while the field has focus
          AND a non-trivial query. Keeps old results visible during the
          next fetch thanks to placeholderData in useSearch, so the
          list doesn't blink to "no results" on every keystroke. */}
      {dropdownOpen && (results.length > 0 || !isFetching) && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-[70vh] overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/services/${r.slug}`}
                    onClick={() => setIsFocused(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      {r.cover_image ? (
                        <Image
                          src={r.cover_image}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.category.name}
                        {r.aimag ? ` · ${r.aimag}` : ""}
                      </div>
                    </div>
                    <div className="text-xs font-semibold whitespace-nowrap">
                      {formatListingPrice(r.price, r.currency, r.is_negotiable)}
                    </div>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setIsFocused(false);
                    submit(query);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors border-t border-border"
                >
                  <span>&ldquo;{query}&rdquo; бүх үр дүнг харах</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </li>
            </ul>
          ) : (
            <div className="px-4 py-5 text-sm text-muted-foreground text-center">
              Үр дүн олдсонгүй
            </div>
          )}
        </div>
      )}

      {/* Popular queries */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">{t("popularLabel")}</span>
        {POPULAR_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQuery(q)}
            onMouseEnter={() => prefetchPopular(q)}
            onFocus={() => prefetchPopular(q)}
            className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-foreground hover:text-background transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
