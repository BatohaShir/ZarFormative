# Skeleton Fix Plan

## Аудит: 12 loading.tsx файлов vs реальные страницы

### Проблемы найдены:

#### 1. `app/loading.tsx` (Главная) — НЕСООТВЕТСТВИЕ

**Отсутствуют блоки:**

- AdStories (рекламные сторис между hero и категориями)
- Recommended Listings (карточки объявлений после категорий)
- Footer skeleton
- Search: в скелетоне один Skeleton, а на странице SearchInput + CitySelect (2 элемента в ряд)
- Sticky header отсутствует backdrop-blur класс

#### 2. `app/account/me/stats/loading.tsx` — НЕСООТВЕТСТВИЕ

**Проблемы:**

- Нет page title с иконкой (на странице есть большой заголовок с BadgeCheck иконкой)
- Нет секций: Goal progress, Requests summary, Income, Reviews
- Desktop nav не соответствует (на странице полный nav с 5 кнопками)
- Слишком примитивный скелетон

#### 3. `app/admin/loading.tsx` — ПРИМИТИВНЫЙ

**Проблемы:**

- Sidebar: 8 одинаковых строк, а на реальной странице есть лого + навигация с иконками + профиль
- Content: слишком generic (3 карточки + один блок)
- Нет mobile header (на мобильном sidebar скрыт, должна быть hamburger кнопка)

#### 4. `app/services/loading.tsx` — ОК (детальный, соответствует)

#### 5. `app/services/[id]/loading.tsx` — ОК (использует ServiceDetailSkeleton из компонента)

#### 6. `app/services/create/loading.tsx` — ОК (детальный, соответствует)

#### 7. `app/account/[name]/loading.tsx` — ОК (профиль с аватаром, stats, services, reviews)

#### 8. `app/account/me/loading.tsx` — ОК (мой профиль, подробный)

#### 9. `app/account/me/favorites/loading.tsx` — ОК (header + grid карточек)

#### 10. `app/account/me/services/loading.tsx` — ОК (header + tabs + grid с actions)

#### 11. `app/account/me/requests/loading.tsx` — ОК (header + search + tabs + list)

#### 12. `app/account/me/settings/loading.tsx` — ОК (секции настроек)

---

## Step 1: Fix главная страница + stats + admin loading.tsx

- Исправить `app/loading.tsx` — добавить AdStories, search row, recommended listings, footer
- Исправить `app/account/me/stats/loading.tsx` — добавить все секции
- Исправить `app/admin/loading.tsx` — улучшить sidebar и content

## Step 2: Ревью Agent-2

## Step 3: Финальная оценка Agent-3
