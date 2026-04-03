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

  const items = itemsText.split("\n").map((s) => s.trim()).filter(Boolean);
  const validItemCount = [4, 8, 16, 32].includes(items.length);

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
      if (!res.ok) { setError(body.error ?? "Something went wrong"); return; }
      localStorage.setItem(`chaveio_token_${body.code}`, body.token);
      router.push(`/tournament/${body.code}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const itemCountLabel =
    items.length === 0 ? null : validItemCount ? (
      <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        {items.length} ✓
      </span>
    ) : (
      <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        {items.length} — need 4, 8, 16 or 32
      </span>
    );

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Top bar */}
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" />
          </svg>
          Back
        </Link>
      </div>

      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-lg space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Create tournament</h1>
            <p className="mt-1 text-sm text-zinc-500">Set up your bracket and invite your team.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Theme */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tournament name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Best Movie Ever"
                  className={input}
                />
              </Field>
              <Field label="Theme / category">
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  required
                  placeholder="Movies"
                  className={input}
                />
              </Field>
            </div>

            {/* Items */}
            <Field label={<>Items {itemCountLabel}</>} hint="One per line · must be 4, 8, 16 or 32">
              <textarea
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                required
                rows={8}
                placeholder={"Inception\nThe Matrix\nInterstellar\nDune"}
                className={`${input} font-mono text-sm resize-none`}
              />
            </Field>

            {/* Credentials */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your account</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Display name">
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    required
                    placeholder="Alice"
                    className={input}
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••"
                    className={input}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !validItemCount}
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create tournament"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const input =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center text-sm font-medium text-zinc-700">{label}</label>
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
      {children}
    </div>
  );
}
