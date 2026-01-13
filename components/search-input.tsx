"use client";

import * as React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Search, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import Link from "next/link";

interface Service {
  id: number;
  title: string;
  description: string;
  price: string;
  image: string;
  provider?: string;
  providerAvatar?: string;
  rating?: number;
  successful?: number;
  failed?: number;
}

interface SearchInputProps {
  services: Service[];
  className?: string;
}

export const SearchInput = React.memo(function SearchInput({
  services,
  className,
}: SearchInputProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Мемоизированная фильтрация
  const results = React.useMemo(() => {
    if (query.trim().length === 0) return [];
    const lowerQuery = query.toLowerCase();
    return services.filter(
      (service) =>
        service.title.toLowerCase().includes(lowerQuery) ||
        service.description.toLowerCase().includes(lowerQuery)
    );
  }, [query, services]);

  // Открывать dropdown при наличии результатов
  React.useEffect(() => {
    setIsOpen(query.trim().length > 0 && results.length > 0);
  }, [query, results.length]);

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

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Танд юу хэрэгтэй вэ?"
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length > 0 && results.length > 0 && setIsOpen(true)}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              onClick={handleResultClick}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
            >
              <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 text-left flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm md:text-base">
                      {service.title}
                    </h4>
                    <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">
                      — {service.description}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground sm:hidden">
                    {service.description}
                  </p>
                </div>
                <p className="text-sm md:text-base font-bold text-primary whitespace-nowrap">
                  {service.price}
                </p>
                {service.provider && service.providerAvatar && (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={service.providerAvatar}
                        alt={service.provider}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {service.provider}
                    </span>
                    <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                      {service.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {service.rating}
                        </span>
                      )}
                      {service.successful !== undefined && (
                        <span className="flex items-center gap-0.5 text-green-500">
                          <ThumbsUp className="w-3 h-3" />
                          {service.successful}
                        </span>
                      )}
                      {service.failed !== undefined && (
                        <span className="flex items-center gap-0.5 text-red-500">
                          <ThumbsDown className="w-3 h-3" />
                          {service.failed}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {isOpen && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground text-sm">
          Хайлт олдсонгүй
        </div>
      )}
    </div>
  );
});
