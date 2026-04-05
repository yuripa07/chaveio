"use client";

import { cn } from "@/lib/cn";
import {
  BRACKET_BASE_HEIGHT,
  BRACKET_ITEM_HEIGHT,
  BRACKET_MATCH_GAP,
  BRACKET_COLUMN_WIDTH,
} from "@/constants/bracket-layout";
import { RoundStatus } from "@/constants/tournament";
import { PulseDot } from "@/components/pulse-dot";
import { ResultIcon } from "@/components/result-icon";
import type { TournamentItem, BracketRound } from "@/types/tournament";

type BracketViewProps = {
  rounds: BracketRound[];
  itemMap: Record<string, TournamentItem>;
  picks?: Record<string, string>;
  onPick?: (matchId: string, itemId: string) => void;
  mode?: "pick" | "predict" | "view";
  readOnlyRounds?: Set<number>;
};

export default function BracketView({
  rounds,
  itemMap,
  picks = {},
  onPick,
  mode = "view",
  readOnlyRounds = new Set(),
}: BracketViewProps) {
  if (!rounds.length) return null;
  const totalRounds = rounds.length;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max py-2">
        {rounds.map((round, roundIndex) => {
          const multiplier = Math.pow(2, roundIndex);
          const matchHeight = BRACKET_BASE_HEIGHT * multiplier;
          const verticalPadding = (matchHeight - BRACKET_ITEM_HEIGHT * 2 - BRACKET_MATCH_GAP) / 2;
          const isLastRound = roundIndex === totalRounds - 1;

          return (
            <div key={round.id} className="flex flex-col" style={{ width: BRACKET_COLUMN_WIDTH + 32 }}>
              <div className="mb-2 px-4">
                <span className="inline-flex items-center gap-1.5 text-xxs font-bold uppercase tracking-widest text-zinc-400">
                  {round.name || (isLastRound ? "Final" : `Rodada ${round.roundNumber}`)}
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-500">
                    {round.pointValue}pt
                  </span>
                  {round.status === RoundStatus.ACTIVE && (
                    <PulseDot color="indigo" size="sm" />
                  )}
                </span>
              </div>

              <div className="flex flex-col">
                {round.matches.map((match) => {
                  const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                  const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                  const isResolved = match.status === "COMPLETE";
                  const selectedItemId = picks[match.id];
                  const isReadOnly = readOnlyRounds.has(round.roundNumber);
                  const isPickable =
                    !isResolved &&
                    !isReadOnly &&
                    match.slots.length >= 2 &&
                    (
                      (mode === "pick" && round.status === RoundStatus.ACTIVE) ||
                      mode === "predict"
                    );

                  return (
                    <div
                      key={match.id}
                      className="relative flex items-center"
                      style={{ height: matchHeight }}
                    >
                      {/* Right connector */}
                      {!isLastRound && (
                        <div
                          className="absolute border-t border-zinc-200"
                          style={{ right: 0, width: 16, top: "50%" }}
                        />
                      )}
                      {/* Left vertical bar joining feeder pair */}
                      {roundIndex > 0 && (
                        <div
                          className="absolute border-l border-zinc-200"
                          style={{ left: 0, top: matchHeight / 4, bottom: matchHeight / 4 }}
                        />
                      )}
                      {/* Left horizontal stub */}
                      {roundIndex > 0 && (
                        <div
                          className="absolute border-t border-zinc-200"
                          style={{ left: 0, width: 16, top: "50%" }}
                        />
                      )}

                      {/* Match card */}
                      <div
                        className="mx-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                        style={{
                          width: BRACKET_COLUMN_WIDTH,
                          marginTop: verticalPadding,
                          marginBottom: verticalPadding,
                        }}
                      >
                        {[item1, item2].map((item, slotIndex) => {
                          const isFirstSlot = slotIndex === 0;
                          if (!item) {
                            return (
                              <div
                                key={slotIndex}
                                style={{ height: BRACKET_ITEM_HEIGHT }}
                                className={cn(
                                  "flex items-center px-3 text-xs text-zinc-300",
                                  !isFirstSlot && "border-t border-zinc-100"
                                )}
                              >
                                A definir
                              </div>
                            );
                          }

                          const isWinner = isResolved && match.winnerId === item.id;
                          const isLoser = isResolved && match.winnerId !== null && match.winnerId !== item.id;
                          const isSelected = !isResolved && selectedItemId === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={!isPickable}
                              style={{ height: BRACKET_ITEM_HEIGHT }}
                              onClick={() => isPickable && onPick?.(match.id, item.id)}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 text-left text-sm transition-colors",
                                !isFirstSlot && "border-t border-zinc-100",
                                isWinner && "bg-emerald-50 text-emerald-700",
                                isLoser && "bg-white text-zinc-300",
                                isSelected && "bg-indigo-600 text-white",
                                !isWinner && !isLoser && !isSelected && isPickable && "hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer",
                                !isWinner && !isLoser && !isSelected && !isPickable && "bg-white text-zinc-700"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xxs font-bold",
                                  isWinner ? "bg-emerald-100 text-emerald-600" : isSelected ? "bg-indigo-500 text-white" : "bg-zinc-100 text-zinc-400"
                                )}
                              >
                                {item.seed}
                              </span>
                              <span className={cn("truncate text-sm font-medium", isLoser && "line-through")}>
                                {item.name}
                              </span>
                              {isWinner && (
                                <ResultIcon result="correct" className="ml-auto h-4 w-4 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

