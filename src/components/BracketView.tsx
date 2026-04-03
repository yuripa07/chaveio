"use client";

/**
 * Visual bracket tree component.
 *
 * Renders rounds as columns. Each match vertically spans 2× the height of
 * matches in the previous round, keeping midpoints aligned.
 *
 * Props:
 * - rounds: ordered array of rounds (each with matches and slots)
 * - itemMap: id → item lookup
 * - picks: matchId → pickedItemId (for bracket/pick mode)
 * - onPick: called when user picks a winner (pick mode only)
 * - mode: "pick" | "view"
 */

type Item = { id: string; name: string; seed: number };
type Slot = { id: string; itemId: string; position: number };
type Match = {
  id: string;
  matchNumber: number;
  status: string;
  winnerId?: string | null;
  slots: Slot[];
};
type Round = {
  id: string;
  roundNumber: number;
  status: string;
  pointValue: number;
  matches: Match[];
};

type Props = {
  rounds: Round[];
  itemMap: Record<string, Item>;
  picks?: Record<string, string>;
  onPick?: (matchId: string, itemId: string) => void;
  mode?: "pick" | "view";
};

const BASE_MATCH_HEIGHT = 96; // px for round-1 matches
const ITEM_H = 40; // px per item button

export default function BracketView({
  rounds,
  itemMap,
  picks = {},
  onPick,
  mode = "view",
}: Props) {
  if (!rounds.length) return null;

  const totalRounds = rounds.length;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-0 min-w-max">
        {rounds.map((round, roundIdx) => {
          // Height multiplier: round 1 = 1×, round 2 = 2×, etc.
          const multiplier = Math.pow(2, roundIdx);
          const matchH = BASE_MATCH_HEIGHT * multiplier;
          // Padding to center matches within their slot (half the gap above and below)
          const padV = (matchH - ITEM_H * 2 - 8) / 2; // 8px gap between items

          return (
            <div key={round.id} className="flex flex-col">
              {/* Round label */}
              <div className="h-7 flex items-center px-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                  {roundIdx === totalRounds - 1
                    ? "Final"
                    : `Round ${round.roundNumber}`}{" "}
                  · {round.pointValue}pt
                </span>
              </div>

              {/* Matches column */}
              <div className="flex flex-col">
                {round.matches.map((match) => {
                  const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                  const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                  const resolved = match.status === "COMPLETE";
                  const selected = picks[match.id];
                  const isPending = !resolved && round.status === "ACTIVE";
                  const isLastRound = roundIdx === totalRounds - 1;

                  return (
                    <div
                      key={match.id}
                      style={{ height: matchH }}
                      className="relative flex items-center"
                    >
                      {/* Connector lines */}
                      {!isLastRound && (
                        <div
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-4 border-t border-zinc-200"
                          style={{ right: -16 }}
                        />
                      )}
                      {roundIdx > 0 && (
                        <>
                          {/* Vertical bar on left connecting to feeder matches */}
                          <div
                            className="absolute left-0 border-l border-zinc-200"
                            style={{
                              top: matchH / 4,
                              bottom: matchH / 4,
                              left: -16,
                            }}
                          />
                        </>
                      )}

                      <div
                        className="w-40 mx-4"
                        style={{ paddingTop: padV, paddingBottom: padV }}
                      >
                        <div className="flex flex-col gap-1">
                          {[item1, item2].map((item, idx) => {
                            if (!item) {
                              return (
                                <div
                                  key={idx}
                                  style={{ height: ITEM_H }}
                                  className="flex items-center justify-center rounded-lg border border-dashed border-zinc-200 text-xs text-zinc-300"
                                >
                                  TBD
                                </div>
                              );
                            }

                            const isWinner = resolved && match.winnerId === item.id;
                            const isLoser = resolved && match.winnerId !== item.id;
                            const isSelected = !resolved && selected === item.id;
                            const isPickable = mode === "pick" && isPending && !resolved;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                disabled={!isPickable}
                                style={{ height: ITEM_H }}
                                onClick={() => isPickable && onPick?.(match.id, item.id)}
                                className={[
                                  "flex items-center gap-1.5 rounded-lg border px-2 text-left text-sm transition-colors w-full",
                                  isWinner
                                    ? "border-green-500 bg-green-50 text-green-700 font-semibold"
                                    : isLoser
                                    ? "border-zinc-100 bg-zinc-50 text-zinc-300 line-through"
                                    : isSelected
                                    ? "border-zinc-900 bg-zinc-900 text-white"
                                    : isPickable
                                    ? "border-zinc-200 hover:border-zinc-500 hover:bg-zinc-50 cursor-pointer"
                                    : "border-zinc-200 text-zinc-600 cursor-default",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <span className="shrink-0 text-[10px] opacity-50 w-4 text-right">
                                  {item.seed}
                                </span>
                                <span className="truncate">{item.name}</span>
                              </button>
                            );
                          })}
                        </div>
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
