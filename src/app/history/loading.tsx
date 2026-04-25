export default function HistoryLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800" />
      <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-indigo-50 dark:from-indigo-950 to-white dark:to-zinc-950 px-4 py-10">
        <div className="w-full max-w-lg space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-5 py-4 shadow-sm"
            >
              <div className="flex-1 overflow-hidden space-y-2.5">
                <div className="h-4 w-40 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                </div>
                <div className="flex gap-3">
                  <div className="h-3.5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                  <div className="h-3.5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-36 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
