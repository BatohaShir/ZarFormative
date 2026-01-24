"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CategoryFilterModal } from "@/components/category-filter-modal";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";
import { X, Building2, User, ChevronDown } from "lucide-react";

export type ProviderType = "all" | "company" | "individual";

interface ServicesFiltersProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  onPriceRangeCommit: (range: [number, number]) => void;
  providerType: ProviderType;
  onProviderTypeChange: (type: ProviderType) => void;
  onReset: () => void;
  variant: "desktop" | "mobile";
}

/**
 * Единый компонент фильтров для Desktop и Mobile
 * - Desktop: вертикальная раскладка в сайдбаре
 * - Mobile: компактная раскладка в collapsible
 */
export const ServicesFilters = React.memo(function ServicesFilters({
  selectedCategories,
  onCategoriesChange,
  priceRange,
  onPriceRangeChange,
  onPriceRangeCommit,
  providerType,
  onProviderTypeChange,
  onReset,
  variant,
}: ServicesFiltersProps) {
  const isDesktop = variant === "desktop";

  // Memoize active filters count calculation
  const activeFiltersCount = React.useMemo(() => {
    return (
      selectedCategories.length +
      (priceRange[0] > 0 || priceRange[1] < 1000000 ? 1 : 0) +
      (providerType !== "all" ? 1 : 0)
    );
  }, [selectedCategories.length, priceRange, providerType]);

  return (
    <div className={isDesktop ? "space-y-6" : "space-y-5"}>
      {/* Categories */}
      <div>
        <h4 className={`font-medium ${isDesktop ? "mb-3" : "mb-2 text-sm"}`}>Ангилал</h4>
        <CategoryFilterModal
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          trigger={
            <Button
              variant="outline"
              className={`w-full justify-between ${isDesktop ? "" : "text-sm"}`}
            >
              <span>
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} ${isDesktop ? "ангилал сонгосон" : "сонгосон"}`
                  : "Ангилал сонгох"}
              </span>
              {isDesktop ? (
                <span className="text-muted-foreground">→</span>
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          }
        />
        {selectedCategories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedCategories.slice(0, isDesktop ? 3 : selectedCategories.length).map((cat) => (
              <span
                key={cat}
                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              >
                {cat}
              </span>
            ))}
            {isDesktop && selectedCategories.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{selectedCategories.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Provider Type */}
      <div>
        <h4 className={`font-medium ${isDesktop ? "mb-3" : "mb-2 text-sm"}`}>Нийлүүлэгч</h4>
        <RadioGroup
          value={providerType}
          onValueChange={(value) => onProviderTypeChange(value as ProviderType)}
          className={isDesktop ? "space-y-2" : "flex flex-wrap gap-4"}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id={`${variant}-provider-all`} />
            <Label
              htmlFor={`${variant}-provider-all`}
              className={`cursor-pointer ${isDesktop ? "flex items-center gap-2" : "text-sm"}`}
            >
              Бүгд
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="company" id={`${variant}-provider-company`} />
            <Label
              htmlFor={`${variant}-provider-company`}
              className={`cursor-pointer flex items-center gap-${isDesktop ? "2" : "1"} ${!isDesktop && "text-sm"}`}
            >
              <Building2 className={isDesktop ? "h-4 w-4" : "h-3.5 w-3.5"} />
              Компани
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="individual" id={`${variant}-provider-individual`} />
            <Label
              htmlFor={`${variant}-provider-individual`}
              className={`cursor-pointer flex items-center gap-${isDesktop ? "2" : "1"} ${!isDesktop && "text-sm"}`}
            >
              <User className={isDesktop ? "h-4 w-4" : "h-3.5 w-3.5"} />
              Хувь хүн
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Price Range - используем onValueCommit чтобы не спамить запросами */}
      <div>
        <h4 className={`font-medium ${isDesktop ? "mb-3" : "mb-2 text-sm"}`}>Үнэ</h4>
        <div className={isDesktop ? "px-1" : ""}>
          <Slider
            value={priceRange}
            onValueChange={(value) => onPriceRangeChange(value as [number, number])}
            onValueCommit={(value) => onPriceRangeCommit(value as [number, number])}
            max={1000000}
            min={0}
            step={10000}
            className="mb-2"
          />
          <div className={`flex items-center justify-between text-muted-foreground ${isDesktop ? "text-sm" : "text-xs"}`}>
            <span>{formatPrice(priceRange[0])}₮</span>
            <span>{formatPrice(priceRange[1])}₮</span>
          </div>
        </div>
      </div>

      {/* Reset button */}
      {isDesktop ? (
        <Button variant="outline" className="w-full" onClick={onReset}>
          <X className="w-4 h-4 mr-2" />
          Шүүлтүүр цэвэрлэх
        </Button>
      ) : (
        activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={onReset}>
            <X className="w-4 h-4 mr-2" />
            Цэвэрлэх
          </Button>
        )
      )}
    </div>
  );
});
