"use client";

import { use, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, CheckCircle2, BarChart2 } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { useRequireParticipant } from "@/hooks/use-require-participant";
import { usePolling } from "@/hooks/use-polling";
import { augmentRounds, clearDownstream } from "@/lib/bracket-client";
import { translateApiError } from "@/lib/translate-api-error";
import { cn } from "@/lib/cn";
import { TournamentStatus, POLL_INTERVAL_BRACKET } from "@/constants/tournament";
import BracketView from "@/components/bracket-view";
import { BracketPageSkeleton } from "@/components/page-spinner";
import { TournamentHeader } from "@/components/tournament-header";
import { Spinner } from "@/components/spinner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { TournamentItem, TournamentState } from "@/types/tournament";

type BracketPageState = TournamentState & { myPicks: Record<string, string> };

export default function BracketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { token, participantId, isCreator, clearToken } = useTournamentToken(code);
  const auth = useRequireParticipant(code);
  const { t } = useLocale();

  const [state, setState] = useState<BracketPageState | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [localItems, setLocalItems] = useState<TournamentItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState("");
  const itemsInitialized = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadState = useCallback(
    async (authToken: string, signal?: AbortSignal) => {
      const [tournamentRes, picksRes] = await Promise.all([
        fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
        fetch(`/api/picks?tournamentCode=${code}`, { headers: { Authorization: `Bearer ${authToken}` }, signal }),
      ]);
      if (tournamentRes.status === 401 || tournamentRes.status === 403) {
        clearToken();
        return null;
      }
      if (!tournamentRes.ok) return null;
      const tournamentData = await tournamentRes.json();
      const myPicks: Record<string, string> = {};
      if (picksRes.ok) {
        for (const pick of (await picksRes.json()).picks ?? []) {
          myPicks[pick.matchId] = pick.pickedItemId;
        }
      }
      return { ...tournamentData, myPicks } as BracketPageState;
    },
    [code, clearToken]
  );

  // Initialize localItems once when state first loads (polling must not overwrite after a drag).
  useEffect(() => {
    if (state?.items && !itemsInitialized.current) {
      setLocalItems(state.items);
      itemsInitialized.current = true;
    }
  }, [state?.items]);

  function handleDragStart(event: DragStartEvent) {
    setActiveItemId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItemId(null);

    if (!over || active.id === over.id || !token) return;

    const previousItems = localItems;
    const newItems = [...localItems];
    const i = newItems.findIndex((x) => x.id === active.id);
    const j = newItems.findIndex((x) => x.id === over.id);
    [newItems[i], newItems[j]] = [newItems[j], newItems[i]];

    setLocalItems(newItems);
    setReorderError("");

    try {
      const res = await fetch(`/api/tournaments/${code}/items/order`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemIds: newItems.map((i) => i.id) }),
      });
      if (!res.ok) {
        setLocalItems(previousItems);
        const reorderBody = await res.json().catch(() => ({}));
        setReorderError(translateApiError(reorderBody.error, t) ?? t.bracket.reorderError);
      } else {
        // Reload to sync bracket view with new round-1 pairings
        const newState = await loadState(token ?? "");
        if (newState) {
          setState(newState);
          setLocalItems(newState.items);
          // Clear picks so the creator re-fills the bracket against the new seeding
          setPicks({});
        }
      }
    } catch {
      setLocalItems(previousItems);
      setReorderError(t.bracket.reorderNetworkError);
    }
  }

  useEffect(() => {
    if (!auth.ready) return;
    loadState(auth.token).then((newState) => {
      if (!newState) return;
      if (newState.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(newState);
      setPicks(newState.myPicks);
    });
  }, [auth.ready, auth.ready ? auth.token : null, code, loadState, router]);

  usePolling(
    async (signal) => {
      if (!auth.ready) return;
      const newState = await loadState(auth.token, signal);
      if (!newState) return;
      if (newState.tournament.status === TournamentStatus.FINISHED) {
        router.replace(`/tournament/${code}/results`);
        return;
      }
      setState(newState);
      setPicks((prev) => ({ ...newState.myPicks, ...prev }));
    },
    POLL_INTERVAL_BRACKET,
    auth.ready && state?.tournament.status === TournamentStatus.ACTIVE
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!auth.ready || !state) return;
    setSubmitting(true);
    setError("");
    setSaved(false);
    try {
      const picksPayload = Object.entries(picks).map(([matchId, pickedItemId]) => ({ matchId, pickedItemId }));
      const response = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ tournamentCode: code, picks: picksPayload }),
      });
      if (!response.ok) {
        const saveBody = await response.json();
        setError(translateApiError(saveBody.error, t) ?? t.bracket.saveFailed);
        return;
      }
      setSaved(true);
      const newState = await loadState(auth.token);
      if (newState) setState(newState);
      if (state.tournament.status === TournamentStatus.LOBBY) {
        router.replace(`/tournament/${code}`);
      }
    } catch {
      setError(t.common.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  const me = state?.participants.find((p) => p.id === participantId);
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
    () => new Set((state?.rounds ?? []).filter((r) => r.roundNumber < startRound).map((r) => r.roundNumber)),
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

  if (!auth.ready) return <BracketPageSkeleton />;
  if (!state) return <BracketPageSkeleton />;

  const mode = viewOnly ? "view" : "predict";
  const isLobby = state.tournament.status === TournamentStatus.LOBBY;
  const isLateJoiner = joinedAtRound !== null;
  const hasAnyPicksSubmitted = state.participants.some((p) => p.hasSubmittedPicks);
  const canDragReorder = isCreator && isLobby && !alreadySubmitted && !hasAnyPicksSubmitted;
  const activeItem = activeItemId ? localItems.find((i) => i.id === activeItemId) : null;

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
        ? t.bracket.yourPicks
        : isLateJoiner
        ? t.bracket.fromRound(startRound)
        : t.bracket.fillBracket}
    </span>
  );

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <TournamentHeader
        code={code}
        name={state.tournament.name}
        backHref={isLobby ? `/tournament/${code}` : "/"}
        backLabel={isLobby ? t.bracket.waitingRoom : t.common.home}
        rightSlot={statusBadge}
      />

      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {viewOnly && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t.bracket.picksSubmitted}
              <Link
                href={`/tournament/${code}/results`}
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                {t.bracket.viewRanking}
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
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
                reorderMode={canDragReorder}
                activeReorderItemId={activeItemId}
              />
              <DragOverlay dropAnimation={null}>
                {activeItem && (
                  <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 shadow-lg scale-[1.02] text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xxs font-bold text-zinc-500">
                      {activeItem.seed}
                    </span>
                    <span className="text-zinc-700">{activeItem.name}</span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
            {reorderError && (
              <p className="text-xs text-red-500">{reorderError}</p>
            )}

            {!viewOnly && (
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-500">
                      {t.bracket.picksProgress(pickedCount, eligibleCount)}
                    </span>
                    {allPicked && (
                      <span className="font-semibold text-emerald-600">{t.bracket.allFilled}</span>
                    )}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        allPicked ? "bg-emerald-500" : "bg-indigo-400"
                      )}
                      style={{ width: eligibleCount > 0 ? `${(pickedCount / eligibleCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !allPicked}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" />
                        {alreadySubmitted ? t.bracket.saving : t.bracket.sending}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {alreadySubmitted ? t.bracket.editPicks : t.bracket.sendPicks}
                      </>
                    )}
                  </button>
                  {!allPicked && eligibleCount > 0 && (
                    <span className="text-xs text-zinc-400">
                      {t.bracket.stillMissing(eligibleCount - pickedCount)}
                    </span>
                  )}
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {t.bracket.picksSaved}
                    </span>
                  )}
                  {error && <span className="text-sm text-red-500">{error}</span>}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
