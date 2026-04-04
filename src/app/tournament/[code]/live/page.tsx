"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { decodeTokenPayload } from "@/lib/token-client";
import Link from "next/link";
import BracketView from "@/components/BracketView";

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; winnerId: string | null; slots: Slot[] };
type Round = { id: string; roundNumber: number; name?: string | null; status: string; pointValue: number; matches: Match[] };

type Participant = { id: string; displayName: string; hasSubmittedPicks: boolean };

type TournamentState = {
  tournament: { id: string; code: string; name: string; status: string };
  items: Item[];
  rounds: Round[];
  participants: Participant[];
};

export default function LivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [winnerError, setWinnerError] = useState("");

  const loadState = useCallback(async (tok: string) => {
    const res = await fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!res.ok) return null;
    return (await res.json()) as TournamentState;
  }, [code]);

  useEffect(() => {
    const stored = localStorage.getItem(`chaveio_token_${code}`);
    if (!stored) { router.replace(`/tournament/${code}`); return; }
    if (!decodeTokenPayload(stored)?.isCreator) { router.replace(`/tournament/${code}/bracket`); return; }
    setToken(stored);
    loadState(stored).then((s) => {
      if (!s) return;
      if (s.tournament.status === "FINISHED") { router.replace(`/tournament/${code}/results`); return; }
      setState(s);
    });
  }, [code, loadState, router]);

  async function setWinner(matchId: string, winnerId: string) {
    if (!token) return;
    setResolving(matchId);
    setWinnerError("");
    try {
      const res = await fetch(`/api/tournaments/${code}/matches/${matchId}/winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winnerId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setWinnerError(body.error ?? "Erro ao salvar vencedor");
        return;
      }
      const s = await loadState(token);
      if (!s) return;
      if (s.tournament.status === "FINISHED") { router.replace(`/tournament/${code}/results`); return; }
      setState(s);
    } finally {
      setResolving(null);
    }
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner />
      </main>
    );
  }

  const itemMap = Object.fromEntries(state.items.map((it) => [it.id, it]));
  const activeRound = state.rounds.find((r) => r.status === "ACTIVE");
  const pendingInRound = activeRound?.matches.filter((m) => m.status !== "COMPLETE") ?? [];
  const pendingPicks = state.participants.filter((p) => !p.hasSubmittedPicks);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <span className="font-mono text-xs font-semibold tracking-widest text-zinc-400">{code}</span>
            <h1 className="text-base font-extrabold leading-tight tracking-tight">{state.tournament.name}</h1>
          </div>
          <Link
            href={`/tournament/${code}/results`}
            className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            Placar →
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">

        {/* Warning: pending picks */}
        {pendingPicks.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3.5 text-sm text-amber-700">
            <svg viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.5a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 8 4.5Zm0 6a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z" />
            </svg>
            <span>
              Aguardando palpites de: <strong>{pendingPicks.map((p) => p.displayName).join(", ")}</strong>.
              Não é possível resolver partidas até que todos enviem seus palpites.
            </span>
          </div>
        )}

        {/* Error from winner API */}
        {winnerError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">
            {winnerError}
          </div>
        )}

        {/* Active round: big match cards */}
        {activeRound && pendingInRound.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                {activeRound.name
                  ? `${activeRound.name} · ${activeRound.pointValue} pts`
                  : `Rodada ${activeRound.roundNumber} · ${activeRound.pointValue} pts`
                } · clique no vencedor
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pendingInRound.map((match) => {
                const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                const busy = resolving === match.id;

                return (
                  <div
                    key={match.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                  >
                    <p className="border-b border-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-400">
                      Partida {match.matchNumber}
                    </p>
                    <div className="flex divide-x divide-zinc-100">
                      {[item1, item2].map((item, idx) => {
                        if (!item)
                          return (
                            <div key={idx} className="flex flex-1 items-center justify-center py-6 text-xs text-zinc-300">
                              A definir
                            </div>
                          );
                        return (
                          <button
                            key={item.id}
                            disabled={busy}
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
                    {busy && (
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

        {/* Full bracket */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chaveamento</h2>
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm overflow-hidden">
            <BracketView rounds={state.rounds} itemMap={itemMap} mode="view" />
          </div>
        </section>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg className="h-6 w-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
