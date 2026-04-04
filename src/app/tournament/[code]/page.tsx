"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeTokenPayload } from "@/lib/token-client";
import { getStoredToken, setStoredToken } from "@/lib/token-storage";
import Spinner from "@/components/Spinner";

type Participant = {
  id: string;
  displayName: string;
  isCreator: boolean;
  hasSubmittedPicks: boolean;
};

type TournamentData = {
  tournament: { id: string; code: string; name: string; theme: string; status: string };
  participants: Participant[];
  items: { id: string; name: string; seed: number }[];
};

export default function TournamentLobby({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [data, setData] = useState<TournamentData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchState = useCallback(async (tok: string) => {
    const res = await fetch(`/api/tournaments/${code}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as TournamentData;
  }, [code]);

  useEffect(() => {
    const stored = getStoredToken(code);
    if (!stored) return;
    setToken(stored);
    const creator = decodeTokenPayload(stored)?.isCreator ?? false;
    setIsCreator(creator);
    fetchState(stored).then((d) => {
      if (!d) return;
      setData(d);
      if (d.tournament.status === "ACTIVE")
        router.replace(creator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`);
      else if (d.tournament.status === "FINISHED")
        router.replace(`/tournament/${code}/results`);
    });
  }, [code, fetchState, router]);

  useEffect(() => {
    if (!token || data?.tournament.status !== "LOBBY") return;
    const interval = setInterval(() => {
      fetchState(token).then((d) => {
        if (!d) return;
        setData(d);
        if (d.tournament.status === "ACTIVE") {
          clearInterval(interval);
          router.replace(isCreator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`);
        } else if (d.tournament.status === "FINISHED") {
          clearInterval(interval);
          router.replace(`/tournament/${code}/results`);
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [token, data?.tournament.status, fetchState, code, router, isCreator]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    setJoining(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: joinName, password: joinPassword }),
      });
      const body = await res.json();
      if (!res.ok) { setJoinError(body.error ?? "Falha ao entrar"); return; }
      setStoredToken(code, body.token);
      setToken(body.token);
      setIsCreator(decodeTokenPayload(body.token)?.isCreator ?? false);
      const d = await fetchState(body.token);
      if (d) setData(d);
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
      const res = await fetch(`/api/tournaments/${code}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) router.replace(`/tournament/${code}/live`);
    } finally {
      setStarting(false);
    }
  }

  /* ── Join screen (not yet authenticated) ── */
  if (!token) {
    return (
      <main className="flex min-h-screen flex-col bg-zinc-50">
        <div className="border-b border-zinc-100 bg-white px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" />
            </svg>
            Início
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
                {code}
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Join tournament</h1>
              <p className="mt-1 text-sm text-zinc-500">Digite seu nome e senha para entrar.</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="Your name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                required
                autoFocus
                className={inp}
              />
              <input
                type="password"
                placeholder="Password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                required
                className={inp}
              />
              {joinError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{joinError}</p>
              )}
              <button
                type="submit"
                disabled={joining}
                className={btnPrimary}
              >
                {joining ? "Entrando…" : "Entrar no torneio"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner />
      </main>
    );
  }

  const { tournament, participants, items } = data;

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Header */}
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
          {/* Tournament title */}
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
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                      {p.displayName[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium">{p.displayName}</span>
                    <div className="flex items-center gap-1.5">
                      {p.isCreator && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                          criador
                        </span>
                      )}
                      {p.hasSubmittedPicks && (
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-emerald-500">
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

          {/* CTA */}
          {tournament.status === "LOBBY" && (
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

function LobbyCTA({
  code,
  participants,
  isCreator,
  starting,
  onStart,
}: {
  code: string;
  participants: Participant[];
  isCreator: boolean;
  starting: boolean;
  onStart: () => void;
}) {
  const allReady = participants.every((p) => p.hasSubmittedPicks);
  const notReady = participants.filter((p) => !p.hasSubmittedPicks);

  return (
    <div className="space-y-3">
      <Link
        href={`/tournament/${code}/bracket`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all"
      >
        Fazer palpites →
      </Link>
      {isCreator && (
        <>
          {!allReady && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Aguardando palpites de: {notReady.map((p) => p.displayName).join(", ")}
            </div>
          )}
          <button
            onClick={onStart}
            disabled={starting || !allReady}
            className={btnPrimary}
          >
            {starting ? "Iniciando…" : "Iniciar torneio"}
          </button>
        </>
      )}
      {!isCreator && (
        <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-zinc-100 bg-white py-4 text-sm text-zinc-500 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Aguardando o criador iniciar…
        </div>
      )}
    </div>
  );
}

const inp =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

const btnPrimary =
  "w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed";

