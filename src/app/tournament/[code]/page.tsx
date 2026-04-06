"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, LogIn, CheckCircle2, Hash, Trophy, Copy, Check, Eye, EyeOff, ChevronLeft, GripVertical } from "lucide-react";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { usePolling } from "@/hooks/use-polling";
import { cn } from "@/lib/cn";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/constants/styles";
import { TournamentStatus, POLL_INTERVAL_LOBBY } from "@/constants/tournament";
import { BackLink } from "@/components/back-link";
import { ErrorAlert } from "@/components/error-alert";
import { LobbyCTA } from "@/components/lobby-cta";
import { LobbyPageSkeleton } from "@/components/page-spinner";
import { Spinner } from "@/components/spinner";
import type { Participant, TournamentState } from "@/types/tournament";
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
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableBracketItem } from "@/components/sortable-bracket-item";
import type { TournamentItem } from "@/types/tournament";

export default function TournamentLobby({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { token, isCreator, setTokenFromResponse } = useTournamentToken(code);

  const [tournamentData, setTournamentData] = useState<TournamentState | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localItems, setLocalItems] = useState<TournamentItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState("");
  const itemsInitialized = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchState = useCallback(async (authToken: string, signal?: AbortSignal) => {
    const response = await fetch(`/api/tournaments/${code}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as TournamentState;
  }, [code]);

  function redirectByStatus(status: string, creator: boolean) {
    if (status === TournamentStatus.ACTIVE)
      router.replace(creator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`);
    else if (status === TournamentStatus.FINISHED)
      router.replace(`/tournament/${code}/results`);
  }

  // Initial load
  useEffect(() => {
    if (!token) return;
    fetchState(token).then((data) => {
      if (!data) return;
      setTournamentData(data);
      redirectByStatus(data.tournament.status, isCreator);
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while in lobby
  usePolling(
    async (signal) => {
      if (!token) return;
      const data = await fetchState(token, signal);
      if (!data) return;
      setTournamentData(data);
      redirectByStatus(data.tournament.status, isCreator);
    },
    POLL_INTERVAL_LOBBY,
    !!token && tournamentData?.tournament.status === TournamentStatus.LOBBY
  );

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    setJoinError("");
    setJoining(true);
    try {
      const response = await fetch(`/api/tournaments/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: joinName, password: joinPassword }),
      });
      const body = await response.json();
      if (!response.ok) { setJoinError(body.error ?? "Falha ao entrar"); return; }
      setTokenFromResponse(code, body.token);
      const data = await fetchState(body.token);
      if (data) setTournamentData(data);
    } catch {
      setJoinError("Erro de rede");
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    if (!token) return;
    setStarting(true);
    try {
      const response = await fetch(`/api/tournaments/${code}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) router.replace(`/tournament/${code}/live`);
    } finally {
      setStarting(false);
    }
  }

  function handleCopyCode() {
    const url = `${window.location.origin}/tournament/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Initialize localItems once when tournamentData first loads
  useEffect(() => {
    if (tournamentData?.items && !itemsInitialized.current) {
      setLocalItems(tournamentData.items);
      itemsInitialized.current = true;
    }
  }, [tournamentData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragStart = useCallback(function(event: DragStartEvent) {
    setActiveItemId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async function(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItemId(null);

    if (!token) return;

    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    const previousItems = localItems;
    const newItems = arrayMove(localItems, oldIndex, newIndex);

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
        const body = await res.json();
        setLocalItems(previousItems);
        setReorderError(body.error ?? "Erro ao reordenar");
      }
    } catch {
      setLocalItems(previousItems);
      setReorderError("Erro de rede ao reordenar");
    }
  }, [localItems, code, token]);

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col bg-zinc-50">
        <div className="border-b border-zinc-100 bg-white px-6 py-4">
          <BackLink href="/" label="Início" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 font-mono text-sm font-bold tracking-widest text-zinc-600 shadow-sm">
                <Hash className="h-3.5 w-3.5 text-zinc-400" />
                {code}
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Entrar no torneio</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Escolha um nome para aparecer no placar e informe a senha do torneio.
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Seu nome no placar"
                  aria-label="Seu nome no placar"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  required
                  autoFocus
                  autoComplete="name"
                  className={cn(INPUT_CLASS, "pl-10 py-3")}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha do torneio"
                  aria-label="Senha do torneio"
                  value={joinPassword}
                  onChange={(event) => setJoinPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className={cn(INPUT_CLASS, "pl-10 pr-10 py-3")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {joinError && <ErrorAlert message={joinError} />}

              <button
                type="submit"
                disabled={joining || !joinName.trim() || !joinPassword}
                className={cn("flex items-center justify-center gap-2", PRIMARY_BUTTON_CLASS)}
              >
                {joining ? (
                  <>
                    <Spinner size="sm" />
                    Entrando…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar no torneio
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (!tournamentData) return <LobbyPageSkeleton />;

  const { tournament, participants, items } = tournamentData;
  const hasAnyPicksSubmitted = participants.some((p) => p.hasSubmittedPicks);
  const canReorder =
    isCreator &&
    tournament.status === TournamentStatus.LOBBY &&
    !hasAnyPicksSubmitted;
  const activeItem = activeItemId
    ? localItems.find((i) => i.id === activeItemId)
    : null;

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Início
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
            <Trophy className="h-4 w-4" />
            Chaveio
          </Link>
        </div>
      </div>

      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{tournament.name}</h1>
              {tournament.theme && <p className="mt-0.5 text-sm text-zinc-500">{tournament.theme}</p>}
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Sala de espera
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-5 py-3 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
              <Hash className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xxs font-semibold uppercase tracking-wider text-zinc-400">Código do torneio</p>
              <p className="font-mono text-lg font-bold tracking-widest text-zinc-800">{code}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                copied
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
              )}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-xxs font-semibold uppercase tracking-wider text-zinc-400">
                <User className="h-3.5 w-3.5" />
                Participantes · {participants.length}
              </h2>
              <ul className="space-y-2">
                {participants.map((participant: Participant) => (
                  <li key={participant.id} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                      {participant.displayName[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium">{participant.displayName}</span>
                    <div className="flex items-center gap-1.5">
                      {participant.isCreator && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xxs font-semibold text-indigo-600">
                          criador
                        </span>
                      )}
                      {participant.hasSubmittedPicks ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Palpites enviados" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-zinc-200" aria-label="Palpites pendentes" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-xxs font-semibold uppercase tracking-wider text-zinc-400">
                <Trophy className="h-3.5 w-3.5" />
                Chaveamento · {items.length} itens
              </h2>

              {canReorder ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-1.5">
                      {localItems.map((item, index) => (
                        <SortableBracketItem key={item.id} item={item} index={index} />
                      ))}
                    </ul>
                  </SortableContext>

                  <DragOverlay>
                    {activeItem && (
                      <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 shadow-lg scale-[1.02] text-sm">
                        <GripVertical className="h-4 w-4 text-zinc-300" />
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xxs font-bold text-zinc-500">
                          {localItems.indexOf(activeItem) + 1}
                        </span>
                        <span className="text-zinc-700">{activeItem.name}</span>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xxs font-bold text-zinc-500">
                        {item.seed}
                      </span>
                      <span className="text-zinc-700">{item.name}</span>
                    </li>
                  ))}
                </ul>
              )}

              {isCreator && hasAnyPicksSubmitted && tournament.status === TournamentStatus.LOBBY && (
                <p className="mt-2 text-xs text-zinc-400">
                  Reordenação bloqueada — um ou mais participantes já enviaram palpites.
                </p>
              )}

              {reorderError && (
                <p className="mt-2 text-xs text-red-500">{reorderError}</p>
              )}
            </div>
          </div>

          {tournament.status === TournamentStatus.LOBBY && (
            <LobbyCTA
              code={code}
              participants={participants}
              isCreator={isCreator}
              starting={starting}
              onStart={handleStart}
            />
          )}
        </div>
      </div>
    </main>
  );
}
