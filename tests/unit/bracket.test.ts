import { describe, it, expect } from "vitest";
import { getNextRoundSlot, getFeederMatches } from "@/lib/bracket";

describe("getNextRoundSlot", () => {
  it("match 1 → {matchIndex: 0, slotPosition: 1}", () => {
    expect(getNextRoundSlot(1)).toEqual({ matchIndex: 0, slotPosition: 1 });
  });

  it("match 2 → {matchIndex: 0, slotPosition: 2}", () => {
    expect(getNextRoundSlot(2)).toEqual({ matchIndex: 0, slotPosition: 2 });
  });

  it("match 3 → {matchIndex: 1, slotPosition: 1}", () => {
    expect(getNextRoundSlot(3)).toEqual({ matchIndex: 1, slotPosition: 1 });
  });

  it("match 4 → {matchIndex: 1, slotPosition: 2}", () => {
    expect(getNextRoundSlot(4)).toEqual({ matchIndex: 1, slotPosition: 2 });
  });

  it("match 5 → {matchIndex: 2, slotPosition: 1}", () => {
    expect(getNextRoundSlot(5)).toEqual({ matchIndex: 2, slotPosition: 1 });
  });

  it("match 6 → {matchIndex: 2, slotPosition: 2}", () => {
    expect(getNextRoundSlot(6)).toEqual({ matchIndex: 2, slotPosition: 2 });
  });

  it("match 7 → {matchIndex: 3, slotPosition: 1}", () => {
    expect(getNextRoundSlot(7)).toEqual({ matchIndex: 3, slotPosition: 1 });
  });

  it("match 8 → {matchIndex: 3, slotPosition: 2}", () => {
    expect(getNextRoundSlot(8)).toEqual({ matchIndex: 3, slotPosition: 2 });
  });
});

describe("getFeederMatches", () => {
  it("match 1 in next round is fed by matches 1 and 2", () => {
    expect(getFeederMatches(1)).toEqual([1, 2]);
  });

  it("match 2 in next round is fed by matches 3 and 4", () => {
    expect(getFeederMatches(2)).toEqual([3, 4]);
  });

  it("match 3 in next round is fed by matches 5 and 6", () => {
    expect(getFeederMatches(3)).toEqual([5, 6]);
  });

  it("is the inverse of getNextRoundSlot", () => {
    const [f1, f2] = getFeederMatches(1);
    expect(getNextRoundSlot(f1).matchIndex).toBe(0);
    expect(getNextRoundSlot(f2).matchIndex).toBe(0);
    expect(getNextRoundSlot(f1).slotPosition).toBe(1);
    expect(getNextRoundSlot(f2).slotPosition).toBe(2);
  });
});
