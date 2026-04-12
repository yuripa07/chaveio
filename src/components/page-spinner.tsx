"use client";

import { Spinner } from "@/components/spinner";
import { useLocale } from "@/contexts/locale-context";

export function PageSpinner() {
  const { t } = useLocale();
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-indigo-400" />
        <p className="text-sm text-zinc-400">{t.common.loading}</p>
      </div>
    </main>
  );
}

export function PageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="h-4 w-24 motion-safe:animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-16 motion-safe:animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-6 py-8">
        <div className="h-6 w-48 motion-safe:animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-32 motion-safe:animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-48 motion-safe:animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-24 motion-safe:animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </main>
  );
}

function HeaderSkeleton({ maxWidth = "5xl" }: { maxWidth?: "2xl" | "5xl" }) {
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
      <div className={`mx-auto flex items-center gap-3 ${maxWidth === "5xl" ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="h-4 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          <div className="h-4 w-40 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        </div>
        <div className="h-6 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

export function LobbyPageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="h-4 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          <div className="h-4 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        </div>
      </div>

      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              <div className="h-4 w-32 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            </div>
            <div className="h-6 w-24 rounded-full bg-amber-100 dark:bg-amber-950 motion-safe:animate-pulse shrink-0" />
          </div>

          <div className="h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-3">
              <div className="h-3 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse shrink-0" />
                    <div className="h-3.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-3">
              <div className="h-3 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-md bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse shrink-0" />
                    <div className="h-3.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        </div>
      </div>
    </main>
  );
}

export function BracketPageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="h-96 rounded-2xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-40 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            </div>
            <div className="h-9 w-36 rounded-xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function LivePageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <HeaderSkeleton />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            <div className="h-3.5 w-40 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            <div className="h-5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-2">
                  <div className="h-3.5 w-3.5 rounded bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                  <div className="h-3 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                </div>
                <div className="flex divide-x divide-zinc-100 dark:divide-zinc-800">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex flex-1 flex-col items-center gap-2 px-4 py-5">
                      <div className="h-5 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                      <div className="h-4 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          <div className="h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        </section>

        <section className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-zinc-50 dark:border-zinc-800 px-5 py-3 last:border-0">
                <div className="h-4 w-4 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                <div className="flex-1 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                <div className="h-4 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function ResultsPageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <HeaderSkeleton />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6">
            <div className="h-3 w-24 rounded-full bg-indigo-400/50 motion-safe:animate-pulse mb-2" />
            <div className="h-12 w-20 rounded-xl bg-indigo-400/50 motion-safe:animate-pulse mb-1" />
            <div className="h-3 w-12 rounded-full bg-indigo-400/50 motion-safe:animate-pulse" />
          </div>
          <div className="flex divide-x divide-zinc-100 dark:divide-zinc-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5 px-4 py-4">
                <div className="h-3 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                <div className="h-6 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <section className="space-y-3">
          <div className="h-3 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-zinc-50 dark:border-zinc-800 px-5 py-3 last:border-0">
                <div className="h-4 w-4 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                <div className="flex-1 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                <div className="h-4 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
          <div className="h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
        </section>
      </div>
    </main>
  );
}
