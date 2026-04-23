import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  issueFlowToken,
  consumeFlow,
  sanitizeReturnTo,
  FLOW_COOKIE,
} from "@/lib/oauth-flow-cookie";
import { AuthError } from "@/lib/auth";

function reqWithCookie(cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest("http://localhost/", { headers });
}

describe("oauth-flow-cookie", () => {
  describe("sanitizeReturnTo", () => {
    it("accepts root and tournament paths", () => {
      expect(sanitizeReturnTo("/")).toBe("/");
      expect(sanitizeReturnTo("/tournament")).toBe("/tournament");
      expect(sanitizeReturnTo("/tournament/ABC234")).toBe("/tournament/ABC234");
    });

    it("falls back to / for disallowed paths", () => {
      expect(sanitizeReturnTo("https://evil.com")).toBe("/");
      expect(sanitizeReturnTo("//evil.com")).toBe("/");
      expect(sanitizeReturnTo("/api/something")).toBe("/");
      expect(sanitizeReturnTo("/tournament/ABC234/bracket")).toBe("/");
      expect(sanitizeReturnTo(null)).toBe("/");
      expect(sanitizeReturnTo(undefined)).toBe("/");
      expect(sanitizeReturnTo("")).toBe("/");
    });
  });

  describe("issueFlowToken / consumeFlow", () => {
    it("round-trips state and returns verifier + returnTo", async () => {
      const token = await issueFlowToken({
        state: "s1",
        codeVerifier: "v1",
        returnTo: "/tournament/ABC234",
      });
      const result = await consumeFlow(
        reqWithCookie(`${FLOW_COOKIE}=${token}`),
        "s1"
      );
      expect(result.codeVerifier).toBe("v1");
      expect(result.returnTo).toBe("/tournament/ABC234");
    });

    it("throws when cookie is missing", async () => {
      await expect(consumeFlow(reqWithCookie(), "s1")).rejects.toBeInstanceOf(AuthError);
    });

    it("throws when state from query does not match cookie state", async () => {
      const token = await issueFlowToken({ state: "s1", codeVerifier: "v1", returnTo: "/" });
      await expect(
        consumeFlow(reqWithCookie(`${FLOW_COOKIE}=${token}`), "s2")
      ).rejects.toBeInstanceOf(AuthError);
    });

    it("throws when cookie signature is tampered", async () => {
      const token = await issueFlowToken({ state: "s1", codeVerifier: "v1", returnTo: "/" });
      const tampered = token.slice(0, -5) + "xxxxx";
      await expect(
        consumeFlow(reqWithCookie(`${FLOW_COOKIE}=${tampered}`), "s1")
      ).rejects.toBeInstanceOf(AuthError);
    });
  });
});
