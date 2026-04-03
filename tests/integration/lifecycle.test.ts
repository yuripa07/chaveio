import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  startTournament,
  setWinner,
} from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function setup() {
  const { code, token: creatorToken } = await createTournament().then((r) =>
    r.json()
  );
  const { token: bobToken } = await joinTournament(code, {
    displayName: "Bob",
    password: "pass",
  }).then((r) => r.json());
  return { code, creatorToken, bobToken };
}

async function getTournamentFromDb(code: string) {
  return testPrisma.tournament.findUniqueOrThrow({
    where: { code },
    include: {
      rounds: { orderBy: { roundNumber: "asc" }, include: { matches: { include: { slots: true } } } },
    },
  });
}

// ── POST /api/tournaments/[code]/start ────────────────────────────────────

describe("POST /api/tournaments/[code]/start", () => {
  it("returns 403 for non-creator token", async () => {
    const { code, bobToken } = await setup();
    const res = await startTournament(code, bobToken);
    expect(res.status).toBe(403);
  });

  it("returns 409 if tournament already started", async () => {
    const { code, creatorToken } = await setup();
    await startTournament(code, creatorToken);
    const res = await startTournament(code, creatorToken);
    expect(res.status).toBe(409);
  });

  it("creates rounds and matches, sets tournament ACTIVE", async () => {
    const { code, creatorToken } = await setup();
    const res = await startTournament(code, creatorToken);
    expect(res.status).toBe(200);

    const t = await getTournamentFromDb(code);
    expect(t.status).toBe("ACTIVE");
    expect(t.startedAt).toBeTruthy();

    // 4 items → 2 rounds
    expect(t.rounds).toHaveLength(2);
    expect(t.rounds[0].status).toBe("ACTIVE");
    expect(t.rounds[1].status).toBe("PENDING");

    // Round 1: 2 matches with 2 slots each
    const r1 = t.rounds[0];
    expect(r1.matches).toHaveLength(2);
    for (const m of r1.matches) {
      expect(m.slots).toHaveLength(2);
    }

    // Round 2: 1 match with no slots yet
    const r2 = t.rounds[1];
    expect(r2.matches).toHaveLength(1);
    expect(r2.matches[0].slots).toHaveLength(0);
  });

  it("assigns correct point values to rounds", async () => {
    const { code, creatorToken } = await setup();
    await startTournament(code, creatorToken);

    const t = await getTournamentFromDb(code);
    // 4 items → round 1 = 1pt, round 2 (final) = 4pts
    expect(t.rounds[0].pointValue).toBe(1);
    expect(t.rounds[1].pointValue).toBe(4);
  });
});

// ── POST /api/tournaments/[code]/matches/[id]/winner ──────────────────────

describe("POST /api/tournaments/[code]/matches/[id]/winner", () => {
  async function startedSetup() {
    const { code, creatorToken, bobToken } = await setup();
    await startTournament(code, creatorToken);
    const t = await getTournamentFromDb(code);
    const r1Matches = t.rounds[0].matches;
    return { code, creatorToken, bobToken, t, r1Matches };
  }

  it("returns 403 for non-creator", async () => {
    const { code, bobToken, r1Matches } = await startedSetup();
    const match = r1Matches[0];
    const winnerId = match.slots[0].itemId;
    const res = await setWinner(code, match.id, winnerId, bobToken);
    expect(res.status).toBe(403);
  });

  it("returns 400 if winnerId not in match slots", async () => {
    const { code, creatorToken, r1Matches } = await startedSetup();
    const match = r1Matches[0];
    const res = await setWinner(code, match.id, "bad-id", creatorToken);
    expect(res.status).toBe(400);
  });

  it("marks match COMPLETE and sets winnerId", async () => {
    const { code, creatorToken, r1Matches } = await startedSetup();
    const match = r1Matches[0];
    const winnerId = match.slots[0].itemId;

    const res = await setWinner(code, match.id, winnerId, creatorToken);
    expect(res.status).toBe(200);

    const updated = await testPrisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(updated.status).toBe("COMPLETE");
    expect(updated.winnerId).toBe(winnerId);
  });

  it("scores picks correctly", async () => {
    const { code, creatorToken, t, r1Matches } = await startedSetup();
    const match = r1Matches[0];
    const correctItemId = match.slots[0].itemId;
    const wrongItemId = match.slots[1].itemId;

    // Get participants created during setup (creator = Alice, Bob joined)
    const participants = await testPrisma.participant.findMany({
      where: { tournamentId: t.id },
    });
    const alice = participants.find((p) => p.isCreator)!;
    const bob = participants.find((p) => !p.isCreator)!;

    // Insert picks directly (bypassing LOBBY-only restriction in picks API)
    await testPrisma.pick.createMany({
      data: [
        { participantId: bob.id, matchId: match.id, pickedItemId: correctItemId },
        { participantId: alice.id, matchId: match.id, pickedItemId: wrongItemId },
      ],
    });

    await setWinner(code, match.id, correctItemId, creatorToken);

    const picks = await testPrisma.pick.findMany({ where: { matchId: match.id } });
    const bobPick = picks.find((p) => p.pickedItemId === correctItemId)!;
    const alicePick = picks.find((p) => p.pickedItemId === wrongItemId)!;

    expect(bobPick.isCorrect).toBe(true);
    expect(bobPick.pointsEarned).toBe(1); // round 1 = 1pt
    expect(alicePick.isCorrect).toBe(false);
    expect(alicePick.pointsEarned).toBe(0);
  });

  it("advances winner to next round slot", async () => {
    const { code, creatorToken, r1Matches } = await startedSetup();
    const match = r1Matches[0];
    const winnerId = match.slots[0].itemId;

    await setWinner(code, match.id, winnerId, creatorToken);

    const t = await getTournamentFromDb(code);
    const r2Match = t.rounds[1].matches[0];
    expect(r2Match.slots).toHaveLength(1);
    expect(r2Match.slots[0].itemId).toBe(winnerId);
  });

  it("activates next round when all matches in current round complete", async () => {
    const { code, creatorToken, r1Matches } = await startedSetup();

    for (const match of r1Matches) {
      await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    }

    const t = await getTournamentFromDb(code);
    expect(t.rounds[0].status).toBe("COMPLETE");
    expect(t.rounds[1].status).toBe("ACTIVE");
  });

  it("finishes tournament when final match resolves", async () => {
    const { code, creatorToken, r1Matches } = await startedSetup();

    // Complete round 1
    for (const match of r1Matches) {
      await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    }

    // Complete round 2 (final)
    const t = await getTournamentFromDb(code);
    const finalMatch = t.rounds[1].matches[0];
    // fetch fresh slots after r1 completed
    const freshFinalMatch = await testPrisma.match.findUniqueOrThrow({
      where: { id: finalMatch.id },
      include: { slots: true },
    });
    await setWinner(code, finalMatch.id, freshFinalMatch.slots[0].itemId, creatorToken);

    const finished = await testPrisma.tournament.findUniqueOrThrow({ where: { code } });
    expect(finished.status).toBe("FINISHED");
    expect(finished.endedAt).toBeTruthy();
  });
});
