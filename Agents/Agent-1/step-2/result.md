# Agent-1 | Step-2 | Optimization Report

## Задачи из Agent-3 Step-1 вердикта

### 1. Убран re-export из base-map.tsx + TILE_URLS (критично)

- **base-map.tsx**: удалён re-export констант (строка 14) и мёртвый `TILE_URLS` объект
- **maps/shared/index.ts**: константы теперь импортируются из `map-constants.ts` (SSR-safe), а `BaseMap`/`useMapTileUrl` из `base-map.tsx`
- **6 файлов**: все leaflet-компоненты переведены с `@/components/ui/base-map` на `@/components/map-constants`:
  - services-map-leaflet.tsx
  - request-location-map-leaflet.tsx
  - fullscreen-map-modal.tsx
  - live-tracking-map-leaflet.tsx
  - location-map-modal.tsx
  - location-picker-map-leaflet.tsx
- **Результат**: ни один файл не импортирует константы через файл с Leaflet зависимостью

### 2. SSR-конверсия account pages (план 2.1-2.4)

Все 4 страницы конвертированы: page.tsx = server component, контент = dynamic client component с `ssr: false`.

| Страница  | Server component      | Client component                   |
| --------- | --------------------- | ---------------------------------- |
| favorites | `page.tsx` (10 строк) | `_components/favorites-client.tsx` |
| services  | `page.tsx` (10 строк) | `_components/services-client.tsx`  |
| requests  | `page.tsx` (10 строк) | `_components/requests-client.tsx`  |
| stats     | `page.tsx` (10 строк) | `_components/stats-client.tsx`     |

**Что это даёт:**

- page.tsx — server component, рендерится мгновенно (нет JS bundle для shell)
- Клиентский код загружается через dynamic import — code-split от основного bundle
- Loading.tsx (из step-1) показывает skeleton пока client component грузится
- Middleware больше не ждёт auth check на public routes (из step-1)

**Почему не полная SSR с data prefetch:**

- Все 4 страницы зависят от `useAuth()` context и ZenStack React Query хуки
- ZenStack не поддерживает server-side prefetch через dehydrate/hydrate
- Полная конверсия потребовала бы переписать data layer — несоразмерные усилия vs выигрыш

### 3. Promise.allSettled в cleanup cron

- `Promise.all` заменён на `Promise.allSettled` для обоих уровней (subfolder listing и file listing)
- Ошибки отдельных запросов логируются в `results.errors`, не блокируют остальные
- Graceful degradation: если одна папка недоступна, остальные всё равно обработаются

### 4. Caching headers для API routes

- `search` и `schedule` уже имеют Cache-Control headers
- `/api/model/[...path]` — ZenStack managed handler, кэширование на клиенте через React Query (staleTime 5 мин)
- Cron routes и health — не нуждаются в кэшировании
- **Вывод**: дополнительные Cache-Control headers не нужны

---

## Файлы изменённые

| Файл                                                        | Действие                    |
| ----------------------------------------------------------- | --------------------------- |
| `components/ui/base-map.tsx`                                | Убран re-export, TILE_URLS  |
| `components/maps/shared/index.ts`                           | Константы из map-constants  |
| `components/services-map-leaflet.tsx`                       | Import из map-constants     |
| `components/request-location-map-leaflet.tsx`               | Import из map-constants     |
| `components/maps/shared/fullscreen-map-modal.tsx`           | Import из map-constants     |
| `components/live-tracking-map-leaflet.tsx`                  | Import из map-constants     |
| `components/location-map-modal.tsx`                         | Import из map-constants     |
| `components/location-picker-map-leaflet.tsx`                | Import из map-constants     |
| `app/account/me/favorites/page.tsx`                         | Server component wrapper    |
| `app/account/me/favorites/_components/favorites-client.tsx` | Новый (контент из page.tsx) |
| `app/account/me/services/page.tsx`                          | Server component wrapper    |
| `app/account/me/services/_components/services-client.tsx`   | Новый                       |
| `app/account/me/requests/page.tsx`                          | Server component wrapper    |
| `app/account/me/requests/_components/requests-client.tsx`   | Новый                       |
| `app/account/me/stats/page.tsx`                             | Server component wrapper    |
| `app/account/me/stats/_components/stats-client.tsx`         | Новый                       |
| `app/api/cron/cleanup-orphaned-files/route.ts`              | Promise.allSettled          |

## Проверки

- `tsc --noEmit` — 0 ошибок
