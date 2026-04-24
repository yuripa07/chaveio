export default function HistoryLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800" />
      <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-indigo-50 dark:from-indigo-950 to-white dark:to-zinc-950 px-4 py-10">
        <div className="w-full max-w-lg space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
