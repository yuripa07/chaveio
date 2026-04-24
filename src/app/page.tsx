"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PlusCircle, LogIn, Trophy, AlertCircle } from "lucide-react";
import { TOURNAMENT_CODE_LENGTH } from "@/constants/tournament";
import { Spinner } from "@/components/spinner";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { cn } from "@/lib/cn";
import { AppHeader } from "@/components/app-header";
import { useLocale } from "@/contexts/locale-context";
import { useUser } from "@/contexts/user-context";

// No `g` flag — avoids stale lastIndex when calling .test() repeatedly
const VALID_CODE_CHARS = /[^A-Z2-9]/g;
const AMBIGUOUS_CHARS = /[01IO]/i;

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { user, ready } = useUser();
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("auth_error");
    if (!err) return;
    if (err === "flow_expired" || err === "invalid_callback") {
      setAuthError(t.auth.oauthExpired);
    } else {
      setAuthError(t.auth.oauthFailed);
    }
  }, [searchParams, t]);

  function handleCodeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.toUpperCase();
    if (AMBIGUOUS_CHARS.test(raw)) {
      setCodeHint(t.landing.codeCharsHint);
    } else {
      setCodeHint(null);
    }
    setCode(raw.replace(VALID_CODE_CHARS, "").slice(0, TOURNAMENT_CODE_LENGTH));
    setCodeError(null);
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== TOURNAMENT_CODE_LENGTH) return;
    setJoining(true);
    setCodeError(null);
    try {
      const res = await fetch(`/api/tournaments/${trimmed}/check`);
      if (res.status === 404) {
        setCodeError(t.landing.tournamentNotFound(trimmed));
        return;
      }
    } catch {
      // Network issue — let the lobby page handle it
    } finally {
      setJoining(false);
    }
    router.push(`/tournament/${trimmed}`);
  }

  const codeComplete = code.length === TOURNAMENT_CODE_LENGTH;
  const codeProgress = code.length / TOURNAMENT_CODE_LENGTH;

  return (
    <main className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 dark:from-indigo-950 to-white dark:to-zinc-950 px-6 py-16">
        <div className="w-full max-w-sm space-y-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Chaveio
              </h1>
              <p className="mt-1.5 text-base text-zinc-500 dark:text-zinc-400">
                {t.landing.tagline}
              </p>
            </div>
          </div>

          {authError && (
            <div className="flex items-start gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-3">
            {ready && !user ? (
              <GoogleSignInButton returnTo="/" />
            ) : (
              <Link
                href="/tournament/new"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-[.98] transition"
              >
                <PlusCircle className="h-4 w-4" />
                {t.landing.createTournament}
              </Link>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-b from-indigo-50 dark:from-indigo-950 to-white dark:to-zinc-950 px-3 text-xs text-zinc-400 dark:text-zinc-500">
                  {t.landing.orEnterCode}
                </span>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-2">
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="XXXXXX"
                    value={code}
                    onChange={handleCodeChange}
                    maxLength={TOURNAMENT_CODE_LENGTH}
                    spellCheck={false}
                    autoComplete="off"
                    inputMode="text"
                    className={cn(
                      "w-full rounded-2xl border bg-white dark:bg-zinc-800 px-5 py-3.5 text-center text-xl font-mono font-bold tracking-widest uppercase placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition",
                      codeComplete
                        ? "border-emerald-300 dark:border-emerald-700 focus:ring-emerald-400 text-emerald-700 dark:text-emerald-400"
                        : codeError
                        ? "border-red-300 dark:border-red-700 focus:ring-red-400 text-zinc-900 dark:text-zinc-100"
                        : "border-zinc-200 dark:border-zinc-700 focus:border-transparent focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                    )}
                  />
                  {code.length > 0 && !codeComplete && !codeError && (
                    <div className="absolute bottom-0 left-4 right-4 h-0.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                      <div
                        className="h-full bg-indigo-400 transition-[width] duration-200"
                        style={{ width: `${codeProgress * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {codeError ? (
                  <div className="flex items-start gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{codeError}</span>
                  </div>
                ) : codeHint ? (
                  <div className="flex items-start gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{codeHint}</span>
                  </div>
                ) : code.length > 0 && !codeComplete ? (
                  <p className="text-center text-xs text-zinc-400">
                    {t.landing.codeProgress(code.length, TOURNAMENT_CODE_LENGTH)}
                  </p>
                ) : codeComplete ? (
                  <p className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {t.landing.codeComplete}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={joining || !codeComplete}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[.98] transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {joining ? (
                  <>
                    <Spinner size="sm" />
                    {t.landing.checking}
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {t.landing.joinTournament}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-400">
        {t.landing.footer}
      </footer>
    </main>
  );
}
