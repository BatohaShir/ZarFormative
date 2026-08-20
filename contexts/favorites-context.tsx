"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { orpc } from "@/lib/orpc/client";
import { CACHE_TIMES } from "@/lib/react-query-config";
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
    user: Pick<profiles, "id" | "first_name" | "last_name" | "avatar_url" | "is_verified">;
  };
}

// ========== РАЗДЕЛЁННЫЕ КОНТЕКСТЫ ==========
// Разделяем на 3 контекста чтобы уменьшить re-renders:
// 1. FavoritesIdsContext - для проверки isFavorite (используется в каждой карточке)
// 2. FavoritesActionsContext - для toggleFavorite (стабильная ссылка)
// 3. FavoritesDataContext - для полного списка избранного (используется только на странице избранного)

// Контекст 1: Только IDs для быстрой проверки (O(1))
interface FavoritesIdsContextType {
  favoriteListingIds: Set<string>;
  isFavorite: (listingId: string) => boolean;
  count: number;
}

/**
 * Snapshot of the listing a card already knows about. Passing this to
 * toggleFavorite lets us optimistically insert a row into the cached
 * favorites list, so the user sees the new card on /favorites before
 * the server round-trip settles. If omitted, the header count still
 * updates instantly (via optimisticIds) but the /favorites grid waits
 * for the background refetch to discover the new row.
 */
export interface ListingSnapshot {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | string | null;
  currency: string;
  is_negotiable: boolean;
  views_count: number;
  favorites_count: number;
  category?: { id: string; name: string; slug: string } | null;
  aimag?: { id: string; name: string } | null;
  images?: { id: string; url: string }[];
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

// Контекст 2: Действия (мутации)
interface FavoritesActionsContextType {
  toggleFavorite: (listingId: string, listingSnapshot?: ListingSnapshot) => void;
  isToggling: boolean;
}

// Контекст 3: Полные данные избранных (для страницы /favorites)
interface FavoritesDataContextType {
  favorites: FavoriteWithListing[];
  isLoading: boolean;
}

const FavoritesIdsContext = React.createContext<FavoritesIdsContextType | undefined>(undefined);
const FavoritesActionsContext = React.createContext<FavoritesActionsContextType | undefined>(
  undefined
);
const FavoritesDataContext = React.createContext<FavoritesDataContextType | undefined>(undefined);

// Кэш для localStorage - избегаем JSON.parse на каждый вызов
let cachedGuestFavorites: string[] | null = null;

// Получить гостевые избранные из localStorage (с кэшированием)
function getGuestFavorites(): string[] {
  if (typeof window === "undefined") return [];

  // Возвращаем из кэша если есть
  if (cachedGuestFavorites !== null) {
    return cachedGuestFavorites;
  }

  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed: string[] = stored ? JSON.parse(stored) : [];
    cachedGuestFavorites = parsed;
    return parsed;
  } catch {
    cachedGuestFavorites = [];
    return [];
  }
}

// Сохранить гостевые избранные в localStorage (обновляем кэш)
function setGuestFavorites(favorites: string[]) {
  if (typeof window === "undefined") return;
  cachedGuestFavorites = favorites; // Обновляем кэш
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

  // OPTIMIZATION: Сначала загружаем ТОЛЬКО IDs для быстрой проверки isFavorite
  // Полные данные загружаются отдельно только на странице /favorites
  //
  // Filter out favorites whose listing the owner has archived or
  // deactivated. Otherwise the header count includes "dead" favorites
  // the user can no longer see on /favorites (SSR CTE already filters
  // status='active' AND is_active=true), and the heart state stays
  // lit on pages that happen to show the card. The favorite row is
  // kept in the DB so a re-activation brings it back.
  const { data: dbFavoritesRaw = [], isLoading } = useQuery(
    orpc.favorites.ids.queryOptions({
      enabled: isAuthenticated && !!user?.id,
      ...CACHE_TIMES.FAVORITES,
    })
  );

  // Полные данные загружаются через отдельный хук useFavoritesFullData
  // который вызывается только на странице /favorites
  const dbFavorites = dbFavoritesRaw as { id: string; listing_id: string }[];

  // Синхронизируем optimisticIds с данными из БД
  // Используем строковый ключ для стабильных зависимостей
  const dbFavoriteIdsString = React.useMemo(() => {
    if (!dbFavorites || !isAuthenticated) return "";
    return dbFavorites
      .map((f) => f.listing_id)
      .sort()
      .join(",");
  }, [dbFavorites, isAuthenticated]);

  React.useEffect(() => {
    if (dbFavoriteIdsString && isAuthenticated) {
      setOptimisticIds(new Set(dbFavoriteIdsString.split(",")));
    }
  }, [dbFavoriteIdsString, isAuthenticated]);

  // Мутации - фоновая синхронизация с rollback на ошибку
  const createFavorite = useMutation(
    orpc.favorites.add.mutationOptions({
      onError: (_error, variables) => {
        // Rollback: убираем из optimistic state при ошибке
        const listingId = variables?.listingId;
        if (listingId) {
          setOptimisticIds((prev) => {
            const next = new Set(prev);
            next.delete(listingId);
            return next;
          });
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: orpc.favorites.key() });
      },
    })
  );

  const deleteFavorite = useMutation(
    orpc.favorites.remove.mutationOptions({
      onError: () => {
        // Rollback: восстанавливаем из БД при ошибке удаления
        if (dbFavoriteIdsString) {
          setOptimisticIds(new Set(dbFavoriteIdsString.split(",")));
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: orpc.favorites.key() });
      },
    })
  );

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

  // dbFavorites no longer needs a ref: removal used to look up the
  // favourite row's id from this list before calling delete, but the
  // server now resolves the row from (user_id, listing_id) itself.
  const optimisticIdsRef = React.useRef(optimisticIds);
  React.useEffect(() => {
    optimisticIdsRef.current = optimisticIds;
  }, [optimisticIds]);

  // Добавить/удалить из избранного - МГНОВЕННО обновляет UI
  // Используем useRef для стабильной ссылки на функцию

  const toggleFavorite = React.useCallback(
    (listingId: string, listingSnapshot?: ListingSnapshot) => {
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
      const isCurrentlyFavorite = optimisticIdsRef.current.has(listingId);

      setOptimisticIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFavorite) {
          next.delete(listingId);
        } else {
          next.add(listingId);
        }
        return next;
      });

      // Also touch the cached full-favorites list that /favorites
      // reads — so a user who likes a card on /services and then
      // navigates to /favorites sees their new row immediately
      // instead of after the create + refetch round-trip (~4s cold
      // on a remote Supabase link).
      if (isCurrentlyFavorite) {
        // Remove matching rows from every user_favorites cache entry.
        queryClient.setQueriesData<unknown>({ queryKey: orpc.favorites.key() }, (prev: unknown) => {
          if (!Array.isArray(prev)) return prev;
          return (prev as { listing_id: string }[]).filter((f) => f.listing_id !== listingId);
        });
      } else if (listingSnapshot) {
        // Insert a provisional row at the top. id is synthetic; when
        // the real row lands via refetch onSettled below it replaces
        // this one. Rows without `listing` (e.g. the minimal
        // `{id, listing_id}` cache in favorites-context itself) get a
        // reduced placeholder — the UI that consumes that shape only
        // needs listing_id anyway.
        const provisionalId = `optimistic-${listingId}`;
        queryClient.setQueriesData<unknown>({ queryKey: orpc.favorites.key() }, (prev: unknown) => {
          if (!Array.isArray(prev)) return prev;
          const list = prev as Array<Record<string, unknown>>;
          if (list.some((f) => f.listing_id === listingId)) return list;
          const hasListingShape = list[0] && "listing" in list[0];
          const provisional = hasListingShape
            ? {
                id: provisionalId,
                user_id: user.id,
                listing_id: listingId,
                created_at: new Date().toISOString(),
                listing: listingSnapshot,
              }
            : {
                id: provisionalId,
                user_id: user.id,
                listing_id: listingId,
                created_at: new Date().toISOString(),
              };
          return [provisional, ...list];
        });
      }

      // Фоновая синхронизация с сервером (без await)
      if (isCurrentlyFavorite) {
        // Delete by listing_id: the server scopes the row to the
        // signed-in user, so we no longer have to look up the
        // favourite's own id first.
        deleteFavorite.mutate({ listingId });
      } else {
        // user_id comes from the session server-side — the client
        // cannot create a favourite on somebody else's behalf.
        createFavorite.mutate({ listingId });
      }
    },
    [isAuthenticated, user, createFavorite, deleteFavorite, queryClient]
  );

  // Количество избранных
  const count = favoriteListingIds.size;

  // OPTIMIZATION: Список IDs избранных (без полных данных)
  // Полные данные загружаются отдельно через useFavoritesFullData хук
  const optimisticFavoriteIds = React.useMemo(() => {
    if (!isAuthenticated) return [];
    return dbFavorites.filter((f) => optimisticIds.has(f.listing_id));
  }, [dbFavorites, optimisticIds, isAuthenticated]);

  // ========== МЕМОИЗИРОВАННЫЕ ЗНАЧЕНИЯ ДЛЯ КАЖДОГО КОНТЕКСТА ==========

  // Контекст IDs - обновляется только при изменении избранных
  const idsValue = React.useMemo<FavoritesIdsContextType>(
    () => ({
      favoriteListingIds,
      isFavorite,
      count,
    }),
    [favoriteListingIds, isFavorite, count]
  );

  // Контекст Actions - максимально стабильная ссылка
  const actionsValue = React.useMemo<FavoritesActionsContextType>(
    () => ({
      toggleFavorite,
      isToggling: createFavorite.isPending || deleteFavorite.isPending,
    }),
    [toggleFavorite, createFavorite.isPending, deleteFavorite.isPending]
  );

  // Контекст Data - OPTIMIZATION: теперь пустой массив, данные загружаются через useFavoritesFullData
  // Это уменьшает payload на главной странице с ~5KB до ~200 байт
  const dataValue = React.useMemo<FavoritesDataContextType>(
    () => ({
      favorites: [], // Полные данные загружаются отдельно через useFavoritesFullData
      isLoading: isAuthenticated ? isLoading : false,
    }),
    [isLoading, isAuthenticated]
  );

  return (
    <FavoritesIdsContext.Provider value={idsValue}>
      <FavoritesActionsContext.Provider value={actionsValue}>
        <FavoritesDataContext.Provider value={dataValue}>{children}</FavoritesDataContext.Provider>
      </FavoritesActionsContext.Provider>
    </FavoritesIdsContext.Provider>
  );
}

// ========== ХУКИ ДЛЯ ИСПОЛЬЗОВАНИЯ ==========

/**
 * Хук для проверки избранного - используется в карточках
 * Минимальные re-renders: только при изменении списка IDs
 */
export function useFavoriteIds() {
  const context = React.useContext(FavoritesIdsContext);
  if (context === undefined) {
    throw new Error("useFavoriteIds must be used within a FavoritesProvider");
  }
  return context;
}

/**
 * Хук для действий - используется для кнопки лайка
 * Стабильная ссылка на toggleFavorite
 */
export function useFavoriteActions() {
  const context = React.useContext(FavoritesActionsContext);
  if (context === undefined) {
    throw new Error("useFavoriteActions must be used within a FavoritesProvider");
  }
  return context;
}

/**
 * Хук для полных данных - используется на странице /favorites
 * Содержит все данные избранных листингов
 */
export function useFavoriteData() {
  const context = React.useContext(FavoritesDataContext);
  if (context === undefined) {
    throw new Error("useFavoriteData must be used within a FavoritesProvider");
  }
  return context;
}

/**
 * Комбинированный хук для обратной совместимости
 * Используйте отдельные хуки для лучшей производительности
 */
export function useFavorites() {
  const ids = useFavoriteIds();
  const actions = useFavoriteActions();
  const data = useFavoriteData();

  return {
    ...ids,
    ...actions,
    ...data,
  };
}

/**
 * OPTIMIZATION: Хук для загрузки ПОЛНЫХ данных избранных
 * Используется ТОЛЬКО на странице /account/me/favorites
 * На главной и других страницах используется только useFavoriteIds для минимального payload
 */
export function useFavoritesFullData(options?: { initialData?: unknown[] }) {
  const { user, isAuthenticated } = useAuth();
  const { favoriteListingIds } = useFavoriteIds();

  const { data: fullFavorites = [], isLoading } = useQuery(
    orpc.favorites.list.queryOptions({
      enabled: isAuthenticated && !!user?.id,
      ...CACHE_TIMES.FAVORITES,
      // When the page SSR'd the list, feed it back as initialData so
      // the hook considers the query already fresh and doesn't fire a
      // mount-time fetch. SSR shape is structurally compatible —
      // same keys the UI reads.
      initialData: options?.initialData as never,
    })
  );

  // Применяем optimistic filtering
  const optimisticFavorites = React.useMemo(() => {
    if (!isAuthenticated) return [];
    return (fullFavorites as FavoriteWithListing[]).filter((f) =>
      favoriteListingIds.has(f.listing_id)
    );
  }, [fullFavorites, favoriteListingIds, isAuthenticated]);

  return {
    favorites: optimisticFavorites,
    isLoading,
  };
}
