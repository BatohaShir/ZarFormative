# Глубокий код-ревью Tsogts.mn

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ (исправить немедленно)

### 1. SQL Injection в поиске

**Файл:** `app/api/search/route.ts`

- `to_tsquery('russian', ${tsQuery})` — пользовательский ввод интерполируется в сырой SQL
- **Фикс:** использовать `plainto_tsquery()` или параметризованный запрос

### 2. `force-dynamic` на главной странице

**Файл:** `app/page.tsx`

- Каждый запрос бьёт по базе — нет кэширования вообще
- **Фикс:** заменить на `revalidate: 60` (ISR) — страница будет обновляться раз в минуту

### 3. Нет серверной валидации переходов статусов заявок

- 13 статусов, но переходы проверяются только на фронте
- Прямой API-вызов может перевести заявку в невалидный статус
- **Фикс:** добавить middleware/валидацию на backend для state machine

### 4. Авторизация только на фронтенде (чат, заявки)

**Файл:** компоненты request-chat и связанные

- `isClient = request.client_id === user?.id` — проверка в React, легко обойти
- **Фикс:** все проверки прав должны быть на backend (ZenStack `@@allow` правила)

### 5. File upload без валидации расширений на сервере

**Файл:** `lib/storage/listings.ts`

- `file.name.split(".").pop()` — MIME-тип можно подделать
- **Фикс:** whitelist расширений + серверная проверка содержимого файла

### 6. Promise.all без try-catch на главной

**Файл:** `app/page.tsx`

- Если одна из двух queries упадёт — белый экран
- **Фикс:** обернуть в try-catch с fallback данными

---

## ВЫСОКИЙ ПРИОРИТЕТ (Performance)

### 7. Нет пагинации в админке

**Файлы:** `app/admin/users/`, `app/admin/listings/`, `app/admin/requests/`

- Грузятся ВСЕ записи сразу — при 10K+ записей приложение ляжет
- **Фикс:** cursor-based пагинация с `take: 25`

### 8. Нет пагинации чата

**Файл:** request-chat

- Все сообщения грузятся разом, нет виртуализации
- При 1000+ сообщений — тормоза
- **Фикс:** cursor-пагинация + `react-window` для виртуализации

### 9. Двойная загрузка категорий

**Файл:** `components/categories-section.tsx`

- SSR передаёт данные, но клиент всё равно делает свой API запрос
- **Фикс:** использовать SSR-данные как initialData, не дублировать запрос

### 10. Query invalidation слишком широкая

```typescript
queryClient.invalidateQueries({ queryKey: ["listing_requests"] });
```

- Инвалидирует ВСЕ запросы всех пользователей
- **Фикс:** скоупить ключи: `["listing_requests", userId]`

### 11. N+1 в cron expire-requests

- Создаёт уведомления в цикле вместо batch insert
- **Фикс:** использовать `createMany`

### 12. Нет индексов для поиска

- Нет composite index на `(status, is_active, created_at)` для listings
- **Фикс:** добавить в schema.zmodel

---

## СРЕДНИЙ ПРИОРИТЕТ (Надёжность)

### 13. Race condition: дублирование сообщений в чате

- Optimistic message с `id: optimistic-${Date.now()}`, а realtime приходит с UUID
- Нет дедупликации → пользователь видит 2 сообщения
- **Фикс:** заменять optimistic-сообщение по `request_id + created_at`

### 14. Race condition: одновременные обновления статуса

- Нет optimistic locking (нет поля `version`)
- Провайдер и клиент могут одновременно менять статус
- **Фикс:** добавить `updatedAt` comparison или version field

### 15. Фавориты: нет rollback при ошибке

**Файл:** `contexts/favorites-context.tsx`

- Optimistic update без отката: если мутация упала — UI врёт
- **Фикс:** `onError` callback должен откатывать optimisticIds

### 16. `window.location.reload()` при смене языка

**Файл:** `contexts/auth-context.tsx`

- Полная перезагрузка страницы — теряется unsaved state
- **Фикс:** `router.refresh()` или state update

### 17. Нет обработки ошибок в автосохранении

**Файл:** `components/create-listing-client.tsx`

- `catch { }` — ошибки глотаются молча
- **Фикс:** показывать toast при ошибке, retry логика

### 18. Осиротевшие файлы при ошибке чата

- Файл загружается в storage, но если message creation упадёт — файл остаётся навсегда
- **Фикс:** cron для очистки orphaned files

### 19. Отзывы: можно оставить без завершения заказа

- Нет серверной проверки что `request.status === 'completed'`
- Нет unique constraint на `(request_id, client_id)`
- **Фикс:** DB constraint + backend валидация

---

## СРЕДНИЙ ПРИОРИТЕТ (Code Quality)

### 20. Дублирование кода

- **EducationSection** и **WorkExperienceSection** — 90% одинаковый код
- **Storage модули** (listings, requests, chat-attachments) — 70% дублирования
- **Админ-формы** (aimags, districts, khoroos, categories) — идентичные паттерны
- **Фикс:** extracted shared hooks и компоненты

### 21. Ref update во время render

**Файл:** `components/listing-card.tsx`

```typescript
isTogglingRef.current = isToggling; // нарушение правил React
```

- **Фикс:** обновлять ref в useEffect

### 22. Dead code в поиске

**Файл:** `components/search-input.tsx`

- Условие `query.length >= 2 && query.length < 2` — невозможно
- **Фикс:** удалить мёртвый код

### 23. Менеджеры видят кнопки удаления в админке

- UI показывает DELETE, но backend запрещает
- **Фикс:** проверять роль перед рендерингом кнопки

### 24. Logger не работает в production

**Файл:** `lib/logger.ts`

- Dev-only логирование, в проде ничего не пишется
- **Фикс:** Pino/Winston для production logging

---

## ACCESSIBILITY & UX

### 25. Нет `aria-label` на иконках-кнопках

- Поиск, лайки, навигация, социальные сети — всё без aria-label
- Screen readers не могут объяснить назначение

### 26. Клавиатурная навигация в поиске сломана

- Нет ArrowUp/ArrowDown для навигации по результатам
- Нет `role="listbox"` на dropdown

### 27. Нет skip-to-content ссылки

**Файл:** `app/layout.tsx`

- Клавиатурные пользователи проходят через всю навигацию

### 28. Alert() вместо toast в настройках уведомлений

- Блокирующий `alert()` — плохой UX, несовместимо с остальным приложением

---

## БЕЗОПАСНОСТЬ

### 29. Профиль хранится в localStorage

**Файл:** `hooks/use-current-user.ts`

- Телефон, имя — в незашифрованном localStorage
- XSS атака = утечка данных

### 30. Нет CSP заголовков

- Content Security Policy не настроен в middleware
- XSS атаки не блокируются на уровне браузера

### 31. Нет CSRF защиты

- Все POST/PUT/DELETE без CSRF токенов
- **Фикс:** origin validation в middleware

### 32. Rate limit обходится через x-forwarded-for

**Файл:** `lib/rate-limit.ts`

- Заголовок доверяется без проверки
- **Фикс:** валидировать через trusted proxies

---

## ПЛАН ДЕЙСТВИЙ

| Неделя       | Задачи                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| **Сейчас**   | #1 SQL injection, #2 ISR, #3 status validation, #6 try-catch                 |
| **Неделя 1** | #4 backend auth, #5 file validation, #7 пагинация админки, #8 пагинация чата |
| **Неделя 2** | #13-14 race conditions, #15 favorites rollback, #19 review integrity         |
| **Неделя 3** | #9-12 performance, #20-24 code quality                                       |
| **Неделя 4** | #25-28 accessibility, #29-32 security hardening                              |
