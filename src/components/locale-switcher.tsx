"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { useTheme, type Theme } from "@/contexts/theme-context";

const THEME_OPTIONS: { value: Theme; Icon: typeof Sun }[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {/* Theme pill */}
      <div className="flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md">
        {THEME_OPTIONS.map(({ value, Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`px-2.5 py-1.5 transition-colors ${
              theme === value
                ? "bg-indigo-600 text-white"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
            aria-label={t.theme[value]}
            title={t.theme[value]}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      {/* Locale pill */}
      <div className="flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md text-xs font-semibold">
        <button
          onClick={() => setLocale("pt-BR")}
          className={`px-3 py-1.5 transition-colors ${
            locale === "pt-BR"
              ? "bg-indigo-600 text-white"
              : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          PT
        </button>
        <button
          onClick={() => setLocale("en")}
          className={`px-3 py-1.5 transition-colors ${
            locale === "en"
              ? "bg-indigo-600 text-white"
              : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
