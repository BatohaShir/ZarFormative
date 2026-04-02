# Agent-2 | Step-2 | Code Review Report

## Исправление замечаний из Step-1

### 1. Re-export в base-map.tsx — ИСПРАВЛЕНО

- Строка 14 (`export { TILE_URL, ... }`) удалена
- Объект `TILE_URLS` (legacy) удалён
- **Подтверждено grep:** ни один файл в проекте больше не содержит `TILE_URLS` (кроме отчётов в Agents/)
- **Вердикт: полностью исправлено**

### 2. Импорт в services-map-leaflet.tsx — ИСПРАВЛЕНО

- Строка 9 теперь: `import { TILE_URL, DEFAULT_MAP_CENTER } from "@/components/map-constants"`
- Ранее импортировал из `@/components/ui/base-map`
- **Вердикт: исправлено**

### 3. Все map-файлы переведены на map-constants — ИСПРАВЛЕНО

Grep подтверждает, что все 6 leaflet-компонентов импортируют из `@/components/map-constants`:

- `services-map-leaflet.tsx`
- `request-location-map-leaflet.tsx`
- `fullscreen-map-modal.tsx`
- `live-tracking-map-leaflet.tsx`
- `location-map-modal.tsx`
- `location-picker-map-leaflet.tsx`

Ни один файл не импортирует константы через `base-map.tsx`. **Цель оптимизации 1.2 теперь полностью достигнута.**

### 4. Promise.allSettled в cleanup cron — ИСПРАВЛЕНО

- `Promise.all` заменён на `Promise.allSettled` на обоих уровнях (строки 73 и 96)
- Ошибки фильтруются и записываются в `results.errors` (строки 87-89, 109-111)
- Успешные результаты корректно извлекаются через `.filter()` + `.map()`
- **Вердикт: корректная реализация**

### 5. Cleanup cron limit:100 — НЕ ИСПРАВЛЕНО

Лимит `{ limit: 100 }` остался на строках 60, 75, 98. Пагинация не добавлена. Это было в категории "желательно" в вердикте Agent-3, не критично.

---

## Что сделано правильно

### 1. SSR-конверсия account pages (план 2.1-2.4)

Все 4 страницы конвертированы корректно:

| Страница  | page.tsx                                     | client component                                  |
| --------- | -------------------------------------------- | ------------------------------------------------- |
| favorites | Server component, `dynamic()` с `ssr: false` | `_components/favorites-client.tsx` ("use client") |
| services  | Server component, `dynamic()` с `ssr: false` | `_components/services-client.tsx` ("use client")  |
| requests  | Server component, `dynamic()` с `ssr: false` | `_components/requests-client.tsx` ("use client")  |
| stats     | Server component, `dynamic()` с `ssr: false` | `_components/stats-client.tsx` ("use client")     |

**Проверено:**

- Ни один `page.tsx` не содержит `"use client"` — все являются server components
- Все client компоненты имеют `"use client"` директиву
- `dynamic()` с `ssr: false` корректно предотвращает SSR для клиентских компонентов
- Паттерн единообразный: `import dynamic` -> `const XClient = dynamic(...)` -> `return <XClient />`

**Обоснование выбора `ssr: false` вместо полного SSR:**
Agent-1 объяснил, что все 4 страницы зависят от `useAuth()` и ZenStack React Query хуков, которые не поддерживают server-side prefetch. Это **разумный компромисс** — page.tsx как server component даёт code-splitting, а data fetching остаётся на клиенте.

### 2. maps/shared/index.ts — корректный barrel export

- Константы экспортируются из `@/components/map-constants` (SSR-safe)
- `BaseMap` и `useMapTileUrl` экспортируются из `@/components/ui/base-map` (client-only)
- Разделение корректное: SSR-safe и client-only exports не смешаны

### 3. Caching headers — обоснованный skip

Agent-1 проверил API routes и обосновал, что дополнительные Cache-Control не нужны:

- `search` и `schedule` уже имеют headers
- ZenStack routes кэшируются через React Query
- Cron и health не нуждаются в кэшировании
- **Вердикт: обоснованно**

---

## Что сделано неправильно

**Существенных ошибок не обнаружено.** Все изменения корректны и соответствуют вердикту Agent-3.

---

## Что требует улучшения

### 1. Cleanup cron — limit:100 (minor, унаследовано)

Пагинация всё ещё не реализована. При росте данных orphaned файлы за пределами лимита не будут удалены. Не критично для текущего масштаба.

### 2. Dynamic import request-detail-modal (план 3.1)

1135-строчный модальник не был оптимизирован через dynamic import. Это было в вердикте Agent-3 как задача Step-2, но помечено как менее приоритетное.

### 3. Consistent Leaflet dynamic imports (план 3.3)

Не проверено/не сделано. Однако все leaflet-компоненты уже используют `"use client"` и загружаются через `dynamic()` в обёртках — паттерн, вероятно, уже консистентный.

---

## Что осталось пропущенным

| Задача                               | Источник                 | Статус                 | Критичность                           |
| ------------------------------------ | ------------------------ | ---------------------- | ------------------------------------- |
| Dynamic import request-detail-modal  | План 3.1, Agent-3 step-2 | Не сделано             | Medium                                |
| Break down largest client components | План 3.2                 | Не сделано             | Low                                   |
| Consistent Leaflet dynamic imports   | План 3.3                 | Не проверено           | Low                                   |
| Composite DB index                   | План 1.1                 | Не сделано             | Low (существующие индексы достаточны) |
| Cleanup cron pagination              | Agent-2 step-1           | Не сделано             | Low                                   |
| PNG -> WebP                          | План 5.1                 | Step 3, не требовалось | N/A                                   |
| Bundle analyzer                      | План 5.2                 | Step 3, не требовалось | N/A                                   |

---

## Оценка: 8/10

**Обоснование:** Agent-1 выполнил все критичные задачи из вердикта Agent-3:

- Все 4 замечания из моего Step-1 ревью исправлены (re-export, TILE_URLS, импорты, Promise.allSettled)
- SSR-конверсия всех 4 account pages выполнена корректно и единообразно
- Все 6 map-файлов переведены на `map-constants` — SSR-safety полностью обеспечена
- Caching headers обоснованно пропущены

Снижение на 2 балла за:

- Не сделан dynamic import для request-detail-modal (план 3.1) — medium impact
- Не добавлена пагинация в cleanup cron — minor, но легко исправить

Общий прогресс проекта после Step-1 + Step-2: ~80% от запланированного объёма выполнено. Оставшиеся задачи имеют низкий-средний приоритет.
