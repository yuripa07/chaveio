"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowRight, Trophy } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/locale-context";
import { useUser } from "@/contexts/user-context";

type HistoryEntry = {
  code: string;
  name: string;
  status: "LOBBY" | "ACTIVE" | "FINISHED";
  isCreator: boolean;
  hasSubmittedPicks: boolean;
  participantCount: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

function statusBadgeClass(status: HistoryEntry["status"]) {
  if (status === "ACTIVE") return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400";
  if (status === "FINISHED") return "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";
  return "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const { t } = useLocale();
  const { user, ready } = useUser();
  const [tournaments, setTournaments] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    fetch("/api/users/tournaments")
      .then((r) => r.json())
      .then((data) => setTournaments(data.tournaments ?? []))
      .catch(() => setError(true));
  }, [ready, user]);

  return (
    <main className="flex min-h-screen flex-col">
      <AppHeader
        backHref="/"
        backLabel={t.common.home}
        title={t.history.title}
        subtitle={t.history.subtitle}
      />

      <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-indigo-50 dark:from-indigo-950 to-white dark:to-zinc-950 px-4 py-10">
        <div className="w-full max-w-lg space-y-4">
          {!ready ? (
            <CardsSkeleton />
          ) : !user ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.auth.signInToCreate}</p>
              <GoogleSignInButton returnTo="/history" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-600 dark:text-red-400">
              {t.common.networkError}
            </p>
          ) : tournaments === null ? (
            <CardsSkeleton />
          ) : tournaments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40">
                <Trophy className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.history.noTournaments}</p>
              <Link
                href="/tournament/new"
                className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t.landing.createTournament}
              </Link>
            </div>
          ) : (
            tournaments.map((entry) => (
              <TournamentCard key={entry.code} entry={entry} t={t} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function CardsSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-5 py-4 shadow-sm"
        >
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-40 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            <div className="flex gap-1.5">
              <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              <div className="h-5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-3.5 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              <div className="h-3.5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-28 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        </div>
      ))}
    </>
  );
}

function TournamentCard({
  entry,
  t,
}: {
  entry: HistoryEntry;
  t: ReturnType<typeof useLocale>["t"];
}) {
  const statusLabel =
    entry.status === "ACTIVE"
      ? t.history.statusActive
      : entry.status === "FINISHED"
      ? t.history.statusFinished
      : t.history.statusLobby;

  const date = entry.endedAt ?? entry.startedAt ?? entry.createdAt;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-5 py-4 shadow-sm">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {entry.name}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeClass(entry.status))}>
            {statusLabel}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              entry.isCreator
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            )}
          >
            {entry.isCreator ? t.history.creatorBadge : t.history.participantBadge}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {t.history.participantCount(entry.participantCount)}
          </span>
          <span>{formatDate(date)}</span>
        </div>
      </div>

      <Link
        href={`/tournament/${entry.code}`}
        className="shrink-0 flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-[.97] transition"
        aria-label={`${t.history.viewTournament}: ${entry.name}`}
      >
        {t.history.viewTournament}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
