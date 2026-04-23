"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Monitor, Moon, Sun, Trophy } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useLocale } from "@/contexts/locale-context";
import { useTheme, type Theme } from "@/contexts/theme-context";
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/cn";
import type { Locale } from "@/locales/translations";

const THEME_OPTIONS: { value: Theme; Icon: typeof Sun }[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "pt-BR", label: "PT" },
  { value: "en", label: "EN" },
];

export function AppHeader() {
  const { user, ready } = useUser();
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Trophy className="h-4 w-4" />
          </span>
          {t.appHeader.brand}
        </Link>

        {ready ? (
          user ? (
            <UserMenu />
          ) : (
            <GoogleSignInButton
              variant="secondary"
              className="!w-auto !py-2 !px-3 !text-xs"
              label={t.auth.signInWithGoogle}
            />
          )
        ) : (
          <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        )}
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, logout } = useUser();
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!user) return null;

  const label = user.name ?? user.email;
  const initial = label.charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1 pl-1 pr-2 sm:pr-3 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.appHeader.openMenu}
      >
        <Avatar user={user} initial={initial} size="sm" />
        <span className="hidden sm:block max-w-[9rem] truncate">{label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar user={user} initial={initial} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {label}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            </div>
          </div>

          <MenuSection label={t.appHeader.themeSection}>
            <div className="flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
              {THEME_OPTIONS.map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors",
                    theme === value
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                  aria-pressed={theme === value}
                  aria-label={t.theme[value]}
                  title={t.theme[value]}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.theme[value]}</span>
                </button>
              ))}
            </div>
          </MenuSection>

          <MenuSection label={t.appHeader.languageSection}>
            <div className="flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-semibold">
              {LOCALE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLocale(value)}
                  className={cn(
                    "flex-1 px-3 py-1.5 transition-colors",
                    locale === value
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                  aria-pressed={locale === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </MenuSection>

          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              {t.auth.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
      <p className="mb-2 text-xxs font-bold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function Avatar({
  user,
  initial,
  size,
}: {
  user: { avatarUrl: string | null };
  initial: string;
  size: "sm" | "lg";
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const text = size === "sm" ? "text-xs" : "text-base";
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className={cn(dim, "rounded-full object-cover")}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className={cn(
        dim,
        text,
        "flex items-center justify-center rounded-full bg-indigo-600 font-semibold text-white"
      )}
    >
      {initial}
    </span>
  );
}
