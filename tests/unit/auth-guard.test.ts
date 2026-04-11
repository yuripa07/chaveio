import { describe, it, expect } from "vitest";
import { resolveAuthGuardStatus } from "@/lib/auth-guard";

describe("resolveAuthGuardStatus", () => {
  describe("when tokenReady is false", () => {
    it("returns ready: false with reason not-ready", () => {
      const result = resolveAuthGuardStatus(false, null, false, null, false);
      expect(result).toEqual({ ready: false, reason: "not-ready" });
    });

    it("returns not-ready even if a token is present (SSR hydration safety)", () => {
      const result = resolveAuthGuardStatus(false, "some-token", true, "pid", false);
      expect(result).toEqual({ ready: false, reason: "not-ready" });
    });
  });

  describe("when tokenReady is true but token is null", () => {
    it("returns ready: false with reason no-token", () => {
      const result = resolveAuthGuardStatus(true, null, false, null, false);
      expect(result).toEqual({ ready: false, reason: "no-token" });
    });

    it("returns no-token even when requireCreator is true", () => {
      const result = resolveAuthGuardStatus(true, null, false, null, true);
      expect(result).toEqual({ ready: false, reason: "no-token" });
    });
  });

  describe("when tokenReady is true and token exists", () => {
    it("returns ready: true for a participant (requireCreator: false)", () => {
      const result = resolveAuthGuardStatus(true, "token-abc", false, "pid-1", false);
      expect(result).toEqual({
        ready: true,
        token: "token-abc",
        isCreator: false,
        participantId: "pid-1",
      });
    });

    it("returns ready: true for a creator (requireCreator: false)", () => {
      const result = resolveAuthGuardStatus(true, "token-abc", true, "pid-1", false);
      expect(result).toEqual({
        ready: true,
        token: "token-abc",
        isCreator: true,
        participantId: "pid-1",
      });
    });
  });

  describe("requireCreator: true", () => {
    it("returns ready: false with reason not-creator when isCreator is false", () => {
      const result = resolveAuthGuardStatus(true, "token-abc", false, "pid-1", true);
      expect(result).toEqual({ ready: false, reason: "not-creator" });
    });

    it("returns ready: true when isCreator is true", () => {
      const result = resolveAuthGuardStatus(true, "token-abc", true, "pid-1", true);
      expect(result).toEqual({
        ready: true,
        token: "token-abc",
        isCreator: true,
        participantId: "pid-1",
      });
    });
  });
});
