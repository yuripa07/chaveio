import { describe, it, expect } from "vitest";
import { augmentRounds, clearDownstream } from "@/lib/bracket-client";
import type { BracketRound, BracketMatch } from "@/types/tournament";

function makeMatch(
  id: string,
  matchNumber: number,
  slots: { id: string; itemId: string; position: number }[] = []
): BracketMatch {
  return { id, matchNumber, status: "PENDING", winnerId: null, slots };
}

function makeRound(roundNumber: number, matches: BracketMatch[]): BracketRound {
  return { id: `r${roundNumber}`, roundNumber, status: "PENDING", pointValue: 1, matches };
}

function make4ItemRounds(): BracketRound[] {
  return [
    makeRound(1, [
      makeMatch("m1", 1, [
        { id: "s1", itemId: "A", position: 1 },
        { id: "s2", itemId: "B", position: 2 },
      ]),
      makeMatch("m2", 2, [
        { id: "s3", itemId: "C", position: 1 },
        { id: "s4", itemId: "D", position: 2 },
      ]),
    ]),
    makeRound(2, [makeMatch("m3", 1)]),
  ];
}

function make8ItemRounds(): BracketRound[] {
  return [
    makeRound(1, [
      makeMatch("m1", 1, [
        { id: "s1", itemId: "A", position: 1 },
        { id: "s2", itemId: "H", position: 2 },
      ]),
      makeMatch("m2", 2, [
        { id: "s3", itemId: "E", position: 1 },
        { id: "s4", itemId: "D", position: 2 },
      ]),
      makeMatch("m3", 3, [
        { id: "s5", itemId: "C", position: 1 },
        { id: "s6", itemId: "F", position: 2 },
      ]),
      makeMatch("m4", 4, [
        { id: "s7", itemId: "G", position: 1 },
        { id: "s8", itemId: "B", position: 2 },
      ]),
    ]),
    makeRound(2, [makeMatch("m5", 1), makeMatch("m6", 2)]),
    makeRound(3, [makeMatch("m7", 1)]),
  ];
}

describe("augmentRounds", () => {
  it("fills virtual slots in round 2 from round-1 picks (4-item)", () => {
    const rounds = make4ItemRounds();
    const picks = { m1: "A", m2: "C" };
    const result = augmentRounds(rounds, picks, 1);

    const r2m1 = result[1].matches[0];
    expect(r2m1.slots).toHaveLength(2);
    expect(r2m1.slots.find((s) => s.position === 1)?.itemId).toBe("A");
    expect(r2m1.slots.find((s) => s.position === 2)?.itemId).toBe("C");
  });

  it("does not overwrite round-2 match that already has real slots", () => {
    const rounds = make4ItemRounds();
    rounds[1].matches[0].slots = [
      { id: "real1", itemId: "A", position: 1 },
      { id: "real2", itemId: "C", position: 2 },
    ];
    const picks = { m1: "B", m2: "D" };
    const result = augmentRounds(rounds, picks, 1);

    expect(result[1].matches[0].slots[0].id).toBe("real1");
  });

  it("does not add virtual slots when picks are missing", () => {
    const rounds = make4ItemRounds();
    const result = augmentRounds(rounds, {}, 1);

    expect(result[1].matches[0].slots).toHaveLength(0);
  });

  it("only adds one virtual slot when only one feeder pick exists", () => {
    const rounds = make4ItemRounds();
    const result = augmentRounds(rounds, { m1: "A" }, 1);

    const r2m1 = result[1].matches[0];
    expect(r2m1.slots).toHaveLength(1);
    expect(r2m1.slots[0].itemId).toBe("A");
    expect(r2m1.slots[0].position).toBe(1);
  });

  it("does not modify rounds at or before startRound", () => {
    const rounds = make4ItemRounds();
    const result = augmentRounds(rounds, { m1: "A", m2: "C" }, 1);

    expect(result[0]).toBe(rounds[0]);
  });

  it("augments round 2 but not round 3 when round-2 picks are absent (8-item)", () => {
    const rounds = make8ItemRounds();
    const picks = { m1: "A", m2: "E", m3: "C", m4: "G" };
    const result = augmentRounds(rounds, picks, 1);

    const r2m1 = result[1].matches[0];
    expect(r2m1.slots.find((s) => s.position === 1)?.itemId).toBe("A");
    expect(r2m1.slots.find((s) => s.position === 2)?.itemId).toBe("E");
    expect(result[2].matches[0].slots).toHaveLength(0);
  });

  it("cascades augmentation through all rounds when all picks are present (8-item)", () => {
    const rounds = make8ItemRounds();
    const picks = { m1: "A", m2: "E", m3: "C", m4: "G", m5: "A", m6: "C" };
    const result = augmentRounds(rounds, picks, 1);

    const r3m1 = result[2].matches[0];
    expect(r3m1.slots.find((s) => s.position === 1)?.itemId).toBe("A");
    expect(r3m1.slots.find((s) => s.position === 2)?.itemId).toBe("C");
  });

  it("does not augment the start round itself", () => {
    const rounds = make4ItemRounds();
    const result = augmentRounds(rounds, { m1: "A", m2: "C" }, 2);

    expect(result[1].matches[0].slots).toHaveLength(0);
  });

  it("uses winnerId from a complete feeder match when user has no pick for it", () => {
    const rounds = make4ItemRounds();
    rounds[0].matches[0] = { ...rounds[0].matches[0], status: "COMPLETE", winnerId: "A" };
    const result = augmentRounds(rounds, { m2: "C" }, 1);

    const r2m1 = result[1].matches[0];
    expect(r2m1.slots).toHaveLength(2);
    expect(r2m1.slots.find((s) => s.position === 1)?.itemId).toBe("A");
    expect(r2m1.slots.find((s) => s.position === 2)?.itemId).toBe("C");
  });

  it("does not discard a partial real DB slot when the other feeder is pending and unpicked", () => {
    const rounds = make4ItemRounds();
    rounds[0].matches[0] = { ...rounds[0].matches[0], status: "COMPLETE", winnerId: "A" };
    rounds[1].matches[0].slots = [{ id: "real1", itemId: "A", position: 1 }];

    const r2m1 = augmentRounds(rounds, {}, 1)[1].matches[0];
    expect(r2m1.slots).toHaveLength(1);
    expect(r2m1.slots[0].itemId).toBe("A");
  });
});

describe("clearDownstream", () => {
  it("clears a round-2 pick that cascaded from the changed round-1 pick", () => {
    const rounds = make4ItemRounds();
    const picks = { m1: "A", m2: "C", m3: "A" };

    const result = clearDownstream("m1", rounds, picks);

    expect(result.m1).toBe("A");
    expect(result.m3).toBeUndefined();
  });

  it("does not clear round-2 pick that cascaded from a different feeder", () => {
    const rounds = make4ItemRounds();
    const picks = { m1: "A", m2: "C", m3: "C" };

    const result = clearDownstream("m1", rounds, picks);

    expect(result.m3).toBe("C");
  });

  it("cascades clearing through multiple rounds (8-item)", () => {
    const rounds = make8ItemRounds();
    // A wins m1 → A wins m5 → A wins m7
    const picks = { m1: "A", m2: "E", m3: "C", m4: "G", m5: "A", m6: "C", m7: "A" };

    const result = clearDownstream("m1", rounds, picks);

    expect(result.m5).toBeUndefined();
    expect(result.m7).toBeUndefined();
    expect(result.m2).toBe("E");
    expect(result.m6).toBe("C");
  });

  it("is a no-op when the changed match has no downstream pick", () => {
    const rounds = make4ItemRounds();
    const picks = { m1: "A", m2: "C" };

    expect(clearDownstream("m1", rounds, picks)).toEqual(picks);
  });

  it("is a no-op when matchId is not found in rounds", () => {
    const rounds = make4ItemRounds();
    const picks = { m1: "A", m2: "C", m3: "A" };

    expect(clearDownstream("nonexistent", rounds, picks)).toEqual(picks);
  });

  it("does not mutate the original picks object", () => {
    const rounds = make4ItemRounds();
    const picks = { m1: "A", m2: "C", m3: "A" };
    const original = { ...picks };

    clearDownstream("m1", rounds, picks);

    expect(picks).toEqual(original);
  });

  it("handles final-round match gracefully with no downstream", () => {
    const rounds = make4ItemRounds();
    const picks = { m1: "A", m2: "C", m3: "A" };

    const result = clearDownstream("m3", rounds, picks);

    expect(result.m1).toBe("A");
    expect(result.m2).toBe("C");
    expect(result.m3).toBe("A");
  });
});
