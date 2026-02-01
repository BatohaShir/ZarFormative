import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isValidLocale, LOCALE_COOKIE, type Locale } from "./config";

// Статический импорт сообщений - бандлится в build time
import mnMessages from "../messages/mn.json";
import ruMessages from "../messages/ru.json";
import enMessages from "../messages/en.json";

// Предзагруженный кеш сообщений - без runtime import
const messagesCache: Record<Locale, typeof mnMessages> = {
  mn: mnMessages,
  ru: ruMessages,
  en: enMessages,
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  // Быстрая валидация с fallback
  const locale: Locale =
    cookieLocale && isValidLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    // Мгновенный доступ из кеша вместо динамического импорта
    messages: messagesCache[locale],
  };
});
