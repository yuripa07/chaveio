import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import { createTournament, joinTournament, submitPicks, getPicks, submitFullBracketPicks } from "./fixtures";

afterAll(async () => {
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  await resetDb();
});

// Helper: get the bracket created at tournament creation
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
      password: "pass",
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
      password: "pass",
    }).then((r) => r.json());

    const t = await getBracket(code);
    // Submit only round-1 picks (missing final)
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
      password: "pass",
    }).then((r) => r.json());

    const t = await getBracket(code);
    const r1 = t.rounds[0];
    const r2 = t.rounds[1];

    const picks = [
      { matchId: r1.matches[0].id, pickedItemId: "nonexistent-id" }, // invalid
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
      password: "pass",
    }).then((r) => r.json());

    const t = await getBracket(code);
    const r1 = t.rounds[0];
    const r2 = t.rounds[1];

    const picks = [
      { matchId: r1.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId }, // picks slot[0]
      { matchId: r1.matches[1].id, pickedItemId: r1.matches[1].slots[0].itemId }, // picks slot[0]
      // Final pick uses slot[1] item from match[0] — that item was NOT picked as winner
      { matchId: r2.matches[0].id, pickedItemId: r1.matches[0].slots[1].itemId },
    ];

    const res = await submitPicks(token, { tournamentCode: code, picks });
    expect(res.status).toBe(400);
  });

  it("resubmission in LOBBY overwrites picks", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const { token } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass",
    }).then((r) => r.json());

    const t = await getBracket(code);
    const r1 = t.rounds[0];
    const r2 = t.rounds[1];

    // First submission: pick slot[0] everywhere
    const firstPicks = [
      { matchId: r1.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId },
      { matchId: r1.matches[1].id, pickedItemId: r1.matches[1].slots[0].itemId },
      { matchId: r2.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId },
    ];
    await submitPicks(token, { tournamentCode: code, picks: firstPicks });

    // Second submission: switch final pick (but still valid cascade)
    const secondPicks = [
      { matchId: r1.matches[0].id, pickedItemId: r1.matches[0].slots[0].itemId },
      { matchId: r1.matches[1].id, pickedItemId: r1.matches[1].slots[0].itemId },
      { matchId: r2.matches[0].id, pickedItemId: r1.matches[1].slots[0].itemId }, // switched
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

describe("GET /api/picks", () => {
  it("returns only the requester's picks", async () => {
    const { code, token: creatorToken } = await createTournament().then((r) => r.json());
    const { token: bobToken } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass",
    }).then((r) => r.json());
    const { token: aliceToken } = await joinTournament(code, {
      displayName: "Alice2",
      password: "pass",
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
});
