type ScoreStatProps = {
  label: string;
  value: number;
};

export function ScoreStat({ label, value }: ScoreStatProps) {
  return (
    <div className="flex flex-1 flex-col items-center py-3">
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}
