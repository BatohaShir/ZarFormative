"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  useFindManyuser_favorites,
  useCreateuser_favorites,
  useDeleteuser_favorites,
} from "@/lib/hooks/user-favorites";
import type { listings, categories, aimags, listings_images, profiles } from "@prisma/client";

const FAVORITES_STORAGE_KEY = "favorites_guest";

// Тип для избранного с данными объявления
export interface FavoriteWithListing {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: Date;
  listing: listings & {
    category: categories;
    aimag: aimags | null;
    images: listings_images[];
    user: Pick<profiles, "id" | "first_name" | "last_name" | "avatar_url">;
  };
}

interface FavoritesContextType {
  favorites: FavoriteWithListing[];
  favoriteListingIds: Set<string>;
  isLoading: boolean;
  toggleFavorite: (listingId: string) => void; // Изменено: не возвращает Promise
  isFavorite: (listingId: string) => boolean;
  count: number;
  isToggling: boolean;
}

const FavoritesContext = React.createContext<FavoritesContextType | undefined>(
  undefined
);

// Получить гостевые избранные из localStorage
function getGuestFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Сохранить гостевые избранные в localStorage
function setGuestFavorites(favorites: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Локальное состояние для гостей
  const [guestFavorites, setGuestFavoritesState] = React.useState<Set<string>>(new Set());

  // Optimistic state - мгновенное обновление UI
  const [optimisticIds, setOptimisticIds] = React.useState<Set<string>>(new Set());

  // Инициализация гостевых избранных из localStorage
  React.useEffect(() => {
    if (!isAuthenticated) {
      setGuestFavoritesState(new Set(getGuestFavorites()));
    }
  }, [isAuthenticated]);

  // Загрузка избранных из БД (только для авторизованных)
  // ОПТИМИЗИРОВАНО: select только нужных полей для уменьшения payload (~40% меньше данных)
  const {
    data: dbFavorites = [],
    isLoading,
  } = useFindManyuser_favorites(
    {
      where: {
        user_id: user?.id,
      },
      select: {
        id: true,
        listing_id: true,
        user_id: true,
        created_at: true,
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            price: true,
            currency: true,
            is_negotiable: true,
            views_count: true,
            favorites_count: true,
            category: {
              select: { id: true, name: true, slug: true },
            },
            aimag: {
              select: { id: true, name: true },
            },
            images: {
              where: { is_cover: true },
              take: 1,
              select: { id: true, url: true },
            },
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    },
    {
      enabled: isAuthenticated && !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 30 * 60 * 1000, // 30 минут в кэше
    }
  );

  // Синхронизируем optimisticIds с данными из БД
  React.useEffect(() => {
    if (dbFavorites && isAuthenticated) {
      setOptimisticIds(new Set((dbFavorites as FavoriteWithListing[]).map((f) => f.listing_id)));
    }
  }, [dbFavorites, isAuthenticated]);

  // Мутации - фоновая синхронизация
  const createFavorite = useCreateuser_favorites({
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user_favorites"] });
    },
  });

  const deleteFavorite = useDeleteuser_favorites({
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user_favorites"] });
    },
  });

  // Set для O(1) проверки - комбинируем optimistic state
  const favoriteListingIds = React.useMemo(() => {
    if (!isAuthenticated) {
      return guestFavorites;
    }
    return optimisticIds;
  }, [isAuthenticated, guestFavorites, optimisticIds]);

  // Проверка - в избранном ли (O(1))
  const isFavorite = React.useCallback(
    (listingId: string): boolean => {
      return favoriteListingIds.has(listingId);
    },
    [favoriteListingIds]
  );

  // Добавить/удалить из избранного - МГНОВЕННО обновляет UI
  const toggleFavorite = React.useCallback(
    (listingId: string) => {
      if (!isAuthenticated || !user?.id) {
        // Для гостей сохраняем в localStorage - мгновенно
        setGuestFavoritesState((prev) => {
          const next = new Set(prev);
          if (next.has(listingId)) {
            next.delete(listingId);
          } else {
            next.add(listingId);
          }
          setGuestFavorites(Array.from(next));
          return next;
        });
        return;
      }

      // Optimistic update - мгновенно обновляем UI
      const isCurrentlyFavorite = optimisticIds.has(listingId);

      setOptimisticIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFavorite) {
          next.delete(listingId);
        } else {
          next.add(listingId);
        }
        return next;
      });

      // Фоновая синхронизация с сервером (без await)
      if (isCurrentlyFavorite) {
        // Удаляем - ищем в dbFavorites
        const existingFavorite = (dbFavorites as FavoriteWithListing[]).find(
          (f) => f.listing_id === listingId
        );
        if (existingFavorite) {
          deleteFavorite.mutate({
            where: { id: existingFavorite.id },
          });
        }
      } else {
        // Добавляем
        createFavorite.mutate({
          data: {
            user_id: user.id,
            listing_id: listingId,
          },
        });
      }
    },
    [isAuthenticated, user?.id, dbFavorites, optimisticIds, createFavorite, deleteFavorite]
  );

  // Количество избранных
  const count = favoriteListingIds.size;

  // Optimistic список избранных - фильтруем по optimisticIds для мгновенного удаления
  const optimisticFavorites = React.useMemo(() => {
    if (!isAuthenticated) return [];
    return (dbFavorites as FavoriteWithListing[]).filter(
      (f) => optimisticIds.has(f.listing_id)
    );
  }, [dbFavorites, optimisticIds, isAuthenticated]);

  const value = React.useMemo(
    () => ({
      favorites: optimisticFavorites,
      favoriteListingIds,
      isLoading: isAuthenticated ? isLoading : false,
      toggleFavorite,
      isFavorite,
      count,
      isToggling: createFavorite.isPending || deleteFavorite.isPending,
    }),
    [
      optimisticFavorites,
      favoriteListingIds,
      isLoading,
      isAuthenticated,
      toggleFavorite,
      isFavorite,
      count,
      createFavorite.isPending,
      deleteFavorite.isPending,
    ]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = React.useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
