import { describe, it, expect } from "vitest";
import { getStoredToken, setStoredToken } from "@/lib/token-storage";

// In the Node test environment localStorage is not available.
// The functions catch the ReferenceError and fall back gracefully.

describe("getStoredToken", () => {
  it("returns null when localStorage is unavailable", () => {
    expect(getStoredToken("ABC123")).toBeNull();
  });
});

describe("setStoredToken", () => {
  it("does not throw when localStorage is unavailable", () => {
    expect(() => setStoredToken("ABC123", "some-token")).not.toThrow();
  });
});
