"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { useTheme, type Theme } from "@/contexts/theme-context";

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const { theme, resolvedTheme, setTheme } = useTheme();

  function handleThemeToggle() {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  }

  const ThemeIcon = theme === "system" ? THEME_ICONS[resolvedTheme] : THEME_ICONS[theme];
  const themeLabel = t.theme[theme];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md text-xs font-semibold">
      <button
        onClick={handleThemeToggle}
        className="px-2.5 py-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        aria-label={`${t.theme.toggleAria}: ${themeLabel}`}
        title={themeLabel}
      >
        <ThemeIcon className="h-3.5 w-3.5" />
      </button>
      <div className="w-px bg-zinc-200 dark:bg-zinc-700 self-stretch" />
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
  );
}
