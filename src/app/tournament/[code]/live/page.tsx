"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart2, Clock, Swords, Trophy, AlertTriangle, X } from "lucide-react";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { cn } from "@/lib/cn";
import { TournamentStatus } from "@/constants/tournament";
import { TournamentHeader } from "@/components/tournament-header";
import { PageSpinner } from "@/components/page-spinner";
import { InfoBanner } from "@/components/info-banner";
import { PulseDot } from "@/components/pulse-dot";
import { RankingsTable } from "@/components/rankings-table";
import { Spinner } from "@/components/spinner";
import dynamic from "next/dynamic";
import type { TournamentState, ItemMap, RankEntry, TournamentItem } from "@/types/tournament";

const BracketView = dynamic(() => import("@/components/BracketView"), {
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />,
});

type PendingWinner = { matchId: string; item: TournamentItem };

export default function LivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { token, isCreator } = useTournamentToken(code);

  const [state, setState] = useState<TournamentState | null>(null);
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [winnerError, setWinnerError] = useState("");
  const [pendingWinner, setPendingWinner] = useState<PendingWinner | null>(null);

  const loadState = useCallback(async (authToken: string) => {
    const [tournamentRes, rankingsRes] = await Promise.all([
      fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${authToken}` } }),
      fetch(`/api/tournaments/${code}/rankings`, { headers: { Authorization: `Bearer ${authToken}` } }),
    ]);
    if (!tournamentRes.ok) return null;
    const rankingsData: RankEntry[] = rankingsRes.ok ? (await rankingsRes.json()).rankings ?? [] : [];
    return { state: (await tournamentRes.json()) as TournamentState, rankings: rankingsData };
  }, [code]);

  // Initial load + redirect non-creators
  useEffect(() => {
    if (!token) { router.replace(`/tournament/${code}`); return; }
    if (!isCreator) { router.replace(`/tournament/${code}/bracket`); return; }
    loadState(token).then((result) => {
      if (!result) return;
      if (result.state.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(result.state);
      setRankings(result.rankings);
    });
  }, [token, isCreator, code, loadState, router]);

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

  const activeRound = state.rounds.find((r) => r.status === TournamentStatus.ACTIVE);
  const pendingMatches = activeRound?.matches.filter((m) => m.status !== "COMPLETE") ?? [];
  const pendingParticipants = state.participants.filter((p) => !p.hasSubmittedPicks);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <TournamentHeader
        code={code}
        name={state.tournament.name}
        backHref="/"
        backLabel="Início"
        rightSlot={
          <Link
            href={`/tournament/${code}/results`}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Placar
          </Link>
        }
      />

      {/* Confirmation dialog */}
      {pendingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <button
                onClick={() => setPendingWinner(null)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-base font-bold text-zinc-900">Confirmar vencedor</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Tem certeza que{" "}
              <strong className="text-zinc-800">{pendingWinner.item.name}</strong> ganhou essa partida?
              Essa ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPendingWinner(null)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmWinner}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[.98] transition-all"
              >
                Confirmar
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
              Aguardando palpites de:{" "}
              <strong>{pendingParticipants.map((p) => p.displayName).join(", ")}</strong>.
              {" "}Os vencedores não podem ser definidos até que todos enviem seus palpites.
            </span>
          </InfoBanner>
        )}

        {winnerError && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">
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
                  : `Rodada ${activeRound.roundNumber} · ${activeRound.pointValue} pts`
                }
              </h2>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                clique no vencedor
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
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2">
                      <Swords className="h-3.5 w-3.5 text-zinc-300" />
                      <p className="text-xs font-semibold text-zinc-400">
                        Partida {match.matchNumber}
                      </p>
                      {isBusy && (
                        <span className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
                          <Spinner size="sm" />
                          Salvando…
                        </span>
                      )}
                    </div>
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
                            disabled={isBusy || !canResolve}
                            onClick={() => setPendingWinner({ matchId: match.id, item })}
                            className={cn(
                              "group flex flex-1 flex-col items-center gap-1.5 px-4 py-5 text-center transition-all",
                              canResolve && !isBusy
                                ? "hover:bg-indigo-600 hover:text-white active:scale-95 cursor-pointer"
                                : "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                              #{item.seed}
                            </span>
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
