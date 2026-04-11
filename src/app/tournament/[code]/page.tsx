"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, LogIn, CheckCircle2, Hash, Trophy, Copy, Check, Eye, EyeOff, ChevronLeft, X } from "lucide-react";
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

export default function TournamentLobby({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { token, tokenReady, participantId, isCreator, setTokenFromResponse, clearToken } = useTournamentToken(code);

  const [tournamentData, setTournamentData] = useState<TournamentState | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  const [kicking, setKicking] = useState(false);
  const [kickError, setKickError] = useState("");

  const fetchState = useCallback(async (authToken: string, signal?: AbortSignal) => {
    const response = await fetch(`/api/tournaments/${code}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal,
    });
    if (response.status === 401 || response.status === 403) {
      clearToken();
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as TournamentState;
  }, [code, clearToken]);

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

  async function handleKick() {
    if (!token || !kickTarget) return;
    setKicking(true);
    setKickError("");
    try {
      const res = await fetch(`/api/tournaments/${code}/participants/${kickTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setKickError((await res.json()).error ?? "Erro ao expulsar");
        return;
      }
      setKickTarget(null);
      setTournamentData((prev) =>
        prev
          ? { ...prev, participants: prev.participants.filter((p) => p.id !== kickTarget.id) }
          : prev
      );
    } catch {
      setKickError("Erro de rede");
    } finally {
      setKicking(false);
    }
  }

  if (!tokenReady) return <LobbyPageSkeleton />;

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
                      {isCreator && !participant.isCreator && (
                        <button
                          type="button"
                          onClick={() => { setKickTarget(participant); setKickError(""); }}
                          className="rounded-md p-0.5 text-zinc-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                          aria-label={`Expulsar ${participant.displayName}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
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
            </div>
          </div>

          {tournament.status === TournamentStatus.LOBBY && (
            <LobbyCTA
              code={code}
              participants={participants}
              isCreator={isCreator}
              hasSubmittedPicks={participants.find((p) => p.id === participantId)?.hasSubmittedPicks ?? false}
              starting={starting}
              onStart={handleStart}
            />
          )}
        </div>
      </div>

      {kickTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold">Expulsar participante</h2>
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja expulsar <strong>{kickTarget.displayName}</strong>? Esta ação não pode ser desfeita.
            </p>
            {kickError && <ErrorAlert message={kickError} />}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setKickTarget(null)}
                disabled={kicking}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleKick}
                disabled={kicking}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {kicking && <Spinner size="sm" />}
                Expulsar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
