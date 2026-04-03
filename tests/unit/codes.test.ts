import { describe, it, expect } from "vitest";
import { generateCode } from "@/lib/codes";

describe("generateCode", () => {
  it("returns exactly 6 characters", () => {
    expect(generateCode()).toHaveLength(6);
  });

  it("returns only uppercase URL-safe characters (no O, 0, I, 1)", () => {
    const ambiguous = new Set(["O", "0", "I", "1"]);
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      for (const char of code) {
        expect(ambiguous.has(char)).toBe(false);
      }
    }
  });

  it("generates different codes (not constant)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
