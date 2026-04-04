"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { usePolling } from "@/hooks/use-polling";
import { cn } from "@/lib/cn";
import { TournamentStatus, POLL_INTERVAL_RESULTS } from "@/constants/tournament";
import { TournamentHeader } from "@/components/tournament-header";
import { PageSpinner } from "@/components/page-spinner";
import { PulseDot } from "@/components/pulse-dot";
import { RankingsTable } from "@/components/rankings-table";
import { ScoreStat } from "@/components/score-stat";
import { ResultIcon } from "@/components/result-icon";
import dynamic from "next/dynamic";
import type { TournamentState, PickResult, RankEntry, ItemMap } from "@/types/tournament";

const BracketView = dynamic(() => import("@/components/BracketView"), {
  loading: () => <div className="h-64 motion-safe:animate-pulse rounded-2xl bg-zinc-100" />,
});

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { token, participantId, isCreator } = useTournamentToken(code);

  const [state, setState] = useState<TournamentState | null>(null);
  const [myPicks, setMyPicks] = useState<PickResult[]>([]);
  const [rankings, setRankings] = useState<RankEntry[]>([]);

  const loadData = useCallback(async (authToken: string, signal?: AbortSignal) => {
    const [tournamentRes, picksRes, rankingsRes] = await Promise.all([
      fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
      fetch(`/api/picks?tournamentCode=${code}`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
      fetch(`/api/tournaments/${code}/rankings`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
    ]);
    if (!tournamentRes.ok) return null;
    const tournamentData = (await tournamentRes.json()) as TournamentState;
    const picks: PickResult[] = picksRes.ok ? (await picksRes.json()).picks ?? [] : [];
    const rankingsData: RankEntry[] = rankingsRes.ok ? (await rankingsRes.json()).rankings ?? [] : [];
    return { tournamentData, picks, rankings: rankingsData };
  }, [code]);

  // Initial load
  useEffect(() => {
    if (!token) return;
    loadData(token).then((result) => {
      if (!result) return;
      setState(result.tournamentData);
      setMyPicks(result.picks);
      setRankings(result.rankings);
    });
  }, [token, loadData]);

  // Poll until finished
  usePolling(
    async (signal) => {
      if (!token) return;
      const result = await loadData(token, signal);
      if (!result) return;
      setState(result.tournamentData);
      setMyPicks(result.picks);
      setRankings(result.rankings);
    },
    POLL_INTERVAL_RESULTS,
    !!token && state?.tournament.status !== TournamentStatus.FINISHED
  );

  const itemMap = useMemo(
    () => Object.fromEntries((state?.items ?? []).map((item) => [item.id, item])) as ItemMap,
    [state?.items]
  );

  const myPickMap = useMemo(
    () => Object.fromEntries(myPicks.map((pick) => [pick.matchId, pick])),
    [myPicks]
  );

  if (!state) return <PageSpinner />;

  let myTotalPoints = 0, resolvedCount = 0, correctCount = 0;
  for (const pick of myPicks) {
    myTotalPoints += pick.pointsEarned;
    if (pick.isCorrect !== null) resolvedCount++;
    if (pick.isCorrect) correctCount++;
  }
  const isFinished = state.tournament.status === TournamentStatus.FINISHED;

  const statusBadge = isFinished ? (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      Finalizado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      <PulseDot color="amber" size="sm" />
      Em andamento
    </span>
  );

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <TournamentHeader
        code={code}
        name={state.tournament.name}
        backHref={
          isFinished ? "/" : isCreator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`
        }
        backLabel={
          isFinished ? "Início" : isCreator ? "Definir vencedores" : "Meus palpites"
        }
        rightSlot={statusBadge}
      />

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">

        {/* Score card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Sua pontuação</p>
            <p className="mt-1 text-5xl font-black tracking-tight">{myTotalPoints}</p>
            <p className="mt-0.5 text-sm font-medium opacity-75">pontos</p>
          </div>
          <div className="flex divide-x divide-zinc-100">
            <ScoreStat label="Corretos" value={correctCount} />
            <ScoreStat label="Disputados" value={resolvedCount} />
            <ScoreStat label="Aguardando" value={myPicks.length - resolvedCount} />
          </div>
        </div>

        {/* Rankings */}
        {rankings.length > 1 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ranking</h2>
            <RankingsTable rankings={rankings} currentParticipantId={participantId} />
          </section>
        )}

        {/* Picks breakdown */}
        {resolvedCount > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Meus palpites</h2>
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
                            ? "border-emerald-200 bg-emerald-50"
                            : isCorrect === false
                            ? "border-red-100 bg-red-50"
                            : "border-zinc-100 bg-white"
                        )}
                      >
                        <ResultIcon result={resultType} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-xxs font-bold text-zinc-400">
                              {round.name || `R${round.roundNumber}`}
                            </span>
                            <span className="font-semibold text-zinc-800 truncate">
                              {winner?.name ?? "?"}
                            </span>
                            <span className="text-zinc-400">ganhou</span>
                          </div>
                          {myItem && (
                            <p className="mt-0.5 text-xs text-zinc-400">
                              Você escolheu:{" "}
                              <span className={isCorrect ? "font-semibold text-emerald-600" : "text-red-400"}>
                                {myItem.name}
                              </span>
                            </p>
                          )}
                        </div>
                        {myPick && myPick.isCorrect !== null && (
                          <span
                            className={cn(
                              "shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold",
                              isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
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

        {/* Bracket */}
        {state.rounds.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chaveamento</h2>
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm overflow-hidden">
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
            Nenhum resultado ainda — aguardando a primeira partida.
          </p>
        )}

      </div>
    </main>
  );
}
