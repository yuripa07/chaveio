"use client";

import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/cn";

interface GoogleSignInButtonProps {
  returnTo?: string;
  variant?: "primary" | "secondary";
  className?: string;
  label?: string;
}

/**
 * Navigates (full page) to the OAuth start route, which 302s to Google and
 * sets the short-lived flow cookie. We intentionally use a real link — not
 * fetch — so the browser carries the Set-Cookie back and follows the redirect.
 */
export function GoogleSignInButton({
  returnTo,
  variant = "primary",
  className,
  label,
}: GoogleSignInButtonProps) {
  const { t } = useLocale();
  const href = returnTo
    ? `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`
    : "/api/auth/google/start";

  const base =
    "flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold active:scale-[.98] transition";
  const primary =
    "bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none hover:bg-indigo-700";
  const secondary =
    "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800";

  return (
    <a
      href={href}
      className={cn(base, variant === "primary" ? primary : secondary, className)}
    >
      <GoogleG />
      <span>{label ?? t.auth.signInWithGoogle}</span>
    </a>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  );
}
