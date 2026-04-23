import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  createUserAndSession,
  joinTournament,
  startTournament,
  setWinner,
  submitFullBracketPicks,
} from "./fixtures";
import { SESSION_COOKIE } from "@/lib/session";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /api/tournaments/[code]/join", () => {
  it("returns 401 when no session cookie is present", async () => {
    const { code } = await createTournament();
    const { POST } = await import("@/app/api/tournaments/[code]/join/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/tournaments/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when session cookie is tampered", async () => {
    const { code } = await createTournament();
    const { POST } = await import("@/app/api/tournaments/[code]/join/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/tournaments/${code}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE}=garbage.jwt.value`,
        },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(401);
  });

  it("creates a new linked participant on first join", async () => {
    const { code } = await createTournament({ userName: "Alice" });
    const bob = await createUserAndSession({ name: "Bob" });

    const { response, token } = await joinTournament(code, { session: bob });
    expect(response.status).toBe(201);
    expect(token).toBeTruthy();

    const participant = await testPrisma.participant.findFirstOrThrow({
      where: { userId: bob.userId },
    });
    expect(participant.displayName).toBe("Bob");
    expect(participant.isCreator).toBe(false);
  });

  it("returns the same participant on re-join (200, same participantId)", async () => {
    const { code } = await createTournament();
    const bob = await createUserAndSession({ name: "Bob" });

    const first = await joinTournament(code, { session: bob });
    expect(first.response.status).toBe(201);

    const second = await joinTournament(code, { session: bob });
    expect(second.response.status).toBe(200);

    const count = await testPrisma.participant.count({
      where: { userId: bob.userId },
    });
    expect(count).toBe(1);
  });

  it("auto-suffixes display name collisions", async () => {
    const { code } = await createTournament({ userName: "Alice" });
    const dup1 = await createUserAndSession({ name: "Alice" });
    const dup2 = await createUserAndSession({ name: "Alice" });

    const r1 = await joinTournament(code, { session: dup1 });
    const r2 = await joinTournament(code, { session: dup2 });
    expect(r1.response.status).toBe(201);
    expect(r2.response.status).toBe(201);

    const names = (
      await testPrisma.participant.findMany({
        where: { tournament: { code } },
        orderBy: { displayName: "asc" },
      })
    ).map((p) => p.displayName);
    expect(names).toEqual(["Alice", "Alice 2", "Alice 3"]);
  });

  it("rejects new participants after tournament is FINISHED", async () => {
    const { code, sessionCookie, token } = await createTournament();
    await submitFullBracketPicks(token, code);
    await startTournament(code, token);

    const t = await testPrisma.tournament.findUniqueOrThrow({
      where: { code },
      include: {
        rounds: {
          orderBy: { roundNumber: "asc" },
          include: { matches: { include: { slots: true } } },
        },
      },
    });
    for (const round of t.rounds) {
      for (const match of round.matches) {
        const fresh = await testPrisma.match.findUniqueOrThrow({
          where: { id: match.id },
          include: { slots: true },
        });
        if (fresh.slots.length > 0) {
          await setWinner(code, fresh.id, fresh.slots[0].itemId, token);
        }
      }
    }

    const late = await createUserAndSession({ name: "Late" });
    const { response } = await joinTournament(code, { session: late });
    expect(response.status).toBe(403);
    void sessionCookie;
  });

  it("sets joinedAtRound for late joiners to the active round", async () => {
    const { code, token } = await createTournament();
    const bob = await createUserAndSession({ name: "Bob" });
    const { token: bobToken } = await joinTournament(code, { session: bob });

    await submitFullBracketPicks(token, code);
    await submitFullBracketPicks(bobToken!, code);
    await startTournament(code, token);

    const eve = await createUserAndSession({ name: "Eve" });
    const { response: eveJoin } = await joinTournament(code, { session: eve });
    expect(eveJoin.status).toBe(201);

    const participant = await testPrisma.participant.findFirstOrThrow({
      where: { userId: eve.userId },
    });
    expect(participant.joinedAtRound).toBe(1);
    expect(participant.hasSubmittedPicks).toBe(false);
  });

  it("ignores body fields — displayName comes from the authenticated user", async () => {
    const { code } = await createTournament({ userName: "Alice" });
    const bob = await createUserAndSession({ name: "Bob" });

    const { POST } = await import("@/app/api/tournaments/[code]/join/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/tournaments/${code}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE}=${bob.sessionCookie}`,
        },
        body: JSON.stringify({ displayName: "Imposter" }),
      }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(201);

    const participant = await testPrisma.participant.findFirstOrThrow({
      where: { userId: bob.userId },
    });
    expect(participant.displayName).toBe("Bob");
  });
});
