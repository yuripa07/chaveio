"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { decodeTokenPayload } from "@/lib/token-client";
import { getStoredToken } from "@/lib/token-storage";
import BracketView from "@/components/BracketView";
import Spinner from "@/components/Spinner";
import { getFeederMatches, getNextRoundSlot } from "@/lib/bracket";

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; winnerId?: string | null; slots: Slot[] };
type Round = { id: string; roundNumber: number; name?: string | null; status: string; pointValue: number; matches: Match[] };
type Participant = { id: string; displayName: string; isCreator: boolean; hasSubmittedPicks: boolean; joinedAtRound: number | null };

type TournamentState = {
  tournament: { id: string; code: string; name: string; status: string };
  items: Item[];
  rounds: Round[];
  participants: Participant[];
  myPicks: Record<string, string>;
};

/** Compute virtual slots for rounds R>startRound based on participant's own picks */
function augmentRounds(
  rounds: Round[],
  picks: Record<string, string>,
  startRound: number
): Round[] {
  const roundByNumber = new Map(rounds.map((r) => [r.roundNumber, r]));

  return rounds.map((round) => {
    if (round.roundNumber <= startRound) return round; // real slots

    const prevRound = roundByNumber.get(round.roundNumber - 1)!;
    const augmentedMatches = round.matches.map((match) => {
      if (match.slots.length >= 2) return match; // already has real slots (shouldn't happen in predict mode)
      const [f1Num, f2Num] = getFeederMatches(match.matchNumber);
      const feeder1 = prevRound.matches.find((m) => m.matchNumber === f1Num);
      const feeder2 = prevRound.matches.find((m) => m.matchNumber === f2Num);
      const pick1 = feeder1 ? picks[feeder1.id] : null;
      const pick2 = feeder2 ? picks[feeder2.id] : null;
      const virtualSlots: Slot[] = [];
      if (pick1) virtualSlots.push({ id: `v-${match.id}-1`, itemId: pick1, position: 1 });
      if (pick2) virtualSlots.push({ id: `v-${match.id}-2`, itemId: pick2, position: 2 });
      return { ...match, slots: virtualSlots };
    });

    return { ...round, matches: augmentedMatches };
  });
}

/** When a pick changes, clear any downstream picks that are now invalid */
function clearDownstream(
  changedMatchId: string,
  rounds: Round[],
  picks: Record<string, string>
): Record<string, string> {
  const updated = { ...picks };

  let roundNumber = -1;
  let matchNumber = -1;
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.id === changedMatchId) {
        roundNumber = round.roundNumber;
        matchNumber = match.matchNumber;
        break;
      }
    }
  }
  if (roundNumber === -1) return updated;

  const prevPickedItem = picks[changedMatchId]; // old value before change

  function cascade(rn: number, mn: number, oldItem: string | undefined) {
    const { matchIndex } = getNextRoundSlot(mn);
    const nextMatchNumber = matchIndex + 1;
    const nextRound = rounds.find((r) => r.roundNumber === rn + 1);
    if (!nextRound) return;
    const nextMatch = nextRound.matches.find((m) => m.matchNumber === nextMatchNumber);
    if (!nextMatch) return;
    const currentPick = updated[nextMatch.id];
    if (currentPick && currentPick === oldItem) {
      delete updated[nextMatch.id];
      cascade(rn + 1, nextMatchNumber, currentPick);
    }
  }

  cascade(roundNumber, matchNumber, prevPickedItem);
  return updated;
}

export default function BracketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
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
        for (const p of (await pRes.json()).picks ?? []) {
          myPicks[p.matchId] = p.pickedItemId;
        }
      }
      return { ...tData, myPicks } as TournamentState;
    },
    [code]
  );

  useEffect(() => {
    const stored = getStoredToken(code);
    if (!stored) { router.replace(`/tournament/${code}`); return; }
    const payload = decodeTokenPayload(stored);
    setToken(stored);
    setParticipantId(payload?.participantId ?? null);
    loadState(stored).then((s) => {
      if (!s) return;
      if (s.tournament.status === "FINISHED") { router.replace(`/tournament/${code}/results`); return; }
      setState(s);
      setPicks(s.myPicks);
    });
  }, [code, loadState, router]);

  // Poll when ACTIVE
  useEffect(() => {
    if (!token || !state || state.tournament.status !== "ACTIVE") return;
    const interval = setInterval(() => {
      loadState(token).then((s) => {
        if (!s) return;
        if (s.tournament.status === "FINISHED") { clearInterval(interval); router.replace(`/tournament/${code}/results`); return; }
        setState(s);
        setPicks((prev) => ({ ...s.myPicks, ...prev }));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [token, code, loadState, router, state?.tournament.status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !state) return;
    setSubmitting(true);
    setError("");
    setSaved(false);
    try {
      const picksPayload = Object.entries(picks).map(([matchId, pickedItemId]) => ({ matchId, pickedItemId }));
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tournamentCode: code, picks: picksPayload }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "Falha ao salvar");
        return;
      }
      setSaved(true);
      // Refresh state so hasSubmittedPicks reflects in participants
      const s = await loadState(token);
      if (s) setState(s);
      // If in LOBBY, go back to lobby to wait
      if (state.tournament.status === "LOBBY") {
        router.replace(`/tournament/${code}`);
      }
    } catch {
      setError("Erro de rede");
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

  const me = state.participants.find((p) => p.id === participantId);
  const joinedAtRound = me?.joinedAtRound ?? null;
  const startRound = joinedAtRound ?? 1;
  const alreadySubmitted = me?.hasSubmittedPicks ?? false;

  // In ACTIVE and already submitted: read-only view
  const viewOnly = state.tournament.status === "ACTIVE" && alreadySubmitted;

  const itemMap = useMemo(
    () => Object.fromEntries((state.items ?? []).map((it) => [it.id, it])),
    [state.items]
  );

  // Augment rounds with virtual slots for future rounds
  const augmented = useMemo(
    () => augmentRounds(state.rounds, picks, startRound),
    [state.rounds, picks, startRound]
  );

  // Rounds before startRound are read-only (for late joiners)
  const readOnlyRounds = useMemo(
    () => new Set(state.rounds.filter((r) => r.roundNumber < startRound).map((r) => r.roundNumber)),
    [state.rounds, startRound]
  );

  // Required matches for this participant — single pass
  const { pickedCount, eligibleCount } = useMemo(() => {
    let picked = 0;
    let eligible = 0;
    for (const round of augmented) {
      if (round.roundNumber < startRound) continue;
      for (const match of round.matches) {
        if (match.slots.length >= 2) {
          eligible++;
          if (picks[match.id]) picked++;
        }
      }
    }
    return { pickedCount: picked, eligibleCount: eligible };
  }, [augmented, picks, startRound]);
  const allPicked = eligibleCount > 0 && pickedCount === eligibleCount;

  const mode = viewOnly ? "view" : "predict";
  const isLobby = state.tournament.status === "LOBBY";
  const isLateJoiner = joinedAtRound !== null;

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <span className="font-mono text-xs font-semibold tracking-widest text-zinc-400">{code}</span>
            <h1 className="text-base font-extrabold leading-tight tracking-tight">{state.tournament.name}</h1>
          </div>
          <span className={[
            "rounded-full px-3 py-1 text-xs font-semibold ring-1",
            viewOnly
              ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
              : isLobby
              ? "bg-amber-50 text-amber-600 ring-amber-100"
              : "bg-indigo-50 text-indigo-600 ring-indigo-100",
          ].join(" ")}>
            {viewOnly ? "Seus palpites" : isLateJoiner ? `Palpites — a partir da rodada ${startRound}` : "Preencha o chaveamento"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {viewOnly && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
              </svg>
              Palpites enviados — acompanhe o resultado ao vivo!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <BracketView
              rounds={augmented}
              itemMap={itemMap}
              picks={picks}
              onPick={(matchId, itemId) => {
                if (viewOnly) return;
                const newPicks = clearDownstream(matchId, state.rounds, picks);
                newPicks[matchId] = itemId;
                setPicks(newPicks);
                setSaved(false);
              }}
              mode={mode}
              readOnlyRounds={readOnlyRounds}
            />

            {!viewOnly && (
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || !allPicked}
                  className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enviando…" : "Enviar palpites"}
                </button>
                <span className="text-sm text-zinc-400">{pickedCount} / {eligibleCount} preenchidos</span>
                {saved && (
                  <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
                    </svg>
                    Enviado!
                  </span>
                )}
                {error && <span className="text-sm text-red-500">{error}</span>}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

