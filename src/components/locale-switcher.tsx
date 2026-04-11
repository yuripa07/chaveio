"use client";

import { useLocale } from "@/contexts/locale-context";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex overflow-hidden rounded-full border border-zinc-200 bg-white shadow-md text-xs font-semibold">
      <button
        onClick={() => setLocale("pt-BR")}
        className={`px-3 py-1.5 transition-colors ${
          locale === "pt-BR"
            ? "bg-indigo-600 text-white"
            : "text-zinc-500 hover:bg-zinc-50"
        }`}
      >
        PT
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1.5 transition-colors ${
          locale === "en"
            ? "bg-indigo-600 text-white"
            : "text-zinc-500 hover:bg-zinc-50"
        }`}
      >
        EN
      </button>
    </div>
  );
}
