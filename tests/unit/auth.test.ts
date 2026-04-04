import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  signToken,
  verifyToken,
  requireParticipant,
  requireCreator,
  AuthError,
} from "@/lib/auth";

const basePayload = { participantId: "p1", tournamentId: "t1", isCreator: false };

function makeReq(token?: string): NextRequest {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  return new NextRequest("http://localhost/test", { method: "GET", headers });
}

describe("signToken / verifyToken", () => {
  it("round-trips a token payload", async () => {
    const token = await signToken(basePayload);
    const decoded = await verifyToken(token);
    expect(decoded.participantId).toBe("p1");
    expect(decoded.tournamentId).toBe("t1");
    expect(decoded.isCreator).toBe(false);
  });

  it("verifyToken throws on a tampered token", async () => {
    await expect(verifyToken("not.a.valid.token")).rejects.toThrow();
  });
});

describe("AuthError", () => {
  it("carries message and status", () => {
    const e = new AuthError("Forbidden", 403);
    expect(e.message).toBe("Forbidden");
    expect(e.status).toBe(403);
    expect(e.name).toBe("AuthError");
    expect(e).toBeInstanceOf(Error);
  });
});

describe("requireParticipant", () => {
  it("returns payload for a valid token", async () => {
    const token = await signToken(basePayload);
    const result = await requireParticipant(makeReq(token));
    expect(result.participantId).toBe("p1");
  });

  it("throws AuthError 401 when token is missing", async () => {
    await expect(requireParticipant(makeReq())).rejects.toMatchObject({
      status: 401,
    });
  });

  it("throws AuthError 401 for an invalid token", async () => {
    await expect(requireParticipant(makeReq("bad.token.value"))).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("requireCreator", () => {
  it("returns payload for a creator token", async () => {
    const token = await signToken({ ...basePayload, isCreator: true });
    const result = await requireCreator(makeReq(token));
    expect(result.isCreator).toBe(true);
  });

  it("throws AuthError 403 for a non-creator token", async () => {
    const token = await signToken(basePayload); // isCreator: false
    await expect(requireCreator(makeReq(token))).rejects.toMatchObject({
      status: 403,
    });
  });
});
