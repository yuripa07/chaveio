"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeTokenPayload } from "@/lib/token-client";
import { getStoredToken } from "@/lib/token-storage";
import Spinner from "@/components/Spinner";
import dynamic from "next/dynamic";

const BracketView = dynamic(() => import("@/components/BracketView"), {
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />,
});

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; winnerId: string | null; slots: Slot[] };
type Round = { id: string; roundNumber: number; name?: string | null; status: string; pointValue: number; matches: Match[] };
type Participant = { id: string; displayName: string; isCreator: boolean; hasSubmittedPicks: boolean };
type Pick = { matchId: string; pickedItemId: string; isCorrect: boolean | null; pointsEarned: number };

type TournamentState = {
  tournament: { id: string; code: string; name: string; status: string };
  participants: Participant[];
  items: Item[];
  rounds: Round[];
};

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [myPicks, setMyPicks] = useState<Pick[]>([]);
  const [isCreator, setIsCreator] = useState(false);

  const loadData = useCallback(async (tok: string) => {
    const [tRes, pRes] = await Promise.all([
      fetch(`/api/tournaments/${code}`, { headers: { Authorization: `Bearer ${tok}` } }),
      fetch(`/api/picks?tournamentCode=${code}`, { headers: { Authorization: `Bearer ${tok}` } }),
    ]);
    if (!tRes.ok) return null;
    const tData = (await tRes.json()) as TournamentState;
    const picks: Pick[] = pRes.ok ? (await pRes.json()).picks ?? [] : [];
    return { tData, picks };
  }, [code]);

  useEffect(() => {
    const stored = getStoredToken(code);
    if (!stored) { router.replace(`/tournament/${code}`); return; }
    const payload = decodeTokenPayload(stored);
    setIsCreator(payload?.isCreator ?? false);
    setToken(stored);
    loadData(stored).then((result) => {
      if (!result) return;
      setState(result.tData);
      setMyPicks(result.picks);
    });
  }, [code, loadData, router]);

  useEffect(() => {
    if (!token || state?.tournament.status === "FINISHED") return;
    const interval = setInterval(() => {
      loadData(token).then((result) => {
        if (!result) return;
        setState(result.tData);
        setMyPicks(result.picks);
        if (result.tData.tournament.status === "FINISHED") clearInterval(interval);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [token, state?.tournament.status, loadData]);

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner />
      </main>
    );
  }

  const itemMap = useMemo(
    () => Object.fromEntries(state.items.map((it) => [it.id, it])),
    [state.items]
  );
  const myPickMap = useMemo(
    () => Object.fromEntries(myPicks.map((p) => [p.matchId, p])),
    [myPicks]
  );
  let myTotalPoints = 0, resolvedCount = 0, correctCount = 0;
  for (const p of myPicks) {
    myTotalPoints += p.pointsEarned;
    if (p.isCorrect !== null) resolvedCount++;
    if (p.isCorrect) correctCount++;
  }
  const finished = state.tournament.status === "FINISHED";

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <span className="font-mono text-xs font-semibold tracking-widest text-zinc-400">{code}</span>
            <h1 className="text-base font-extrabold leading-tight tracking-tight">{state.tournament.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {finished ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Finalizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                </span>
                Em andamento
              </span>
            )}
            {isCreator && !finished && (
              <Link
                href={`/tournament/${code}/live`}
                className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                ← Resolver
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">

        {/* Score card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Sua pontuação</p>
            <p className="mt-1 text-5xl font-black tracking-tight">{myTotalPoints}</p>
            <p className="mt-0.5 text-sm font-medium opacity-75">pontos</p>
          </div>
          <div className="flex divide-x divide-zinc-100">
            <Stat label="Corretos" value={correctCount} />
            <Stat label="Resolvidos" value={resolvedCount} />
            <Stat label="Pendentes" value={(myPicks.length - resolvedCount)} />
          </div>
        </div>

        {/* Picks breakdown */}
        {resolvedCount > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Meus palpites</h2>
            <div className="space-y-2">
              {state.rounds.flatMap((round) =>
                round.matches
                  .filter((m) => m.status === "COMPLETE")
                  .map((match) => {
                    const winner = match.winnerId ? itemMap[match.winnerId] : null;
                    const myPick = myPickMap[match.id];
                    const myItem = myPick ? itemMap[myPick.pickedItemId] : null;
                    const correct = myPick?.isCorrect;

                    return (
                      <div
                        key={match.id}
                        className={[
                          "flex items-center gap-3 rounded-xl border px-4 py-3",
                          correct === true
                            ? "border-emerald-200 bg-emerald-50"
                            : correct === false
                            ? "border-red-100 bg-red-50"
                            : "border-zinc-100 bg-white",
                        ].join(" ")}
                      >
                        <div className="shrink-0">
                          {correct === true ? (
                            <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-emerald-500">
                              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
                            </svg>
                          ) : correct === false ? (
                            <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-red-400">
                              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm-3.28-6.22a.75.75 0 0 0 1.06 1.06L8 9.06l2.22 2.22a.75.75 0 1 0 1.06-1.06L9.06 8l2.22-2.22a.75.75 0 0 0-1.06-1.06L8 6.94 5.78 4.72a.75.75 0 0 0-1.06 1.06L6.94 8l-2.22 2.22Z" />
                            </svg>
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-zinc-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-[10px] font-bold text-zinc-400">
                              {round.name || `R${round.roundNumber}`}
                            </span>
                            <span className="font-semibold text-zinc-800 truncate">
                              {winner?.name ?? "?"}
                            </span>
                            <span className="text-zinc-400">ganhou</span>
                          </div>
                          {myItem && (
                            <p className="mt-0.5 text-xs text-zinc-400">
                              Você escolheu:{" "}
                              <span className={correct ? "font-semibold text-emerald-600" : "text-red-400"}>
                                {myItem.name}
                              </span>
                            </p>
                          )}
                        </div>
                        {myPick && myPick.isCorrect !== null && (
                          <span
                            className={[
                              "shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold",
                              correct
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-400",
                            ].join(" ")}
                          >
                            {correct ? `+${myPick.pointsEarned}` : "0"}
                          </span>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        )}

        {/* Bracket */}
        {state.rounds.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chaveamento</h2>
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm overflow-hidden">
              <BracketView
                rounds={state.rounds}
                itemMap={itemMap}
                picks={Object.fromEntries(
                  Object.entries(myPickMap).map(([k, v]) => [k, v.pickedItemId])
                )}
                mode="view"
              />
            </div>
          </section>
        )}

        {resolvedCount === 0 && state.rounds.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-400">
            Nenhum resultado ainda — aguardando a primeira partida.
          </p>
        )}

        <div className="text-center">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
            ← Início
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center py-3">
      <p className="text-lg font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}

