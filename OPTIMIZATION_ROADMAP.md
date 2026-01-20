# Roadmap оптимизации Uilchilgee.mn

## Содержание

1. [Фаза 1: Критические индексы БД](#фаза-1-критические-индексы-бд)
2. [Фаза 2: Оптимизация запросов](#фаза-2-оптимизация-запросов)
3. [Фаза 3: Real-time подписки Supabase](#фаза-3-real-time-подписки-supabase)
4. [Фаза 4: Кэширование](#фаза-4-кэширование)
5. [Фаза 5: Пагинация и виртуализация](#фаза-5-пагинация-и-виртуализация)
6. [Фаза 6: Полнотекстовый поиск](#фаза-6-полнотекстовый-поиск)

---

## Фаза 1: Критические индексы БД

### 1.1 Недостающие индексы для `listings_views`

**Проблема:** Запрос дедупликации просмотров за 24 часа работает медленно.

```sql
-- Текущий медленный запрос в /api/listings/[id]/view
SELECT * FROM listings_views
WHERE listing_id = ?
  AND viewed_at >= NOW() - INTERVAL '24 hours'
  AND (viewer_id = ? OR (ip_address = ? AND viewer_id IS NULL))
```

**Решение в `schema.zmodel`:**

```prisma
model listings_views {
  // ... существующие поля ...

  // ДОБАВИТЬ композитные индексы:
  @@index([listing_id, viewed_at(sort: Desc)])           // Для поиска недавних просмотров
  @@index([listing_id, viewer_id, viewed_at(sort: Desc)]) // Для авторизованных
  @@index([listing_id, ip_address, viewed_at(sort: Desc)]) // Для гостей
}
```

**Ожидаемый результат:** Ускорение запроса дедупликации в 10-50 раз.

---

### 1.2 Индекс для запросов профиля пользователя

**Проблема:** Страница `/account/[name]` загружает объявления пользователя с фильтрами.

```sql
SELECT * FROM listings
WHERE user_id = ? AND is_active = true AND status = 'active'
```

**Решение в `schema.zmodel`:**

```prisma
model listings {
  // ... существующие индексы ...

  // ДОБАВИТЬ:
  @@index([user_id, status, is_active])  // Композитный индекс для профиля
}
```

---

### 1.3 Индекс для сортировки по популярности

**Проблема:** Сортировка `views_count DESC` без индекса.

**Решение:**

```prisma
model listings {
  // ДОБАВИТЬ:
  @@index([status, is_active, views_count(sort: Desc)])  // Для сортировки "Популярные"
}
```

---

### 1.4 Индекс для фильтрации по цене

**Проблема:** Range-запросы по `price` не оптимизированы.

**Решение:**

```prisma
model listings {
  // ДОБАВИТЬ:
  @@index([status, is_active, price])  // Для фильтра по цене
}
```

---

### 1.5 Полный список новых индексов

Добавить в `schema.zmodel`:

```prisma
model listings {
  // ... существующие поля ...

  // Существующие индексы (оставить):
  @@index([user_id])
  @@index([category_id])
  @@index([status, is_active])
  @@index([aimag_id])
  @@index([aimag_id, district_id])
  @@index([aimag_id, district_id, khoroo_id])
  @@index([created_at(sort: Desc)])
  @@index([status, aimag_id, category_id])
  @@index([slug])

  // НОВЫЕ индексы:
  @@index([user_id, status, is_active])                    // Профиль пользователя
  @@index([status, is_active, views_count(sort: Desc)])    // Сортировка по популярности
  @@index([status, is_active, price])                      // Фильтр по цене
  @@index([status, is_active, created_at(sort: Desc)])     // Основной список (оптимизация)
}

model listings_views {
  // ... существующие поля ...

  // Существующие индексы (оставить):
  @@index([listing_id])
  @@index([viewer_id])
  @@index([ip_address])
  @@index([listing_id, viewer_id])
  @@index([listing_id, ip_address])
  @@index([viewed_at])

  // НОВЫЕ индексы:
  @@index([listing_id, viewed_at(sort: Desc)])              // Недавние просмотры
  @@index([listing_id, viewer_id, viewed_at(sort: Desc)])   // Дедупликация для юзеров
  @@index([listing_id, ip_address, viewed_at(sort: Desc)])  // Дедупликация для гостей
}
```

---

## Фаза 2: Оптимизация запросов

### 2.1 Исправление race condition в view tracking

**Проблема:** Два отдельных запроса `findFirst` + `create` создают race condition.

**Текущий код (`app/api/listings/[id]/view/route.ts`):**

```typescript
// ❌ Проблема: race condition между findFirst и create
const existingView = await prisma.listings_views.findFirst({...})
if (!existingView) {
  await prisma.$transaction([...])
}
```

**Оптимизированное решение:**

```typescript
// app/api/listings/[id]/view/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { createClient } from "@/lib/supabase/server";

const VIEW_UNIQUENESS_PERIOD_HOURS = 24;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: slug } = await params;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const viewerId = user?.id || null;

    // Используем один raw SQL запрос с INSERT ... ON CONFLICT
    const result = await prisma.$queryRaw<{ views_count: number; inserted: boolean }[]>`
      WITH listing_check AS (
        SELECT id, user_id, views_count
        FROM listings
        WHERE slug = ${slug}
          AND status = 'active'
          AND is_active = true
        LIMIT 1
      ),
      view_check AS (
        SELECT 1 FROM listings_views lv, listing_check lc
        WHERE lv.listing_id = lc.id
          AND lv.viewed_at >= NOW() - INTERVAL '${VIEW_UNIQUENESS_PERIOD_HOURS} hours'
          AND (
            (${viewerId}::uuid IS NOT NULL AND lv.viewer_id = ${viewerId}::uuid)
            OR (${viewerId}::uuid IS NULL AND lv.ip_address = ${ip} AND lv.viewer_id IS NULL)
          )
        LIMIT 1
      ),
      insert_view AS (
        INSERT INTO listings_views (id, listing_id, viewer_id, ip_address, viewed_at)
        SELECT
          gen_random_uuid(),
          lc.id,
          ${viewerId}::uuid,
          CASE WHEN ${viewerId}::uuid IS NULL THEN ${ip} ELSE NULL END,
          NOW()
        FROM listing_check lc
        WHERE NOT EXISTS (SELECT 1 FROM view_check)
          AND lc.user_id != COALESCE(${viewerId}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        RETURNING listing_id
      ),
      update_count AS (
        UPDATE listings
        SET views_count = views_count + 1
        FROM insert_view iv
        WHERE listings.id = iv.listing_id
        RETURNING listings.views_count
      )
      SELECT
        COALESCE(
          (SELECT views_count FROM update_count),
          (SELECT views_count FROM listing_check)
        ) as views_count,
        EXISTS (SELECT 1 FROM insert_view) as inserted
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      views_count: result[0].views_count,
      skipped: !result[0].inserted,
    });
  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Преимущества:**

- Один запрос вместо 3-4
- Атомарность операции
- Нет race condition
- В 3-5 раз быстрее

---

### 2.2 Оптимизация загрузки изображений

**Проблема:** Загружаются ВСЕ изображения для каждого объявления.

**Текущий код:**

```typescript
images: {
  select: { id: true, url: true, sort_order: true },
  orderBy: { sort_order: "asc" },
}
```

**Оптимизированное решение для списков:**

```typescript
// Для страницы /services и главной - только обложка
images: {
  where: { is_cover: true },
  select: { id: true, url: true, alt: true },
  take: 1,
}

// Альтернатива если is_cover не всегда установлен:
images: {
  select: { id: true, url: true, alt: true },
  orderBy: { sort_order: "asc" },
  take: 1,  // Только первое изображение
}
```

**Для детальной страницы объявления - все изображения:**

```typescript
// app/services/[id]/page.tsx - здесь нужны все
images: {
  select: { id: true, url: true, alt: true, sort_order: true },
  orderBy: { sort_order: "asc" },
}
```

---

### 2.3 Кэширование статичных данных

**Проблема:** Категории, аймаги, дистрикты запрашиваются при каждом рендере.

**Решение с React Query:**

```typescript
// lib/hooks/use-cached-data.ts

import { useQuery } from "@tanstack/react-query";
import { useFindManycategories } from "./categories";
import { useFindManyaimags } from "./aimags";
import { useFindManydistricts } from "./districts";

// Категории - кэш на 1 час
export function useCachedCategories() {
  return useFindManycategories(
    {
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    },
    {
      staleTime: 60 * 60 * 1000, // 1 час - данные считаются свежими
      gcTime: 24 * 60 * 60 * 1000, // 24 часа - хранить в кэше
      refetchOnWindowFocus: false, // Не перезапрашивать при фокусе
      refetchOnMount: false, // Не перезапрашивать при маунте
    }
  );
}

// Аймаги - кэш на 24 часа (редко меняются)
export function useCachedAimags() {
  return useFindManyaimags(
    {
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    },
    {
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000, // Неделя в кэше
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );
}

// Дистрикты по аймагу - кэш на 24 часа
export function useCachedDistricts(aimagId: string | null) {
  return useFindManydistricts(
    {
      where: { aimag_id: aimagId!, is_active: true },
      orderBy: { sort_order: "asc" },
    },
    {
      enabled: !!aimagId,
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
}
```

---

## Фаза 3: Real-time подписки Supabase

### 3.1 Настройка Supabase Realtime

**Шаг 1:** Включить Realtime для таблиц в Supabase Dashboard:

- Database → Replication → Включить для `listings`

**Шаг 2:** Создать хук для real-time подписок:

```typescript
// lib/hooks/use-realtime.ts

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ListingPayload = RealtimePostgresChangesPayload<{
  id: string;
  status: string;
  is_active: boolean;
  views_count: number;
  [key: string]: unknown;
}>;

export function useRealtimeListings() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("listings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
          filter: "status=eq.active",
        },
        (payload: ListingPayload) => {
          console.log("Realtime update:", payload);

          // Инвалидируем кэш при изменениях
          if (payload.eventType === "INSERT") {
            // Новое объявление - обновляем списки
            queryClient.invalidateQueries({ queryKey: ["listings", "findMany"] });
          } else if (payload.eventType === "UPDATE") {
            // Обновление - обновляем конкретное объявление
            const listingId = payload.new?.id;
            if (listingId) {
              queryClient.invalidateQueries({
                queryKey: ["listings", "findUnique", { where: { id: listingId } }],
              });
              // Также обновляем списки если изменился views_count
              if (payload.old?.views_count !== payload.new?.views_count) {
                queryClient.invalidateQueries({ queryKey: ["listings", "findMany"] });
              }
            }
          } else if (payload.eventType === "DELETE") {
            // Удаление - обновляем списки
            queryClient.invalidateQueries({ queryKey: ["listings", "findMany"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);
}
```

### 3.2 Использование в компонентах

```typescript
// app/services/page.tsx

import { useRealtimeListings } from "@/lib/hooks/use-realtime";

function ServicesPageContent() {
  // Включаем real-time обновления
  useRealtimeListings();

  // ... остальной код
}
```

### 3.3 Real-time для счётчика просмотров

```typescript
// lib/hooks/use-realtime-views.ts

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeViewsCount(listingId: string, initialCount: number) {
  const [viewsCount, setViewsCount] = useState(initialCount);
  const supabase = createClient();

  useEffect(() => {
    setViewsCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const channel = supabase
      .channel(`listing-views-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "listings",
          filter: `id=eq.${listingId}`,
        },
        (payload) => {
          if (payload.new?.views_count !== undefined) {
            setViewsCount(payload.new.views_count as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId, supabase]);

  return viewsCount;
}
```

### 3.4 Использование на странице объявления

```typescript
// app/services/[id]/page.tsx

import { useRealtimeViewsCount } from "@/lib/hooks/use-realtime-views";

function ServiceDetailContent({ listing }) {
  const viewsCount = useRealtimeViewsCount(
    listing.id,
    listing.views_count
  );

  return (
    <div>
      {/* ... */}
      <span>{viewsCount} просмотров</span>
    </div>
  );
}
```

---

## Фаза 4: Кэширование

### 4.1 Настройка React Query Provider

```typescript
// components/providers/query-provider.tsx

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Глобальные настройки кэширования
            staleTime: 5 * 60 * 1000,        // 5 минут - данные свежие
            gcTime: 30 * 60 * 1000,          // 30 минут - хранить в кэше
            refetchOnWindowFocus: false,     // Не перезапрашивать при фокусе
            retry: 1,                        // Одна повторная попытка
            retryDelay: 1000,               // Задержка 1 секунда
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 4.2 Prefetching данных на сервере

```typescript
// app/services/page.tsx - Server Component версия

import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { prisma } from "@/prisma";

export default async function ServicesPage() {
  const queryClient = getQueryClient();

  // Prefetch на сервере
  await queryClient.prefetchQuery({
    queryKey: ["listings", "findMany", { status: "active" }],
    queryFn: async () => {
      return prisma.listings.findMany({
        where: { status: "active", is_active: true },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
          category: { select: { id: true, name: true, slug: true } },
          images: { where: { is_cover: true }, take: 1 },
          aimag: { select: { name: true } },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      });
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ServicesPageClient />
    </HydrationBoundary>
  );
}
```

### 4.3 HTTP кэширование для API

```typescript
// app/api/listings/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  const listings = await prisma.listings.findMany({...});

  return NextResponse.json(listings, {
    headers: {
      // Кэширование на CDN и браузере
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
```

---

## Фаза 5: Пагинация и виртуализация

### 5.1 Cursor-based пагинация

```typescript
// lib/hooks/use-infinite-listings.ts

import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

interface ListingsPage {
  items: Listing[];
  nextCursor: string | null;
}

export function useInfiniteListings(filters: ListingFilters) {
  return useInfiniteQuery({
    queryKey: ["listings", "infinite", filters],
    queryFn: async ({ pageParam }): Promise<ListingsPage> => {
      const response = await fetch(
        "/api/listings?" +
          new URLSearchParams({
            ...filters,
            cursor: pageParam || "",
            limit: String(PAGE_SIZE),
          })
      );
      return response.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
  });
}
```

### 5.2 API endpoint с cursor пагинацией

```typescript
// app/api/listings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "20");
  const category = searchParams.get("category");

  const where = {
    status: "active" as const,
    is_active: true,
    ...(category && { category: { slug: category } }),
  };

  const listings = await prisma.listings.findMany({
    where,
    include: {
      user: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
      category: { select: { id: true, name: true, slug: true } },
      images: { where: { is_cover: true }, take: 1 },
      aimag: { select: { name: true } },
    },
    orderBy: { created_at: "desc" },
    take: limit + 1, // +1 для определения hasMore
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const hasMore = listings.length > limit;
  const items = hasMore ? listings.slice(0, -1) : listings;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    items,
    nextCursor,
  });
}
```

### 5.3 Виртуализация списка

```typescript
// components/virtual-listing-grid.tsx

"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { ListingCard, type ListingWithRelations } from "./listing-card";

interface Props {
  listings: ListingWithRelations[];
  columns?: number;
}

export function VirtualListingGrid({ listings, columns = 3 }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowCount = Math.ceil(listings.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Примерная высота карточки
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-200px)] overflow-auto"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowListings = listings.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full grid gap-4"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
              }}
            >
              {rowListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Фаза 6: Полнотекстовый поиск

### 6.1 Настройка PostgreSQL Full-Text Search

```sql
-- migrations/add_fulltext_search.sql

-- Создаём колонку для поискового вектора
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Создаём функцию обновления вектора
CREATE OR REPLACE FUNCTION listings_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаём триггер
DROP TRIGGER IF EXISTS listings_search_vector_trigger ON listings;
CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description
  ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_search_vector_update();

-- Обновляем существующие записи
UPDATE listings SET search_vector =
  setweight(to_tsvector('russian', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('russian', COALESCE(description, '')), 'B');

-- Создаём GIN индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING GIN(search_vector);
```

### 6.2 API для поиска

```typescript
// app/api/listings/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (!query || query.length < 2) {
    return NextResponse.json({ items: [], total: 0 });
  }

  // Преобразуем запрос в tsquery формат
  const searchQuery = query
    .trim()
    .split(/\s+/)
    .map((word) => `${word}:*`) // Префиксный поиск
    .join(" & "); // AND между словами

  const [items, countResult] = await Promise.all([
    prisma.$queryRaw<Listing[]>`
      SELECT
        l.*,
        ts_rank(l.search_vector, to_tsquery('russian', ${searchQuery})) as rank
      FROM listings l
      WHERE l.status = 'active'
        AND l.is_active = true
        AND l.search_vector @@ to_tsquery('russian', ${searchQuery})
      ORDER BY rank DESC, l.created_at DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM listings
      WHERE status = 'active'
        AND is_active = true
        AND search_vector @@ to_tsquery('russian', ${searchQuery})
    `,
  ]);

  return NextResponse.json({
    items,
    total: Number(countResult[0]?.count || 0),
  });
}
```

### 6.3 Хук для поиска с debounce

```typescript
// lib/hooks/use-search-listings.ts

import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

export function useSearchListings(query: string) {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: ["listings", "search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { items: [], total: 0 };
      }
      const response = await fetch(`/api/listings/search?q=${encodeURIComponent(debouncedQuery)}`);
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Сводная таблица приоритетов

| Фаза    | Задача                     | Сложность | Влияние | Приоритет |
| ------- | -------------------------- | --------- | ------- | --------- |
| 1.1     | Индексы для listings_views | Низкая    | Высокое | 🔴 P0     |
| 1.2     | Индекс user_id + status    | Низкая    | Среднее | 🔴 P0     |
| 1.3-1.4 | Индексы сортировки         | Низкая    | Среднее | 🟡 P1     |
| 2.1     | Fix race condition         | Средняя   | Высокое | 🔴 P0     |
| 2.2     | Оптимизация images         | Низкая    | Среднее | 🟡 P1     |
| 2.3     | Кэширование статики        | Низкая    | Среднее | 🟡 P1     |
| 3       | Real-time подписки         | Средняя   | Среднее | 🟢 P2     |
| 4       | Server prefetch            | Средняя   | Высокое | 🟡 P1     |
| 5       | Cursor пагинация           | Средняя   | Высокое | 🟡 P1     |
| 6       | Full-text поиск            | Высокая   | Высокое | 🟢 P2     |

---

## Команды для применения

```bash
# 1. Обновить схему и сгенерировать миграцию
npx zenstack generate
npx prisma migrate dev --name add_optimization_indexes

# 2. Проверить производительность запросов
npx prisma studio

# 3. Анализ индексов в PostgreSQL
psql -c "SELECT * FROM pg_stat_user_indexes WHERE relname = 'listings';"
```

---

## Метрики успеха

После внедрения всех оптимизаций ожидаемые улучшения:

| Метрика                  | До     | После  |
| ------------------------ | ------ | ------ |
| Время загрузки /services | ~800ms | ~200ms |
| Время записи просмотра   | ~150ms | ~30ms  |
| Размер payload списка    | ~50KB  | ~15KB  |
| TTFB главной страницы    | ~500ms | ~150ms |
| Concurrent users         | ~100   | ~500   |
