/**
 * Общие функции форматирования для переиспользования в компонентах
 * Избегаем дублирования кода между listing-card.tsx, services/[id]/page.tsx и др.
 */

// Типы для пользователя
interface UserForName {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  is_company?: boolean;
}

// Типы для листинга с локацией
interface ListingWithLocation {
  aimag?: { name: string } | null;
  district?: { name: string } | null;
  khoroo?: { name: string } | null;
  address?: string | null;        // В БД детальный адрес хранится тут для remote услуг
  address_detail?: string | null; // Используется в клиентских компонентах
  service_type?: string | null;
}

// Типы для изображений
interface ImageWithSortOrder {
  url: string;
  sort_order: number;
}

/**
 * Получить отображаемое имя провайдера
 * Приоритет: company_name (для компаний) -> полное имя -> "Хэрэглэгч"
 */
export function getProviderName(user: UserForName): string {
  if (user.is_company && user.company_name) {
    return user.company_name;
  }
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }
  return "Хэрэглэгч";
}

/**
 * Форматировать локацию листинга
 * - Для "remote" (Миний газар - клиент приходит к исполнителю) - показываем address (детальный адрес исполнителя)
 * - Для "on_site" (Зочны газар - исполнитель едет к клиенту) - показываем aimag/district/khoroo
 */
export function formatLocation(listing: ListingWithLocation): string {
  // Если услуга типа "remote" (Миний газар - клиент приходит к исполнителю) и есть детальный адрес - показываем его
  // Сначала проверяем address_detail (для клиентских компонентов), потом address (из БД)
  const detailAddress = listing.address_detail || listing.address;
  if (listing.service_type === "remote" && detailAddress) {
    return detailAddress;
  }

  // Для "on_site" (Зочны газар - исполнитель едет к клиенту) или если нет address - показываем aimag/district
  const parts: string[] = [];

  if (listing.aimag?.name) {
    parts.push(listing.aimag.name);
  }
  if (listing.district?.name) {
    parts.push(listing.district.name);
  }
  if (listing.khoroo?.name) {
    parts.push(listing.khoroo.name);
  }

  return parts.length > 0 ? parts.join(", ") : "Байршил тодорхойгүй";
}

/**
 * Получить URL первого изображения (по sort_order)
 * Возвращает placeholder если изображений нет
 */
export function getFirstImageUrl(
  images: ImageWithSortOrder[],
  placeholderSize: "small" | "large" = "small"
): string {
  if (images.length === 0) {
    return placeholderSize === "large"
      ? "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop"
      : "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=300&fit=crop";
  }
  // Сортируем по sort_order и берём первое
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0].url;
}
