/**
 * Mock data for autocomplete suggestions
 * TODO: Move to database when ready
 */

// Schools/Universities in Mongolia
export const SCHOOLS_DB = [
  "МУИС",
  "ШУТИС",
  "ХААИС",
  "МУБИС",
  "СУИС",
  "Отгонтэнгэр их сургууль",
  "Монгол Улсын Их Сургууль",
  "Шинжлэх Ухаан Технологийн Их Сургууль",
  "Хөдөө Аж Ахуйн Их Сургууль",
  "Боловсролын Их Сургууль",
] as const;

// Companies in Mongolia
export const COMPANIES_DB = [
  "Голомт банк",
  "Хаан банк",
  "Худалдаа хөгжлийн банк",
  "Төрийн банк",
  "Монгол Пост",
  "МЦС",
  "Юнител",
  "Скайтел",
  "Оюу Толгой",
  "Эрдэнэт үйлдвэр",
] as const;

// Job positions
export const POSITIONS_DB = [
  "Програм хангамжийн инженер",
  "IT мэргэжилтэн",
  "Веб хөгжүүлэгч",
  "Мобайл хөгжүүлэгч",
  "Дата шинжээч",
  "Систем администратор",
  "Төслийн менежер",
  "UI/UX дизайнер",
] as const;

// Education degrees
export const DEGREES_DB = [
  "Бакалавр",
  "Магистр",
  "Доктор",
  "Дипломын",
  "Мэргэжлийн",
] as const;

// Mongolian months (static constant to avoid recreation)
export const MONGOLIAN_MONTHS = [
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
] as const;

/**
 * Format date string to Mongolian format
 * @param dateStr - Date string in "YYYY-MM" format
 * @returns Formatted date string like "2024 оны 1-р сар"
 */
export function formatWorkDate(dateStr: string): string {
  if (!dateStr) return "Одоог хүртэл";
  const [year, month] = dateStr.split("-");
  return `${year} оны ${MONGOLIAN_MONTHS[parseInt(month) - 1]}`;
}

/**
 * Format birth date to Mongolian format
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns Formatted date string like "2000 оны 1-р сарын 15"
 */
export function formatBirthDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${year} оны ${parseInt(month)}-р сарын ${parseInt(day)}`;
}
