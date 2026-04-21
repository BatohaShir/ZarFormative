"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CitySelect } from "@/components/city-select";
import { cn } from "@/lib/utils";

const POPULAR_QUERIES = ["Сантехник", "Цэвэрлэгээ", "Засвар", "Тээвэр", "Цахилгаанчин", "IT"];
const LOCATION_KEY = "tsogts_selected_location";

export function HeroSearch() {
  const t = useTranslations("home");
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);

  const submit = React.useCallback(
    (q: string) => {
      const params = new URLSearchParams();
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      try {
        const stored = localStorage.getItem(LOCATION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as {
            aimagId?: string;
            districtId?: string;
          };
          if (parsed.aimagId) params.set("aimag", parsed.aimagId);
          if (parsed.districtId) params.set("district", parsed.districtId);
        }
      } catch {
        /* ignore */
      }
      const qs = params.toString();
      router.push(qs ? `/services?${qs}` : "/services");
    },
    [router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(query);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
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
          <Search className="h-5 w-5 text-muted-foreground shrink-0 group-focus-within:text-foreground transition-colors" />
          <input
            type="text"
            placeholder="Танд юу хэрэгтэй вэ?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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

      {/* Popular queries */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">{t("popularLabel")}</span>
        {POPULAR_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQuery(q)}
            className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-foreground hover:text-background transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
