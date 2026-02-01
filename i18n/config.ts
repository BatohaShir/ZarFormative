// Поддерживаемые локали - as const для type inference
export const locales = ["mn", "ru", "en"] as const;

// Локаль по умолчанию
export const defaultLocale = "mn" as const;

// Тип для локали
export type Locale = (typeof locales)[number];

// Названия языков - Object.freeze для неизменяемости
export const localeNames = Object.freeze<Record<Locale, string>>({
  mn: "Монгол",
  ru: "Русский",
  en: "English",
});

// Флаги для UI
export const localeFlags = Object.freeze<Record<Locale, string>>({
  mn: "🇲🇳",
  ru: "🇷🇺",
  en: "🇬🇧",
});

// Cookie name
export const LOCALE_COOKIE = "NEXT_LOCALE" as const;

// Set для O(1) проверки валидности
const localeSet = new Set<string>(locales);

// Проверка валидности локали - O(1) вместо O(n)
export function isValidLocale(locale: string): locale is Locale {
  return localeSet.has(locale);
}
