"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeTokenPayload } from "@/lib/token-client";
import { getStoredToken, setStoredToken } from "@/lib/token-storage";
import { cn } from "@/lib/cn";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/constants/styles";
import { TournamentStatus, POLL_INTERVAL_LOBBY } from "@/constants/tournament";
import { BackLink } from "@/components/back-link";
import { ErrorAlert } from "@/components/error-alert";
import { LobbyCTA } from "@/components/lobby-cta";
import { PageSpinner } from "@/components/page-spinner";
import type { Participant, TournamentState } from "@/types/tournament";

export default function TournamentLobby({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [tournamentData, setTournamentData] = useState<TournamentState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchState = useCallback(async (token: string) => {
    const response = await fetch(`/api/tournaments/${code}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return (await response.json()) as TournamentState;
  }, [code]);

  useEffect(() => {
    const stored = getStoredToken(code);
    if (!stored) return;
    setToken(stored);
    const creator = decodeTokenPayload(stored)?.isCreator ?? false;
    setIsCreator(creator);
    fetchState(stored).then((tournamentData) => {
      if (!tournamentData) return;
      setTournamentData(tournamentData);
      if (tournamentData.tournament.status === TournamentStatus.ACTIVE)
        router.replace(creator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`);
      else if (tournamentData.tournament.status === TournamentStatus.FINISHED)
        router.replace(`/tournament/${code}/results`);
    });
  }, [code, fetchState, router]);

  useEffect(() => {
    if (!token || tournamentData?.tournament.status !== TournamentStatus.LOBBY) return;
    const interval = setInterval(() => {
      fetchState(token).then((tournamentData) => {
        if (!tournamentData) return;
        setTournamentData(tournamentData);
        if (tournamentData.tournament.status === TournamentStatus.ACTIVE) {
          clearInterval(interval);
          router.replace(isCreator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`);
        } else if (tournamentData.tournament.status === TournamentStatus.FINISHED) {
          clearInterval(interval);
          router.replace(`/tournament/${code}/results`);
        }
      });
    }, POLL_INTERVAL_LOBBY);
    return () => clearInterval(interval);
  }, [token, tournamentData?.tournament.status, fetchState, code, router, isCreator]);

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
      setStoredToken(code, body.token);
      setToken(body.token);
      setIsCreator(decodeTokenPayload(body.token)?.isCreator ?? false);
      const tournamentData = await fetchState(body.token);
      if (tournamentData) setTournamentData(tournamentData);
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

  /* ── Join screen (not yet authenticated) ── */
  if (!token) {
    return (
      <main className="flex min-h-screen flex-col bg-zinc-50">
        <div className="border-b border-zinc-100 bg-white px-6 py-4">
          <BackLink href="/" label="Início" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
                {code}
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Entrar no torneio</h1>
              <p className="mt-1 text-sm text-zinc-500">Digite seu nome e senha para entrar.</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="Seu nome"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                required
                autoFocus
                className={cn(INPUT_CLASS, "px-4 py-3")}
              />
              <input
                type="password"
                placeholder="Senha"
                value={joinPassword}
                onChange={(event) => setJoinPassword(event.target.value)}
                required
                className={cn(INPUT_CLASS, "px-4 py-3")}
              />
              {joinError && <ErrorAlert message={joinError} />}
              <button
                type="submit"
                disabled={joining}
                className={PRIMARY_BUTTON_CLASS}
              >
                {joining ? "Entrando…" : "Entrar no torneio"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (!tournamentData) return <PageSpinner />;

  const { tournament, participants, items } = tournamentData;

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            Chaveio
          </Link>
          <span className="rounded-full border border-zinc-200 px-3 py-1 font-mono text-xs font-semibold tracking-widest text-zinc-500">
            {tournament.code}
          </span>
        </div>
      </div>

      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{tournament.name}</h1>
              <p className="mt-0.5 text-sm text-zinc-500">{tournament.theme}</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Sala de espera
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Participants */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
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
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                          criador
                        </span>
                      )}
                      {participant.hasSubmittedPicks && (
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-emerald-500">
                          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
                        </svg>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Chaveamento · {items.length} itens
              </h2>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-500">
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
              starting={starting}
              onStart={handleStart}
            />
          )}
        </div>
      </div>
    </main>
  );
}
