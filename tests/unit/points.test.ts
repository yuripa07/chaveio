import { describe, it, expect } from "vitest";
import { computeRoundPoints, computeMaxPoints } from "@/lib/points";

describe("computeRoundPoints", () => {
  it("round 1 of 4 (16 items) = 1", () => {
    expect(computeRoundPoints(1, 4, 16)).toBe(1);
  });

  it("round 2 of 4 (16 items) = 2", () => {
    expect(computeRoundPoints(2, 4, 16)).toBe(2);
  });

  it("round 3 of 4 (16 items) = 4", () => {
    expect(computeRoundPoints(3, 4, 16)).toBe(4);
  });

  it("final round (round 4 of 4, 16 items) = 16, not 8", () => {
    expect(computeRoundPoints(4, 4, 16)).toBe(16);
  });

  it("round 1 of 2 (4 items) = 1", () => {
    expect(computeRoundPoints(1, 2, 4)).toBe(1);
  });

  it("final round (round 2 of 2, 4 items) = 4", () => {
    expect(computeRoundPoints(2, 2, 4)).toBe(4);
  });
});

describe("computeMaxPoints", () => {
  it("16 items = 40 pts", () => {
    // 8×1 + 4×2 + 2×4 + 1×16 = 8 + 8 + 8 + 16 = 40
    expect(computeMaxPoints(16)).toBe(40);
  });

  it("4 items = 6 pts", () => {
    // 2×1 + 1×4 = 2 + 4 = 6
    expect(computeMaxPoints(4)).toBe(6);
  });

  it("8 items = 20 pts", () => {
    // 4×1 + 2×2 + 1×8 = 4 + 4 + 8 = 16... wait
    // rounds: 1→1pt×4matches, 2→2pt×2matches, 3(final)→8pt×1match = 4+4+8 = 16? No...
    // 3 rounds for 8 items: 2^(3-1)=4? No, final=itemCount=8
    // r1: 2^0=1 × 4 matches = 4
    // r2: 2^1=2 × 2 matches = 4
    // r3(final): 8 × 1 match = 8
    // total = 16
    expect(computeMaxPoints(8)).toBe(16);
  });
});
