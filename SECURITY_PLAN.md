# Security Plan — zar-formative (Tsogts.mn)

Государственное приложение для Монголии. Документ фиксирует находки аудита безопасности и план их устранения.

**Дата создания:** 2026-04-24
**Аудитор:** Claude (security role)
**Методология:** послойный аудит, снизу вверх.

---

## Прогресс по слоям

| #   | Слой                                                   | Статус                                                        |
| --- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 1   | Секреты, конфиги, Sentry                               | ✅ Аудит проведён, критические/средние фиксы применены        |
| 2   | Supabase RLS и миграции                                | ✅ Аудит проведён, критические фиксы **применены 2026-08-20** |
| 3   | Middleware, CSRF, CSP, auth-гварды                     | ⏳ В очереди                                                  |
| 4   | API routes (`/api/*`), cron endpoints, rate limiting   | ⏳ В очереди                                                  |
| 5   | Supabase клиенты (server/client/middleware разделение) | ⏳ В очереди                                                  |
| 6   | Auth flow (логин/регистрация/reset)                    | ⏳ В очереди                                                  |
| 7   | File uploads, storage policies в рантайме              | ⏳ В очереди                                                  |
| 8   | XSS, raw HTML, user-controlled URLs                    | ⏳ В очереди                                                  |
| 9   | Страничный обход — каждая страница `app/**/page.tsx`   | ⏳ В очереди                                                  |
| 10  | Realtime каналы в рантайме (клиентские подписки)       | ⏳ В очереди                                                  |
| 11  | PII, логи, retention, анонимизация                     | ⏳ В очереди                                                  |
| 12  | Dependencies (npm audit, supply chain)                 | ⏳ В очереди                                                  |

---

# Слой 1 — Секреты и базовые конфиги

## Находки и статус

| #    | Severity  | Находка                                                                             | Статус                                                                                                                             |
| ---- | --------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | 🟢 GOOD   | `.env` не в git, history чистая                                                     | —                                                                                                                                  |
| 1.2  | 🟢 GOOD   | `SERVICE_ROLE_KEY` только в `scripts/`, не в рантайме                               | —                                                                                                                                  |
| 1.3  | 🟢 GOOD   | Все `NEXT_PUBLIC_*` безопасны для клиента                                           | —                                                                                                                                  |
| 1.4  | 🟢 GOOD   | Sentry client: `maskAllText`, `blockAllMedia`, `hideSourceMaps`                     | —                                                                                                                                  |
| 1.5  | 🟡 MEDIUM | `images.remotePatterns` содержал `*.supabase.co` wildcard                           | ✅ Исправлено — жёсткий hostname `gqzohavylekbxolokzgi.supabase.co`                                                                |
| 1.6  | 🟡 MEDIUM | Нет глобальных security headers в `next.config.ts` (`async headers()`)              | ✅ Исправлено — добавлены HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control на все ответы |
| 1.7  | 🟡 LOW    | Sentry edge: `tracesSampleRate: 1` в проде                                          | ✅ Исправлено — `isProduction ? 0.1 : 1`                                                                                           |
| 1.8  | 🟡 LOW    | Нет `beforeSend` в Sentry — возможная утечка PII                                    | ✅ Исправлено — создан `lib/sentry-scrub.ts`, подключён во все три конфига, `sendDefaultPii: false`                                |
| 1.9  | 🟡 INFO   | `.env.example` упоминает `NEXTAUTH_SECRET`/Google OAuth, но проект на Supabase Auth | ⏳ Удалить legacy при чистке                                                                                                       |
| 1.10 | 🟡 INFO   | `VAPID_PRIVATE_KEY` нигде не используется — Web Push без подписи?                   | ⏳ Проверить на слое notifications                                                                                                 |

---

# Слой 2 — Supabase RLS и миграции

## ✅ Применено 2026-08-20

Проверка живой БД (не миграций) показала, что часть находок ниже была
хуже описанного, часть — уже закрыта. Что сделано:

| Миграция                                     | Что закрыто                                                                                                                                                                                                        | Подтверждение                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `20260820000000_rls_lockdown`                | RLS включён на `app_settings`, `listing_boosts`, `ad_stories`; у `anon` отозваны INSERT/UPDATE/DELETE/TRUNCATE на всей схеме + default privileges                                                                  | `GET /rest/v1/app_settings` с anon-ключом: было 200 с данными → стало `[]`   |
| `20260820000001_profiles_pii_lockdown`       | Снята политика `USING (true)` на `profiles` — она отдавала **все 10 профилей с `phone_number`** любому с anon-ключом. Добавлен `WITH CHECK` на UPDATE (без него крафченый PATCH мог переписать `id` на чужой uuid) | `content-range: 0-9/10` → `*/0`                                              |
| `20260820000002_function_hardening`          | `REVOKE EXECUTE … FROM PUBLIC` на 7 SECURITY DEFINER функций + `SET search_path` на 18 функций                                                                                                                     | `POST /rest/v1/rpc/cleanup_old_listing_views` анонимно: было 200 → стало 401 |
| `20260820000003_fix_expire_overdue_requests` | Функция падала **12 017 раз подряд с 2026-04-17**, ни одного успеха: `gen_random_uuid()::text` после перевода `notifications.id` в uuid                                                                            | `pg_get_functiondef`: `::text` убран, enum `request_expired`, ACL без PUBLIC |

**Важное про `REVOKE … FROM anon`:** первая миграция отзывала EXECUTE у `anon`
и `authenticated`, но advisors продолжали ругаться. Причина — `=X/postgres`
в `proacl`: это грант **PUBLIC**, который наследуют все роли. Postgres выдаёт
его каждой новой функции по умолчанию, поэтому отзыв у `anon` ничего не менял.
Лечится только `FROM PUBLIC`. То же касается `CREATE OR REPLACE` — он сбрасывает
ACL, так что после каждой замены функции revoke нужно повторять.

**Осталось (не критично):**

- 14 × INFO «RLS enabled, no policy» — это намеренный deny-all для PostgREST;
  приложение ходит через Prisma под владельцем БД.
- Leaked password protection выключён — включается тумблером в Dashboard → Auth,
  миграцией не лечится.
- `listings` в publication `supabase_realtime` без SELECT-политики: события
  не доставляются, клиентский код живёт, а функция нет.

---

## 🔴 CRITICAL

### C1. Realtime без RLS на 5 критичных таблицах

**Файл:** [supabase/migrations/20260128000000_enable_realtime.sql](supabase/migrations/20260128000000_enable_realtime.sql)

Таблицы в publication `supabase_realtime`:

- `listing_requests`
- `chat_messages`
- `notifications`
- `request_locations` — **live-геолокация пользователей**
- `listings`

Ни для одной из них в миграциях нет `ENABLE ROW LEVEL SECURITY` + политик SELECT.

**Impact:** Любой подключённый к Realtime видит события всех пользователей по WebSocket, включая live-геолокацию. Для гос. приложения — прямая угроза физической безопасности пользователей (возможность следить за людьми).

**Fix plan:**

1. Проверить live-состояние БД (возможно RLS включён через Dashboard):
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname='public'
     AND tablename IN ('listing_requests','chat_messages','notifications','request_locations','listings');
   ```
2. Создать миграцию `20260424000000_rls_realtime_tables.sql` с ENABLE RLS + SELECT-политиками:
   - `listing_requests`: `USING (auth.uid() IN (client_id, provider_id))` + админ
   - `chat_messages`: через EXISTS в `listing_requests`
   - `notifications`: `USING (auth.uid() = user_id)`
   - `request_locations`: через EXISTS в `listing_requests`
   - `listings`: `USING (is_active = true AND status = 'active')` + владелец + админ
3. Добавить INSERT/UPDATE/DELETE политики, зеркалящие правила ZenStack.
4. Проверить `REPLICA IDENTITY FULL` — возможно downgrade до DEFAULT для снижения объёма данных в стриме.

---

### C2. Таблица `listing_requests` без RLS

**Файл:** [supabase/migrations/20260121000000_add_listing_requests.sql](supabase/migrations/20260121000000_add_listing_requests.sql)

Таблица создана без `ENABLE ROW LEVEL SECURITY`, политики не заданы ни в одной последующей миграции.

**Impact:** Прямой REST-запрос `supabase.from('listing_requests').select('*')` возвращает все заявки всех пользователей: PII (телефоны, адреса, координаты), переписку (message, provider_response, completion_description), цены, статусы.

**Fix plan:** Покрывается общей миграцией из C1 (INSERT/UPDATE/DELETE политики должны зеркалить ZenStack `@@allow` из `schema.zmodel:837-858`).

---

### C3. `reviews` INSERT — нет проверки связи с `request_id`

**Файл:** [supabase/migrations/20260124000003_completion_flow_fields.sql:68](supabase/migrations/20260124000003_completion_flow_fields.sql#L68)

```sql
CREATE POLICY "reviews_client_insert"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());
```

Проверяется только `client_id = auth.uid()`, но не факт, что пользователь был клиентом в этом `request_id` и что `provider_id` соответствует реальному provider'у реквеста.

**Impact:**

- Атакующий пишет себя клиентом в **любой** request и занимает слот отзыва (UNIQUE(request_id)).
- Подставляет фейковый 1-star отзыв любому провайдеру.
- Настоящий клиент не может написать отзыв — слот занят.
- Можно накрутить себе 5-star отзывы (сам себе provider).

**Fix plan:** Миграция с переписанной политикой:

```sql
DROP POLICY IF EXISTS "reviews_client_insert" ON public.reviews;
CREATE POLICY "reviews_client_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM listing_requests lr
      WHERE lr.id = request_id
        AND lr.client_id = auth.uid()
        AND lr.provider_id = reviews.provider_id
        AND lr.status = 'completed'
    )
  );
```

---

## 🔴 HIGH

### H1. Categories storage — любой user может менять иконки

**Файл:** [supabase/migrations/20260115000000_categories_storage.sql:30-51](supabase/migrations/20260115000000_categories_storage.sql#L30)

Политики INSERT/UPDATE/DELETE требуют только `auth.role() = 'authenticated'`. Комментарий в коде сам признаёт проблему: "In production, restrict to admin role".

**Impact:** Дефейс категорий, произвольная загрузка контента (в рамках MIME-whitelist, но всё равно 5MB на категорию × N юзеров).

**Fix plan:** Мигация, заменяющая политики на:

```sql
AND EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND role IN ('admin','manager')
)
```

---

### H2. Таблица `app_settings` без RLS

**Файл:** [supabase/migrations/20260422000000_verified_profiles.sql:23](supabase/migrations/20260422000000_verified_profiles.sql#L23)

Таблица хранит бизнес-настройки (`verified_threshold` — порог верификации provider'а). RLS не включён.

**Impact:** Любой авторизованный юзер может:

- `UPDATE app_settings SET value='0'::jsonb WHERE key='verified_threshold'` → при следующем триггере все provider'ы становятся verified.
- Читать будущие настройки (feature flags, цены, комиссии, если добавят).

**Fix plan:**

```sql
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_read_all" ON app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_admin_write" ON app_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

### H3. 5 SECURITY DEFINER функций без `SET search_path`

**Файлы:**

- [20260122000002_expire_requests_cron.sql](supabase/migrations/20260122000002_expire_requests_cron.sql) — `expire_overdue_requests`
- [20260417000002_wave4_ttl_cron.sql](supabase/migrations/20260417000002_wave4_ttl_cron.sql) — `cleanup_old_notifications`, `cleanup_old_listing_views`, `cleanup_old_request_locations`
- [20260423000000_boost_lifecycle.sql](supabase/migrations/20260423000000_boost_lifecycle.sql) — `expire_and_prune_boosts`

**Impact:** search_path hijacking — если атакующий получает CREATE-право в любой схеме, попадающей в search_path, он создаёт overloaded функцию (`COUNT`, `COALESCE`, `gen_random_uuid` и пр.), которая исполняется с правами владельца функции (обычно superuser).

**Fix plan:** Миграция, пересоздающая каждую через `CREATE OR REPLACE` с `SET search_path = pg_catalog, public, pg_temp`:

```sql
CREATE OR REPLACE FUNCTION expire_overdue_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$ ... $$;
```

---

### H4. `reviews` UPDATE — клиент может сменить `provider_id`

**Файл:** [supabase/migrations/20260124000003_completion_flow_fields.sql:74](supabase/migrations/20260124000003_completion_flow_fields.sql#L74) + ZenStack [schema.zmodel:996](schema.zmodel#L996)

RLS: `USING (client_id = auth.uid())` — нет WITH CHECK. ZenStack: `@@allow('update', auth().id == client_id)` — без field-level ограничений.

**Impact:** Клиент редактирует свой отзыв и перенаправляет его на **другого провайдера** через UPDATE `provider_id`.

**Fix plan:**

1. RLS:
   ```sql
   DROP POLICY IF EXISTS "reviews_client_update" ON public.reviews;
   CREATE POLICY "reviews_client_update" ON public.reviews
     FOR UPDATE TO authenticated
     USING (client_id = auth.uid())
     WITH CHECK (
       client_id = auth.uid()
       AND provider_id = (SELECT provider_id FROM reviews WHERE id = reviews.id)
       AND request_id  = (SELECT request_id  FROM reviews WHERE id = reviews.id)
     );
   ```
   Либо проще — через trigger, запрещающий менять `provider_id`/`request_id`/`client_id`:
   ```sql
   CREATE OR REPLACE FUNCTION reviews_prevent_ownership_change()
   RETURNS trigger LANGUAGE plpgsql
   SET search_path = pg_catalog, public, pg_temp
   AS $$
   BEGIN
     IF NEW.provider_id IS DISTINCT FROM OLD.provider_id
        OR NEW.request_id IS DISTINCT FROM OLD.request_id
        OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
       RAISE EXCEPTION 'Cannot change ownership fields of a review';
     END IF;
     RETURN NEW;
   END $$;
   ```

---

### H5. `listing_boosts` — владелец может сам продлять VIP

**Файл:** [schema.zmodel:1142](schema.zmodel#L1142)

`@@allow('update', auth().id == user_id)` без field-level — user может UPDATE `plan`, `expires_at`, `status`.

**Impact:** Бесплатный вечный VIP: `UPDATE listing_boosts SET expires_at = '2099-01-01', plan='14day' WHERE id=...`.

**Fix plan:**

1. ZenStack: сузить до smена только `status` (= cancel):
   ```
   @@allow('update', auth() != null && auth().id == user_id
     && future().plan == plan
     && future().expires_at == expires_at
     && future().listing_id == listing_id)
   ```
   (Синтаксис `future()` / `before()` — уточнить по доке ZenStack.)
2. На уровне БД — trigger, запрещающий менять `plan`/`expires_at`/`listing_id`/`user_id` пользователем (разрешать только для service_role).

---

### H6. Realtime REPLICA IDENTITY FULL

**Файл:** [supabase/migrations/20260128000000_enable_realtime.sql:22](supabase/migrations/20260128000000_enable_realtime.sql#L22)

`chat_messages`, `listing_requests`, `request_locations` имеют `REPLICA IDENTITY FULL` — в WAL/stream попадают все колонки OLD row при UPDATE.

**Impact:** После фикса RLS (C1) объём данных в realtime-стриме шире, чем необходимо. Усугубляет последствия при любом промахе в политике.

**Fix plan:** После C1 проанализировать, нужно ли FULL для бизнес-логики (diff-подсчёт). Если не нужно — откатить до DEFAULT:

```sql
ALTER TABLE chat_messages REPLICA IDENTITY DEFAULT;
```

---

## 🟡 MEDIUM

### M1. Plpgsql функции без `SET search_path` (не SECURITY DEFINER)

**Файлы:** `20260119000000_manual_fulltext.sql`, `20260417000000_wave3_integrity.sql`, `20260417000001_wave4_fulltext_mongolian.sql`, `20260422000000_verified_profiles.sql`

Функции: `listings_search_vector_update`, `recalc_provider_rating`, `reviews_counters_trigger`, `favorites_counter_trigger`, `completed_jobs_counter_trigger`, `listings_published_at_trigger`, `verified_threshold`, `recompute_is_verified`.

**Fix plan:** Миграция, добавляющая `SET search_path = pg_catalog, public, pg_temp` во все (`CREATE OR REPLACE` идемпотентно).

---

### M2. `work-completion-photos` bucket публичный

**Файл:** [supabase/migrations/20260124000001_work_completion_photos.sql:11](supabase/migrations/20260124000001_work_completion_photos.sql#L11)

`public: true`. Фото завершённых работ доступны по прямому URL кому угодно.

**Fix plan:** Обсудить с продуктом. Если фото не критичны (общие виды работ) — оставить. Если могут содержать PII (люди, документы, номерные знаки) — переделать в приватный bucket + signed URLs по модели `chat-attachments`.

---

### M3. `chat_attachments` DELETE на fake путях

**Файл:** [supabase/migrations/20260123000000_chat_attachments.sql:78](supabase/migrations/20260123000000_chat_attachments.sql#L78)

DELETE проверяет только `(storage.foldername(name))[2] = auth.uid()::text`, не валидирует первый сегмент как существующий request_id.

**Fix plan:** Добавить EXISTS-проверку как в SELECT/INSERT:

```sql
AND EXISTS (
  SELECT 1 FROM listing_requests lr
  WHERE lr.id::text = (storage.foldername(name))[1]
    AND (lr.client_id = auth.uid() OR lr.provider_id = auth.uid())
)
```

---

### M4. UPDATE-политики без WITH CHECK

**Файлы:** `20260113000000_push_notifications.sql`, `20260124000001_work_completion_photos.sql`, `20260124000003_completion_flow_fields.sql`

Политики UPDATE имеют только `USING`. Пользователь может при UPDATE сменить `user_id`/`client_id` на чужой.

**Fix plan:** Массовая миграция, добавляющая `WITH CHECK (<same condition as USING>)` ко всем UPDATE-политикам.

---

### M5. `ad_stories` — владелец меняет `views_count`/`plan`

**Файл:** [schema.zmodel:1094](schema.zmodel#L1094)

`@@allow('update,delete', auth().id == user_id)` без field-level — накрутка просмотров, апгрейд `1day → 2day` без оплаты.

**Fix plan:** Аналогично H5 — ограничить поля через `future()` или триггер.

---

### M6. `notifications` — создание другим юзерам

**Файл:** [schema.zmodel:900](schema.zmodel#L900)

`@@allow('create', auth().id != user_id)` — спам уведомлениями с произвольным `title`/`message`/`type`.

**Fix plan:** Ограничить создание нотификаций клиентом до белого списка типов, связанных с его действиями (например, `message_received` — только если он отправитель в чате). Серверные типы (`request_accepted`, `cron`-генерируемые) — только через service_role/прямой Prisma.

---

### M7. `listings_views.ip_address` — PII

**Файл:** [supabase/migrations/20260129000000_add_optimization_indexes.sql:48](supabase/migrations/20260129000000_add_optimization_indexes.sql#L48)

IP адрес — PII по GDPR и аналогичным нормам. Retention 90 дней есть (✅), но:

- Хранится в plaintext
- RLS таблицы не проверен отдельно

**Fix plan:**

1. Проверить RLS на `listings_views` (SELECT должен быть только для admin).
2. Рассмотреть хеширование IP с солью вместо plaintext (для dedup достаточно `sha256(ip + secret_salt)`).
3. Задокументировать retention в privacy policy.

---

## 🟡 LOW

### L1. `ad-stories` публичный bucket 10MB — DoS storage

**Fix plan:** Добавить триггер или cron, ограничивающий кол-во активных stories на юзера.

### L2. `completion_photos` — массив URL без валидации

**Fix plan:**

- На уровне БД: CHECK constraint на формат URL (regex `^https://`).
- На клиенте: никогда не рендерить `src={photo}` без валидации протокола.

### L3. `expire_overdue_requests` — title в тексте уведомления без экранирования

Косметика. Если UI использует только `textContent` — ок.

### L4. `reviews` — нет DELETE-политики

**Fix plan:** Обсудить с продуктом. Если клиент должен иметь право удалить — добавить политику `DELETE USING (client_id = auth.uid())`. Если нет — оставить, но дать админу возможность модерации.

---

## 🟢 GOOD (подтверждённые хорошие практики)

- `.env` не в git, `SERVICE_ROLE_KEY` только в `scripts/`
- `chat-attachments` bucket приватный + path-based ownership
- `work-completion-photos` — provider-scoped INSERT через EXISTS
- FK `profiles.id -> auth.users(id)` с CASCADE
- Partial unique indexes (`listing_boosts`, active requests) — DB-level бизнес-инварианты
- TTL cron jobs на `notifications`, `listings_views`, `request_locations` — PII retention
- Check constraints на coords, prices, time formats, plan enums, counters

---

## План выполнения фиксов Слоя 2

**Порядок (по убыванию риска):**

### Этап 1 — Экстренный (сделать до любого прод-запуска)

1. Проверить live-состояние RLS в Supabase (возможно часть включена через Dashboard):
   ```sql
   SELECT tablename, rowsecurity, policyname FROM pg_tables
   LEFT JOIN pg_policies USING (tablename)
   WHERE schemaname = 'public' ORDER BY tablename, policyname;
   ```
2. Создать миграцию `20260424000000_rls_critical_tables.sql` — C1 + C2: RLS на все 5 realtime-таблиц, зеркалящий ZenStack правила.
3. Создать миграцию `20260424000001_fix_reviews_rls.sql` — C3 + H4.

### Этап 2 — Критичный (в ту же неделю)

4. Миграция `20260424000002_fix_categories_storage.sql` — H1 (admin-only).
5. Миграция `20260424000003_app_settings_rls.sql` — H2.
6. Миграция `20260424000004_security_definer_search_path.sql` — H3: пересоздать 5 SECURITY DEFINER функций с фиксированным search_path.
7. ZenStack правка `schema.zmodel` — H5, M5, M6 (field-level ограничения).

### Этап 3 — Гигиенический

8. Миграция `20260424000005_plpgsql_search_path.sql` — M1.
9. Миграция `20260424000006_update_policies_with_check.sql` — M4.
10. Миграция `20260424000007_chat_attachments_delete_fix.sql` — M3.
11. Триггеры для H4 (prevent ownership change) + H5/M5 (prevent field mutation).
12. Обсуждение с продуктом: M2 (public work-photos), M7 (IP retention), L4 (review delete).

### Этап 4 — Проверка

13. Прогнать Supabase Security Advisor — должен быть зелёным.
14. Написать e2e-тесты: атакующий vs защищённый endpoint для каждой C/H находки.
15. Нагрузочный тест realtime — убедиться, что подписка от юзера A не видит events юзера B.

---

## Следующие слои

Слой 2 полностью задокументирован. Перед переходом к Слою 3 (middleware/CSRF/CSP/auth-гварды) — нужно закрыть экстренный этап фиксов. Иначе дальнейший аудит бесполезен: дыры в RLS обходят любую защиту на уровне приложения.

**Решение:** ждёт команды пользователя — править Layer 2 сейчас или идти дальше на Layer 3 параллельно.
