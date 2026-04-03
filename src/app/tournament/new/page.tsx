"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTournament() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const items = itemsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, theme, items, creatorName, creatorPassword: password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      localStorage.setItem(`chaveio_token_${body.code}`, body.token);
      router.push(`/tournament/${body.code}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const validItemCount = [4, 8, 16, 32].includes(items.length);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-12">
      <div className="w-full max-w-md space-y-6">
        <div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700">
            ← Back
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Create tournament</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tournament name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Best Movie Ever"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Theme / category</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              required
              placeholder="Movies"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Items{" "}
              <span
                className={`text-xs ${
                  items.length === 0
                    ? "text-zinc-400"
                    : validItemCount
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                ({items.length} — must be 4, 8, 16 or 32)
              </span>
            </label>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              required
              rows={8}
              placeholder={"Inception\nThe Matrix\nInterstellar\nDune"}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Your name</label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                required
                placeholder="Alice"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !validItemCount}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create tournament"}
          </button>
        </form>
      </div>
    </main>
  );
}
