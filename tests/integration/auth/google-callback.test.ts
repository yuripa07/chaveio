import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { testPrisma, resetDb } from "../helpers";
import { FLOW_COOKIE, issueFlowToken } from "@/lib/oauth-flow-cookie";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const { mockExchange } = vi.hoisted(() => ({
  mockExchange: vi.fn(),
}));

vi.mock("@/lib/oauth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/oauth")>("@/lib/oauth");
  return { ...actual, exchangeGoogleCodeForUser: mockExchange };
});

beforeEach(async () => {
  await resetDb();
  mockExchange.mockReset();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function callCallback(opts: {
  code?: string | null;
  state?: string | null;
  flowCookie?: string | null;
}) {
  const params = new URLSearchParams();
  if (opts.code !== null && opts.code !== undefined) params.set("code", opts.code);
  if (opts.state !== null && opts.state !== undefined) params.set("state", opts.state);
  const url = `http://localhost/api/auth/google/callback?${params.toString()}`;
  const headers: Record<string, string> = {};
  if (opts.flowCookie) headers.Cookie = `${FLOW_COOKIE}=${opts.flowCookie}`;
  const { GET } = await import("@/app/api/auth/google/callback/route");
  return GET(new NextRequest(url, { headers }));
}

function extractSessionCookieValue(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

describe("GET /api/auth/google/callback", () => {
  it("redirects to /?auth_error=invalid_callback when code or state is missing", async () => {
    const res1 = await callCallback({ code: "abc", state: null });
    expect(res1.status).toBe(307);
    expect(res1.headers.get("location")).toContain("auth_error=invalid_callback");

    const res2 = await callCallback({ code: null, state: "xyz" });
    expect(res2.headers.get("location")).toContain("auth_error=invalid_callback");
  });

  it("redirects to /?auth_error=flow_expired when flow cookie is missing", async () => {
    const res = await callCallback({ code: "abc", state: "state-x" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("auth_error=flow_expired");
  });

  it("redirects to /?auth_error=flow_expired when state does not match cookie (tampered state)", async () => {
    const flowCookie = await issueFlowToken({
      state: "real-state",
      codeVerifier: "verifier-abc",
      returnTo: "/",
    });
    const res = await callCallback({
      code: "abc",
      state: "attacker-state",
      flowCookie,
    });
    expect(res.headers.get("location")).toContain("auth_error=flow_expired");
  });

  it("creates a new user, sets session cookie, and redirects to returnTo", async () => {
    mockExchange.mockResolvedValueOnce({
      sub: "google-123",
      email: "new@example.com",
      email_verified: true,
      name: "New User",
      picture: "https://example.com/p.png",
      locale: "pt-BR",
    });
    const flowCookie = await issueFlowToken({
      state: "state-new",
      codeVerifier: "verifier-new",
      returnTo: "/tournament/ABC123",
    });

    const res = await callCallback({
      code: "auth-code",
      state: "state-new",
      flowCookie,
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/tournament/ABC123");

    const sessionCookie = extractSessionCookieValue(res);
    expect(sessionCookie).toBeTruthy();

    const payload = await verifySession(sessionCookie!);
    const user = await testPrisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
    });
    expect(user.googleSub).toBe("google-123");
    expect(user.email).toBe("new@example.com");
    expect(user.emailVerified).toBe(true);
    expect(user.name).toBe("New User");
    expect(user.avatarUrl).toBe("https://example.com/p.png");
    expect(user.locale).toBe("pt-BR");
    expect(user.lastLoginAt).toBeInstanceOf(Date);
  });

  it("updates an existing user on repeated sign-in", async () => {
    await testPrisma.user.create({
      data: {
        googleSub: "google-existing",
        email: "old@example.com",
        emailVerified: false,
        name: "Old Name",
      },
    });
    mockExchange.mockResolvedValueOnce({
      sub: "google-existing",
      email: "new-email@example.com",
      email_verified: true,
      name: "New Name",
      picture: "https://example.com/new.png",
      locale: "en",
    });
    const flowCookie = await issueFlowToken({
      state: "state-existing",
      codeVerifier: "verifier-existing",
      returnTo: "/",
    });

    const res = await callCallback({
      code: "auth-code-2",
      state: "state-existing",
      flowCookie,
    });
    expect(res.status).toBe(307);

    const user = await testPrisma.user.findUniqueOrThrow({
      where: { googleSub: "google-existing" },
    });
    expect(user.email).toBe("new-email@example.com");
    expect(user.emailVerified).toBe(true);
    expect(user.name).toBe("New Name");
    expect(user.avatarUrl).toBe("https://example.com/new.png");
    expect(user.locale).toBe("en");

    const users = await testPrisma.user.findMany();
    expect(users).toHaveLength(1);
  });

  it("redirects to /?auth_error=oauth_failed when code exchange throws", async () => {
    mockExchange.mockRejectedValueOnce(new Error("invalid code"));
    const flowCookie = await issueFlowToken({
      state: "state-fail",
      codeVerifier: "verifier-fail",
      returnTo: "/",
    });

    const res = await callCallback({
      code: "bad-code",
      state: "state-fail",
      flowCookie,
    });
    expect(res.headers.get("location")).toContain("auth_error=oauth_failed");
  });
});
