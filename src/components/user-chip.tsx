"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, UserCircle2 } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/cn";

export function UserChip({ className }: { className?: string }) {
  const { user, logout } = useUser();
  const { t } = useLocale();
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
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {initial}
          </span>
        )}
        <span className="max-w-[9rem] truncate pr-1">{label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg"
        >
          <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
