import { createContext, createElement, type ReactNode, useContext } from "react";

export type Locale = string;
export type TranslationDictionary = Readonly<Record<string, string>>;
export type TranslateFn = (key: string, fallback?: string) => string;

export interface I18nBundle {
  pluginId: string;
  dictionaries: Readonly<Partial<Record<Locale, TranslationDictionary>>>;
}

export interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nValue | null>(null);

export function defineI18nBundle<T extends I18nBundle>(bundle: T): T {
  return bundle;
}

export function createTranslate(
  locale: Locale,
  bundles: readonly I18nBundle[],
  fallbackLocale: Locale = "en"
): TranslateFn {
  const fallbackMessages = new Map<string, string>();
  const activeMessages = new Map<string, string>();

  for (const bundle of bundles) {
    const fallbackDictionary = bundle.dictionaries[fallbackLocale];
    if (fallbackDictionary) {
      for (const [key, value] of Object.entries(fallbackDictionary)) {
        fallbackMessages.set(key, value);
      }
    }

    const activeDictionary = bundle.dictionaries[locale];
    if (activeDictionary) {
      for (const [key, value] of Object.entries(activeDictionary)) {
        activeMessages.set(key, value);
      }
    }
  }

  return (key, fallback) => activeMessages.get(key) ?? fallbackMessages.get(key) ?? fallback ?? key;
}

export function I18nProvider({ children, value }: { children: ReactNode; value: I18nValue }) {
  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}
