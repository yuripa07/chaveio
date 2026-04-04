"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setStoredToken } from "@/lib/token-storage";
import { cn } from "@/lib/cn";
import { INPUT_CLASS } from "@/constants/styles";
import { VALID_TOURNAMENT_SIZES, MAX_TOURNAMENT_SIZE } from "@/constants/tournament";
import { BackLink } from "@/components/back-link";
import { FormField } from "@/components/form-field";
import { ErrorAlert } from "@/components/error-alert";

function totalRoundsFor(itemCount: number) {
  return (VALID_TOURNAMENT_SIZES as readonly number[]).includes(itemCount)
    ? Math.log2(itemCount)
    : null;
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

  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);

  const filledItems = items.filter((item) => item.trim());
  const numRounds = totalRoundsFor(filledItems.length);
  const isValidCount = numRounds !== null;

  useEffect(() => {
    if (numRounds === null) return;
    setRoundNames((previous) => {
      if (previous.length === numRounds) return previous;
      if (previous.length < numRounds)
        return [...previous, ...Array(numRounds - previous.length).fill("")];
      return previous.slice(0, numRounds);
    });
  }, [numRounds]);

  function handleItemChange(index: number, value: string) {
    setItems((previous) => {
      const next = [...previous];
      next[index] = value;
      if (index === next.length - 1 && value.trim() && next.length < MAX_TOURNAMENT_SIZE) {
        next.push("");
      }
      return next;
    });
  }

  function handleItemKeyDown(index: number, event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      const nextInput = itemRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    }
    if (event.key === "Backspace" && items[index] === "" && index > 0) {
      event.preventDefault();
      setItems((previous) => previous.slice(0, -1));
      setTimeout(() => itemRefs.current[index - 1]?.focus(), 0);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const validItems = items.map((item) => item.trim()).filter(Boolean);
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          items: validItems,
          creatorName,
          creatorPassword: password,
          roundNames: roundNames.map((roundName) => roundName.trim()),
        }),
      });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Algo deu errado"); return; }
      setStoredToken(body.code, body.token);
      router.push(`/tournament/${body.code}`);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  const countLabel = (() => {
    const count = filledItems.length;
    if (count === 0) return null;
    if (isValidCount)
      return (
        <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {count} ✓
        </span>
      );
    const nextValidSize = (VALID_TOURNAMENT_SIZES as readonly number[]).find((size) => size > count);
    return (
      <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        {count} — adicione até {nextValidSize ?? MAX_TOURNAMENT_SIZE}
      </span>
    );
  })();

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <BackLink href="/" />
      </div>

      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-lg space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Criar torneio</h1>
            <p className="mt-1 text-sm text-zinc-500">Configure o chaveamento e convide sua equipe.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Nome do torneio">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Melhor filme de todos os tempos"
                className={INPUT_CLASS}
              />
            </FormField>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-zinc-700">
                Participantes {countLabel}
              </label>
              <p className="text-xs text-zinc-400">
                Deve ter 4, 8, 16 ou 32 itens. Pressione Enter para avançar.
              </p>
              <div className="space-y-2">
                {items.map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-bold text-zinc-400">
                      {index + 1}
                    </span>
                    <input
                      ref={(element) => { itemRefs.current[index] = element; }}
                      type="text"
                      value={value}
                      onChange={(event) => handleItemChange(index, event.target.value)}
                      onKeyDown={(event) => handleItemKeyDown(index, event)}
                      placeholder={index === 0 ? "Ex: Brasil" : `Item ${index + 1}`}
                      autoFocus={index === 0}
                      className={cn(INPUT_CLASS, "py-2")}
                    />
                    {value.trim() && index < items.length - 1 && (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-emerald-500">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
                  {Array.from({ length: numRounds }).map((_, roundIndex) => {
                    const isFinal = roundIndex === numRounds - 1;
                    return (
                      <div key={roundIndex} className="flex items-center gap-3">
                        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                          {isFinal ? "Final" : `Rodada ${roundIndex + 1}`}
                        </span>
                        <input
                          type="text"
                          value={roundNames[roundIndex] ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRoundNames((previous) => {
                              const next = [...previous];
                              next[roundIndex] = value;
                              return next;
                            });
                          }}
                          placeholder={isFinal ? "Ex: Melhor no geral" : `Ex: Melhor ${["bandeira", "culinária", "idioma", "cultura"][roundIndex] ?? "atributo"}`}
                          className={cn(INPUT_CLASS, "py-2 flex-1")}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Sua conta (criador)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Seu nome">
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(event) => setCreatorName(event.target.value)}
                    required
                    placeholder="Alice"
                    className={INPUT_CLASS}
                  />
                </FormField>
                <FormField label="Senha">
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="••••••"
                    className={INPUT_CLASS}
                  />
                </FormField>
              </div>
            </div>

            {error && <ErrorAlert message={error} />}

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
