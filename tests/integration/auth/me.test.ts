import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { testPrisma, resetDb } from "../helpers";
import { SESSION_COOKIE, signSession } from "@/lib/session";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function callMe(sessionCookie?: string) {
  const { GET } = await import("@/app/api/auth/me/route");
  const headers: Record<string, string> = {};
  if (sessionCookie) headers.Cookie = `${SESSION_COOKIE}=${sessionCookie}`;
  return GET(new NextRequest("http://localhost/api/auth/me", { headers }));
}

describe("GET /api/auth/me", () => {
  it("returns { user: null } when no session cookie", async () => {
    const res = await callMe();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it("returns { user: null } when session cookie is tampered", async () => {
    const res = await callMe("not-a-real-jwt");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it("returns the user when session is valid", async () => {
    const user = await testPrisma.user.create({
      data: {
        googleSub: "sub-alice",
        email: "alice@example.com",
        emailVerified: true,
        name: "Alice",
        avatarUrl: "https://example.com/alice.png",
      },
    });
    const cookie = await signSession({ userId: user.id });

    const res = await callMe(cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({
      id: user.id,
      email: "alice@example.com",
      name: "Alice",
      avatarUrl: "https://example.com/alice.png",
      tier: "FREE",
    });
  });

  it("returns { user: null } when the session points at a deleted user", async () => {
    const cookie = await signSession({ userId: "nonexistent-user-id" });
    const res = await callMe(cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });
});
