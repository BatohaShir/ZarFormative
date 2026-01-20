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
  toggleFavorite: (listingId: string) => Promise<void>;
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

  // Инициализация гостевых избранных из localStorage
  React.useEffect(() => {
    if (!isAuthenticated) {
      setGuestFavoritesState(new Set(getGuestFavorites()));
    }
  }, [isAuthenticated]);

  // Загрузка избранных из БД (только для авторизованных)
  const {
    data: dbFavorites = [],
    isLoading,
  } = useFindManyuser_favorites(
    {
      where: {
        user_id: user?.id,
      },
      include: {
        listing: {
          include: {
            category: true,
            aimag: true,
            images: {
              where: { is_cover: true },
              take: 1,
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

  // Мутации с optimistic updates
  const createFavorite = useCreateuser_favorites({
    onSettled: () => {
      // Инвалидируем кэш для синхронизации
      queryClient.invalidateQueries({ queryKey: ["user_favorites"] });
    },
  });

  const deleteFavorite = useDeleteuser_favorites({
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user_favorites"] });
    },
  });

  // Set для O(1) проверки - для авторизованных
  const favoriteListingIds = React.useMemo(() => {
    if (!isAuthenticated) {
      return guestFavorites;
    }
    return new Set((dbFavorites as FavoriteWithListing[]).map((f) => f.listing_id));
  }, [isAuthenticated, dbFavorites, guestFavorites]);

  // Проверка - в избранном ли (O(1))
  const isFavorite = React.useCallback(
    (listingId: string): boolean => {
      return favoriteListingIds.has(listingId);
    },
    [favoriteListingIds]
  );

  // Добавить/удалить из избранного
  const toggleFavorite = React.useCallback(
    async (listingId: string) => {
      if (!isAuthenticated || !user?.id) {
        // Для гостей сохраняем в localStorage
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

      // Для авторизованных пользователей
      const existingFavorite = (dbFavorites as FavoriteWithListing[]).find(
        (f) => f.listing_id === listingId
      );

      if (existingFavorite) {
        // Удаляем
        await deleteFavorite.mutateAsync({
          where: { id: existingFavorite.id },
        });
      } else {
        // Добавляем
        await createFavorite.mutateAsync({
          data: {
            user_id: user.id,
            listing_id: listingId,
          },
        });
      }
    },
    [isAuthenticated, user?.id, dbFavorites, createFavorite, deleteFavorite]
  );

  // Количество избранных
  const count = favoriteListingIds.size;

  const value = React.useMemo(
    () => ({
      favorites: (dbFavorites as FavoriteWithListing[]) || [],
      favoriteListingIds,
      isLoading: isAuthenticated ? isLoading : false,
      toggleFavorite,
      isFavorite,
      count,
      isToggling: createFavorite.isPending || deleteFavorite.isPending,
    }),
    [
      dbFavorites,
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
