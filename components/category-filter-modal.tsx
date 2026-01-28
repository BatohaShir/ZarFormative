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
import { useFindManycategories } from "@/lib/hooks/categories";
import {
  isImageIcon,
  buildCategoryTree,
  getChildCategories,
  fallbackCategories,
  type CategoryWithChildren,
  type Category,
} from "@/lib/categories";

interface CategoryFilterModalProps {
  trigger?: React.ReactNode;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export function CategoryFilterModal({
  trigger,
  selectedCategories,
  onCategoriesChange,
}: CategoryFilterModalProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tempSelectedCategories, setTempSelectedCategories] = React.useState<string[]>(selectedCategories);
  const [expandedCategory, setExpandedCategory] = React.useState<CategoryWithChildren | Category | null>(null);

  // Загружаем категории из БД (кэш 1 час - относительно редко меняются)
  // OPTIMIZATION: Добавлен лимит для предотвращения загрузки слишком большого количества
  const { data: fetchedCategories } = useFindManycategories(
    {
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      take: 100, // OPTIMIZATION: Лимит на категории
    },
    {
      staleTime: 60 * 60 * 1000, // 1 час
      gcTime: 2 * 60 * 60 * 1000, // 2 часа
    }
  );

  const allCategoriesFlat = fetchedCategories || [];
  const categoryTree = fetchedCategories ? buildCategoryTree(fetchedCategories) : [];

  // Если БД пустая, используем fallback
  const rootCategories: (CategoryWithChildren | Category)[] =
    categoryTree.length > 0 ? categoryTree : fallbackCategories;

  // Получить дочерние категории
  const getChildren = React.useCallback(
    (parentId: string): (CategoryWithChildren | Category)[] => {
      const parent = categoryTree.find((c) => c.id === parentId) as CategoryWithChildren | undefined;
      if (parent?.children && parent.children.length > 0) {
        return parent.children;
      }
      return getChildCategories(allCategoriesFlat, parentId);
    },
    [categoryTree, allCategoriesFlat]
  );

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return rootCategories;
    const lowerQuery = searchQuery.toLowerCase();

    return rootCategories.filter((cat) => {
      if (cat.name.toLowerCase().includes(lowerQuery)) return true;
      const children = getChildren(cat.id);
      return children.some((child) => child.name.toLowerCase().includes(lowerQuery));
    });
  }, [searchQuery, rootCategories, getChildren]);

  const toggleCategory = (categorySlug: string) => {
    if (tempSelectedCategories.includes(categorySlug)) {
      setTempSelectedCategories(tempSelectedCategories.filter((c) => c !== categorySlug));
    } else {
      setTempSelectedCategories([...tempSelectedCategories, categorySlug]);
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

  const toggleSubcategory = (subcategorySlug: string) => {
    if (tempSelectedCategories.includes(subcategorySlug)) {
      setTempSelectedCategories(tempSelectedCategories.filter((c) => c !== subcategorySlug));
    } else {
      setTempSelectedCategories([...tempSelectedCategories, subcategorySlug]);
    }
  };

  const handleConfirm = () => {
    onCategoriesChange(tempSelectedCategories);
    setOpen(false);
  };

  const handleReset = () => {
    setTempSelectedCategories([]);
  };

  const expandedChildren = expandedCategory ? getChildren(expandedCategory.id) : [];

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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col overflow-x-hidden">
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

        <div className="flex-1 overflow-hidden overflow-x-hidden flex flex-col gap-4">
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
              <span className="text-muted-foreground">{tempSelectedCategories.length} сонгосон</span>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-auto p-0 text-primary">
                Бүгдийг арилгах
              </Button>
            </div>
          )}

          {!expandedCategory ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-2">
              {filteredCategories.map((category) => {
                const isSelected = tempSelectedCategories.includes(category.slug);
                const children = getChildren(category.id);
                const hasSubcategories = children.length > 0;
                return (
                  <div
                    key={category.id}
                    className={`flex items-center gap-2 p-3 rounded-lg transition-colors border ${
                      isSelected ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <label
                      htmlFor={`filter-cat-${category.id}`}
                      className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <Checkbox
                        id={`filter-cat-${category.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(category.slug)}
                      />
                      {isImageIcon(category.icon) ? (
                        <Image src={category.icon!} alt={category.name} width={24} height={24} className="shrink-0" />
                      ) : (
                        <span className="text-lg shrink-0">{category.icon || "📁"}</span>
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium truncate">{category.name}</p>
                        {hasSubcategories && (
                          <p className="text-xs text-muted-foreground truncate">
                            {children
                              .slice(0, 3)
                              .map((c) => c.name)
                              .join(", ")}
                            ...
                          </p>
                        )}
                      </div>
                    </label>
                    <button
                      onClick={() => hasSubcategories && setExpandedCategory(category)}
                      className={`shrink-0 p-2 rounded-lg transition-colors ${hasSubcategories ? "hover:bg-muted" : "invisible"}`}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-2">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-2">
                {isImageIcon(expandedCategory.icon) ? (
                  <Image src={expandedCategory.icon!} alt={expandedCategory.name} width={32} height={32} />
                ) : (
                  <span className="text-2xl">{expandedCategory.icon || "📁"}</span>
                )}
                <div>
                  <p className="font-medium">{expandedCategory.name}</p>
                  <p className="text-xs text-muted-foreground">{expandedChildren.length} дэд ангилал</p>
                </div>
              </div>
              {expandedChildren.map((sub) => {
                const isSubSelected = tempSelectedCategories.includes(sub.slug);
                return (
                  <label
                    key={sub.id}
                    htmlFor={`filter-sub-${sub.id}`}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                      isSubSelected ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      id={`filter-sub-${sub.id}`}
                      checked={isSubSelected}
                      onCheckedChange={() => toggleSubcategory(sub.slug)}
                    />
                    <span className="text-sm">{sub.name}</span>
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
          <Button onClick={handleConfirm}>Баталгаажуулах ({tempSelectedCategories.length})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
