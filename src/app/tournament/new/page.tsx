"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/locale-context";
import { Trophy, LayoutList, Tag, User, Lock, CheckCircle2, ChevronRight, Eye, EyeOff } from "lucide-react";
import { setStoredToken } from "@/lib/token-storage";
import { translateApiError } from "@/lib/translate-api-error";
import { cn } from "@/lib/cn";
import { INPUT_CLASS } from "@/constants/styles";
import { VALID_TOURNAMENT_SIZES, MAX_TOURNAMENT_SIZE } from "@/constants/tournament";
import { BackLink } from "@/components/back-link";
import { FormField } from "@/components/form-field";
import { ErrorAlert } from "@/components/error-alert";
import { Spinner } from "@/components/spinner";

function totalRoundsFor(itemCount: number) {
  return (VALID_TOURNAMENT_SIZES as readonly number[]).includes(itemCount)
    ? Math.log2(itemCount)
    : null;
}

export default function NewTournament() {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [roundNames, setRoundNames] = useState<string[]>([]);
  const [creatorName, setCreatorName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);

  const filledItems = items.filter((item) => item.trim());
  const numRounds = totalRoundsFor(filledItems.length);
  const isValidCount = numRounds !== null;
  const allRoundNamesFilled =
    numRounds !== null &&
    Array.from({ length: numRounds }).every((_, i) => (roundNames[i] ?? "").trim() !== "");

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
          roundNames: roundNames.slice(0, numRounds ?? 0).map((roundName) => roundName.trim()),
        }),
      });
      const body = await response.json();
      if (!response.ok) { setError(translateApiError(body.error, t) ?? t.createTournament.somethingWentWrong); return; }
      setStoredToken(body.code, body.token);
      router.push(`/tournament/${body.code}`);
    } catch {
      setError(t.common.networkError);
    } finally {
      setLoading(false);
    }
  }

  const countLabel = (() => {
    const count = filledItems.length;
    if (count === 0) return null;
    if (isValidCount)
      return (
        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-xxs font-bold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> {count}
        </span>
      );
    const nextValidSize = (VALID_TOURNAMENT_SIZES as readonly number[]).find((size) => size > count);
    return (
      <span className="ml-1.5 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-xxs font-bold text-amber-700 dark:text-amber-400">
        {count} — {t.createTournament.addUpTo(nextValidSize ?? MAX_TOURNAMENT_SIZE)}
      </span>
    );
  })();

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <BackLink href="/" label={t.common.back} />
      </div>

      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-lg space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
              <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{t.createTournament.title}</h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t.createTournament.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label={t.createTournament.tournamentNameLabel} icon={<Tag className="h-3.5 w-3.5" />}>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
                autoComplete="off"
                placeholder={t.createTournament.tournamentNamePlaceholder}
                className={INPUT_CLASS}
              />
            </FormField>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <LayoutList className="h-3.5 w-3.5 text-zinc-400" />
                {t.createTournament.candidatesLabel} {countLabel}
              </label>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {t.createTournament.candidatesHint}
              </p>
              <div className="space-y-2">
                {items.map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                      {index + 1}
                    </span>
                    <input
                      ref={(element) => { itemRefs.current[index] = element; }}
                      type="text"
                      value={value}
                      onChange={(event) => handleItemChange(index, event.target.value)}
                      onKeyDown={(event) => handleItemKeyDown(index, event)}
                      placeholder={t.createTournament.itemPlaceholder(index + 1)}
                      className={cn(INPUT_CLASS, "py-2")}
                    />
                    {value.trim() && index < items.length - 1 && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isValidCount && numRounds !== null && (
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                    {t.createTournament.roundThemesLabel}
                  </label>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {t.createTournament.roundThemesHint}
                  </p>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: numRounds }).map((_, roundIndex) => {
                    const isFinal = roundIndex === numRounds - 1;
                    return (
                      <div key={roundIndex} className="flex items-center gap-3">
                        <span className="shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 text-xxs font-bold text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-900">
                          {isFinal ? t.createTournament.final : t.createTournament.roundLabel(roundIndex + 1)}
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
                          placeholder={isFinal ? t.createTournament.roundPlaceholderFinal : (t.createTournament.roundPlaceholders[roundIndex] ?? t.createTournament.roundPlaceholderDefault)}
                          className={cn(INPUT_CLASS, "py-2 flex-1")}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <User className="h-3.5 w-3.5" />
                {t.createTournament.creatorSection}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t.createTournament.yourName}>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(event) => setCreatorName(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder={t.createTournament.yourNamePlaceholder}
                    className={INPUT_CLASS}
                  />
                </FormField>
                <FormField label={t.createTournament.passwordLabel} hint={t.createTournament.passwordHint} icon={<Lock className="h-3 w-3" />}>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="••••••"
                      className={cn(INPUT_CLASS, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                      aria-label={showPassword ? t.common.hidePassword : t.common.showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>
              </div>
            </div>

            {error && <ErrorAlert message={error} />}

            <button
              type="submit"
              disabled={loading || !allRoundNamesFilled || !name.trim() || !creatorName.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  {t.createTournament.creating}
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  {t.createTournament.create}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
