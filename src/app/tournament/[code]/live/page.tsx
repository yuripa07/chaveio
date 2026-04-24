"use client";

import { use, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart2, Clock, Swords, Trophy, AlertTriangle, X } from "lucide-react";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { useRequireParticipant } from "@/hooks/use-require-participant";
import { usePolling } from "@/hooks/use-polling";
import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/cn";
import { translateApiError } from "@/lib/translate-api-error";
import { TournamentStatus, RoundStatus, POLL_INTERVAL_LIVE } from "@/constants/tournament";
import { AppHeader } from "@/components/app-header";
import { KickParticipantDialog } from "@/components/kick-participant-dialog";
import { LivePageSkeleton } from "@/components/page-spinner";
import { InfoBanner } from "@/components/info-banner";
import { ParticipantAvatar } from "@/components/participant-avatar";
import { PulseDot } from "@/components/pulse-dot";
import { RankingsTable } from "@/components/rankings-table";
import { Spinner } from "@/components/spinner";
import dynamic from "next/dynamic";
import type { TournamentState, ItemMap, RankEntry, TournamentItem, Participant } from "@/types/tournament";

const BracketView = dynamic(() => import("@/components/bracket-view"), {
  loading: () => <div className="h-64 motion-safe:animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />,
});

type PendingWinner = { matchId: string; item: TournamentItem };

export default function LivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { token, clearToken } = useTournamentToken(code);
  const auth = useRequireParticipant(code, { requireCreator: true });
  const { t } = useLocale();

  const [state, setState] = useState<TournamentState | null>(null);
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [winnerError, setWinnerError] = useState("");
  const [pendingWinner, setPendingWinner] = useState<PendingWinner | null>(null);
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  const [kicking, setKicking] = useState(false);
  const [kickError, setKickError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingWinner) dialogRef.current?.focus();
  }, [pendingWinner]);

  const loadState = useCallback(async (authToken: string, signal?: AbortSignal) => {
    const [tournamentRes, rankingsRes] = await Promise.all([
      fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
      fetch(`/api/tournaments/${code}/rankings`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
    ]);
    if (tournamentRes.status === 401 || tournamentRes.status === 403) {
      clearToken();
      return null;
    }
    if (!tournamentRes.ok) return null;
    const rankingsData: RankEntry[] = rankingsRes.ok ? (await rankingsRes.json()).rankings ?? [] : [];
    return { state: (await tournamentRes.json()) as TournamentState, rankings: rankingsData };
  }, [code, clearToken]);

  useEffect(() => {
    if (!auth.ready) return;
    loadState(auth.token).then((result) => {
      if (!result) return;
      if (result.state.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(result.state);
      setRankings(result.rankings);
    });
  }, [auth.ready, auth.ready ? auth.token : null, code, loadState, router]);

  usePolling(
    async (signal) => {
      if (!auth.ready) return;
      const result = await loadState(auth.token, signal);
      if (!result) return;
      if (result.state.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(result.state);
      setRankings(result.rankings);
    },
    POLL_INTERVAL_LIVE,
    auth.ready && !!state,
  );

  async function confirmWinner() {
    if (!token || !pendingWinner) return;
    const { matchId, item } = pendingWinner;
    setPendingWinner(null);
    setResolving(matchId);
    setWinnerError("");
    try {
      const response = await fetch(`/api/tournaments/${code}/matches/${matchId}/winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winnerId: item.id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setWinnerError(translateApiError(body.error, t) ?? t.live.winnerError);
        return;
      }
      const result = await loadState(token);
      if (!result) return;
      if (result.state.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(result.state);
      setRankings(result.rankings);
    } finally {
      setResolving(null);
    }
  }

  async function handleKick() {
    if (!token || !kickTarget) return;
    setKicking(true);
    setKickError("");
    try {
      const res = await fetch(`/api/tournaments/${code}/participants/${kickTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const liveKickBody = await res.json();
        setKickError(translateApiError(liveKickBody.error, t) ?? t.live.kickError);
        return;
      }
      setKickTarget(null);
      const result = await loadState(token);
      if (result) {
        setState(result.state);
        setRankings(result.rankings);
      }
    } catch {
      setKickError(t.common.networkError);
    } finally {
      setKicking(false);
    }
  }

  const itemMap = useMemo(
    () => Object.fromEntries((state?.items ?? []).map((item) => [item.id, item])) as ItemMap,
    [state?.items]
  );

  if (!auth.ready) return <LivePageSkeleton />;
  if (!state) return <LivePageSkeleton />;

  const activeRound = state.rounds.find((r) => r.status === RoundStatus.ACTIVE);
  const pendingMatches = activeRound?.matches.filter((m) => m.status !== "COMPLETE") ?? [];
  const pendingParticipants = state.participants.filter((p) => !p.hasSubmittedPicks);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader
        backHref="/"
        backLabel={t.common.home}
        title={state.tournament.name}
        subtitle={code}
        rightSlot={
          <Link
            href={`/tournament/${code}/results`}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            {t.live.score}
          </Link>
        }
      />

      {pendingWinner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPendingWinner(null); }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-winner-title"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === "Escape") setPendingWinner(null); }}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl focus:outline-none"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <button
                onClick={() => setPendingWinner(null)}
                aria-label={t.common.close}
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <h2 id="confirm-winner-title" className="text-base font-bold text-zinc-900 dark:text-zinc-50">{t.live.confirmWinner}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t.live.confirmWinnerText(pendingWinner.item.name)}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPendingWinner(null)}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmWinner}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[.98] transition"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">

        {pendingParticipants.length > 0 && (
          <InfoBanner variant="warning">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t.live.waitingPicksFrom}{" "}
              <strong>{pendingParticipants.map((p) => p.displayName).join(", ")}</strong>.
              {" "}{t.live.picksRequired}
            </span>
          </InfoBanner>
        )}

        {winnerError && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-5 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {winnerError}
          </div>
        )}

        {activeRound && pendingMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <PulseDot color="indigo" size="md" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                {activeRound.name
                  ? `${activeRound.name} · ${activeRound.pointValue} pts`
                  : `${t.bracketView.round(activeRound.roundNumber)} · ${activeRound.pointValue} pts`
                }
              </h2>
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {t.live.clickWinner}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pendingMatches.map((match) => {
                const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                const isBusy = resolving === match.id;
                const canResolve = pendingParticipants.length === 0;

                return (
                  <div
                    key={match.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm"
                  >
                    <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-2">
                      <Swords className="h-3.5 w-3.5 text-zinc-300" />
                      <p className="text-xs font-semibold text-zinc-400">
                        {t.live.match(match.matchNumber)}
                      </p>
                      {isBusy && (
                        <span className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
                          <Spinner size="sm" />
                          {t.live.saving}
                        </span>
                      )}
                    </div>
                    <div className="flex divide-x divide-zinc-100 dark:divide-zinc-800">
                      {[item1, item2].map((item, index) => {
                        if (!item)
                          return (
                            <div key={index} className="flex flex-1 items-center justify-center py-6 text-xs text-zinc-300 dark:text-zinc-600">
                              {t.live.toBeDefined}
                            </div>
                          );
                        return (
                          <button
                            key={item.id}
                            disabled={isBusy || !canResolve}
                            onClick={() => setPendingWinner({ matchId: match.id, item })}
                            className={cn(
                              "group flex flex-1 flex-col items-center gap-1.5 px-4 py-5 text-center transition-all",
                              canResolve && !isBusy
                                ? "hover:bg-indigo-600 hover:text-white active:scale-95 cursor-pointer"
                                : "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span className="font-semibold leading-tight">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t.live.bracketSection}</h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <BracketView rounds={state.rounds} itemMap={itemMap} mode="view" />
          </div>
        </section>

        {rankings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t.live.rankingSection}</h2>
            <RankingsTable rankings={rankings} />
          </section>
        )}

        {auth.isCreator && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t.live.participantsSection}</h2>
            <div className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <ul className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {state.participants.map((participant) => (
                  <li key={participant.id} className="flex items-center gap-3 px-5 py-3">
                    <ParticipantAvatar name={participant.displayName} />
                    <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{participant.displayName}</span>
                    {participant.isCreator && (
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-xxs font-semibold text-indigo-600 dark:text-indigo-400">
                        {t.common.creator}
                      </span>
                    )}
                    {!participant.isCreator && (
                      <button
                        type="button"
                        onClick={() => { setKickTarget(participant); setKickError(""); }}
                        className="rounded-md p-0.5 text-zinc-300 dark:text-zinc-600 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-400 transition-colors"
                        aria-label={t.common.kickParticipantAria(participant.displayName)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      <KickParticipantDialog
        participant={kickTarget}
        onConfirm={handleKick}
        onCancel={() => { setKickTarget(null); setKickError(""); }}
        isLoading={kicking}
        error={kickError}
      />
    </main>
  );
}
