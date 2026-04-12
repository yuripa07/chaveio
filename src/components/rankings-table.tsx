"use client";

import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/locale-context";
import type { RankEntry } from "@/types/tournament";

type RankingsTableProps = {
  rankings: RankEntry[];
  currentParticipantId?: string | null;
};

export function RankingsTable({ rankings, currentParticipantId }: RankingsTableProps) {
  const { t } = useLocale();
  if (rankings.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
            <th className="px-4 py-2.5 text-xs font-semibold text-zinc-400">{t.rankingsTable.rankHeader}</th>
            <th className="px-4 py-2.5 text-xs font-semibold text-zinc-400">{t.rankingsTable.nameHeader}</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-400">{t.rankingsTable.pointsHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
          {rankings.map((entry) => {
            const isCurrentUser = entry.participantId === currentParticipantId;
            return (
              <tr key={entry.participantId} className={isCurrentUser ? "bg-indigo-50 dark:bg-indigo-950" : ""}>
                <td className="px-4 py-3 text-sm font-bold text-zinc-400">{entry.rank}</td>
                <td className={cn("max-w-0 truncate px-4 py-3", isCurrentUser ? "font-semibold text-indigo-700 dark:text-indigo-300" : "text-zinc-800 dark:text-zinc-200")}>
                  {entry.displayName}
                  {isCurrentUser && ` ${t.common.you}`}
                </td>
                <td className="px-4 py-3 text-right font-bold text-zinc-800 dark:text-zinc-200">{entry.totalPoints}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
