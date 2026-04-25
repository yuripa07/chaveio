import { describe, it, expect } from "vitest";
import { resolveAuthGuardStatus, AUTH_GUARD_REASON } from "@/lib/auth-guard";

// Helper: call with all params for brevity in tests that focus on one dimension
function resolve(
  tokenReady: boolean,
  userReady: boolean,
  token: string | null,
  hasUser: boolean,
  isCreator: boolean,
  participantId: string | null,
  requireCreator: boolean
) {
  return resolveAuthGuardStatus(tokenReady, userReady, token, hasUser, isCreator, participantId, requireCreator);
}

describe("resolveAuthGuardStatus", () => {
  describe("when tokenReady is false", () => {
    it("returns ready: false with reason not-ready", () => {
      expect(resolve(false, true, null, false, false, null, false))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NOT_READY });
    });

    it("returns not-ready even if a token is present (SSR hydration safety)", () => {
      expect(resolve(false, true, "some-token", true, true, "pid", false))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NOT_READY });
    });
  });

  describe("when userReady is false", () => {
    it("returns ready: false with reason not-ready while session is loading", () => {
      expect(resolve(true, false, "some-token", false, false, "pid", false))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NOT_READY });
    });

    it("returns not-ready even when token and user will eventually be present", () => {
      expect(resolve(true, false, "some-token", true, true, "pid", false))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NOT_READY });
    });
  });

  describe("when tokenReady is true but token is null", () => {
    it("returns ready: false with reason no-token", () => {
      expect(resolve(true, true, null, true, false, null, false))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NO_TOKEN });
    });

    it("returns no-token even when requireCreator is true", () => {
      expect(resolve(true, true, null, true, false, null, true))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NO_TOKEN });
    });
  });

  describe("when user session is gone (logged out)", () => {
    it("returns no-token when token exists but user session is absent", () => {
      expect(resolve(true, true, "valid-token", false, false, "pid-1", false))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NO_TOKEN });
    });

    it("returns no-token for creator token without session", () => {
      expect(resolve(true, true, "creator-token", false, true, "pid-1", true))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NO_TOKEN });
    });
  });

  describe("when tokenReady is true and token exists", () => {
    it("returns ready: true for a participant (requireCreator: false)", () => {
      expect(resolve(true, true, "token-abc", true, false, "pid-1", false))
        .toEqual({ ready: true, token: "token-abc", isCreator: false, participantId: "pid-1" });
    });

    it("returns ready: true for a creator (requireCreator: false)", () => {
      expect(resolve(true, true, "token-abc", true, true, "pid-1", false))
        .toEqual({ ready: true, token: "token-abc", isCreator: true, participantId: "pid-1" });
    });
  });

  describe("requireCreator: true", () => {
    it("returns ready: false with reason not-creator when isCreator is false", () => {
      expect(resolve(true, true, "token-abc", true, false, "pid-1", true))
        .toEqual({ ready: false, reason: AUTH_GUARD_REASON.NOT_CREATOR });
    });

    it("returns ready: true when isCreator is true", () => {
      expect(resolve(true, true, "token-abc", true, true, "pid-1", true))
        .toEqual({ ready: true, token: "token-abc", isCreator: true, participantId: "pid-1" });
    });
  });
});
