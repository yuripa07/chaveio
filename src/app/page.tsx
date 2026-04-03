"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 6) router.push(`/tournament/${trimmed}`);
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6 py-24">
        <div className="w-full max-w-sm space-y-10 text-center">
          {/* Logo mark */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Chaveio</h1>
              <p className="mt-1.5 text-base text-zinc-500">Bracket predictions for your team</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/tournament/new"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all"
            >
              Create tournament
            </Link>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-b from-indigo-50 to-white px-3 text-xs text-zinc-400">
                  or join with a code
                </span>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
                maxLength={6}
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 text-center text-xl font-mono font-bold tracking-[0.3em] uppercase placeholder:text-zinc-300 placeholder:font-normal placeholder:tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={code.length !== 6}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enter tournament
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-400">
        March Madness-style brackets · Made for team bonding
      </footer>
    </main>
  );
}
