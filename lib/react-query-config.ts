/**
 * Централизованная конфигурация времени кэширования для React Query
 * Обеспечивает консистентность кэширования по всему приложению
 */

// Время в миллисекундах
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Конфигурация кэширования по типам данных
 *
 * staleTime - время, после которого данные считаются "несвежими" и будут перезапрошены при следующем использовании
 * gcTime (cacheTime) - время, после которого неиспользуемые данные удаляются из кэша
 */
export const CACHE_TIMES = {
  // Листинги - часто меняются, короткий stale
  LISTINGS: {
    staleTime: 2 * MINUTE,
    gcTime: 10 * MINUTE,
  },

  // Результаты поиска - очень короткий stale для актуальности
  SEARCH: {
    staleTime: 30 * 1000, // 30 секунд
    gcTime: 5 * MINUTE,
  },

  // Категории - редко меняются, длинный кэш
  CATEGORIES: {
    staleTime: 30 * MINUTE,
    gcTime: 1 * HOUR,
  },

  // Локации (аймаги, районы, хороо) - почти статичные данные
  LOCATIONS: {
    staleTime: 1 * HOUR,
    gcTime: 2 * HOUR,
  },

  // Данные пользователя - умеренный кэш
  USER: {
    staleTime: 1 * MINUTE,
    gcTime: 5 * MINUTE,
  },

  // Избранное - средний кэш, обновляется оптимистично
  FAVORITES: {
    staleTime: 5 * MINUTE,
    gcTime: 30 * MINUTE,
  },

  // Профили пользователей - умеренный кэш
  PROFILES: {
    staleTime: 5 * MINUTE,
    gcTime: 15 * MINUTE,
  },

  // Заявки на услуги - короткий stale для актуальности статуса
  SERVICE_REQUESTS: {
    staleTime: 1 * MINUTE,
    gcTime: 10 * MINUTE,
  },

  // Рекомендации - средний кэш
  RECOMMENDATIONS: {
    staleTime: 2 * MINUTE,
    gcTime: 10 * MINUTE,
  },
} as const;

/**
 * Дефолтные опции для React Query
 * Используются в QueryClientProvider
 */
export const defaultQueryOptions = {
  queries: {
    staleTime: CACHE_TIMES.LISTINGS.staleTime,
    gcTime: CACHE_TIMES.LISTINGS.gcTime,
    refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
    retry: 1, // Одна повторная попытка при ошибке
  },
  mutations: {
    retry: 0, // Не повторять мутации
  },
} as const;

/**
 * Хелпер для получения опций кэширования по типу данных
 */
export function getCacheOptions(type: keyof typeof CACHE_TIMES) {
  return CACHE_TIMES[type];
}
