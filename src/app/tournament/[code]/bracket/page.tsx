"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { decodeTokenPayload } from "@/lib/token-client";
import BracketView from "@/components/BracketView";

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; winnerId?: string | null; slots: Slot[] };
type Round = { id: string; roundNumber: number; name?: string | null; status: string; pointValue: number; matches: Match[] };

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
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner />
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
  const picked = pendingMatches.filter((m) => picks[m.id]).length;
  const allPicked = picked === pendingMatches.length && pendingMatches.length > 0;

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <span className="font-mono text-xs font-semibold tracking-widest text-zinc-400">{code}</span>
            <h1 className="text-base font-extrabold leading-tight tracking-tight">{state.tournament.name}</h1>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
            Escolha os vencedores
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
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

            <div className="flex items-center gap-3">
              {pendingMatches.length > 0 ? (
                <>
                  <button
                    type="submit"
                    disabled={submitting || !allPicked}
                    className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Salvando…" : "Salvar palpites"}
                  </button>
                  <span className="text-sm text-zinc-400">
                    {picked} / {pendingMatches.length} picked
                  </span>
                  {saved && (
                    <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
                      </svg>
                      Salvo!
                    </span>
                  )}
                  {error && <span className="text-sm text-red-500">{error}</span>}
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  Aguardando a próxima rodada…
                </div>
              )}
            </div>
          </form>
        </div>
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
