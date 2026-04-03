"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { decodeTokenPayload } from "@/lib/token-client";

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; slots: Slot[] };
type Round = { id: string; roundNumber: number; status: string; pointValue: number; matches: Match[] };

type TournamentState = {
  tournament: { id: string; code: string; name: string; status: string };
  items: Item[];
  rounds: Round[];
  myPicks: Record<string, string>; // matchId → pickedItemId
};

export default function BracketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({}); // matchId → itemId
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

      // Fetch round/match details — we'll build from tournament state
      // The GET /api/tournaments/[code] doesn't return rounds; we need to extend it
      // For now, use the tournament items + a derived structure
      // Actually we'll do a workaround: fetch the full state from a dedicated endpoint
      // Since we don't have one, we'll query Prisma indirectly via the existing data.
      // We need to add round data to the GET /api/tournaments/[code] endpoint.
      // For now, return what we have.

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

  // Poll for new rounds becoming active
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
        // Merge picks — don't overwrite user's in-progress selections
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

  // Get all rounds that are ACTIVE or COMPLETE
  const visibleRounds = (state.rounds ?? []).filter(
    (r) => r.status === "ACTIVE" || r.status === "COMPLETE"
  );

  const itemMap = Object.fromEntries((state.items ?? []).map((it) => [it.id, it]));

  // Check if all visible pending matches have a pick
  const pendingMatches = visibleRounds
    .flatMap((r) => r.matches)
    .filter((m) => m.status !== "COMPLETE");
  const allPicked = pendingMatches.every((m) => picks[m.id]);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 pt-12">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <p className="text-xs font-mono tracking-widest text-zinc-400">{code}</p>
          <h1 className="mt-1 text-2xl font-bold">{state.tournament.name}</h1>
          <p className="text-sm text-zinc-500">Pick your winners</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {visibleRounds.map((round) => (
            <div key={round.id} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Round {round.roundNumber}{" "}
                <span className="text-zinc-300">· {round.pointValue} pts each</span>
                {round.status === "COMPLETE" && (
                  <span className="ml-2 text-green-500">complete</span>
                )}
              </h2>
              <div className="space-y-2">
                {round.matches.map((match) => {
                  const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                  const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                  const selected = picks[match.id];
                  const resolved = match.status === "COMPLETE";

                  return (
                    <div
                      key={match.id}
                      className={`rounded-2xl border p-3 ${
                        resolved ? "border-zinc-100 bg-zinc-50" : "border-zinc-200 bg-white"
                      }`}
                    >
                      <div className="flex gap-2">
                        {[item1, item2].map((item, idx) => {
                          if (!item)
                            return (
                              <div
                                key={idx}
                                className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 py-2 text-xs text-zinc-300"
                              >
                                TBD
                              </div>
                            );
                          const isSelected = selected === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={resolved}
                              onClick={() => {
                                if (!resolved) {
                                  setPicks((p) => ({ ...p, [match.id]: item.id }));
                                  setSaved(false);
                                }
                              }}
                              className={`flex flex-1 flex-col items-center rounded-xl border px-3 py-2 text-sm transition-colors ${
                                isSelected
                                  ? "border-zinc-900 bg-zinc-900 text-white"
                                  : resolved
                                  ? "border-zinc-100 text-zinc-300"
                                  : "border-zinc-200 hover:border-zinc-400"
                              }`}
                            >
                              <span className="text-[10px] opacity-60">#{item.seed}</span>
                              <span className="font-medium leading-tight text-center">
                                {item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-green-600">Picks saved!</p>}

          {pendingMatches.length > 0 && (
            <button
              type="submit"
              disabled={submitting || !allPicked}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save picks"}
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
