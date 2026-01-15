"use client";

import * as React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Search, Eye } from "lucide-react";
import Link from "next/link";
import { useFindManylistings } from "@/lib/hooks/listings";
import type { listings, profiles, categories, listings_images } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Тип объявления с включёнными связями для поиска
type ListingSearchResult = listings & {
  user: Pick<profiles, "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company">;
  category: Pick<categories, "id" | "name" | "slug">;
  images: Pick<listings_images, "id" | "url" | "sort_order">[];
};

interface SearchInputProps {
  className?: string;
}

// Форматирование цены
function formatPrice(price: Decimal | null, currency: string, isNegotiable: boolean): string {
  if (isNegotiable) return "Тохиролцоно";
  if (!price) return "Үнэгүй";

  const numPrice = Number(price);
  const formatted = new Intl.NumberFormat("mn-MN").format(numPrice);

  if (currency === "MNT") {
    return `${formatted}₮`;
  }
  return `$${formatted}`;
}

// Получить имя провайдера
function getProviderName(user: ListingSearchResult["user"]): string {
  if (user.is_company && user.company_name) {
    return user.company_name;
  }
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }
  return "Хэрэглэгч";
}

// Получить URL первого изображения
function getFirstImageUrl(images: ListingSearchResult["images"]): string {
  if (images.length === 0) {
    return "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=300&fit=crop";
  }
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0].url;
}

export const SearchInput = React.memo(function SearchInput({
  className,
}: SearchInputProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounce поискового запроса
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Поиск в БД
  const { data: results, isLoading } = useFindManylistings(
    {
      where: {
        status: "active",
        is_active: true,
        OR: [
          { title: { contains: debouncedQuery, mode: "insensitive" } },
          { description: { contains: debouncedQuery, mode: "insensitive" } },
        ],
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
          select: {
            id: true,
            url: true,
            sort_order: true,
          },
          orderBy: {
            sort_order: "asc",
          },
          take: 1,
        },
      },
      take: 10,
    },
    {
      enabled: debouncedQuery.trim().length >= 2,
    }
  );

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

  const searchResults = (results || []) as ListingSearchResult[];
  const hasResults = searchResults.length > 0;
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

          {!isLoading && hasResults && searchResults.map((listing) => {
            const providerName = getProviderName(listing.user);
            const imageUrl = getFirstImageUrl(listing.images);
            const priceDisplay = formatPrice(listing.price, listing.currency, listing.is_negotiable);

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
                    {listing.user.avatar_url ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={listing.user.avatar_url}
                          alt={providerName}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {providerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {providerName}
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
