import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Decimal } from "@prisma/client/runtime/library";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Форматирует цену в короткий вид (например: 50мян, 1.5сая)
 * Используется для слайдеров и компактного отображения
 */
export function formatPriceShort(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}сая`;
  }
  return `${(value / 1000).toFixed(0)}мян`;
}

// Alias for backwards compatibility
export const formatPrice = formatPriceShort;

/**
 * Форматирует цену листинга для отображения
 * Обрабатывает Decimal, null, валюту и флаг "Тохиролцоно"
 */
export function formatListingPrice(
  price: Decimal | number | null,
  currency: string = "MNT",
  isNegotiable: boolean = false
): string {
  if (isNegotiable) {
    return "Тохиролцоно";
  }

  if (price === null || price === undefined) {
    return "Үнэ тодорхойгүй";
  }

  const numPrice = typeof price === "number" ? price : Number(price);

  // Format with thousand separators.
  //
  // NOT toLocaleString("mn-MN"): Node and the browser ship different
  // ICU data for that locale, so the server rendered "100,000" while
  // the browser produced "100 000" for the same number. React saw the
  // mismatch during hydration, threw, and re-rendered the whole
  // listing tree on the client. Grouping the digits ourselves is
  // deterministic on both sides.
  //
  // U+00A0 (non-breaking space) is the separator Mongolian formatting
  // uses, and it also keeps the amount from wrapping away from ₮.
  const formatted = Number.isFinite(numPrice)
    ? Math.trunc(numPrice)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    : String(numPrice);

  // Add currency symbol
  const currencySymbol = currency === "USD" ? "$" : "₮";

  return currency === "USD" ? `${currencySymbol}${formatted}` : `${formatted}${currencySymbol}`;
}

/**
 * Форматирует дату в монгольский формат
 */
export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return "Одоог хүртэл";
  const [year, month] = dateStr.split("-");
  const monthIndex = parseInt(month) - 1;
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return dateStr;
  }
  const months = [
    "1-р сар",
    "2-р сар",
    "3-р сар",
    "4-р сар",
    "5-р сар",
    "6-р сар",
    "7-р сар",
    "8-р сар",
    "9-р сар",
    "10-р сар",
    "11-р сар",
    "12-р сар",
  ];
  return `${year} оны ${months[monthIndex]}`;
}
