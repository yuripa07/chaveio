"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TOURNAMENT_CODE_LENGTH } from "@/constants/tournament";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === TOURNAMENT_CODE_LENGTH) router.push(`/tournament/${trimmed}`);
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6 py-24">
        <div className="w-full max-w-sm space-y-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Chaveio</h1>
              <p className="mt-1.5 text-base text-zinc-500">Palpites de chaveamento para sua equipe</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/tournament/new"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all"
            >
              Criar torneio
            </Link>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-b from-indigo-50 to-white px-3 text-xs text-zinc-400">
                  ou entre com um código
                </span>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                placeholder="ABC123"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
                maxLength={TOURNAMENT_CODE_LENGTH}
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 text-center text-xl font-mono font-bold tracking-[0.3em] uppercase placeholder:font-normal placeholder:tracking-widest placeholder:text-zinc-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={code.length !== TOURNAMENT_CODE_LENGTH}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                Entrar no torneio
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-400">
        Chaveamento estilo bracket · Para atividades em equipe
      </footer>
    </main>
  );
}
