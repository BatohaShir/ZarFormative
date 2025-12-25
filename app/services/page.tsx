"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { MessagesButton } from "@/components/messages-button";
import { ServiceCard } from "@/components/service-card";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
import { CategoryFilterModal } from "@/components/category-filter-modal";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft,
  SlidersHorizontal,
  X,
  Star,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const allServices = [
  {
    id: 1,
    title: "Орон сууцны засвар",
    description: "Мэргэжлийн баг, чанартай ажил",
    price: "50,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Болд Констракшн",
    providerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    rating: 4.8,
    likes: 892,
    successful: 245,
    failed: 3,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=300&h=300&fit=crop",
  },
  {
    id: 2,
    title: "Гэрийн цэвэрлэгээ",
    description: "Өдөр бүр, долоо хоног бүр",
    price: "30,000₮-с",
    category: "Цэвэрлэгээ",
    city: "Улаанбаатар",
    provider: "Цэвэр Гэр ХХК",
    providerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    rating: 4.9,
    likes: 654,
    successful: 178,
    failed: 2,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Компьютер засвар",
    description: "Бүх төрлийн техник засвар",
    price: "20,000₮-с",
    category: "Техник",
    city: "Дархан",
    provider: "ТехМастер",
    providerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    rating: 4.7,
    likes: 1203,
    successful: 412,
    failed: 8,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&h=300&fit=crop",
  },
  {
    id: 4,
    title: "Англи хэлний хичээл",
    description: "Туршлагатай багш, онлайн/офлайн",
    price: "40,000₮/цаг",
    category: "Сургалт",
    city: "Улаанбаатар",
    provider: "Сараа багш",
    providerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    rating: 5.0,
    likes: 1567,
    successful: 320,
    failed: 0,
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&h=300&fit=crop",
  },
  {
    id: 5,
    title: "Ачаа тээвэр",
    description: "Хот доторх болон хот хоорондын",
    price: "80,000₮-с",
    category: "Тээвэр",
    city: "Улаанбаатар",
    provider: "Хурд Логистик",
    providerAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
    rating: 4.6,
    likes: 2341,
    successful: 856,
    failed: 12,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&h=300&fit=crop",
  },
  {
    id: 6,
    title: "Гоо сайхны үйлчилгээ",
    description: "Үс засалт, гоо сайхан",
    price: "15,000₮-с",
    category: "Гоо сайхан",
    city: "Эрдэнэт",
    provider: "Гоо Студио",
    providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    rating: 4.9,
    likes: 1876,
    successful: 534,
    failed: 4,
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=300&fit=crop",
  },
  {
    id: 7,
    title: "Веб хөгжүүлэлт",
    description: "Вебсайт, апп хөгжүүлэлт",
    price: "500,000₮-с",
    category: "IT",
    city: "Улаанбаатар",
    provider: "КодМастер ХХК",
    providerAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
    rating: 4.8,
    likes: 456,
    successful: 89,
    failed: 2,
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300&h=300&fit=crop",
  },
  {
    id: 8,
    title: "Авто засвар",
    description: "Бүх төрлийн авто засвар",
    price: "30,000₮-с",
    category: "Авто",
    city: "Улаанбаатар",
    provider: "АвтоПро Сервис",
    providerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    rating: 4.7,
    likes: 1432,
    successful: 623,
    failed: 9,
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=300&h=300&fit=crop",
  },
  {
    id: 9,
    title: "Цахилгааны ажил",
    description: "Цахилгаан угсралт, засвар",
    price: "25,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Электрик Про",
    providerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    rating: 4.6,
    likes: 678,
    successful: 234,
    failed: 5,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&h=300&fit=crop",
  },
  {
    id: 10,
    title: "Сантехникийн ажил",
    description: "Ус, дулааны шугам засвар",
    price: "35,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Усны Мастер",
    providerAvatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop",
    rating: 4.5,
    likes: 543,
    successful: 189,
    failed: 7,
    image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&h=300&fit=crop",
  },
  {
    id: 11,
    title: "Гэрийн тавилга угсралт",
    description: "Тавилга угсрах, задлах",
    price: "20,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Тавилга Мастер",
    providerAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop",
    rating: 4.8,
    likes: 432,
    successful: 156,
    failed: 2,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop",
  },
  {
    id: 12,
    title: "Зураг авалт",
    description: "Мэргэжлийн гэрэл зураг",
    price: "100,000₮-с",
    category: "Урлаг",
    city: "Улаанбаатар",
    provider: "Фото Студио",
    providerAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop",
    rating: 4.9,
    likes: 987,
    successful: 345,
    failed: 1,
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&h=300&fit=crop",
  },
];

type SortOption = "popular" | "rating" | "price_asc" | "price_desc" | "newest";
type ExperienceLevel = "any" | "beginner" | "experienced" | "top";

const experienceLevels = [
  { id: "beginner", label: "Шинэ (0-50)", min: 0, max: 50 },
  { id: "experienced", label: "Туршлагатай (50-200)", min: 50, max: 200 },
  { id: "top", label: "Топ (200+)", min: 200, max: Infinity },
];

// Desktop Sidebar Filters Component
function FiltersContent({
  selectedCategories,
  setSelectedCategories,
  priceRange,
  setPriceRange,
  minRating,
  setMinRating,
  experienceLevel,
  setExperienceLevel,
  onReset,
}: {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  minRating: number;
  setMinRating: (rating: number) => void;
  experienceLevel: ExperienceLevel;
  setExperienceLevel: (level: ExperienceLevel) => void;
  onReset: () => void;
}) {
  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}сая`;
    }
    return `${(value / 1000).toFixed(0)}мян`;
  };

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

      {/* Rating */}
      <div>
        <h4 className="font-medium mb-3">Хамгийн багадаа үнэлгээ</h4>
        <div className="px-1">
          <Slider
            value={[minRating]}
            onValueChange={(value) => setMinRating(value[0])}
            max={5}
            min={0}
            step={0.5}
            className="mb-2"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>0</span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {minRating}+
            </span>
            <span>5</span>
          </div>
        </div>
      </div>

      {/* Experience Level */}
      <div>
        <h4 className="font-medium mb-3">Туршлага</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exp-any"
              checked={experienceLevel === "any"}
              onCheckedChange={() => setExperienceLevel("any")}
            />
            <Label htmlFor="exp-any" className="text-sm cursor-pointer">
              Бүгд
            </Label>
          </div>
          {experienceLevels.map((level) => (
            <div key={level.id} className="flex items-center space-x-2">
              <Checkbox
                id={`exp-${level.id}`}
                checked={experienceLevel === level.id}
                onCheckedChange={() => setExperienceLevel(level.id as ExperienceLevel)}
              />
              <Label htmlFor={`exp-${level.id}`} className="text-sm cursor-pointer">
                {level.label}
              </Label>
            </div>
          ))}
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

// Helper to parse price from string like "50,000₮-с" to number
const parsePrice = (priceStr: string): number => {
  const match = priceStr.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ""), 10);
  }
  return 0;
};

function ServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial values from URL
  const initialCategories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const initialPriceMin = parseInt(searchParams.get("priceMin") || "0", 10);
  const initialPriceMax = parseInt(searchParams.get("priceMax") || "1000000", 10);
  const initialRating = parseFloat(searchParams.get("rating") || "0");
  const initialExperience = (searchParams.get("experience") as ExperienceLevel) || "any";
  const initialSort = (searchParams.get("sort") as SortOption) || "popular";

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(initialCategories);
  const [priceRange, setPriceRange] = React.useState<[number, number]>([initialPriceMin, initialPriceMax]);
  const [minRating, setMinRating] = React.useState(initialRating);
  const [experienceLevel, setExperienceLevel] = React.useState<ExperienceLevel>(initialExperience);
  const [sortBy, setSortBy] = React.useState<SortOption>(initialSort);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

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
    if (minRating > 0) {
      params.set("rating", minRating.toString());
    }
    if (experienceLevel !== "any") {
      params.set("experience", experienceLevel);
    }
    if (sortBy !== "popular") {
      params.set("sort", sortBy);
    }

    const queryString = params.toString();
    router.replace(queryString ? `/services?${queryString}` : "/services", { scroll: false });
  }, [selectedCategories, priceRange, minRating, experienceLevel, sortBy, router]);

  React.useEffect(() => {
    updateURL();
  }, [updateURL]);

  const filteredServices = allServices.filter((service) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(service.category)) {
      return false;
    }
    if (service.rating < minRating) {
      return false;
    }
    const servicePrice = parsePrice(service.price);
    if (servicePrice < priceRange[0] || servicePrice > priceRange[1]) {
      return false;
    }
    if (experienceLevel !== "any") {
      const level = experienceLevels.find((l) => l.id === experienceLevel);
      if (level) {
        if (service.successful < level.min || service.successful >= level.max) {
          return false;
        }
      }
    }
    return true;
  });

  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating;
      case "price_asc":
        return parsePrice(a.price) - parsePrice(b.price);
      case "price_desc":
        return parsePrice(b.price) - parsePrice(a.price);
      case "newest":
        return b.id - a.id;
      case "popular":
      default:
        return b.likes - a.likes;
    }
  });

  const resetFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 1000000]);
    setMinRating(0);
    setExperienceLevel("any");
    setSortBy("popular");
  };

  const activeFiltersCount =
    selectedCategories.length +
    (priceRange[0] > 0 || priceRange[1] < 1000000 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (experienceLevel !== "any" ? 1 : 0);

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}сая`;
    }
    return `${(value / 1000).toFixed(0)}мян`;
  };

  return (
    <div className="min-h-screen bg-background">
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
          <nav className="hidden md:flex items-center gap-4">
            <MessagesButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <MessagesButton className="h-9 w-9" />
            <FavoritesButton className="h-9 w-9" />
            <ThemeToggle />
            <AuthModal />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Page Title */}
        <h2 className="text-xl md:text-2xl font-bold mb-4">Бүх үйлчилгээ</h2>

        {/* Desktop Search & City */}
        <div className="hidden md:flex w-full gap-2 mb-6">
          <SearchInput services={allServices} className="flex-1" />
          <CitySelect />
        </div>

        {/* Mobile: Search, City (full width), Collapsible Filters */}
        <div className="md:hidden space-y-3 mb-4">
          {/* Search */}
          <SearchInput services={allServices} />

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

                {/* Rating */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Үнэлгээ</h4>
                  <Slider
                    value={[minRating]}
                    onValueChange={(value) => setMinRating(value[0])}
                    max={5}
                    min={0}
                    step={0.5}
                    className="mb-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {minRating}+
                    </span>
                    <span>5</span>
                  </div>
                </div>

                {/* Experience Level */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Туршлага</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={experienceLevel === "any" ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setExperienceLevel("any")}
                    >
                      Бүгд
                    </Button>
                    {experienceLevels.map((level) => (
                      <Button
                        key={level.id}
                        variant={experienceLevel === level.id ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setExperienceLevel(level.id as ExperienceLevel)}
                      >
                        {level.label}
                      </Button>
                    ))}
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
                minRating={minRating}
                setMinRating={setMinRating}
                experienceLevel={experienceLevel}
                setExperienceLevel={setExperienceLevel}
                onReset={resetFilters}
              />
            </div>
          </aside>

          {/* Services Grid */}
          <div className="flex-1">
            {/* Results header with sort */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {sortedServices.length} үйлчилгээ
              </p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-36 md:w-44">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Эрэмбэлэх" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Эрэлттэй</SelectItem>
                  <SelectItem value="rating">Үнэлгээгээр</SelectItem>
                  <SelectItem value="price_asc">Үнэ ↑</SelectItem>
                  <SelectItem value="price_desc">Үнэ ↓</SelectItem>
                  <SelectItem value="newest">Шинэ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sortedServices.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {sortedServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Үйлчилгээ олдсонгүй</p>
                <Button variant="outline" onClick={resetFilters}>
                  Шүүлтүүр цэвэрлэх
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-6 md:mt-8">
        <div className="container mx-auto px-4 py-6 md:py-8 text-center text-muted-foreground">
          <p className="text-xs md:text-sm">&copy; 2025 Uilchilgee.mn. Бүх эрх хуулиар хамгаалагдсан.</p>
        </div>
      </footer>
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
