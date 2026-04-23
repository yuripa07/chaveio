import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  createGoogleTournament,
  createUserAndSession,
  joinTournament,
  linkGoogleToParticipant,
} from "./fixtures";
import { SESSION_COOKIE } from "@/lib/session";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function rawLink(
  code: string,
  opts: { sessionCookie?: string; body?: unknown }
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.sessionCookie) headers.Cookie = `${SESSION_COOKIE}=${opts.sessionCookie}`;
  const { POST } = await import("@/app/api/tournaments/[code]/link-google/route");
  return POST(
    new NextRequest(`http://localhost/api/tournaments/${code}/link-google`, {
      method: "POST",
      headers,
      body: JSON.stringify(opts.body ?? {}),
    }),
    { params: Promise.resolve({ code }) }
  );
}

describe("POST /api/tournaments/[code]/link-google", () => {
  it("links a password participant to a Google user and returns a tournament token", async () => {
    const createRes = await createTournament({
      items: ["A", "B", "C", "D"],
      creatorPassword: "pass123",
    });
    const { code } = await createRes.json();
    await joinTournament(code, { displayName: "Bob", password: "pass123" });

    const bobSession = await createUserAndSession({ name: "Bob" });
    const res = await linkGoogleToParticipant(code, {
      sessionCookie: bobSession.sessionCookie,
      displayName: "Bob",
      password: "pass123",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();

    const participant = await testPrisma.participant.findFirstOrThrow({
      where: { displayName: "Bob" },
    });
    expect(participant.userId).toBe(bobSession.userId);
  });

  it("returns 401 without a session", async () => {
    const createRes = await createTournament({ items: ["A", "B", "C", "D"] });
    const { code } = await createRes.json();
    await joinTournament(code, { displayName: "Bob", password: "pass123" });

    const res = await rawLink(code, {
      body: { displayName: "Bob", password: "pass123" },
    });
    expect(res.status).toBe(401);
  });

  // Two-case auth test per docs/backend-conventions.md §8:
  // 1) participant already exists (re-auth path) with wrong password
  // 2) participant newly arrived with wrong password (still existing in DB but
  //    different call site shape) — here the guard is bcrypt.compare against the
  //    tournament's passwordHash, identical behavior for both cases.
  it("returns 401 with wrong password when linking to an existing (unlinked) participant", async () => {
    const createRes = await createTournament({
      items: ["A", "B", "C", "D"],
      creatorPassword: "correct-pw",
    });
    const { code } = await createRes.json();
    await joinTournament(code, { displayName: "Bob", password: "correct-pw" });

    const bobSession = await createUserAndSession({ name: "Bob" });
    const res = await linkGoogleToParticipant(code, {
      sessionCookie: bobSession.sessionCookie,
      displayName: "Bob",
      password: "wrong-pw",
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong password on first-time link attempt (participant not yet joined)", async () => {
    const createRes = await createTournament({
      items: ["A", "B", "C", "D"],
      creatorPassword: "correct-pw",
    });
    const { code } = await createRes.json();

    const bobSession = await createUserAndSession({ name: "Bob" });
    const res = await linkGoogleToParticipant(code, {
      sessionCookie: bobSession.sessionCookie,
      displayName: "NotYetJoined",
      password: "wrong-pw",
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when no participant matches the displayName (even with correct password)", async () => {
    const createRes = await createTournament({
      items: ["A", "B", "C", "D"],
      creatorPassword: "pass123",
    });
    const { code } = await createRes.json();

    const bobSession = await createUserAndSession({ name: "Bob" });
    const res = await linkGoogleToParticipant(code, {
      sessionCookie: bobSession.sessionCookie,
      displayName: "Ghost",
      password: "pass123",
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when participant is already linked to a different account", async () => {
    const createRes = await createTournament({
      items: ["A", "B", "C", "D"],
      creatorPassword: "pass123",
    });
    const { code } = await createRes.json();
    await joinTournament(code, { displayName: "Bob", password: "pass123" });

    const firstSession = await createUserAndSession({ name: "Bob" });
    const ok = await linkGoogleToParticipant(code, {
      sessionCookie: firstSession.sessionCookie,
      displayName: "Bob",
      password: "pass123",
    });
    expect(ok.status).toBe(200);

    const otherSession = await createUserAndSession({ name: "Bob Other" });
    const res = await linkGoogleToParticipant(code, {
      sessionCookie: otherSession.sessionCookie,
      displayName: "Bob",
      password: "pass123",
    });
    expect(res.status).toBe(409);
  });

  it("is idempotent: linking the same user to the same participant twice succeeds", async () => {
    const createRes = await createTournament({
      items: ["A", "B", "C", "D"],
      creatorPassword: "pass123",
    });
    const { code } = await createRes.json();
    await joinTournament(code, { displayName: "Bob", password: "pass123" });

    const bobSession = await createUserAndSession({ name: "Bob" });
    const r1 = await linkGoogleToParticipant(code, {
      sessionCookie: bobSession.sessionCookie,
      displayName: "Bob",
      password: "pass123",
    });
    expect(r1.status).toBe(200);
    const r2 = await linkGoogleToParticipant(code, {
      sessionCookie: bobSession.sessionCookie,
      displayName: "Bob",
      password: "pass123",
    });
    expect(r2.status).toBe(200);
  });

  it("rejects linking on a GOOGLE-mode tournament with 400", async () => {
    const { code } = await createGoogleTournament();
    const someone = await createUserAndSession({ name: "Outsider" });
    const res = await linkGoogleToParticipant(code, {
      sessionCookie: someone.sessionCookie,
      displayName: "Alice",
      password: "irrelevant",
    });
    expect(res.status).toBe(400);
  });

  it("rejects when the same account is already linked to another participant in this tournament", async () => {
    const createRes = await createTournament({
      items: ["A", "B", "C", "D"],
      creatorPassword: "pass123",
    });
    const { code } = await createRes.json();
    await joinTournament(code, { displayName: "Bob", password: "pass123" });
    await joinTournament(code, { displayName: "Charlie", password: "pass123" });

    const session = await createUserAndSession({ name: "Duplicate" });
    const r1 = await linkGoogleToParticipant(code, {
      sessionCookie: session.sessionCookie,
      displayName: "Bob",
      password: "pass123",
    });
    expect(r1.status).toBe(200);
    const r2 = await linkGoogleToParticipant(code, {
      sessionCookie: session.sessionCookie,
      displayName: "Charlie",
      password: "pass123",
    });
    expect(r2.status).toBe(409);
  });
});
