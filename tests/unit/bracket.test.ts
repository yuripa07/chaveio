import { describe, it, expect } from "vitest";
import { seedPositions, generateFirstRoundPairs, getNextRoundSlot } from "@/lib/bracket";

describe("seedPositions", () => {
  it("n=2 → [1, 2]", () => {
    expect(seedPositions(2)).toEqual([1, 2]);
  });

  it("n=4 → [1, 4, 3, 2]", () => {
    expect(seedPositions(4)).toEqual([1, 4, 3, 2]);
  });

  it("n=8 returns 8 unique seeds from 1..8", () => {
    const pos = seedPositions(8);
    expect(pos).toHaveLength(8);
    expect(new Set(pos).size).toBe(8);
    expect(Math.min(...pos)).toBe(1);
    expect(Math.max(...pos)).toBe(8);
  });

  it("n=16 returns 16 unique seeds from 1..16", () => {
    const pos = seedPositions(16);
    expect(pos).toHaveLength(16);
    expect(new Set(pos).size).toBe(16);
  });
});

describe("generateFirstRoundPairs", () => {
  it("n=4 produces 2 pairs with no repeated seed", () => {
    const pairs = generateFirstRoundPairs(4);
    expect(pairs).toHaveLength(2);
    const allSeeds = pairs.flat();
    expect(new Set(allSeeds).size).toBe(4);
  });

  it("n=4 first pair is [1,4] (top seed vs bottom seed)", () => {
    const pairs = generateFirstRoundPairs(4);
    expect(pairs[0]).toEqual([1, 4]);
  });

  it("n=16 produces 8 pairs with no repeated item", () => {
    const pairs = generateFirstRoundPairs(16);
    expect(pairs).toHaveLength(8);
    const allSeeds = pairs.flat();
    expect(new Set(allSeeds).size).toBe(16);
  });
});

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
});
