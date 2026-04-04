"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setStoredToken } from "@/lib/token-storage";

const VALID_COUNTS = [4, 8, 16, 32];

function totalRoundsFor(n: number) {
  return VALID_COUNTS.includes(n) ? Math.log2(n) : null;
}

export default function NewTournament() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [roundNames, setRoundNames] = useState<string[]>([]);
  const [creatorName, setCreatorName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Refs for each item input so we can focus the new one automatically
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);

  const filledItems = items.filter((s) => s.trim());
  const numRounds = totalRoundsFor(filledItems.length);
  const isValidCount = numRounds !== null;

  // Sync roundNames length when numRounds changes
  useEffect(() => {
    if (numRounds === null) return;
    setRoundNames((prev) => {
      if (prev.length === numRounds) return prev;
      if (prev.length < numRounds) return [...prev, ...Array(numRounds - prev.length).fill("")];
      return prev.slice(0, numRounds);
    });
  }, [numRounds]);

  function handleItemChange(idx: number, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = value;
      // Append a new empty slot if the last field is now filled
      if (idx === next.length - 1 && value.trim() && next.length < 32) {
        next.push("");
      }
      return next;
    });
  }

  function handleItemKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = itemRefs.current[idx + 1];
      if (next) next.focus();
    }
    if (e.key === "Backspace" && items[idx] === "" && idx > 0) {
      e.preventDefault();
      setItems((prev) => prev.slice(0, -1));
      setTimeout(() => itemRefs.current[idx - 1]?.focus(), 0);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const validItems = items.map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          items: validItems,
          creatorName,
          creatorPassword: password,
          roundNames: roundNames.map((s) => s.trim()),
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Algo deu errado"); return; }
      setStoredToken(body.code, body.token);
      router.push(`/tournament/${body.code}`);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  // Status label for item count
  const countLabel = (() => {
    const n = filledItems.length;
    if (n === 0) return null;
    if (isValidCount)
      return (
        <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {n} ✓
        </span>
      );
    const next = VALID_COUNTS.find((v) => v > n);
    return (
      <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        {n} — adicione até {next ?? 32}
      </span>
    );
  })();

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Top bar */}
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" />
          </svg>
          Voltar
        </Link>
      </div>

      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-lg space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Criar torneio</h1>
            <p className="mt-1 text-sm text-zinc-500">Configure o chaveamento e convide sua equipe.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tournament name */}
            <Field label="Nome do torneio">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Melhor filme de todos os tempos"
                className={inp}
              />
            </Field>

            {/* Dynamic item inputs */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-zinc-700">
                Participantes {countLabel}
              </label>
              <p className="text-xs text-zinc-400">
                Deve ter 4, 8, 16 ou 32 itens. Pressione Enter para avançar.
              </p>
              <div className="space-y-2">
                {items.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-bold text-zinc-400">
                      {idx + 1}
                    </span>
                    <input
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      type="text"
                      value={val}
                      onChange={(e) => handleItemChange(idx, e.target.value)}
                      onKeyDown={(e) => handleItemKeyDown(idx, e)}
                      placeholder={idx === 0 ? "Ex: Brasil" : `Item ${idx + 1}`}
                      autoFocus={idx === 0}
                      className={`${inp} py-2`}
                    />
                    {val.trim() && idx < items.length - 1 && (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-emerald-500">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Round names — only show when item count is valid */}
            {isValidCount && numRounds !== null && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-zinc-700">
                    Tema de cada rodada
                  </label>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    O que está sendo disputado em cada fase? Ex: "Melhor bandeira", "Melhor culinária".
                  </p>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: numRounds }).map((_, i) => {
                    const isFinal = i === numRounds - 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                          {isFinal ? "Final" : `Rodada ${i + 1}`}
                        </span>
                        <input
                          type="text"
                          value={roundNames[i] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRoundNames((prev) => {
                              const next = [...prev];
                              next[i] = v;
                              return next;
                            });
                          }}
                          placeholder={isFinal ? "Ex: Melhor no geral" : `Ex: Melhor ${["bandeira", "culinária", "idioma", "cultura"][i] ?? "atributo"}`}
                          className={`${inp} py-2 flex-1`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Creator credentials */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Sua conta (criador)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Seu nome">
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    required
                    placeholder="Alice"
                    className={inp}
                  />
                </Field>
                <Field label="Senha">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••"
                    className={inp}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !isValidCount}
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Criando…" : "Criar torneio"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const inp =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center text-sm font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}
