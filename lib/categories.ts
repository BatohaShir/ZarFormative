import type { categories } from "@prisma/client";

// Тип категории из БД с дочерними категориями
export type CategoryWithChildren = categories & {
  children?: CategoryWithChildren[];
  parent?: categories | null;
};

// Тип для отображения категории (совместим со старым интерфейсом)
export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

// Утилита для проверки является ли иконка изображением
export const isImageIcon = (icon: string | null | undefined): boolean => {
  if (!icon) return false;
  return icon.startsWith("/") || icon.startsWith("http");
};

// Преобразование плоского списка категорий в иерархический
export function buildCategoryTree(categories: categories[]): CategoryWithChildren[] {
  const categoryMap = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // Сначала создаём Map всех категорий
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Затем строим дерево
  categories.forEach((cat) => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(category);
      category.parent = parent;
    } else {
      roots.push(category);
    }
  });

  // Сортируем по sort_order
  const sortCategories = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
    return cats
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => ({
        ...cat,
        children: cat.children ? sortCategories(cat.children) : [],
      }));
  };

  return sortCategories(roots);
}

// Получить только корневые категории (parent_id === null)
export function getRootCategories(categories: categories[]): categories[] {
  return categories
    .filter((cat) => cat.parent_id === null && cat.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

// Получить дочерние категории для родителя
export function getChildCategories(categories: categories[], parentId: string): categories[] {
  return categories
    .filter((cat) => cat.parent_id === parentId && cat.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

// Преобразовать CategoryWithChildren в старый формат Category с subcategories как строки
export function toCategoryWithSubcategories(
  category: CategoryWithChildren
): Category & { subcategories?: string[] } {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    parent_id: category.parent_id,
    sort_order: category.sort_order,
    is_active: category.is_active,
    children: category.children?.map((c) => toCategoryWithSubcategories(c)),
    subcategories: category.children?.map((c) => c.name),
  };
}

// ============================================
// Моковые данные для fallback (пока БД пустая)
// ============================================

export const fallbackCategories: Category[] = [
  {
    id: "transport",
    slug: "transport",
    name: "Тээвэрлэлт, хүргэлт",
    icon: "/icons/delivery-man.png",
    parent_id: null,
    sort_order: 0,
    is_active: true,
  },
  {
    id: "repair",
    slug: "repair",
    name: "Засвар, өнгөлгөө",
    icon: "/icons/artist.png",
    parent_id: null,
    sort_order: 1,
    is_active: true,
  },
  {
    id: "tech-repair",
    slug: "tech-repair",
    name: "Техник засвар",
    icon: "/icons/mechanic.png",
    parent_id: null,
    sort_order: 2,
    is_active: true,
  },
  {
    id: "cleaning",
    slug: "cleaning",
    name: "Цэвэрлэгээ",
    icon: "/icons/cleaning.png",
    parent_id: null,
    sort_order: 3,
    is_active: true,
  },
  {
    id: "beauty",
    slug: "beauty",
    name: "Гоо сайхан",
    icon: "💄",
    parent_id: null,
    sort_order: 4,
    is_active: true,
  },
  {
    id: "construction",
    slug: "construction",
    name: "Барилга",
    icon: "/icons/workers.png",
    parent_id: null,
    sort_order: 5,
    is_active: true,
  },
  {
    id: "education",
    slug: "education",
    name: "Сургалт, хичээл",
    icon: "/icons/teaching.png",
    parent_id: null,
    sort_order: 6,
    is_active: true,
  },
  {
    id: "it",
    slug: "it",
    name: "IT үйлчилгээ",
    icon: "/icons/laptop.png",
    parent_id: null,
    sort_order: 7,
    is_active: true,
  },
  {
    id: "health",
    slug: "health",
    name: "Эрүүл мэнд",
    icon: "🏥",
    parent_id: null,
    sort_order: 8,
    is_active: true,
  },
  {
    id: "auto",
    slug: "auto",
    name: "Авто үйлчилгээ",
    icon: "🚗",
    parent_id: null,
    sort_order: 9,
    is_active: true,
  },
];

// Для обратной совместимости (deprecated - будет удалено)
export const allCategories = fallbackCategories;
