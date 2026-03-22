import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { formatCurrencyForLocale, formatPercentForLocale } from "@/lib/i18n/format";

// ---------------------------------------------------------------------------
// Tailwind class merger
// ---------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------

/**
 * Formats a number as a currency string.
 * @param amount - The numeric amount to format.
 * @param currency - ISO 4217 currency code (default: "USD").
 */
export function formatCurrency(amount: number, currency = "USD", locale: Locale = DEFAULT_LOCALE): string {
  return formatCurrencyForLocale(amount, { currency, locale });
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Formats a Date or ISO date string using a date-fns format string.
 * @param date - The date to format (Date object or ISO string).
 * @param fmt  - date-fns format string (default: "MMM d, yyyy").
 */
export function formatDate(date: Date | string, fmt = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, fmt);
}

// ---------------------------------------------------------------------------
// R-multiple formatting
// ---------------------------------------------------------------------------

/**
 * Formats an R-multiple value to two decimal places with the R suffix.
 * Positive values are prefixed with "+".
 * @param r - The R-multiple value.
 */
export function formatR(r: number): string {
  const sign = r > 0 ? "+" : "";
  return `${sign}${r.toFixed(2)}R`;
}

// ---------------------------------------------------------------------------
// Percentage formatting
// ---------------------------------------------------------------------------

/**
 * Formats a decimal fraction (0–1) or a whole percentage (0–100) as a
 * percentage string with one decimal place.
 * Values <= 1 are assumed to be fractions and multiplied by 100.
 * @param n - The number to format.
 */
export function formatPercent(n: number, locale: Locale = DEFAULT_LOCALE): string {
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${formatPercentForLocale(pct, { locale, valueIsFraction: false })}`;
}
