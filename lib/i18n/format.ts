import { DEFAULT_LOCALE, getLocaleTag, type Locale } from "@/lib/i18n";

export function formatCurrencyForLocale(
  amount: number,
  {
    locale = DEFAULT_LOCALE,
    currency = "USD",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  }: {
    locale?: Locale;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {},
): string {
  return new Intl.NumberFormat(getLocaleTag(locale), {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function formatPercentForLocale(
  value: number,
  {
    locale = DEFAULT_LOCALE,
    maximumFractionDigits = 1,
    valueIsFraction = Math.abs(value) <= 1,
  }: {
    locale?: Locale;
    maximumFractionDigits?: number;
    valueIsFraction?: boolean;
  } = {},
): string {
  return new Intl.NumberFormat(getLocaleTag(locale), {
    style: "percent",
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(valueIsFraction ? value : value / 100);
}

export function formatDateForLocale(
  date: Date,
  {
    locale = DEFAULT_LOCALE,
    options,
  }: {
    locale?: Locale;
    options?: Intl.DateTimeFormatOptions;
  } = {},
): string {
  return new Intl.DateTimeFormat(getLocaleTag(locale), options).format(date);
}
