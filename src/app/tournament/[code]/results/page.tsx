"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { useRequireParticipant } from "@/hooks/use-require-participant";
import { usePolling } from "@/hooks/use-polling";
import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/cn";
import { TournamentStatus, POLL_INTERVAL_RESULTS } from "@/constants/tournament";
import { AppHeader } from "@/components/app-header";
import { ResultsPageSkeleton } from "@/components/page-spinner";
import { PulseDot } from "@/components/pulse-dot";
import { RankingsTable } from "@/components/rankings-table";
import { ScoreStat } from "@/components/score-stat";
import { ResultIcon } from "@/components/result-icon";
import dynamic from "next/dynamic";
import type { TournamentState, PickResult, RankEntry, ItemMap } from "@/types/tournament";

const BracketView = dynamic(() => import("@/components/bracket-view"), {
  loading: () => <div className="h-64 motion-safe:animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />,
});

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { clearToken } = useTournamentToken(code);
  const auth = useRequireParticipant(code);
  const { t } = useLocale();

  const [state, setState] = useState<TournamentState | null>(null);
  const [myPicks, setMyPicks] = useState<PickResult[]>([]);
  const [rankings, setRankings] = useState<RankEntry[]>([]);

  const loadData = useCallback(async (authToken: string, signal?: AbortSignal) => {
    const [tournamentRes, picksRes, rankingsRes] = await Promise.all([
      fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
      fetch(`/api/picks?tournamentCode=${code}`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
      fetch(`/api/tournaments/${code}/rankings`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
    ]);
    if (tournamentRes.status === 401 || tournamentRes.status === 403) {
      clearToken();
      return null;
    }
    if (!tournamentRes.ok) return null;
    const tournamentData = (await tournamentRes.json()) as TournamentState;
    const picks: PickResult[] = picksRes.ok ? (await picksRes.json()).picks ?? [] : [];
    const rankingsData: RankEntry[] = rankingsRes.ok ? (await rankingsRes.json()).rankings ?? [] : [];
    return { tournamentData, picks, rankings: rankingsData };
  }, [code, clearToken]);

  // Initial load
  useEffect(() => {
    if (!auth.ready) return;
    loadData(auth.token).then((result) => {
      if (!result) return;
      setState(result.tournamentData);
      setMyPicks(result.picks);
      setRankings(result.rankings);
    });
  }, [auth.ready, auth.ready ? auth.token : null, code, loadData]);

  // Poll until finished
  usePolling(
    async (signal) => {
      if (!auth.ready) return;
      const result = await loadData(auth.token, signal);
      if (!result) return;
      setState(result.tournamentData);
      setMyPicks(result.picks);
      setRankings(result.rankings);
    },
    POLL_INTERVAL_RESULTS,
    auth.ready && state?.tournament.status !== TournamentStatus.FINISHED
  );

  const itemMap = useMemo(
    () => Object.fromEntries((state?.items ?? []).map((item) => [item.id, item])) as ItemMap,
    [state?.items]
  );

  const myPickMap = useMemo(
    () => Object.fromEntries(myPicks.map((pick) => [pick.matchId, pick])),
    [myPicks]
  );

  if (!auth.ready) return <ResultsPageSkeleton />;
  if (!state) return <ResultsPageSkeleton />;

  let myTotalPoints = 0;
  let resolvedCount = 0;
  let correctCount = 0;
  for (const pick of myPicks) {
    myTotalPoints += pick.pointsEarned;
    if (pick.isCorrect !== null) resolvedCount++;
    if (pick.isCorrect) correctCount++;
  }
  const isFinished = state.tournament.status === TournamentStatus.FINISHED;

  const statusBadge = isFinished ? (
    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      {t.results.finished}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
      <PulseDot color="amber" size="sm" />
      {t.results.inProgress}
    </span>
  );

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader
        backHref={isFinished ? "/" : auth.isCreator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`}
        backLabel={isFinished ? t.common.home : auth.isCreator ? t.results.setWinnersBack : t.results.myPicksBack}
        title={state.tournament.name}
        subtitle={code}
        rightSlot={statusBadge}
      />

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">

        <div className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{t.results.yourScore}</p>
            <p className="mt-1 text-5xl font-black tracking-tight">{myTotalPoints}</p>
            <p className="mt-0.5 text-sm font-medium opacity-75">{t.results.points}</p>
          </div>
          <div className="flex divide-x divide-zinc-100 dark:divide-zinc-800">
            <ScoreStat label={t.results.correct} value={correctCount} />
            <ScoreStat label={t.results.played} value={resolvedCount} />
            <ScoreStat label={t.results.waiting} value={myPicks.length - resolvedCount} />
          </div>
        </div>

        {rankings.length > 1 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t.results.rankingSection}</h2>
            <RankingsTable rankings={rankings} currentParticipantId={auth.participantId} />
          </section>
        )}

        {resolvedCount > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t.results.myPicksSection}</h2>
            <div className="space-y-2">
              {state.rounds.flatMap((round) =>
                round.matches
                  .filter((match) => match.status === "COMPLETE")
                  .map((match) => {
                    const winner = match.winnerId ? itemMap[match.winnerId] : null;
                    const myPick = myPickMap[match.id];
                    const myItem = myPick ? itemMap[myPick.pickedItemId] : null;
                    const isCorrect = myPick?.isCorrect;
                    const resultType = isCorrect === true ? "correct" : isCorrect === false ? "incorrect" : "pending";

                    return (
                      <div
                        key={match.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3",
                          isCorrect === true
                            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950"
                            : isCorrect === false
                            ? "border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950"
                            : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        )}
                      >
                        <ResultIcon result={resultType} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-xxs font-bold text-zinc-400">
                              {round.name || `R${round.roundNumber}`}
                            </span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                              {winner?.name ?? "?"}
                            </span>
                            <span className="text-zinc-400">{t.results.won}</span>
                          </div>
                          {myItem && (
                            <p className="mt-0.5 text-xs text-zinc-400">
                              {t.results.youChose}{" "}
                              <span className={isCorrect ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-red-400"}>
                                {myItem.name}
                              </span>
                            </p>
                          )}
                        </div>
                        {myPick && myPick.isCorrect !== null && (
                          <span
                            className={cn(
                              "shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold",
                              isCorrect ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                            )}
                          >
                            {isCorrect ? `+${myPick.pointsEarned}` : "0"}
                          </span>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        )}

        {state.rounds.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t.results.bracketSection}</h2>
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm overflow-hidden">
              <BracketView
                rounds={state.rounds}
                itemMap={itemMap}
                picks={Object.fromEntries(
                  Object.entries(myPickMap).map(([key, pickResult]) => [key, pickResult.pickedItemId])
                )}
                mode="view"
              />
            </div>
          </section>
        )}

        {resolvedCount === 0 && state.rounds.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-400">
            {t.results.noResults}
          </p>
        )}

      </div>
    </main>
  );
}
