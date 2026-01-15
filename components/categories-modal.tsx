"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { categories } from "@prisma/client";

interface CategoriesModalProps {
  onSelectCategory?: (category: CategoryWithChildren | Category) => void;
  onSelectSubcategory?: (category: CategoryWithChildren | Category, subcategory: CategoryWithChildren | Category) => void;
  trigger?: React.ReactNode;
  // Данные можно передать извне или загрузить внутри
  categories?: CategoryWithChildren[];
  allCategories?: categories[];
}

export function CategoriesModal({
  onSelectCategory,
  onSelectSubcategory,
  trigger,
  categories: propCategories,
  allCategories: propAllCategories,
}: CategoriesModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryWithChildren | Category | null>(null);

  // Если данные не переданы, загружаем из БД
  const { data: fetchedCategories } = useFindManycategories(
    {
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    },
    {
      enabled: !propCategories && !propAllCategories,
    }
  );

  const allCategoriesFlat = propAllCategories || fetchedCategories || [];
  const categoryTree = propCategories || (fetchedCategories ? buildCategoryTree(fetchedCategories) : []);

  // Если БД пустая, используем fallback
  const rootCategories: (CategoryWithChildren | Category)[] =
    categoryTree.length > 0 ? categoryTree : fallbackCategories;

  // Получить дочерние категории
  const getChildren = React.useCallback(
    (parentId: string): (CategoryWithChildren | Category)[] => {
      // Сначала проверяем в дереве
      const parent = categoryTree.find((c) => c.id === parentId) as CategoryWithChildren | undefined;
      if (parent?.children && parent.children.length > 0) {
        return parent.children;
      }
      // Иначе ищем в плоском списке
      return getChildCategories(allCategoriesFlat, parentId);
    },
    [categoryTree, allCategoriesFlat]
  );

  // Мемоизированная фильтрация категорий
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return rootCategories;
    const lowerQuery = searchQuery.toLowerCase();

    return rootCategories.filter((cat) => {
      // Поиск по имени категории
      if (cat.name.toLowerCase().includes(lowerQuery)) return true;

      // Поиск по дочерним категориям
      const children = getChildren(cat.id);
      return children.some((child) => child.name.toLowerCase().includes(lowerQuery));
    });
  }, [searchQuery, rootCategories, getChildren]);

  const handleSelectCategory = React.useCallback((category: CategoryWithChildren | Category) => {
    setSelectedCategory(category);
  }, []);

  const handleSelectSubcategory = React.useCallback(
    (subcategory: CategoryWithChildren | Category) => {
      if (selectedCategory) {
        if (onSelectSubcategory) {
          onSelectSubcategory(selectedCategory, subcategory);
        } else {
          router.push(`/services?category=${encodeURIComponent(subcategory.slug)}`);
        }
        setOpen(false);
        setSelectedCategory(null);
      }
    },
    [selectedCategory, onSelectSubcategory, router]
  );

  const handleSelectWholeCategory = React.useCallback(() => {
    if (selectedCategory) {
      if (onSelectCategory) {
        onSelectCategory(selectedCategory);
      } else {
        router.push(`/services?category=${encodeURIComponent(selectedCategory.slug)}`);
      }
      setOpen(false);
      setSelectedCategory(null);
    }
  }, [selectedCategory, onSelectCategory, router]);

  const handleBack = React.useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedCategory(null);
      setSearchQuery("");
    }
  }, []);

  // Получаем дочерние для выбранной категории
  const selectedChildren = selectedCategory ? getChildren(selectedCategory.id) : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || <Button variant="outline">Бүх ангилал</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedCategory && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedCategory ? selectedCategory.name : "Бүх ангилал"}
          </DialogTitle>
        </DialogHeader>

        {!selectedCategory ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ангилал хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-2">
              {filteredCategories.map((category) => {
                const children = getChildren(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    {isImageIcon(category.icon) ? (
                      <Image src={category.icon!} alt={category.name} width={32} height={32} />
                    ) : (
                      <span className="text-2xl">{category.icon || "📁"}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{category.name}</p>
                      {children.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {children
                            .slice(0, 2)
                            .map((c) => c.name)
                            .join(", ")}
                          ...
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {isImageIcon(selectedCategory.icon) ? (
                <Image src={selectedCategory.icon!} alt={selectedCategory.name} width={40} height={40} />
              ) : (
                <span className="text-3xl">{selectedCategory.icon || "📁"}</span>
              )}
              <div>
                <p className="font-medium">{selectedCategory.name}</p>
                <p className="text-xs text-muted-foreground">{selectedChildren.length} дэд ангилал</p>
              </div>
            </div>

            {selectedChildren.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-2">
                {selectedChildren.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubcategory(sub)}
                    className="p-3 rounded-lg hover:bg-accent transition-colors text-left text-sm"
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Дэд ангилал байхгүй</p>
            )}

            <Button variant="outline" className="w-full" onClick={handleSelectWholeCategory}>
              Бүх {selectedCategory.name} харах
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
