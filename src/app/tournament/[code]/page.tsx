"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeTokenPayload } from "@/lib/token-client";

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

  const fetchState = useCallback(
    async (tok: string) => {
      const res = await fetch(`/api/tournaments/${code}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as TournamentData;
    },
    [code]
  );

  useEffect(() => {
    const stored = localStorage.getItem(`chaveio_token_${code}`);
    if (!stored) return;
    setToken(stored);
    const payload = decodeTokenPayload(stored);
    const creator = payload?.isCreator ?? false;
    setIsCreator(creator);
    fetchState(stored).then((d) => {
      if (!d) return;
      setData(d);
      if (d.tournament.status === "ACTIVE") {
        router.replace(creator ? `/tournament/${code}/live` : `/tournament/${code}/bracket`);
      } else if (d.tournament.status === "FINISHED") {
        router.replace(`/tournament/${code}/results`);
      }
    });
  }, [code, fetchState, router]);

  // Poll for updates when in LOBBY
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
      if (!res.ok) {
        setJoinError(body.error ?? "Failed to join");
        return;
      }
      localStorage.setItem(`chaveio_token_${code}`, body.token);
      setToken(body.token);
      const payload = decodeTokenPayload(body.token);
      setIsCreator(payload?.isCreator ?? false);
      const d = await fetchState(body.token);
      if (d) setData(d);
    } catch {
      setJoinError("Network error");
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
      if (res.ok) {
        router.replace(`/tournament/${code}/live`);
      }
    } finally {
      setStarting(false);
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-xs font-mono text-zinc-400 tracking-widest">{code}</p>
            <h1 className="mt-1 text-2xl font-bold">Join tournament</h1>
          </div>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <input
              type="password"
              placeholder="Password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            {joinError && <p className="text-sm text-red-500">{joinError}</p>}
            <button
              type="submit"
              disabled={joining}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join"}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-400">
            <Link href="/" className="hover:text-zinc-700">
              ← Home
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  const { tournament, participants, items } = data;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 pt-12">
      <div className="w-full max-w-md space-y-6">
        <div>
          <p className="text-xs font-mono tracking-widest text-zinc-400">{tournament.code}</p>
          <h1 className="mt-1 text-2xl font-bold">{tournament.name}</h1>
          <p className="text-sm text-zinc-500">{tournament.theme}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Participants ({participants.length})
          </h2>
          <ul className="space-y-1">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{p.displayName}</span>
                {p.isCreator && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                    creator
                  </span>
                )}
                {p.hasSubmittedPicks && (
                  <span className="text-green-500 text-xs">✓ picks submitted</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Items ({items.length})
          </h2>
          <ul className="grid grid-cols-2 gap-1">
            {items.map((item) => (
              <li key={item.id} className="text-sm text-zinc-700">
                <span className="text-zinc-400 text-xs mr-1">#{item.seed}</span>
                {item.name}
              </li>
            ))}
          </ul>
        </div>

        {isCreator && tournament.status === "LOBBY" && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {starting ? "Starting..." : "Start tournament"}
          </button>
        )}

        {!isCreator && tournament.status === "LOBBY" && (
          <p className="text-center text-sm text-zinc-400">
            Waiting for the creator to start the tournament...
          </p>
        )}
      </div>
    </main>
  );
}
