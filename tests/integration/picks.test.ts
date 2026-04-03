import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import { createTournament, joinTournament, submitPicks, getPicks } from "./fixtures";
import { generateFirstRoundPairs } from "@/lib/bracket";

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function setupTournamentWithBracket() {
  const createRes = await createTournament();
  const { code, token: creatorToken } = await createRes.json();

  const tournament = await testPrisma.tournament.findUnique({
    where: { code },
    include: { items: { orderBy: { seed: "asc" } } },
  });

  const items = tournament!.items;
  const pairs = generateFirstRoundPairs(items.length);

  // Create round 1
  const round = await testPrisma.round.create({
    data: {
      tournamentId: tournament!.id,
      roundNumber: 1,
      status: "ACTIVE",
      pointValue: 1,
    },
  });

  // Create matches + slots
  const matches = await Promise.all(
    pairs.map(async ([seed1, seed2], i) => {
      const item1 = items.find((it) => it.seed === seed1)!;
      const item2 = items.find((it) => it.seed === seed2)!;
      const match = await testPrisma.match.create({
        data: {
          tournamentId: tournament!.id,
          roundId: round.id,
          matchNumber: i + 1,
          slots: {
            create: [
              { itemId: item1.id, position: 1 },
              { itemId: item2.id, position: 2 },
            ],
          },
        },
        include: { slots: true },
      });
      return match;
    })
  );

  return { code, creatorToken, tournament: tournament!, items, matches };
}

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/picks", () => {
  it("submits picks and marks hasSubmittedPicks=true", async () => {
    const { code, matches } = await setupTournamentWithBracket();
    const { token } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass",
    }).then((r) => r.json());

    const picks = matches.map((m) => ({
      matchId: m.id,
      pickedItemId: m.slots[0].itemId,
    }));

    const res = await submitPicks(token, { tournamentCode: code, picks });
    expect(res.status).toBe(200);

    const participant = await testPrisma.participant.findFirst({
      where: { displayName: "Bob" },
    });
    expect(participant!.hasSubmittedPicks).toBe(true);
  });

  it("resubmitting picks is idempotent", async () => {
    const { code, matches } = await setupTournamentWithBracket();
    const { token } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass",
    }).then((r) => r.json());

    const picks = matches.map((m) => ({
      matchId: m.id,
      pickedItemId: m.slots[0].itemId,
    }));

    await submitPicks(token, { tournamentCode: code, picks });

    // Resubmit with different picks
    const newPicks = matches.map((m) => ({
      matchId: m.id,
      pickedItemId: m.slots[1].itemId,
    }));
    const res = await submitPicks(token, { tournamentCode: code, picks: newPicks });
    expect(res.status).toBe(200);

    const dbPicks = await testPrisma.pick.findMany({
      where: { match: { tournamentId: matches[0].tournamentId } },
    });
    // Each pick should be updated to the new choice
    for (const dp of dbPicks) {
      const expected = newPicks.find((p) => p.matchId === dp.matchId);
      expect(dp.pickedItemId).toBe(expected!.pickedItemId);
    }
  });
});

describe("GET /api/picks", () => {
  it("returns only the requester's picks", async () => {
    const { code, matches } = await setupTournamentWithBracket();
    const { token: bobToken } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass",
    }).then((r) => r.json());
    const { token: aliceToken } = await joinTournament(code, {
      displayName: "Alice",
      password: "pass",
    }).then((r) => r.json());

    const bobPicks = matches.map((m) => ({
      matchId: m.id,
      pickedItemId: m.slots[0].itemId,
    }));
    const alicePicks = matches.map((m) => ({
      matchId: m.id,
      pickedItemId: m.slots[1].itemId,
    }));
    await submitPicks(bobToken, { tournamentCode: code, picks: bobPicks });
    await submitPicks(aliceToken, { tournamentCode: code, picks: alicePicks });

    const res = await getPicks(bobToken, code);
    expect(res.status).toBe(200);
    const { picks } = await res.json();
    expect(picks).toHaveLength(matches.length);
    for (const p of picks) {
      const expected = bobPicks.find((bp) => bp.matchId === p.matchId);
      expect(p.pickedItemId).toBe(expected!.pickedItemId);
    }
  });
});
