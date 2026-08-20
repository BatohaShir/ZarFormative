# План полной миграции на oRPC — zar-formative (Tsogts.mn)

**Дата:** 2026-08-20 (ревизия 2 — после сплошной перепроверки)
**Решение по авторизации:** oRPC везде + `getEnhancedPrisma()` внутри процедур
**Статус:** план на утверждение, код не написан

> **Что изменилось в ревизии 2.** Первая версия плана покрывала только канал ZenStack и упускала примерно половину реального объёма. Сплошная проверка нашла **шесть независимых каналов** клиент→сервер, из них ZenStack — лишь один. Ниже учтены все.

---

## 1. Полная карта каналов клиент→сервер

Это результат сплошного поиска, а не оценки. Каждая строка проверена.

| #   | Канал                                                                                              | Объём                         | Уходит под oRPC?            |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| 1   | **ZenStack REST** `/api/model/[...path]`                                                           | 21 файл, ~10 000 строк хуков  | ✅ да                       |
| 2   | **Кастомные REST-роуты** `/api/search`, `/api/services`, `/api/schedule`, `/api/listings/:id/view` | 572 строки, 4 роута           | ✅ да                       |
| 3   | **Server Actions** `transitionRequest`, `setSelectedAimagAction`                                   | 2 действия                    | ✅ да (см. §4)              |
| 4   | **Прямая запись в БД из клиента** `supabase.from("request_locations")`                             | 1 место + 1 realtime-подписка | ✅ да — **и это фикс дыры** |
| 5   | **Supabase Storage** — 37 обращений, 7 модулей                                                     | 7 файлов-потребителей         | ⚠️ частично (см. §5)        |
| 6   | **Supabase Auth** — 18 обращений                                                                   | signIn/signUp/signOut/reset   | ❌ нет (см. §6)             |
| —   | **Мёртвый код** `/api/notifications/*`                                                             | 3 вызова в никуда             | 🗑 удалить                  |

### Находка: три вызова в несуществующие роуты

`app/account/me/notifications/page.tsx` строки 120, 136, 161 бьют в `/api/notifications/subscribe`, `/unsubscribe`, `/settings`. **Директории `app/api/notifications/` не существует.** Все три `fetch` без проверки `res.ok`, поэтому 404 проглатывается молча — пользователь жмёт «Сохранить», получает успех в UI, настройки на сервер не уходят.

Это не часть миграции, а работающий баг. Под oRPC он исчезает сам: несуществующая процедура — ошибка типов на этапе сборки, а не молчаливый 404 в рантайме.

### Находка: клиент пишет в БД мимо всех проверок

`components/live-tracking-map-leaflet.tsx:561` — прямой `supabase.from("request_locations").upsert(...)` из браузера. Этот путь **не проходит ни через ZenStack, ни через API**: единственная защита — RLS-политики в Postgres, а по `SECURITY_PLAN.md` слой RLS ещё не закрыт (3 CRITICAL открыты).

Перевод под oRPC здесь — не косметика, а закрытие дыры: запись пойдёт через процедуру, которая проверит, что пользователь действительно участник этой заявки и что заявка в статусе `in_progress`.

---

## 2. Что остаётся от ZenStack и почему

Уходит: REST-роут, ~10 000 строк хуков `lib/hooks/*`, плагин `hooks`, пакеты `@zenstackhq/tanstack-query` и `@zenstackhq/server`.

Остаётся: `@zenstackhq/runtime` + `enhance()` в `prisma/enhanced.ts` + 78 правил `@@allow`/`@@deny` в схеме + плагин `enhancer`.

**Почему.** `enhance()` подмешивает фильтры по `auth()` в каждый запрос. Правило `@@allow('read', status == active && is_active == true)` физически не даёт утечь чужим черновикам, даже если в процедуре забыли `where`. Убрать его — значит переписать 78 правил руками, где каждая забытая строка = утечка. Это тот случай, когда «убрать всё» ухудшает результат.

Снаружи ZenStack при этом **полностью невидим**: ни одного импорта в клиентском коде, ни одного REST-вызова. Он работает как guard внутри контекста oRPC. Клиент и API — чистый oRPC, цель «всё под oRPC» достигнута.

Проверка после миграции:

```bash
grep -rn "lib/hooks\|zenstack\|@zenstackhq" --include="*.ts" --include="*.tsx" app components hooks contexts
# ожидаемый результат: пусто
# ZenStack остаётся только в prisma/enhanced.ts и schema.zmodel
```

---

## 3. Главный риск: реалтайм отвалится молча

5 realtime-хуков жёстко зашиты на ключи ZenStack — 45 ссылок в 16 файлах:

```ts
queryClient.invalidateQueries({ queryKey: ["zenstack", "listings", "findMany"] });
```

После перехода ключи станут другими. Если ключ не совпадёт — **ошибки не будет**: `invalidateQueries` с несуществующим ключом молча ничего не делает. Сборка пройдёт, типы пройдут, 81 тест пройдёт, а UI перестанет обновляться вживую.

Замена — `.key()` из `@orpc/tanstack-query` (частичное совпадение, прямой аналог):

```ts
queryClient.invalidateQueries({ queryKey: orpc.listings.list.key() });
```

**Правило: realtime-хук переводится в том же коммите, что и его домен.** Никаких «потом допилим».

---

## 4. Server Actions → oRPC

Оба действия уходят под oRPC, но по-разному.

**`setSelectedAimagAction`** — тривиально, обычная мутация.

**`transitionRequest`** (480 строк) — переносим **логику как есть, целиком**, меняя только обёртку:

```ts
// было:  "use server"; export async function transitionRequest(input)
// стало: requests.transition — oRPC-мутация с Zod-валидацией входа
```

Внутри всё сохраняется без изменений: одна `prisma.$transaction`, машина состояний `validateStatusTransition`, optimistic locking через `expected_updated_at`, создание уведомлений в той же транзакции.

Два условия, которые нельзя нарушить:

1. Процедура ходит через **сырой `prisma`**, а не через `ctx.db`. Действие — доверенная граница, оно намеренно обходит правила ZenStack (иначе `@deny('update')` на поле `status` заблокирует сам переход).
2. `@deny('update', true)` на поле `status` в схеме **остаётся**. Он закрывает альтернативный путь записи. Если его убрать, статус можно будет прокинуть напрямую в терминальное состояние.

Тесты `__tests__/lib/validations/request-status.test.ts` и `use-status-transition.test.tsx` — машина состояний не меняется, они должны остаться зелёными без правок. Это и есть критерий, что перенос корректен.

---

## 5. Storage: что можно и чего нельзя

37 обращений к Supabase Storage в 7 модулях `lib/storage/*`, 7 файлов-потребителей.

**Под oRPC уходит:** выдача подписанных URL, валидация (тип, размер, владелец), запись метаданных в БД, удаление файлов, привязка к сущностям.

**Под oRPC не уходит:** сам байтовый аплоад. Файл должен идти напрямую в Supabase Storage по подписанному URL. Гнать бинарь через oRPC-процедуру означает пропускать его через Node-рантайм Vercel — это лимиты на размер тела, таймауты и оплачиваемое время функции на каждую фотографию.

Правильный паттерн: `orpc.images.createUploadUrl` → браузер грузит байты напрямую → `orpc.images.confirm` пишет метаданные. Управление — целиком в oRPC, транспорт байтов — мимо.

---

## 6. Auth: почему остаётся на Supabase

18 обращений: `signInWithPassword`, `signUp`, `signOut`, `resetPasswordForEmail`, `updateUser`, `getUser`, `onAuthStateChange`.

Это **не может** уйти под oRPC, и дело не в объёме работ:

- Supabase Auth сам управляет httpOnly-куками сессии; oRPC-процедура их не выставит
- `onAuthStateChange` — подписка на события SDK, у RPC нет аналога
- Обёртка вокруг `signInWithPassword` не убирает сам SDK — он останется в бандле, но добавится лишний сетевой хоп и место, где можно потерять куку

`getUser()` при этом уже живёт на сервере — в `createORPCContext()`. Клиентские `getUser()` в компонентах по ходу миграции уйдут, потому что данные придут из процедур.

**Итог:** auth остаётся каналом Supabase SDK. Все шесть каналов данных — под oRPC; аутентификация каналом данных не является.

---

## 7. Целевая архитектура

```
lib/orpc/
  context.ts     — createORPCContext(): { db: enhanced prisma, user, supabase }
  base.ts        — os.$context<Ctx>(), publicProcedure, protectedProcedure
  router.ts      — appRouter
  client.ts      — RPCLink + createTanstackQueryUtils → orpc
  server.ts      — серверный клиент для RSC (без HTTP-хопа)
  routers/
    listings.ts    favorites.ts   requests.ts   notifications.ts
    chat.ts        profiles.ts    reviews.ts    locations.ts
    categories.ts  images.ts      ad-stories.ts boosts.ts
    search.ts      schedule.ts    views.ts

app/api/orpc/[[...rest]]/route.ts   — RPCHandler
```

Инвариант: процедуры ходят **только** через `ctx.db`. Единственное исключение — `requests.transition` (§4), и оно задокументировано в коде.

Домены именуются по смыслу, не по CRUD: `orpc.favorites.list` вместо `useFindManyuser_favorites({ where: { user_id } })`. Клиент больше не диктует `where` — это сужение поверхности атаки, а не только косметика.

---

## 8. Порядок работ

Каждый этап оставляет приложение рабочим.

**Этап 0 — каркас.** Ставим `@orpc/server @orpc/client @orpc/tanstack-query @orpc/zod` (1.15.0), создаём `lib/orpc/*`, роут-хендлер, провайдер. Ничего не сломано.

**Этап 1 — справочники.** `categories`, `aimags`, `districts`, `khoroos`. Публичные данные, 2–3 правила на модель, realtime нет. Здесь отрабатывается паттерн SSR-сидинга через `initialData` (`city-select.tsx:128`, `:155`).
Файлы: `city-select`, `categories-modal`, `category-filter-modal`, `address-select-modal`, `lib/aimag/actions.ts`

**Этап 2 — favorites.** Первый домен с авторизацией и оптимистикой: 3 хука, гостевой `localStorage`, контекст разделён на 3 части ради ре-рендеров.
Файлы: `contexts/favorites-context.tsx`, `lib/favorites/query.ts`, `favorites-client.tsx`

**Этап 3 — profiles.** Файлы: `use-current-user`, `use-educations`, `use-work-experiences`, `my-profile-client`, `profile/*`
Realtime: `use-realtime-profile.ts`

**Этап 4 — listings + images + search.** Сюда же кастомные роуты `/api/services` (57 строк) и `/api/search` (167 строк) — обе CTE-выборки становятся процедурами.
Файлы: `services-list-client`, `service-detail-client`, `create-listing-client`, `hero-search`, `use-search`, `use-batch-create-images`, `services-client`
Realtime: `use-realtime-listings`, `use-realtime-views` (+ роут `/api/listings/:id/view`)

**Этап 5 — notifications.** Плюс удаление мёртвых вызовов `/api/notifications/*` и подключение push-настроек к реальным процедурам.
Файлы: `notifications-context`, `notification-bell`, `use-notification-settings`, `use-push-subscription`, `notifications/page.tsx`

**Этап 6 — requests + chat + tracking.** Самый сложный: машина состояний, `transitionRequest` (§4), realtime чата с дедупликацией, `/api/schedule` (228 строк), **и закрытие дыры с прямой записью в `request_locations`** (§1).
Файлы: `requests-client`, `request-chat`, `request-form`, `requests-button`, `active-requests-sidebar`, `live-tracking-map-leaflet`, `work-completion-flow`
Realtime: `use-realtime-requests`, `use-realtime-chat`, `use-realtime-location`

**Этап 7 — reviews, ad_stories, boosts.** Файлы: `reviews-list`, `billboard/ad-stories`

**Этап 8 — зачистка.** Удаляем `app/api/model/`, `lib/hooks/*`, 4 кастомных роута, плагин `hooks` из схемы, пакеты. Обновляем README (он и сейчас врёт про NextAuth и `/api/services/:id`) и `CONTRIBUTING.md`.

---

## 9. Что даёт оптимизацию

1. **−10 000 строк** генерируемого кода из бандла и билда
2. **Конец over-fetching** — процедура отдаёт ровно то, что нужно экрану, вместо клиентских Prisma-`include`
3. **Сужение поверхности атаки** — клиент не составляет произвольный запрос, только вызывает процедуру с Zod-валидированным входом
4. **Закрытие дыры** с прямой записью в `request_locations` из браузера
5. **Устранение молчаливого бага** с `/api/notifications/*`
6. **Батчинг** — параллельные запросы страницы схлопываются в один HTTP
7. **Честный SSR** — серверный клиент вызывает процедуры напрямую, без HTTP-хопа

Пункт 7 — самый весомый и самый объёмный: 18 файлов SSR-запросов в `lib/*/query.ts`. **Предлагаю отдельным этапом после миграции.** Два больших рефакторинга одновременно превратят отладку realtime в угадайку. Это единственное, что я предлагаю вынести за скобки — и только по срокам, а не по объёму.

---

## 10. Проверка на каждом этапе

```bash
npx tsc --noEmit   # сейчас чисто — держим чистым
npx jest           # сейчас 81/81 зелёных — держим зелёными
npm run lint
```

Ручная проверка (автотестами не ловится):

- **Realtime:** два браузера, изменение в одном → обновление в другом без перезагрузки
- **Оптимистика:** favorites и чат реагируют мгновенно, откат при ошибке
- **Гость → логин:** гостевые favorites из `localStorage` мигрируют
- **Переходы статусов:** полный цикл заявки от `pending` до `completed`
- **Загрузка фото:** объявления, чат, отчёт о работе

---

## 11. Открытые вопросы

1. **MCP смотрит в чужую базу.** В `.env` проект `gqzohavylekbxolokzgi`, MCP-сервер унаследован из `job_2025/.mcp.json` с ref `guntikxiabswcglgbije`. Чинить до того, как понадобятся реальные данные.
2. **SSR-слой** (18 файлов) — подтверди вынос отдельным этапом.
3. **Батчинг** — сразу или после стабилизации? Рекомендую после.

---

## 12. Чего план сознательно не делает

- **Не убирает `enhance()` и 78 правил** — активный слой защиты, §2
- **Не переписывает логику `transitionRequest`** — переносится под oRPC как есть, §4
- **Не гонит байты файлов через oRPC** — управление под oRPC, транспорт мимо, §5
- **Не оборачивает Supabase Auth** — не канал данных, §6
- Не закрывает находки `SECURITY_PLAN.md` (3 CRITICAL по RLS) — отдельная работа
- Не выносит хардкод строк в i18n — задача из `TRANSLATIONS.md`
