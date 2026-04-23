import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  signSession,
  verifySession,
  requireUser,
  getOptionalUser,
  SESSION_COOKIE,
} from "@/lib/session";
import { AuthError } from "@/lib/auth";

function reqWithCookie(cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest("http://localhost/", { headers });
}

describe("session", () => {
  describe("signSession / verifySession", () => {
    it("round-trips a user payload with version", async () => {
      const token = await signSession({ userId: "user-123" });
      const payload = await verifySession(token);
      expect(payload.userId).toBe("user-123");
      expect(payload.v).toBe(1);
    });

    it("rejects a tampered token", async () => {
      const token = await signSession({ userId: "user-123" });
      const tampered = token.slice(0, -5) + "aaaaa";
      await expect(verifySession(tampered)).rejects.toThrow();
    });
  });

  describe("requireUser", () => {
    it("returns payload when a valid cookie is present", async () => {
      const token = await signSession({ userId: "user-abc" });
      const payload = await requireUser(reqWithCookie(`${SESSION_COOKIE}=${token}`));
      expect(payload.userId).toBe("user-abc");
    });

    it("throws AuthError when cookie is missing", async () => {
      await expect(requireUser(reqWithCookie())).rejects.toBeInstanceOf(AuthError);
    });

    it("throws AuthError when cookie is tampered", async () => {
      const token = await signSession({ userId: "user-abc" });
      const tampered = token.slice(0, -5) + "xxxxx";
      await expect(
        requireUser(reqWithCookie(`${SESSION_COOKIE}=${tampered}`))
      ).rejects.toBeInstanceOf(AuthError);
    });
  });

  describe("getOptionalUser", () => {
    it("returns null when cookie is missing", async () => {
      expect(await getOptionalUser(reqWithCookie())).toBeNull();
    });

    it("returns null when cookie is invalid", async () => {
      expect(await getOptionalUser(reqWithCookie(`${SESSION_COOKIE}=not-a-jwt`))).toBeNull();
    });

    it("returns the payload when cookie is valid", async () => {
      const token = await signSession({ userId: "user-def" });
      const payload = await getOptionalUser(reqWithCookie(`${SESSION_COOKIE}=${token}`));
      expect(payload?.userId).toBe("user-def");
    });
  });
});
