import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";
import { handleRequest } from "@/lib/api-utils";

const basePayload = { participantId: "p1", tournamentId: "t1", isCreator: false };

function makeReq(token?: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new NextRequest("http://localhost/test", {
    method: body !== undefined ? "POST" : "GET",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("handleRequest — participant auth", () => {
  it("returns ok: true with payload for a valid token", async () => {
    const token = await signToken(basePayload);
    const result = await handleRequest(makeReq(token), "participant");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.participantId).toBe("p1");
  });

  it("returns ok: false with 401 for missing token", async () => {
    const result = await handleRequest(makeReq(), "participant");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });
});

describe("handleRequest — creator auth", () => {
  it("returns ok: true for a creator token", async () => {
    const token = await signToken({ ...basePayload, isCreator: true });
    const result = await handleRequest(makeReq(token), "creator");
    expect(result.ok).toBe(true);
  });

  it("returns ok: false with 403 for a non-creator token", async () => {
    const token = await signToken(basePayload);
    const result = await handleRequest(makeReq(token), "creator");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});

describe("handleRequest — parseBody", () => {
  it("returns parsed body when parseBody: true", async () => {
    const token = await signToken(basePayload);
    const result = await handleRequest<{ x: number }>(
      makeReq(token, { x: 42 }),
      "participant",
      { parseBody: true }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toEqual({ x: 42 });
  });

  it("returns ok: false with 400 for invalid JSON body", async () => {
    const token = await signToken(basePayload);
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "not-json",
    });
    const result = await handleRequest(req, "participant", { parseBody: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
