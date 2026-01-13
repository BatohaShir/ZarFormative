import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует цену в читаемый вид (например: 50мян, 1.5сая)
 */
export function formatPrice(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}сая`;
  }
  return `${(value / 1000).toFixed(0)}мян`;
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
