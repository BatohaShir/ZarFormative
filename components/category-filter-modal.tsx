"use client";

import * as React from "react";
import Image from "next/image";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { allCategories, type Category } from "@/lib/categories";

interface CategoryFilterModalProps {
  trigger?: React.ReactNode;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

const isImageIcon = (icon: string) => icon.startsWith("/");

export function CategoryFilterModal({
  trigger,
  selectedCategories,
  onCategoriesChange,
}: CategoryFilterModalProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tempSelectedCategories, setTempSelectedCategories] = React.useState<string[]>(selectedCategories);
  const [expandedCategory, setExpandedCategory] = React.useState<Category | null>(null);

  const filteredCategories = allCategories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.subcategories?.some((sub) =>
        sub.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const toggleCategory = (categoryName: string) => {
    if (tempSelectedCategories.includes(categoryName)) {
      setTempSelectedCategories(tempSelectedCategories.filter((c) => c !== categoryName));
    } else {
      setTempSelectedCategories([...tempSelectedCategories, categoryName]);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTempSelectedCategories(selectedCategories);
      setSearchQuery("");
      setExpandedCategory(null);
    }
  };

  const toggleSubcategory = (subcategory: string) => {
    if (tempSelectedCategories.includes(subcategory)) {
      setTempSelectedCategories(tempSelectedCategories.filter((c) => c !== subcategory));
    } else {
      setTempSelectedCategories([...tempSelectedCategories, subcategory]);
    }
  };

  const handleConfirm = () => {
    onCategoriesChange(tempSelectedCategories);
    setOpen(false);
  };

  const handleReset = () => {
    setTempSelectedCategories([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-between">
            <span>Ангилал сонгох</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {expandedCategory && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpandedCategory(null)}
                className="h-8 w-8 -ml-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {expandedCategory ? expandedCategory.name : "Ангилал сонгох"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!expandedCategory && (
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ангилал хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {tempSelectedCategories.length > 0 && (
            <div className="flex items-center justify-between text-sm shrink-0">
              <span className="text-muted-foreground">
                {tempSelectedCategories.length} сонгосон
              </span>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-auto p-0 text-primary">
                Бүгдийг арилгах
              </Button>
            </div>
          )}

          {!expandedCategory ? (
            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
              {filteredCategories.map((category) => {
                const isSelected = tempSelectedCategories.includes(category.name);
                const hasSubcategories = category.subcategories && category.subcategories.length > 0;
                return (
                  <div
                    key={category.id}
                    className={`flex items-center p-3 rounded-lg transition-colors border ${
                      isSelected
                        ? "bg-primary/10 border-primary/30"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <label
                      htmlFor={`filter-cat-${category.id}`}
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                    >
                      <Checkbox
                        id={`filter-cat-${category.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(category.name)}
                      />
                      {isImageIcon(category.icon) ? (
                        <Image src={category.icon} alt={category.name} width={24} height={24} className="shrink-0" />
                      ) : (
                        <span className="text-lg shrink-0">{category.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{category.name}</p>
                        {category.subcategories && (
                          <p className="text-xs text-muted-foreground truncate">
                            {category.subcategories.slice(0, 3).join(", ")}...
                          </p>
                        )}
                      </div>
                    </label>
                    {hasSubcategories && (
                      <button
                        onClick={() => setExpandedCategory(category)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-2">
                {isImageIcon(expandedCategory.icon) ? (
                  <Image src={expandedCategory.icon} alt={expandedCategory.name} width={32} height={32} />
                ) : (
                  <span className="text-2xl">{expandedCategory.icon}</span>
                )}
                <div>
                  <p className="font-medium">{expandedCategory.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {expandedCategory.subcategories?.length || 0} дэд ангилал
                  </p>
                </div>
              </div>
              {expandedCategory.subcategories?.map((sub, index) => {
                const isSubSelected = tempSelectedCategories.includes(sub);
                return (
                  <label
                    key={index}
                    htmlFor={`filter-sub-${index}`}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                      isSubSelected
                        ? "bg-primary/10 border-primary/30"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      id={`filter-sub-${index}`}
                      checked={isSubSelected}
                      onCheckedChange={() => toggleSubcategory(sub)}
                    />
                    <span className="text-sm">{sub}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Болих
          </Button>
          <Button onClick={handleConfirm}>
            Баталгаажуулах ({tempSelectedCategories.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
