"use client";

import * as React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Search, Eye } from "lucide-react";
import Link from "next/link";
import { useSearch } from "@/hooks/use-search";
import { formatListingPrice } from "@/lib/utils";

interface SearchInputProps {
  className?: string;
}

export const SearchInput = React.memo(function SearchInput({
  className,
}: SearchInputProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Оптимизированный debounce с useRef - один таймер вместо создания нового на каждое изменение
  React.useEffect(() => {
    // Очищаем предыдущий таймер
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Full-text поиск через API с tsvector
  const { data: searchData, isLoading } = useSearch({
    query: debouncedQuery,
    limit: 10,
    enabled: debouncedQuery.trim().length >= 2,
  });

  const results = searchData?.results || [];

  // Открывать dropdown при наличии результатов
  React.useEffect(() => {
    setIsOpen(query.trim().length >= 2);
  }, [query]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = React.useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const hasResults = results.length > 0;
  const showNoResults = !isLoading && debouncedQuery.trim().length >= 2 && !hasResults;

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Танд юу хэрэгтэй вэ?"
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Хайж байна...
            </div>
          )}

          {!isLoading && hasResults && results.map((listing) => {
            const imageUrl = listing.cover_image || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=300&fit=crop";
            const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);

            return (
              <Link
                key={listing.id}
                href={`/services/${listing.slug}`}
                onClick={handleResultClick}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
              >
                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={imageUrl}
                    alt={listing.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 text-left flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm md:text-base line-clamp-1">
                        {listing.title}
                      </h4>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden sm:inline">
                        {listing.category.name}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                      {listing.description}
                    </p>
                  </div>
                  <p className="text-sm md:text-base font-bold text-primary whitespace-nowrap">
                    {priceDisplay}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    {listing.user.avatar ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={listing.user.avatar}
                          alt={listing.user.name}
                          fill
                          sizes="32px"
                          unoptimized={listing.user.avatar.includes("dicebear")}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {listing.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {listing.user.name}
                    </span>
                    <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" />
                        {listing.views_count}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {showNoResults && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Хайлт олдсонгүй
            </div>
          )}

          {!isLoading && query.trim().length >= 2 && query.trim().length < 2 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Дор хаяж 2 тэмдэгт оруулна уу
            </div>
          )}
        </div>
      )}
    </div>
  );
});
