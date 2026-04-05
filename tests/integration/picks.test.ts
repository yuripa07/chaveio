import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  startTournament,
  setWinner,
  submitPicks,
  getPicks,
  submitFullBracketPicks,
} from "./fixtures";

afterAll(async () => {
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  await resetDb();
});

async function getBracket(code: string) {
  return testPrisma.tournament.findUniqueOrThrow({
    where: { code },
    include: {
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: { matches: { orderBy: { matchNumber: "asc" }, include: { slots: true } } },
      },
    },
  });
}

describe("POST /api/picks — full bracket submission", () => {
  it("accepts a valid full bracket and marks hasSubmittedPicks=true", async () => {
    const { code, token: creatorToken } = await createTournament().then((r) => r.json());
    const { token: bobToken } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    }).then((r) => r.json());

    const res = await submitFullBracketPicks(bobToken, code);
    expect(res.status).toBe(200);

    const participant = await testPrisma.participant.findFirst({
      where: { displayName: "Bob" },
    });
    expect(participant!.hasSubmittedPicks).toBe(true);

    void creatorToken;
  });

  it("rejects submission missing picks for some matches", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const { token } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    }).then((r) => r.json());

    const t = await getBracket(code);
    const r1Picks = t.rounds[0].matches.map((m) => ({
      matchId: m.id,
      pickedItemId: m.slots[0].itemId,
    }));

    const res = await submitPicks(token, { tournamentCode: code, picks: r1Picks });
    expect(res.status).toBe(400);
  });

  it("rejects pick with item not in round-1 match slots", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const { token } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    }).then((r) => r.json());

    const t = await getBracket(code);
    const r1 = t.rounds[0];
    const r2 = t.rounds[1];

    const picks = [
      { matchId: r1.matches[0].id, pickedItemId: "nonexistent-id" },
      { matchId: r1.matches[1].id, pickedItemId: r1.matches[1].slots[0].itemId },
      { matchId: r2.matches[0].id, pickedItemId: r1.matches[1].slots[0].itemId },
    ];

    const res = await submitPicks(token, { tournamentCode: code, picks });
    expect(res.status).toBe(400);
  });

  it("rejects cascade violation in round 2", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const { token } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    }).then((r) => r.json());

    const t = await getBracket(code);
    const r1 = t.rounds[0];
    const r2 = t.rounds[1];

    const picks = [
      { matchId: r1.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId },
      { matchId: r1.matches[1].id, pickedItemId: r1.matches[1].slots[0].itemId },
      { matchId: r2.matches[0].id, pickedItemId: r1.matches[0].slots[1].itemId },
    ];

    const res = await submitPicks(token, { tournamentCode: code, picks });
    expect(res.status).toBe(400);
  });

  it("resubmission in LOBBY overwrites picks", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const { token } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    }).then((r) => r.json());

    const t = await getBracket(code);
    const r1 = t.rounds[0];
    const r2 = t.rounds[1];

    const firstPicks = [
      { matchId: r1.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId },
      { matchId: r1.matches[1].id, pickedItemId: r1.matches[1].slots[0].itemId },
      { matchId: r2.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId },
    ];
    await submitPicks(token, { tournamentCode: code, picks: firstPicks });

    const secondPicks = [
      { matchId: r1.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId },
      { matchId: r1.matches[1].id, pickedItemId: r1.matches[1].slots[0].itemId },
      { matchId: r2.matches[0].id, pickedItemId: r1.matches[1].slots[0].itemId },
    ];
    const res = await submitPicks(token, { tournamentCode: code, picks: secondPicks });
    expect(res.status).toBe(200);

    const dbPicks = await testPrisma.pick.findMany({
      where: { match: { roundId: r2.matches[0].roundId } },
    });
    expect(dbPicks[0].pickedItemId).toBe(r1.matches[1].slots[0].itemId);
  });

  it("creator can also submit picks", async () => {
    const { code, token: creatorToken } = await createTournament().then((r) => r.json());
    const res = await submitFullBracketPicks(creatorToken, code);
    expect(res.status).toBe(200);

    const creator = await testPrisma.participant.findFirst({ where: { isCreator: true } });
    expect(creator!.hasSubmittedPicks).toBe(true);
  });
});

describe("POST /api/picks — additional guards", () => {
  it("returns 409 when trying to submit picks after tournament is FINISHED", async () => {
    const { code, token: creatorToken } = await createTournament().then((r) => r.json());
    await submitFullBracketPicks(creatorToken, code);
    await startTournament(code, creatorToken);

    const t = await getBracket(code);
    for (const round of t.rounds) {
      for (const match of round.matches) {
        const fresh = await testPrisma.match.findUniqueOrThrow({
          where: { id: match.id },
          include: { slots: true },
        });
        if (fresh.slots.length > 0) {
          await setWinner(code, fresh.id, fresh.slots[0].itemId, creatorToken);
        }
      }
    }

    const res = await submitFullBracketPicks(creatorToken, code);
    expect(res.status).toBe(409);
  });

  it("returns 404 when tournamentCode in body belongs to a different tournament", async () => {
    const { code: code1 } = await createTournament().then((r) => r.json());
    const { code: code2, token: strangerToken } = await createTournament({
      name: "Other",
      items: ["W", "X", "Y", "Z"],
      creatorName: "Stranger",
      creatorPassword: "pw",
    }).then((r) => r.json());

    const res = await submitPicks(strangerToken, { tournamentCode: code1, picks: [] });
    expect(res.status).toBe(404);

    void code2;
  });
});

describe("GET /api/picks", () => {
  it("returns only the requester's picks", async () => {
    const { code, token: creatorToken } = await createTournament().then((r) => r.json());
    const { token: bobToken } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    }).then((r) => r.json());
    const { token: aliceToken } = await joinTournament(code, {
      displayName: "Alice2",
      password: "pass123",
    }).then((r) => r.json());

    await submitFullBracketPicks(bobToken, code);
    await submitFullBracketPicks(aliceToken, code);

    const t = await getBracket(code);
    const totalMatches = t.rounds.reduce((sum, r) => sum + r.matches.length, 0);

    const res = await getPicks(bobToken, code);
    expect(res.status).toBe(200);
    const { picks } = await res.json();
    expect(picks).toHaveLength(totalMatches);

    void creatorToken;
  });

  it("returns 400 when tournamentCode query param is missing", async () => {
    const { token } = await createTournament().then((r) => r.json());
    const { GET } = await import("@/app/api/picks/route");
    const { NextRequest } = await import("next/server");
    const res = await GET(
      new NextRequest("http://localhost/api/picks", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 without token", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const res = await getPicks(null as unknown as string, code);
    expect(res.status).toBe(401);
  });
});
