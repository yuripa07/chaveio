"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeTokenPayload } from "@/lib/token-client";
import { getStoredToken } from "@/lib/token-storage";
import { TournamentStatus } from "@/constants/tournament";
import { TournamentHeader } from "@/components/tournament-header";
import { PageSpinner } from "@/components/page-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { InfoBanner } from "@/components/info-banner";
import { PulseDot } from "@/components/pulse-dot";
import { RankingsTable } from "@/components/rankings-table";
import dynamic from "next/dynamic";
import type { TournamentState, ItemMap, RankEntry } from "@/types/tournament";

const BracketView = dynamic(() => import("@/components/BracketView"), {
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />,
});

export default function LivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [winnerError, setWinnerError] = useState("");

  const loadState = useCallback(async (token: string) => {
    const [tournamentResponse, rankingsResponse] = await Promise.all([
      fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/tournaments/${code}/rankings`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!tournamentResponse.ok) return null;
    const rankingsData: RankEntry[] = rankingsResponse.ok
      ? (await rankingsResponse.json()).rankings ?? []
      : [];
    return { state: (await tournamentResponse.json()) as TournamentState, rankings: rankingsData };
  }, [code]);

  useEffect(() => {
    const stored = getStoredToken(code);
    if (!stored) { router.replace(`/tournament/${code}`); return; }
    if (!decodeTokenPayload(stored)?.isCreator) { router.replace(`/tournament/${code}/bracket`); return; }
    setToken(stored);
    loadState(stored).then((result) => {
      if (!result) return;
      if (result.state.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(result.state);
      setRankings(result.rankings);
    });
  }, [code, loadState, router]);

  async function setWinner(matchId: string, winnerId: string) {
    if (!token) return;
    setResolving(matchId);
    setWinnerError("");
    try {
      const response = await fetch(`/api/tournaments/${code}/matches/${matchId}/winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winnerId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setWinnerError(body.error ?? "Erro ao salvar vencedor");
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

  const itemMap = useMemo(
    () => Object.fromEntries((state?.items ?? []).map((item) => [item.id, item])) as ItemMap,
    [state?.items]
  );

  if (!state) return <PageSpinner />;

  const activeRound = state.rounds.find((round) => round.status === TournamentStatus.ACTIVE);
  const pendingMatches = activeRound?.matches.filter((match) => match.status !== "COMPLETE") ?? [];
  const pendingParticipants = state.participants.filter((participant) => !participant.hasSubmittedPicks);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <TournamentHeader
        code={code}
        name={state.tournament.name}
        rightSlot={
          <Link
            href={`/tournament/${code}/results`}
            className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            Placar →
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">

        {pendingParticipants.length > 0 && (
          <InfoBanner variant="warning">
            <svg viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.5a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 8 4.5Zm0 6a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z" />
            </svg>
            <span>
              Aguardando palpites de:{" "}
              <strong>{pendingParticipants.map((participant) => participant.displayName).join(", ")}</strong>.
              Não é possível resolver partidas até que todos enviem seus palpites.
            </span>
          </InfoBanner>
        )}

        {winnerError && <ErrorAlert message={winnerError} className="rounded-2xl border border-red-100 px-5 py-3" />}

        {activeRound && pendingMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <PulseDot color="indigo" size="md" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                {activeRound.name
                  ? `${activeRound.name} · ${activeRound.pointValue} pts`
                  : `Rodada ${activeRound.roundNumber} · ${activeRound.pointValue} pts`
                } · clique no vencedor
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pendingMatches.map((match) => {
                const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                const isBusy = resolving === match.id;

                return (
                  <div
                    key={match.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                  >
                    <p className="border-b border-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-400">
                      Partida {match.matchNumber}
                    </p>
                    <div className="flex divide-x divide-zinc-100">
                      {[item1, item2].map((item, index) => {
                        if (!item)
                          return (
                            <div key={index} className="flex flex-1 items-center justify-center py-6 text-xs text-zinc-300">
                              A definir
                            </div>
                          );
                        return (
                          <button
                            key={item.id}
                            disabled={isBusy}
                            onClick={() => setWinner(match.id, item.id)}
                            className="group flex flex-1 flex-col items-center gap-1.5 px-4 py-5 text-center hover:bg-indigo-600 hover:text-white active:scale-[.97] transition-all disabled:opacity-50"
                          >
                            <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                              #{item.seed}
                            </span>
                            <span className="font-semibold leading-tight">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {isBusy && (
                      <div className="border-t border-zinc-100 py-2 text-center text-xs text-zinc-400">
                        Salvando…
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chaveamento</h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <BracketView rounds={state.rounds} itemMap={itemMap} mode="view" />
          </div>
        </section>

        {rankings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ranking atual</h2>
            <RankingsTable rankings={rankings} />
          </section>
        )}
      </div>
    </main>
  );
}
