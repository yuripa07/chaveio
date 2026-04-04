"use client";

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
  name?: string | null;
  status: string;
  pointValue: number;
  matches: Match[];
};

type Props = {
  rounds: Round[];
  itemMap: Record<string, Item>;
  picks?: Record<string, string>;
  onPick?: (matchId: string, itemId: string) => void;
  mode?: "pick" | "predict" | "view";
  readOnlyRounds?: Set<number>; // round numbers that are view-only even in predict mode
};

const BASE_H = 100;
const ITEM_H = 42;
const GAP = 6;
const COL_W = 168;

export default function BracketView({ rounds, itemMap, picks = {}, onPick, mode = "view", readOnlyRounds = new Set() }: Props) {
  if (!rounds.length) return null;
  const totalRounds = rounds.length;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max py-2">
        {rounds.map((round, ri) => {
          const multiplier = Math.pow(2, ri);
          const matchH = BASE_H * multiplier;
          const padV = (matchH - ITEM_H * 2 - GAP) / 2;
          const isLast = ri === totalRounds - 1;

          return (
            <div key={round.id} className="flex flex-col" style={{ width: COL_W + 32 }}>
              {/* Column header */}
              <div className="mb-2 px-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {round.name || (isLast ? "Final" : `Rodada ${round.roundNumber}`)}
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-500">
                    {round.pointValue}pt
                  </span>
                  {round.status === "ACTIVE" && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </span>
                  )}
                </span>
              </div>

              {/* Matches */}
              <div className="flex flex-col">
                {round.matches.map((match, mi) => {
                  const item1 = match.slots[0] ? itemMap[match.slots[0].itemId] : null;
                  const item2 = match.slots[1] ? itemMap[match.slots[1].itemId] : null;
                  const resolved = match.status === "COMPLETE";
                  const selected = picks[match.id];
                  const isReadOnly = readOnlyRounds.has(round.roundNumber);
                  const pickable =
                    !resolved &&
                    !isReadOnly &&
                    match.slots.length >= 2 &&
                    (
                      (mode === "pick" && round.status === "ACTIVE") ||
                      mode === "predict"
                    );

                  return (
                    <div
                      key={match.id}
                      className="relative flex items-center"
                      style={{ height: matchH }}
                    >
                      {/* Right connector (horizontal out) */}
                      {!isLast && (
                        <div
                          className="absolute border-t border-zinc-200"
                          style={{ right: 0, width: 16, top: "50%" }}
                        />
                      )}
                      {/* Left connector (vertical bar joining feeder pair) */}
                      {ri > 0 && (
                        <div
                          className="absolute border-l border-zinc-200"
                          style={{ left: 0, top: matchH / 4, bottom: matchH / 4 }}
                        />
                      )}
                      {/* Left horizontal stub */}
                      {ri > 0 && (
                        <div
                          className="absolute border-t border-zinc-200"
                          style={{ left: 0, width: 16, top: "50%" }}
                        />
                      )}

                      {/* Match card */}
                      <div
                        className="mx-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                        style={{
                          width: COL_W,
                          marginTop: padV,
                          marginBottom: padV,
                        }}
                      >
                        {[item1, item2].map((item, idx) => {
                          const isFirst = idx === 0;
                          if (!item) {
                            return (
                              <div
                                key={idx}
                                style={{ height: ITEM_H }}
                                className={[
                                  "flex items-center px-3 text-xs text-zinc-300",
                                  !isFirst && "border-t border-zinc-100",
                                ].join(" ")}
                              >
                                A definir
                              </div>
                            );
                          }

                          const isWinner = resolved && match.winnerId === item.id;
                          const isLoser = resolved && match.winnerId !== null && match.winnerId !== item.id;
                          const isSelected = !resolved && selected === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={!pickable}
                              style={{ height: ITEM_H }}
                              onClick={() => pickable && onPick?.(match.id, item.id)}
                              className={[
                                "flex w-full items-center gap-2 px-3 text-left text-sm transition-colors",
                                !isFirst && "border-t border-zinc-100",
                                isWinner
                                  ? "bg-emerald-50 text-emerald-700"
                                  : isLoser
                                  ? "bg-white text-zinc-300"
                                  : isSelected
                                  ? "bg-indigo-600 text-white"
                                  : pickable
                                  ? "hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                                  : "bg-white text-zinc-700",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <span
                                className={[
                                  "shrink-0 flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold",
                                  isWinner
                                    ? "bg-emerald-100 text-emerald-600"
                                    : isSelected
                                    ? "bg-indigo-500 text-white"
                                    : "bg-zinc-100 text-zinc-400",
                                ].join(" ")}
                              >
                                {item.seed}
                              </span>
                              <span className={["truncate text-sm font-medium", isLoser ? "line-through" : ""].join(" ")}>
                                {item.name}
                              </span>
                              {isWinner && (
                                <svg viewBox="0 0 16 16" fill="currentColor" className="ml-auto h-4 w-4 shrink-0 text-emerald-500">
                                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
                                </svg>
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
