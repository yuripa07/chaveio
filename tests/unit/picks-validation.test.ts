import { describe, it, expect } from "vitest";
import { validateBracketPicks } from "@/lib/picks-validation";

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

type Slot = { itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; slots: Slot[] };
type Round = { roundNumber: number; matches: Match[] };

function makeSlots(ids: [string, string]): Slot[] {
  return [
    { itemId: ids[0], position: 1 },
    { itemId: ids[1], position: 2 },
  ];
}

/**
 * 4-item bracket structure (pre-start, all rounds PENDING):
 *   Round 1: match 1 (A vs B), match 2 (C vs D)
 *   Round 2: match 1 (no slots yet)
 */
function make4ItemRounds(): Round[] {
  return [
    {
      roundNumber: 1,
      matches: [
        { id: "m1", matchNumber: 1, status: "PENDING", slots: makeSlots(["A", "B"]) },
        { id: "m2", matchNumber: 2, status: "PENDING", slots: makeSlots(["C", "D"]) },
      ],
    },
    {
      roundNumber: 2,
      matches: [{ id: "m3", matchNumber: 1, status: "PENDING", slots: [] }],
    },
  ];
}

/**
 * 8-item bracket structure:
 *   Round 1: 4 matches (A-H)
 *   Round 2: 2 matches (empty)
 *   Round 3: 1 match (empty)
 */
function make8ItemRounds(): Round[] {
  return [
    {
      roundNumber: 1,
      matches: [
        { id: "m1", matchNumber: 1, status: "PENDING", slots: makeSlots(["A", "H"]) },
        { id: "m2", matchNumber: 2, status: "PENDING", slots: makeSlots(["E", "D"]) },
        { id: "m3", matchNumber: 3, status: "PENDING", slots: makeSlots(["C", "F"]) },
        { id: "m4", matchNumber: 4, status: "PENDING", slots: makeSlots(["G", "B"]) },
      ],
    },
    {
      roundNumber: 2,
      matches: [
        { id: "m5", matchNumber: 1, status: "PENDING", slots: [] },
        { id: "m6", matchNumber: 2, status: "PENDING", slots: [] },
      ],
    },
    {
      roundNumber: 3,
      matches: [{ id: "m7", matchNumber: 1, status: "PENDING", slots: [] }],
    },
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateBracketPicks — 4-item full bracket", () => {
  it("accepts valid full bracket (A wins R1M1, C wins R1M2, A wins final)", () => {
    const result = validateBracketPicks({
      picks: [
        { matchId: "m1", pickedItemId: "A" },
        { matchId: "m2", pickedItemId: "C" },
        { matchId: "m3", pickedItemId: "A" }, // A cascades from m1
      ],
      rounds: make4ItemRounds(),
      joinedAtRound: null,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects if a pick is missing", () => {
    const result = validateBracketPicks({
      picks: [
        { matchId: "m1", pickedItemId: "A" },
        { matchId: "m2", pickedItemId: "C" },
        // missing m3
      ],
      rounds: make4ItemRounds(),
      joinedAtRound: null,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/missing/i);
  });

  it("rejects round-1 pick with item not in match slots", () => {
    const result = validateBracketPicks({
      picks: [
        { matchId: "m1", pickedItemId: "X" }, // X not in [A, B]
        { matchId: "m2", pickedItemId: "C" },
        { matchId: "m3", pickedItemId: "C" },
      ],
      rounds: make4ItemRounds(),
      joinedAtRound: null,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });

  it("rejects cascade violation: final pick not matching any R1 winner", () => {
    const result = validateBracketPicks({
      picks: [
        { matchId: "m1", pickedItemId: "A" },
        { matchId: "m2", pickedItemId: "C" },
        { matchId: "m3", pickedItemId: "B" }, // B was eliminated in R1
      ],
      rounds: make4ItemRounds(),
      joinedAtRound: null,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cascade|invalid/i);
  });
});

describe("validateBracketPicks — 8-item full bracket", () => {
  it("accepts valid full 8-item bracket", () => {
    // A beats H, E beats D, C beats F, G beats B
    // R2: A vs E → A wins; C vs G → C wins
    // Final: A vs C → A wins
    const result = validateBracketPicks({
      picks: [
        { matchId: "m1", pickedItemId: "A" },
        { matchId: "m2", pickedItemId: "E" },
        { matchId: "m3", pickedItemId: "C" },
        { matchId: "m4", pickedItemId: "G" },
        { matchId: "m5", pickedItemId: "A" }, // A from m1, E from m2 → A or E
        { matchId: "m6", pickedItemId: "C" }, // C from m3, G from m4 → C or G
        { matchId: "m7", pickedItemId: "A" }, // A from m5, C from m6 → A or C
      ],
      rounds: make8ItemRounds(),
      joinedAtRound: null,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects cascade violation in round 2", () => {
    const result = validateBracketPicks({
      picks: [
        { matchId: "m1", pickedItemId: "A" },
        { matchId: "m2", pickedItemId: "E" },
        { matchId: "m3", pickedItemId: "C" },
        { matchId: "m4", pickedItemId: "G" },
        { matchId: "m5", pickedItemId: "H" }, // H lost in R1 — cascade violation
        { matchId: "m6", pickedItemId: "C" },
        { matchId: "m7", pickedItemId: "C" },
      ],
      rounds: make8ItemRounds(),
      joinedAtRound: null,
    });
    expect(result.valid).toBe(false);
  });
});

describe("validateBracketPicks — late joiner", () => {
  /**
   * Late joiner at round 2 of 4-item bracket.
   * Round 2 has actual slots (populated from real winners).
   */
  it("accepts 1 pick for final when joining at round 2", () => {
    const rounds: Round[] = [
      {
        roundNumber: 1,
        matches: [
          { id: "m1", matchNumber: 1, status: "COMPLETE", slots: makeSlots(["A", "B"]) },
          { id: "m2", matchNumber: 2, status: "COMPLETE", slots: makeSlots(["C", "D"]) },
        ],
      },
      {
        roundNumber: 2,
        matches: [
          // Real slots populated: A beat B, C beat D
          { id: "m3", matchNumber: 1, status: "PENDING", slots: makeSlots(["A", "C"]) },
        ],
      },
    ];

    const result = validateBracketPicks({
      picks: [{ matchId: "m3", pickedItemId: "A" }],
      rounds,
      joinedAtRound: 2,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects late joiner pick with item not in actual slots", () => {
    const rounds: Round[] = [
      {
        roundNumber: 1,
        matches: [
          { id: "m1", matchNumber: 1, status: "COMPLETE", slots: makeSlots(["A", "B"]) },
          { id: "m2", matchNumber: 2, status: "COMPLETE", slots: makeSlots(["C", "D"]) },
        ],
      },
      {
        roundNumber: 2,
        matches: [
          { id: "m3", matchNumber: 1, status: "PENDING", slots: makeSlots(["A", "C"]) },
        ],
      },
    ];

    const result = validateBracketPicks({
      picks: [{ matchId: "m3", pickedItemId: "B" }], // B lost in R1
      rounds,
      joinedAtRound: 2,
    });
    expect(result.valid).toBe(false);
  });

  it("accepts late joiner at round 2 with cascading round 3", () => {
    // 8-item bracket, joining at round 2
    // Round 2 has real slots, round 3 cascades from R2 picks
    const rounds: Round[] = [
      {
        roundNumber: 1,
        matches: [
          { id: "m1", matchNumber: 1, status: "COMPLETE", slots: makeSlots(["A", "H"]) },
          { id: "m2", matchNumber: 2, status: "COMPLETE", slots: makeSlots(["E", "D"]) },
          { id: "m3", matchNumber: 3, status: "COMPLETE", slots: makeSlots(["C", "F"]) },
          { id: "m4", matchNumber: 4, status: "COMPLETE", slots: makeSlots(["G", "B"]) },
        ],
      },
      {
        roundNumber: 2,
        matches: [
          { id: "m5", matchNumber: 1, status: "PENDING", slots: makeSlots(["A", "E"]) },
          { id: "m6", matchNumber: 2, status: "PENDING", slots: makeSlots(["C", "G"]) },
        ],
      },
      {
        roundNumber: 3,
        matches: [{ id: "m7", matchNumber: 1, status: "PENDING", slots: [] }],
      },
    ];

    const result = validateBracketPicks({
      picks: [
        { matchId: "m5", pickedItemId: "A" },
        { matchId: "m6", pickedItemId: "C" },
        { matchId: "m7", pickedItemId: "A" }, // A cascades from m5
      ],
      rounds,
      joinedAtRound: 2,
    });
    expect(result.valid).toBe(true);
  });
});
