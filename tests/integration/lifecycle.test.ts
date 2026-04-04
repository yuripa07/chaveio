import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  startTournament,
  setWinner,
  submitFullBracketPicks,
} from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function setup() {
  const { code, token: creatorToken } = await createTournament().then((r) => r.json());
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
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: { matches: { orderBy: { matchNumber: "asc" }, include: { slots: true } } },
      },
    },
  });
}

/** Create tournament, join Bob, submit picks for both, then start. */
async function setupAndStart() {
  const { code, creatorToken, bobToken } = await setup();
  await submitFullBracketPicks(creatorToken, code);
  await submitFullBracketPicks(bobToken, code);
  await startTournament(code, creatorToken);
  const t = await getTournamentFromDb(code);
  return { code, creatorToken, bobToken, t, r1Matches: t.rounds[0].matches };
}

// ── POST /api/tournaments/[code]/start ────────────────────────────────────

describe("POST /api/tournaments/[code]/start", () => {
  it("returns 403 for non-creator token", async () => {
    const { code, bobToken } = await setup();
    const res = await startTournament(code, bobToken);
    expect(res.status).toBe(403);
  });

  it("returns 409 if tournament already started", async () => {
    const { code, creatorToken, bobToken } = await setup();
    await submitFullBracketPicks(creatorToken, code);
    await submitFullBracketPicks(bobToken, code);
    await startTournament(code, creatorToken);
    const res = await startTournament(code, creatorToken);
    expect(res.status).toBe(409);
  });

  it("returns 409 if not all participants have submitted picks", async () => {
    const { code, creatorToken } = await setup();
    // Only creator submitted, Bob did not
    await submitFullBracketPicks(creatorToken, code);
    const res = await startTournament(code, creatorToken);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.pendingParticipants).toContain("Bob");
  });

  it("returns 409 if no one has submitted picks", async () => {
    const { code, creatorToken } = await setup();
    const res = await startTournament(code, creatorToken);
    expect(res.status).toBe(409);
  });

  it("activates round 1 and sets tournament ACTIVE when all submitted", async () => {
    const { code, creatorToken, bobToken } = await setup();
    await submitFullBracketPicks(creatorToken, code);
    await submitFullBracketPicks(bobToken, code);
    const res = await startTournament(code, creatorToken);
    expect(res.status).toBe(200);

    const t = await getTournamentFromDb(code);
    expect(t.status).toBe("ACTIVE");
    expect(t.startedAt).toBeTruthy();
    // Bracket was created at tournament creation; start just activates round 1
    expect(t.rounds).toHaveLength(2);
    expect(t.rounds[0].status).toBe("ACTIVE");
    expect(t.rounds[1].status).toBe("PENDING");
    // Round 1 matches have real slots
    for (const m of t.rounds[0].matches) {
      expect(m.slots).toHaveLength(2);
    }
    // Round 2 match has no slots yet
    expect(t.rounds[1].matches[0].slots).toHaveLength(0);
  });

  it("assigns correct point values to rounds", async () => {
    const { t } = await setupAndStart();
    // 4 items → round 1 = 1pt, round 2 (final) = 4pts
    expect(t.rounds[0].pointValue).toBe(1);
    expect(t.rounds[1].pointValue).toBe(4);
  });
});

// ── POST /api/tournaments/[code]/matches/[id]/winner ──────────────────────

describe("POST /api/tournaments/[code]/matches/[id]/winner", () => {
  it("returns 403 for non-creator", async () => {
    const { code, bobToken, r1Matches } = await setupAndStart();
    const match = r1Matches[0];
    const res = await setWinner(code, match.id, match.slots[0].itemId, bobToken);
    expect(res.status).toBe(403);
  });

  it("returns 400 if winnerId not in match slots", async () => {
    const { code, creatorToken, r1Matches } = await setupAndStart();
    const res = await setWinner(code, r1Matches[0].id, "bad-id", creatorToken);
    expect(res.status).toBe(400);
  });

  it("marks match COMPLETE and sets winnerId", async () => {
    const { code, creatorToken, r1Matches } = await setupAndStart();
    const match = r1Matches[0];
    const winnerId = match.slots[0].itemId;

    const res = await setWinner(code, match.id, winnerId, creatorToken);
    expect(res.status).toBe(200);

    const updated = await testPrisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(updated.status).toBe("COMPLETE");
    expect(updated.winnerId).toBe(winnerId);
  });

  it("scores picks correctly", async () => {
    const { code, creatorToken, t, r1Matches } = await setupAndStart();
    const match = r1Matches[0];
    const correctItemId = match.slots[0].itemId;
    const wrongItemId = match.slots[1].itemId;

    const participants = await testPrisma.participant.findMany({
      where: { tournamentId: t.id },
    });
    const alice = participants.find((p) => p.isCreator)!;
    const bob = participants.find((p) => !p.isCreator)!;

    // Alice always picks slot[0], Bob picks slot[1] for this match
    await testPrisma.pick.update({
      where: { participantId_matchId: { participantId: bob.id, matchId: match.id } },
      data: { pickedItemId: wrongItemId },
    });
    await testPrisma.pick.update({
      where: { participantId_matchId: { participantId: alice.id, matchId: match.id } },
      data: { pickedItemId: correctItemId },
    });

    await setWinner(code, match.id, correctItemId, creatorToken);

    const picks = await testPrisma.pick.findMany({ where: { matchId: match.id } });
    const alicePick = picks.find((p) => p.participantId === alice.id)!;
    const bobPick = picks.find((p) => p.participantId === bob.id)!;

    expect(alicePick.isCorrect).toBe(true);
    expect(alicePick.pointsEarned).toBe(1);
    expect(bobPick.isCorrect).toBe(false);
    expect(bobPick.pointsEarned).toBe(0);
  });

  it("advances winner to next round slot", async () => {
    const { code, creatorToken, r1Matches } = await setupAndStart();
    const match = r1Matches[0];
    const winnerId = match.slots[0].itemId;

    await setWinner(code, match.id, winnerId, creatorToken);

    const t = await getTournamentFromDb(code);
    const r2Match = t.rounds[1].matches[0];
    expect(r2Match.slots).toHaveLength(1);
    expect(r2Match.slots[0].itemId).toBe(winnerId);
  });

  it("activates next round when all matches in current round complete", async () => {
    const { code, creatorToken, r1Matches } = await setupAndStart();
    for (const match of r1Matches) {
      await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    }

    const t = await getTournamentFromDb(code);
    expect(t.rounds[0].status).toBe("COMPLETE");
    expect(t.rounds[1].status).toBe("ACTIVE");
  });

  it("finishes tournament when final match resolves", async () => {
    const { code, creatorToken, r1Matches } = await setupAndStart();

    for (const match of r1Matches) {
      await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    }

    const t = await getTournamentFromDb(code);
    const finalMatch = await testPrisma.match.findUniqueOrThrow({
      where: { id: t.rounds[1].matches[0].id },
      include: { slots: true },
    });
    await setWinner(code, finalMatch.id, finalMatch.slots[0].itemId, creatorToken);

    const finished = await testPrisma.tournament.findUniqueOrThrow({ where: { code } });
    expect(finished.status).toBe("FINISHED");
    expect(finished.endedAt).toBeTruthy();
  });
});
