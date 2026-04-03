"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { decodeTokenPayload } from "@/lib/token-client";
import BracketView from "@/components/BracketView";

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; winnerId?: string | null; slots: Slot[] };
type Round = { id: string; roundNumber: number; status: string; pointValue: number; matches: Match[] };

type TournamentState = {
  tournament: { id: string; code: string; name: string; status: string };
  items: Item[];
  rounds: Round[];
  myPicks: Record<string, string>;
};

export default function BracketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadState = useCallback(
    async (tok: string) => {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${tok}` } }),
        fetch(`/api/picks?tournamentCode=${code}`, { headers: { Authorization: `Bearer ${tok}` } }),
      ]);
      if (!tRes.ok) return null;
      const tData = await tRes.json();
      const myPicks: Record<string, string> = {};
      if (pRes.ok) {
        const pData = await pRes.json();
        for (const p of pData.picks ?? []) {
          myPicks[p.matchId] = p.pickedItemId;
        }
      }
      return { ...tData, myPicks } as TournamentState;
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
    if (payload?.isCreator) {
      router.replace(`/tournament/${code}/live`);
      return;
    }
    setToken(stored);
    loadState(stored).then((s) => {
      if (!s) return;
      if (s.tournament.status === "FINISHED") {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      if (s.tournament.status === "LOBBY") {
        router.replace(`/tournament/${code}`);
        return;
      }
      setState(s);
      setPicks(s.myPicks);
    });
  }, [code, loadState, router]);

  // Poll for new rounds
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadState(token).then((s) => {
        if (!s) return;
        if (s.tournament.status === "FINISHED") {
          clearInterval(interval);
          router.replace(`/tournament/${code}/results`);
          return;
        }
        setState(s);
        setPicks((prev) => ({ ...s.myPicks, ...prev }));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [token, code, loadState, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !state) return;
    setSubmitting(true);
    setError("");
    setSaved(false);
    try {
      const picksPayload = Object.entries(picks).map(([matchId, pickedItemId]) => ({
        matchId,
        pickedItemId,
      }));
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tournamentCode: code, picks: picksPayload }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to save picks");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  const itemMap = Object.fromEntries((state.items ?? []).map((it) => [it.id, it]));
  const activeRounds = (state.rounds ?? []).filter(
    (r) => r.status === "ACTIVE" || r.status === "COMPLETE"
  );
  const pendingMatches = activeRounds
    .flatMap((r) => r.matches)
    .filter((m) => m.status !== "COMPLETE");
  const allPicked = pendingMatches.every((m) => picks[m.id]);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 pt-12">
      <div className="w-full max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-mono tracking-widest text-zinc-400">{code}</p>
          <h1 className="mt-1 text-2xl font-bold">{state.tournament.name}</h1>
          <p className="text-sm text-zinc-500">Pick your winners — click to select</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <BracketView
            rounds={activeRounds}
            itemMap={itemMap}
            picks={picks}
            onPick={(matchId, itemId) => {
              setPicks((p) => ({ ...p, [matchId]: itemId }));
              setSaved(false);
            }}
            mode="pick"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-green-600">Picks saved!</p>}

          {pendingMatches.length > 0 && (
            <button
              type="submit"
              disabled={submitting || !allPicked}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : `Save picks (${Object.keys(picks).length}/${pendingMatches.length} picked)`}
            </button>
          )}

          {pendingMatches.length === 0 && (
            <p className="text-center text-sm text-zinc-400">
              Waiting for the next round...
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
