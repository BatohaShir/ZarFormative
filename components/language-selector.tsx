"use client";

import { memo, useCallback } from "react";
import { useLocale } from "@/hooks/use-locale";
import { localeNames, localeFlags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface LanguageSelectorProps {
  className?: string;
}

// Мемоизированный элемент списка языков
const LanguageItem = memo(function LanguageItem({
  locale,
  isSelected,
  onSelect,
}: {
  locale: Locale;
  isSelected: boolean;
  onSelect: (locale: Locale) => void;
}) {
  const handleClick = useCallback(() => onSelect(locale), [locale, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/10 border border-primary/20"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{localeFlags[locale]}</span>
        <span className={cn("text-sm", isSelected && "font-medium")}>
          {localeNames[locale]}
        </span>
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
});

/**
 * Компонент выбора языка (оптимизированный)
 */
export const LanguageSelector = memo(function LanguageSelector({
  className,
}: LanguageSelectorProps) {
  const { locale, locales, setLocale } = useLocale();

  return (
    <div className={cn("space-y-1", className)}>
      {locales.map((loc) => (
        <LanguageItem
          key={loc}
          locale={loc}
          isSelected={loc === locale}
          onSelect={setLocale}
        />
      ))}
    </div>
  );
});

/**
 * Компактный селектор языка для хедера (оптимизированный)
 */
export const LanguageSelectorCompact = memo(function LanguageSelectorCompact({
  className,
}: LanguageSelectorProps) {
  const { locale, locales, setLocale } = useLocale();

  // Вычисляем следующий язык
  const currentIndex = locales.indexOf(locale);
  const nextLocale = locales[(currentIndex + 1) % locales.length];

  const handleClick = useCallback(
    () => setLocale(nextLocale),
    [nextLocale, setLocale]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors",
        "hover:bg-muted/50 text-sm font-medium",
        className
      )}
      title={`Switch to ${localeNames[nextLocale]}`}
    >
      <span>{localeFlags[locale]}</span>
      <span className="uppercase">{locale}</span>
    </button>
  );
});
