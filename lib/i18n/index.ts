import { en } from "./dictionaries/en";
import { he } from "./dictionaries/he";

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "he"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type Dictionary = typeof en;

const RTL_LANGUAGE_CODES = new Set(["ar", "fa", "he", "ur"]);
const dictionaries: Record<Locale, Dictionary> = {
  en,
  he,
};

export function normalizeLocale(locale: string): string {
  return locale.toLowerCase().split("-")[0] ?? locale.toLowerCase();
}

export function resolveLocale(locale?: string | null): Locale {
  if (!locale) return DEFAULT_LOCALE;

  const normalized = normalizeLocale(locale);
  return (SUPPORTED_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as Locale)
    : DEFAULT_LOCALE;
}

export function isRtlLocale(locale: string): boolean {
  return RTL_LANGUAGE_CODES.has(normalizeLocale(locale));
}

export function getLocaleDirection(locale: string): "ltr" | "rtl" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

export function getDictionary(locale?: string | null): Dictionary {
  return dictionaries[resolveLocale(locale)];
}

export function getLocaleTag(locale?: string | null): string {
  switch (resolveLocale(locale)) {
    case "he":
      return "he-IL";
    default:
      return "en-US";
  }
}
