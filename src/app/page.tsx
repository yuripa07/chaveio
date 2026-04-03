"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/tournament/${trimmed}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Chaveio</h1>
          <p className="mt-2 text-zinc-500">Bracket predictions for your group</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/tournament/new"
            className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Create tournament
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-50 px-2 text-zinc-400">or join with a code</span>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
              maxLength={6}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-lg font-mono tracking-widest uppercase placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold hover:bg-zinc-100 transition-colors"
            >
              Join tournament
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
