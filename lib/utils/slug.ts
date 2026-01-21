/**
 * Генерация slug из кириллического текста
 * Пример: "Услуги такси" -> "uslugi-taksi"
 */

const cyrillicToLatinMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split("")
    .map((char) => cyrillicToLatinMap[char] || char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-") // Заменяем все не буквы/цифры на дефис
    .replace(/^-+|-+$/g, "") // Убираем дефисы в начале и конце
    .replace(/-{2,}/g, "-") // Убираем повторяющиеся дефисы
    .substring(0, 100); // Ограничиваем длину
}

/**
 * Добавляет случайный суффикс к slug для уникальности
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = generateSlug(text);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
}
