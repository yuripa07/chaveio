"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeTokenPayload } from "@/lib/token-client";
import { getStoredToken } from "@/lib/token-storage";
import { cn } from "@/lib/cn";
import { TournamentStatus, POLL_INTERVAL_BRACKET } from "@/constants/tournament";
import BracketView from "@/components/BracketView";
import { PageSpinner } from "@/components/page-spinner";
import { TournamentHeader } from "@/components/tournament-header";
import { getFeederMatches, getNextRoundSlot } from "@/lib/bracket";
import type { TournamentState, BracketRound, MatchSlot } from "@/types/tournament";

type BracketPageState = TournamentState & { myPicks: Record<string, string> };

/** Compute virtual slots for rounds after startRound based on participant's own picks */
function augmentRounds(
  rounds: BracketRound[],
  picks: Record<string, string>,
  startRound: number
): BracketRound[] {
  const roundByNumber = new Map(rounds.map((round) => [round.roundNumber, round]));

  return rounds.map((round) => {
    if (round.roundNumber <= startRound) return round;

    const previousRound = roundByNumber.get(round.roundNumber - 1)!;
    const augmentedMatches = round.matches.map((match) => {
      if (match.slots.length >= 2) return match;
      const [feeder1MatchNumber, feeder2MatchNumber] = getFeederMatches(match.matchNumber);
      const feeder1 = previousRound.matches.find((m) => m.matchNumber === feeder1MatchNumber);
      const feeder2 = previousRound.matches.find((m) => m.matchNumber === feeder2MatchNumber);
      const pick1 = feeder1 ? picks[feeder1.id] : null;
      const pick2 = feeder2 ? picks[feeder2.id] : null;
      const virtualSlots: MatchSlot[] = [];
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
  rounds: BracketRound[],
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

  const previousPickedItem = picks[changedMatchId];

  function cascade(currentRoundNumber: number, currentMatchNumber: number, oldItem: string | undefined) {
    const { matchIndex } = getNextRoundSlot(currentMatchNumber);
    const nextMatchNumber = matchIndex + 1;
    const nextRound = rounds.find((round) => round.roundNumber === currentRoundNumber + 1);
    if (!nextRound) return;
    const nextMatch = nextRound.matches.find((match) => match.matchNumber === nextMatchNumber);
    if (!nextMatch) return;
    const currentPick = updated[nextMatch.id];
    if (currentPick && currentPick === oldItem) {
      delete updated[nextMatch.id];
      cascade(currentRoundNumber + 1, nextMatchNumber, currentPick);
    }
  }

  cascade(roundNumber, matchNumber, previousPickedItem);
  return updated;
}

export default function BracketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [state, setState] = useState<BracketPageState | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadState = useCallback(
    async (token: string) => {
      const [tournamentResponse, picksResponse] = await Promise.all([
        fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/picks?tournamentCode=${code}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!tournamentResponse.ok) return null;
      const tournamentData = await tournamentResponse.json();
      const myPicks: Record<string, string> = {};
      if (picksResponse.ok) {
        for (const pick of (await picksResponse.json()).picks ?? []) {
          myPicks[pick.matchId] = pick.pickedItemId;
        }
      }
      return { ...tournamentData, myPicks } as BracketPageState;
    },
    [code]
  );

  useEffect(() => {
    const stored = getStoredToken(code);
    if (!stored) { router.replace(`/tournament/${code}`); return; }
    const payload = decodeTokenPayload(stored);
    setToken(stored);
    setParticipantId(payload?.participantId ?? null);
    loadState(stored).then((newState) => {
      if (!newState) return;
      if (newState.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(newState);
      setPicks(newState.myPicks);
    });
  }, [code, loadState, router]);

  useEffect(() => {
    if (!token || !state || state.tournament.status !== TournamentStatus.ACTIVE) return;
    const interval = setInterval(() => {
      loadState(token).then((newState) => {
        if (!newState) return;
        if (newState.tournament.status === TournamentStatus.FINISHED) {
          clearInterval(interval);
          router.replace(`/tournament/${code}/results`);
          return;
        }
        setState(newState);
        setPicks((previous) => ({ ...newState.myPicks, ...previous }));
      });
    }, POLL_INTERVAL_BRACKET);
    return () => clearInterval(interval);
  }, [token, code, loadState, router, state?.tournament.status]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !state) return;
    setSubmitting(true);
    setError("");
    setSaved(false);
    try {
      const picksPayload = Object.entries(picks).map(([matchId, pickedItemId]) => ({ matchId, pickedItemId }));
      const response = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tournamentCode: code, picks: picksPayload }),
      });
      if (!response.ok) {
        setError((await response.json()).error ?? "Falha ao salvar");
        return;
      }
      setSaved(true);
      const newState = await loadState(token);
      if (newState) setState(newState);
      if (state.tournament.status === TournamentStatus.LOBBY) {
        router.replace(`/tournament/${code}`);
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setSubmitting(false);
    }
  }

  const me = state?.participants.find((participant) => participant.id === participantId);
  const joinedAtRound = me?.joinedAtRound ?? null;
  const startRound = joinedAtRound ?? 1;
  const alreadySubmitted = me?.hasSubmittedPicks ?? false;
  const viewOnly = state?.tournament.status === TournamentStatus.ACTIVE && alreadySubmitted;

  const itemMap = useMemo(
    () => Object.fromEntries((state?.items ?? []).map((item) => [item.id, item])),
    [state?.items]
  );

  const augmented = useMemo(
    () => augmentRounds(state?.rounds ?? [], picks, startRound),
    [state?.rounds, picks, startRound]
  );

  const readOnlyRounds = useMemo(
    () => new Set((state?.rounds ?? []).filter((round) => round.roundNumber < startRound).map((round) => round.roundNumber)),
    [state?.rounds, startRound]
  );

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

  if (!state) return <PageSpinner />;

  const mode = viewOnly ? "view" : "predict";
  const isLobby = state.tournament.status === TournamentStatus.LOBBY;
  const isLateJoiner = joinedAtRound !== null;

  const statusBadge = (
    <span className={cn(
      "rounded-full px-3 py-1 text-xs font-semibold ring-1",
      viewOnly
        ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
        : isLobby
        ? "bg-amber-50 text-amber-600 ring-amber-100"
        : "bg-indigo-50 text-indigo-600 ring-indigo-100"
    )}>
      {viewOnly
        ? "Seus palpites"
        : isLateJoiner
        ? `Palpites — a partir da rodada ${startRound}`
        : "Preencha o chaveamento"}
    </span>
  );

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <TournamentHeader code={code} name={state.tournament.name} rightSlot={statusBadge} />

      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {viewOnly && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
              </svg>
              Palpites enviados — acompanhe o resultado ao vivo!
              <Link
                href={`/tournament/${code}/results`}
                className="ml-auto shrink-0 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                Ver ranking →
              </Link>
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
