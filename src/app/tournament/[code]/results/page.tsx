"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeTokenPayload } from "@/lib/token-client";
import BracketView from "@/components/BracketView";

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; winnerId: string | null; slots: Slot[] };
type Round = { id: string; roundNumber: number; status: string; pointValue: number; matches: Match[] };
type Participant = { id: string; displayName: string; isCreator: boolean; hasSubmittedPicks: boolean };

type TournamentState = {
  tournament: { id: string; code: string; name: string; status: string };
  participants: Participant[];
  items: Item[];
  rounds: Round[];
};

type Pick = { matchId: string; pickedItemId: string; isCorrect: boolean | null; pointsEarned: number };

type LeaderboardEntry = { participant: Participant; points: number; correct: number };

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [myPicks, setMyPicks] = useState<Pick[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isCreator, setIsCreator] = useState(false);

  const loadData = useCallback(
    async (tok: string) => {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${tok}` } }),
        fetch(`/api/picks?tournamentCode=${code}`, { headers: { Authorization: `Bearer ${tok}` } }),
      ]);
      if (!tRes.ok) return null;
      const tData = (await tRes.json()) as TournamentState;
      const picks: Pick[] = pRes.ok ? (await pRes.json()).picks ?? [] : [];
      return { tData, picks };
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
    setIsCreator(payload?.isCreator ?? false);
    setToken(stored);

    loadData(stored).then((result) => {
      if (!result) return;
      const { tData, picks } = result;
      setState(tData);
      setMyPicks(picks);

      // Build leaderboard from picks (we only have own picks — show own score at minimum)
      // Full leaderboard would require a server endpoint that aggregates all participants' scores
      // For now, compute own score
      const myPoints = picks.reduce((sum, p) => sum + p.pointsEarned, 0);
      const myCorrect = picks.filter((p) => p.isCorrect).length;
      const me = tData.participants.find((p) => p.id === payload?.participantId);
      if (me) {
        setLeaderboard([{ participant: me, points: myPoints, correct: myCorrect }]);
      }
    });
  }, [code, loadData, router]);

  // Poll while tournament is still active
  useEffect(() => {
    if (!token || state?.tournament.status === "FINISHED") return;
    const interval = setInterval(() => {
      loadData(token).then((result) => {
        if (!result) return;
        const { tData, picks } = result;
        setState(tData);
        setMyPicks(picks);
        if (tData.tournament.status === "FINISHED") clearInterval(interval);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [token, state?.tournament.status, loadData]);

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  const itemMap = Object.fromEntries(state.items.map((it) => [it.id, it]));
  const myPickMap = Object.fromEntries(myPicks.map((p) => [p.matchId, p]));
  const myTotalPoints = myPicks.reduce((s, p) => s + p.pointsEarned, 0);
  // Enrich rounds with pick-based winnerId overlay for coloring
  const enrichedRounds = state.rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m, winnerId: m.winnerId ?? null })),
  }));

  return (
    <main className="flex min-h-screen flex-col items-center p-6 pt-12">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono tracking-widest text-zinc-400">{code}</p>
            <h1 className="mt-1 text-2xl font-bold">{state.tournament.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {state.tournament.status === "FINISHED" ? "Tournament finished" : "In progress"}
            </p>
          </div>
          {isCreator && state.tournament.status !== "FINISHED" && (
            <Link
              href={`/tournament/${code}/live`}
              className="text-sm text-zinc-400 hover:text-zinc-700"
            >
              ← Resolve matches
            </Link>
          )}
        </div>

        {/* Own score */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex items-center gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Your score</p>
            <p className="text-4xl font-bold">{myTotalPoints} pts</p>
            <p className="text-sm text-zinc-500 mt-1">
              {myPicks.filter((p) => p.isCorrect).length} correct /{" "}
              {myPicks.filter((p) => p.isCorrect !== null).length} resolved
            </p>
          </div>
        </div>

        {/* Visual bracket */}
        {state.rounds.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 overflow-hidden">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Bracket
            </h2>
            <BracketView
              rounds={enrichedRounds}
              itemMap={itemMap}
              picks={myPickMap ? Object.fromEntries(
                Object.entries(myPickMap).map(([k, v]) => [k, v.pickedItemId])
              ) : {}}
              mode="view"
            />
          </div>
        )}

        {state.rounds.length === 0 && (
          <p className="text-center text-sm text-zinc-400">
            No results yet — waiting for the first match to be resolved.
          </p>
        )}

        <Link href="/" className="block text-center text-sm text-zinc-400 hover:text-zinc-700">
          ← Home
        </Link>
      </div>
    </main>
  );
}
