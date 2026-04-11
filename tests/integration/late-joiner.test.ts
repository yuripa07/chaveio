import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  startTournament,
  setWinner,
  submitPicks,
  submitFullBracketPicks,
  getTournament,
} from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

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

/** Start a tournament with Alice (creator) and Bob both having submitted picks. */
async function startedTournament() {
  const { code, token: creatorToken } = await createTournament().then((r) => r.json());
  const { token: bobToken } = await joinTournament(code, {
    displayName: "Bob",
    password: "pass123",
  }).then((r) => r.json());
  await submitFullBracketPicks(creatorToken, code);
  await submitFullBracketPicks(bobToken, code);
  await startTournament(code, creatorToken);
  return { code, creatorToken, bobToken };
}

describe("Winner API — gate on all picks submitted", () => {
  it("blocks resolution when a participant has not submitted picks", async () => {
    const { code, creatorToken } = await startedTournament();

    // Eve joins after start — hasSubmittedPicks = false
    await joinTournament(code, { displayName: "Eve", password: "pass123" });

    const t = await getTournamentFromDb(code);
    const match = t.rounds[0].matches[0];
    const res = await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/palpites/i);
  });

  it("allows resolution once all participants have submitted", async () => {
    const { code, creatorToken } = await startedTournament();

    const { token: eveToken } = await joinTournament(code, {
      displayName: "Eve",
      password: "pass123",
    }).then((r) => r.json());

    // Eve submits her remaining picks
    await submitFullBracketPicks(eveToken, code);

    const t = await getTournamentFromDb(code);
    const match = t.rounds[0].matches[0];
    const res = await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    expect(res.status).toBe(200);
  });
});

describe("Late joiner", () => {
  it("gets joinedAtRound set to the current active round", async () => {
    const { code } = await startedTournament();

    await joinTournament(code, { displayName: "Eve", password: "pass123" });

    const eve = await testPrisma.participant.findFirst({ where: { displayName: "Eve" } });
    expect(eve!.joinedAtRound).toBe(1);
    expect(eve!.hasSubmittedPicks).toBe(false);
  });

  it("late joiner can submit picks from the current round onward", async () => {
    const { code } = await startedTournament();

    const { token: eveToken } = await joinTournament(code, {
      displayName: "Eve",
      password: "pass123",
    }).then((r) => r.json());

    const res = await submitFullBracketPicks(eveToken, code);
    expect(res.status).toBe(200);

    const eve = await testPrisma.participant.findFirst({ where: { displayName: "Eve" } });
    expect(eve!.hasSubmittedPicks).toBe(true);
  });

  it("late joiner at round 2 only needs to pick from round 2 onward", async () => {
    const { code, creatorToken } = await startedTournament();

    // Complete all round 1 matches → round 2 becomes active
    const t = await getTournamentFromDb(code);
    for (const match of t.rounds[0].matches) {
      await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    }

    // Eve joins now at round 2
    const { token: eveToken } = await joinTournament(code, {
      displayName: "Eve",
      password: "pass123",
    }).then((r) => r.json());

    const eve = await testPrisma.participant.findFirst({ where: { displayName: "Eve" } });
    expect(eve!.joinedAtRound).toBe(2);

    // Eve fetches tournament — round 2 has real slots now
    const body = await getTournament(code, eveToken).then((r) => r.json());
    const finalMatch = body.rounds[1].matches[0];
    expect(finalMatch.slots).toHaveLength(2); // populated by winners

    // Eve submits only the final pick
    const res = await submitPicks(eveToken, {
      tournamentCode: code,
      picks: [{ matchId: finalMatch.id, pickedItemId: finalMatch.slots[0].itemId }],
    });
    expect(res.status).toBe(200);

    const eveAfter = await testPrisma.participant.findFirst({ where: { displayName: "Eve" } });
    expect(eveAfter!.hasSubmittedPicks).toBe(true);
  });

  it("late joiner at round 2 cannot submit round 1 picks", async () => {
    const { code, creatorToken } = await startedTournament();

    const t = await getTournamentFromDb(code);
    for (const match of t.rounds[0].matches) {
      await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    }

    const { token: eveToken } = await joinTournament(code, {
      displayName: "Eve",
      password: "pass123",
    }).then((r) => r.json());

    // Attempt to submit picks for round 1 (already completed) — should fail
    const r1Match = t.rounds[0].matches[0];
    const res = await submitPicks(eveToken, {
      tournamentCode: code,
      picks: [{ matchId: r1Match.id, pickedItemId: r1Match.slots[0].itemId }],
    });
    expect(res.status).toBe(409); // COMPLETE match
  });

  it("creator is blocked until late joiner submits, then can continue", async () => {
    const { code, creatorToken } = await startedTournament();

    // Eve joins — no picks submitted
    const { token: eveToken } = await joinTournament(code, {
      displayName: "Eve",
      password: "pass123",
    }).then((r) => r.json());

    const t = await getTournamentFromDb(code);
    const match = t.rounds[0].matches[0];

    // Creator tries to resolve — should be blocked
    const blocked = await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    expect(blocked.status).toBe(409);

    // Eve submits picks
    await submitFullBracketPicks(eveToken, code);

    // Now creator can proceed
    const ok = await setWinner(code, match.id, match.slots[0].itemId, creatorToken);
    expect(ok.status).toBe(200);
  });
});
