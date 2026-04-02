# Agent-1 | Step-1 | Optimization Report

## Audit Summary

Провёл полный аудит: 20+ страниц, DB слой, клиентский бандл, middleware.

### Сильные стороны проекта (уже было хорошо)

- ISR с правильными revalidate (60s главная, 300s профили, 1800s категории)
- Promise.all() для параллельных запросов на серверных страницах
- cache() дедупликация в service detail
- Денормализованные поля (avg_rating, reviews_count) — нет N+1
- React Query с 5 мин staleTime
- Dynamic imports для модалок и карт
- Хорошие индексы в БД

---

## Выполненные оптимизации

### 1. Middleware: убран getUser() на публичных маршрутах

**Файл:** `middleware.ts`
**Проблема:** `supabase.auth.getUser()` — сетевой запрос к Supabase на КАЖДОЙ навигации, даже на публичных страницах (/, /services, /account/[name]).
**Решение:** getUser() вызывается только для `/admin/*` и `/account/me/*`.
**Ожидаемый эффект:** -100-300ms на каждый переход между публичными страницами.

### 2. Loading.tsx для мгновенных переходов

**Файлы:** `app/loading.tsx`, `app/admin/loading.tsx`, `app/account/me/stats/loading.tsx`
**Проблема:** Без loading.tsx Next.js ждёт полной загрузки страницы перед показом, создавая ощущение "зависания".
**Решение:** Добавлены skeleton loading states.
**Ожидаемый эффект:** Мгновенный визуальный отклик при навигации.

### 3. Map constants extracted (SSR safety)

**Файлы:** `components/map-constants.ts` (новый), `components/ui/base-map.tsx`
**Проблема:** Константы TILE_URL, DEFAULT_MAP_CENTER были в base-map.tsx вместе с Leaflet imports. Любой серверный компонент, импортирующий константы, тянул бы Leaflet.
**Решение:** Константы вынесены в отдельный файл без зависимости от Leaflet.

### 4. Redundant re-exports removed

**Файл:** `components/services-map-leaflet.tsx`
**Проблема:** Re-export getListingsWithCoords из leaflet-файла — если кто-то импортирует оттуда, SSR баг вернётся.
**Решение:** Убран re-export, единственный путь — через `services-map-utils.ts`.

### 5. Cleanup cron: N+1 fix + parallelization

**Файл:** `app/api/cron/cleanup-orphaned-files/route.ts`
**Проблемы:**

- findMany загружал ВСЕ chat_messages с attachment в память
- 3 уровня вложенных последовательных API-запросов к storage
  **Решения:**
- `SELECT DISTINCT attachment_url` через raw SQL
- Promise.all() для параллельного листинга папок и файлов
- Один batch delete вместо множественных
  **Ожидаемый эффект:** ~3-5x ускорение cron job, меньше потребление памяти.

---

## Файлы изменённые

| Файл                                           | Действие |
| ---------------------------------------------- | -------- |
| `components/map-constants.ts`                  | Новый    |
| `components/ui/base-map.tsx`                   | Изменён  |
| `components/services-map-leaflet.tsx`          | Изменён  |
| `middleware.ts`                                | Изменён  |
| `app/loading.tsx`                              | Новый    |
| `app/admin/loading.tsx`                        | Новый    |
| `app/account/me/stats/loading.tsx`             | Новый    |
| `app/api/cron/cleanup-orphaned-files/route.ts` | Изменён  |

## Проверки

- TypeScript: `tsc --noEmit` — 0 ошибок
- Dev server: все страницы возвращают 200
