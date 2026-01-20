import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Decimal } from "@prisma/client/runtime/library"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

  // Format with thousand separators
  const formatted = numPrice.toLocaleString("mn-MN");

  // Add currency symbol
  const currencySymbol = currency === "USD" ? "$" : "₮";

  return currency === "USD"
    ? `${currencySymbol}${formatted}`
    : `${formatted}${currencySymbol}`;
}

/**
 * Форматирует дату в монгольский формат
 */
export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return "Одоог хүртэл";
  const [year, month] = dateStr.split("-");
  const months = [
    "1-р сар", "2-р сар", "3-р сар", "4-р сар",
    "5-р сар", "6-р сар", "7-р сар", "8-р сар",
    "9-р сар", "10-р сар", "11-р сар", "12-р сар",
  ];
  return `${year} оны ${months[parseInt(month) - 1]}`;
}
