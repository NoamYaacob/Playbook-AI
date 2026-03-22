"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  getDictionary,
  resolveLocale,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dictionary: getDictionary(DEFAULT_LOCALE),
});

export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: string;
  children: ReactNode;
}) {
  const resolvedLocale = resolveLocale(locale);

  return (
    <I18nContext.Provider
      value={{
        locale: resolvedLocale,
        dictionary: getDictionary(resolvedLocale),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
