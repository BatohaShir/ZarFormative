# Agent-2 | Step-1 | Code Review Report

## Что сделано правильно

### 1. Middleware optimization (navigation speed)

- `getUser()` теперь вызывается только для `/admin` и `/account/me` маршрутов — корректно
- Логика условий `isAdminRoute` / `isProtectedRoute` чистая и понятная
- Не сломана CSRF-валидация и security headers
- **Вердикт: отлично**

### 2. Map constants extraction (Plan 1.2)

- Константы `TILE_URL`, `TILE_ATTRIBUTION`, `DEFAULT_MAP_CENTER`, `DEFAULT_MAP_ZOOM` вынесены в `components/map-constants.ts`
- Файл не имеет зависимости от Leaflet — SSR-safe
- `base-map.tsx` импортирует из нового файла
- **Вердикт: корректно**

### 3. Loading.tsx скелетоны (не в плане, но полезно)

- `app/loading.tsx`, `app/admin/loading.tsx`, `app/account/me/stats/loading.tsx` — хорошие skeleton states
- Улучшают perceived performance при навигации
- **Вердикт: полезное дополнение**

### 4. Cleanup cron N+1 fix + parallelization (Plan 4.1, 4.2)

- Raw SQL с `SELECT DISTINCT attachment_url` — корректно, решает проблему загрузки всех строк в память
- `Promise.all()` для параллельного листинга папок и файлов — правильно
- Batch delete одним вызовом `remove()` — правильно
- **Вердикт: корректно**

---

## Что сделано неправильно

### 1. Re-exports в `base-map.tsx` не убраны (противоречие)

**План 1.3** говорит: "Remove redundant re-exports from services-map-leaflet.tsx". Agent-1 убрал re-export `getListingsWithCoords`/`ListingWithCoords` из `services-map-leaflet.tsx` (строка 45 — теперь импорт напрямую из `services-map-utils`). Это **правильно**.

Однако в `base-map.tsx` (строка 14) **добавлен новый** re-export:

```ts
// Re-export constants for backward compatibility
export { TILE_URL, TILE_ATTRIBUTION, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM };
```

Это **противоречит цели** оптимизации 1.2 — любой серверный компонент, импортирующий константы из `base-map.tsx`, всё равно подтянет Leaflet (потому что `base-map.tsx` импортирует `react-leaflet`). Re-export создаёт ложную "обратную совместимость", которая сохраняет оригинальную проблему.

**Проблема подтверждена:** `services-map-leaflet.tsx:9` уже импортирует `TILE_URL` и `DEFAULT_MAP_CENTER` из `@/components/ui/base-map` вместо `@/components/map-constants`. Это не критично именно здесь (так как этот файл уже "use client" и сам тянет Leaflet), но **паттерн опасен** — другие разработчики могут по привычке импортировать из `base-map` и получить SSR-баг.

**Рекомендация:** Убрать re-export из `base-map.tsx`, обновить импорт в `services-map-leaflet.tsx` на `@/components/map-constants`.

### 2. Legacy `TILE_URLS` объект в `base-map.tsx`

Строки 17-20 — оставлен объект `TILE_URLS` с комментарием "Legacy export для обратной совместимости". Если это не используется, его следует удалить. Если используется — нужно перенести в `map-constants.ts`.

---

## Что требует улучшения

### 1. Cleanup cron — limit 100 может пропустить файлы

В `route.ts` строки 60, 75, 89 — везде `{ limit: 100 }`. Если в бакете больше 100 папок или файлов в папке, orphaned файлы за пределами лимита **не будут обработаны**. Нужна пагинация или увеличение лимита. Это унаследованная проблема, но Agent-1 мог бы её исправить при рефакторинге.

### 2. Cleanup cron — нет обработки ошибок в Promise.all

Строки 73-80 и 87-94 — если один `supabase.storage.list()` упадёт, весь `Promise.all` упадёт, и ни один файл не будет удалён. Стоит использовать `Promise.allSettled()` для graceful degradation.

### 3. `services-map-leaflet.tsx` — импорт из base-map вместо map-constants

Строка 9: `import { TILE_URL, DEFAULT_MAP_CENTER } from "@/components/ui/base-map"` — следует импортировать из `@/components/map-constants` для консистентности с целью оптимизации.

---

## Что из плана пропущено

### Step 1 (должно было быть сделано)

| Пункт плана                                                                           | Статус        | Комментарий                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **1.1** Composite index `[provider_id, status, preferred_time]` на `listing_requests` | **ПРОПУЩЕНО** | Уже есть `[provider_id, preferred_date, status]` — возможно Agent-1 счёл достаточным, но план явно просил другой индекс |
| **1.2** Extract constants                                                             | Сделано       |                                                                                                                         |
| **1.3** Remove re-exports from services-map-leaflet                                   | Сделано       | Но добавлены новые re-exports в base-map (см. выше)                                                                     |
| **2.1-2.4** Convert account pages to server components                                | **ПРОПУЩЕНО** | Четыре страницы account/me/\* должны были быть конвертированы в server components с client sub-components. Не сделано   |
| **3.1** Dynamic import request-detail-modal                                           | **ПРОПУЩЕНО** | 1135-строчный модальник не был оптимизирован                                                                            |
| **3.2** Break down largest client components                                          | **ПРОПУЩЕНО** | Не сделано                                                                                                              |
| **3.3** Consistent Leaflet dynamic imports                                            | **ПРОПУЩЕНО** | Не проверено/не сделано                                                                                                 |
| **4.1** N+1 fix in cleanup cron                                                       | Сделано       |                                                                                                                         |
| **4.2** Parallelize cleanup cron                                                      | Сделано       |                                                                                                                         |
| **4.3** Caching headers for API routes                                                | **ПРОПУЩЕНО** | Не сделано                                                                                                              |

**Итого пропущено из Step 1:** Priority 2 (все 4 пункта SSR-конверсии) и Priority 3 (все 3 пункта code-splitting) — это **7 пунктов** из плана, помеченные как "High Impact" и "Medium Impact".

Agent-1 сделал работу из Priority 1 (кроме индекса) и Priority 4 (пункты 4.1 и 4.2), но пропустил Priority 2 и 3 целиком, хотя план явно указывает Step 1 = "Priorities 1-3".

---

## Дополнительные находки

- **Плюс:** Agent-1 добавил loading.tsx — это не было в плане, но полезно для UX
- **Плюс:** Middleware оптимизация — тоже не в плане, но ощутимый performance gain
- **Минус:** Agent-1 заявил "tsc --noEmit — 0 ошибок", но не представил доказательств

---

## Оценка: 5/10

**Обоснование:** Выполненная работа качественная — middleware оптимизация, map constants extraction, cleanup cron refactoring сделаны корректно и без багов. Однако пропущено 7 из 12 пунктов Step 1 (Priority 2 и 3 целиком), включая все SSR-конверсии (High Impact) и все code-splitting задачи (Medium Impact). Re-export в `base-map.tsx` частично аннулирует цель оптимизации 1.2. Работа выполнена примерно наполовину от запланированного объёма.
