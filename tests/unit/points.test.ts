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

  it("8 items = 16 pts", () => {
    // r1: 1pt × 4 = 4; r2: 2pt × 2 = 4; r3(final): 8pt × 1 = 8 → total = 16
    expect(computeMaxPoints(8)).toBe(16);
  });

  it("32 items = 96 pts", () => {
    // r1: 1pt × 16 = 16
    // r2: 2pt × 8  = 16
    // r3: 4pt × 4  = 16
    // r4: 8pt × 2  = 16
    // r5(final): 32pt × 1 = 32
    // total = 96
    expect(computeMaxPoints(32)).toBe(96);
  });
});
