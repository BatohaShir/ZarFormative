"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CategoriesModal } from "@/components/categories-modal";
import { useFindManycategories } from "@/lib/hooks/categories";
import {
  isImageIcon,
  buildCategoryTree,
  fallbackCategories,
  type CategoryWithChildren,
} from "@/lib/categories";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoriesSection() {
  // Получаем все категории из БД (кэш 1 час)
  const { data: categoriesData, isLoading } = useFindManycategories(
    {
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    },
    {
      staleTime: 60 * 60 * 1000, // 1 час
      gcTime: 2 * 60 * 60 * 1000, // 2 часа
    }
  );

  // Строим иерархию и берём только корневые
  const categoryTree = categoriesData ? buildCategoryTree(categoriesData) : [];

  // Если БД пустая, используем fallback
  const rootCategories = categoryTree.length > 0 ? categoryTree : fallbackCategories;

  // Показываем первые 10 категорий на главной
  const mainCategories = rootCategories.slice(0, 10);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-4 md:py-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Ангилал</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 md:h-20 rounded-lg" />
          ))}
          <Skeleton className="col-span-2 sm:col-span-1 lg:col-span-2 h-14 md:h-20 rounded-lg" />
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-4 md:py-6">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Ангилал</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
        {mainCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/services?category=${encodeURIComponent(cat.slug)}`}
            className="flex items-center gap-2 md:gap-3 py-3 md:py-5 px-3 md:px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            {isImageIcon(cat.icon) ? (
              <Image
                src={cat.icon!}
                alt={cat.name}
                width={32}
                height={32}
                className="w-6 h-6 md:w-10 md:h-10"
              />
            ) : (
              <span className="text-xl md:text-3xl">{cat.icon || "📁"}</span>
            )}
            <span className="text-xs md:text-sm font-medium line-clamp-1">{cat.name}</span>
          </Link>
        ))}
        <CategoriesModal
          categories={rootCategories as CategoryWithChildren[]}
          allCategories={categoriesData || []}
          trigger={
            <button className="col-span-2 sm:col-span-1 lg:col-span-2 flex items-center justify-center gap-2 py-3 md:py-5 px-3 md:px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <span className="text-xs md:text-sm font-medium">Бүх ангилал</span>
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          }
        />
      </div>
    </section>
  );
}
