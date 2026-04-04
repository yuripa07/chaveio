import { Spinner } from "@/components/spinner";

export function PageSpinner() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-indigo-400" />
        <p className="text-sm text-zinc-400">Carregando…</p>
      </div>
    </main>
  );
}

export function PageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-100" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-100" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-6 py-8">
        <div className="h-6 w-48 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    </main>
  );
}
