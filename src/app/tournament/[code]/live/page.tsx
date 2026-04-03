"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { decodeTokenPayload } from "@/lib/token-client";
import Link from "next/link";

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; winnerId: string | null; slots: Slot[] };
type Round = { id: string; roundNumber: number; status: string; pointValue: number; matches: Match[] };

type TournamentState = {
  tournament: { id: string; code: string; name: string; status: string };
  items: Item[];
  rounds: Round[];
};

export default function LivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [resolving, setResolving] = useState<string | null>(null); // matchId being resolved

  const loadState = useCallback(
    async (tok: string) => {
      const res = await fetch(`/api/tournaments/${code}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as TournamentState;
    },
    [code]
  );

  useEffect(() => {
    const stored = localStorage.getItem(`chaveio_token_${code}`);
    if (!stored) {
      router.replace(`/tournament/${code}`);
      return;
    }
    const payload = decodeTokenPayload(stored);
    if (!payload?.isCreator) {
      router.replace(`/tournament/${code}/bracket`);
      return;
    }
    setToken(stored);
    loadState(stored).then((s) => {
      if (!s) return;
      if (s.tournament.status === "FINISHED") {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(s);
    });
  }, [code, loadState, router]);

  async function setWinner(matchId: string, winnerId: string) {
    if (!token) return;
    setResolving(matchId);
    try {
      const res = await fetch(`/api/tournaments/${code}/matches/${matchId}/winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winnerId }),
      });
      if (!res.ok) return;
      const s = await loadState(token);
      if (!s) return;
      if (s.tournament.status === "FINISHED") {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(s);
    } finally {
      setResolving(null);
    }
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  const itemMap = Object.fromEntries(state.items.map((it) => [it.id, it]));
  const activeRound = state.rounds.find((r) => r.status === "ACTIVE");
  const completedRounds = state.rounds.filter((r) => r.status === "COMPLETE");

  return (
    <main className="flex min-h-screen flex-col items-center p-6 pt-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono tracking-widest text-zinc-400">{code}</p>
            <h1 className="mt-1 text-2xl font-bold">{state.tournament.name}</h1>
          </div>
          <Link
            href={`/tournament/${code}/results`}
            className="text-sm text-zinc-400 hover:text-zinc-700"
          >
            Leaderboard →
          </Link>
        </div>

        {activeRound && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Round {activeRound.roundNumber} — Active
              <span className="text-zinc-300"> · {activeRound.pointValue} pts</span>
            </h2>
            <div className="space-y-3">
              {activeRound.matches.map((match) => {
                const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                const resolved = match.status === "COMPLETE";

                return (
                  <div
                    key={match.id}
                    className={`rounded-2xl border p-4 ${
                      resolved ? "border-zinc-100 bg-zinc-50" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <p className="mb-2 text-xs text-zinc-400">Match {match.matchNumber}</p>
                    <div className="flex gap-2">
                      {[item1, item2].map((item, idx) => {
                        if (!item)
                          return (
                            <div
                              key={idx}
                              className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 py-3 text-xs text-zinc-300"
                            >
                              TBD
                            </div>
                          );
                        const isWinner = match.winnerId === item.id;
                        const isResolving = resolving === match.id;
                        return (
                          <button
                            key={item.id}
                            disabled={resolved || isResolving}
                            onClick={() => setWinner(match.id, item.id)}
                            className={`flex flex-1 flex-col items-center rounded-xl border px-3 py-3 text-sm transition-colors ${
                              isWinner
                                ? "border-green-500 bg-green-50 text-green-700"
                                : resolved
                                ? "border-zinc-100 text-zinc-300"
                                : "border-zinc-200 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                            } disabled:cursor-default`}
                          >
                            <span className="text-[10px] opacity-60">#{item.seed}</span>
                            <span className="font-semibold">{item.name}</span>
                            {isWinner && <span className="text-xs mt-0.5">Winner</span>}
                          </button>
                        );
                      })}
                    </div>
                    {resolving === match.id && (
                      <p className="mt-2 text-center text-xs text-zinc-400">Saving...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {completedRounds.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Completed rounds
            </h2>
            {completedRounds.map((round) => (
              <div key={round.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-2">
                <p className="text-xs text-zinc-400">Round {round.roundNumber}</p>
                {round.matches.map((match) => {
                  const winner = match.winnerId ? itemMap[match.winnerId] : null;
                  const loser = match.slots
                    .map((s) => itemMap[s.itemId])
                    .find((it) => it?.id !== match.winnerId);
                  return (
                    <div key={match.id} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{winner?.name ?? "?"}</span>
                      <span className="text-zinc-300">beat</span>
                      <span className="text-zinc-400 line-through">{loser?.name ?? "?"}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
