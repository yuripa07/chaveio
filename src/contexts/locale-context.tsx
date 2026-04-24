"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { type Locale, type Translations, translations } from "@/locales/translations";

const STORAGE_KEY = "chaveio:locale";

function isLocale(value: string | null): value is Locale {
  return value === "pt-BR" || value === "en";
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {}
  const lang = typeof navigator !== "undefined" ? navigator.language ?? "" : "";
  return lang.startsWith("pt") ? "pt-BR" : "en";
}

const listeners = new Set<() => void>();

function subscribeLocale(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function persistLocale(next: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  for (const cb of listeners) cb();
}

const getLocaleServerSnapshot = (): Locale => "pt-BR";

type LocaleContextValue = {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "pt-BR",
  t: translations["pt-BR"],
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, detectLocale, getLocaleServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, t: translations[locale], setLocale: persistLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
