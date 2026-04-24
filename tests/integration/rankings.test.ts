import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  startTournament,
  setWinner,
  getRankings,
  submitFullBracketPicks,
} from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});


async function setup() {
  const { code, token: creatorToken } = await createTournament();
  const { token: bobToken } = await joinTournament(code, { userName: "Bob" });
  return { code, creatorToken, bobToken: bobToken! };
}

async function setupAndStart() {
  const { code, creatorToken, bobToken } = await setup();
  await submitFullBracketPicks(creatorToken, code);
  await submitFullBracketPicks(bobToken, code);
  await startTournament(code, creatorToken);
  return { code, creatorToken, bobToken };
}

describe("GET /api/tournaments/[code]/rankings", () => {
  it("returns 401 without token", async () => {
    const { code } = await setup();
    const res = await getRankings(code, null);
    expect(res.status).toBe(401);
  });

  it("returns 403 when tournament is LOBBY", async () => {
    const { code, creatorToken } = await setup();
    const res = await getRankings(code, creatorToken);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 200 with all totalPoints: 0 when ACTIVE but no matches resolved yet", async () => {
    const { code, creatorToken, bobToken } = await setupAndStart();
    const res = await getRankings(code, bobToken);
    expect(res.status).toBe(200);
    const { rankings } = await res.json();
    expect(rankings).toHaveLength(2);
    for (const entry of rankings) {
      expect(entry.totalPoints).toBe(0);
      expect(entry.participantId).toBeDefined();
      expect(entry.displayName).toBeDefined();
    }
    // Sequential ranks even when tied
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].rank).toBe(2);
    // creator can also access
    const res2 = await getRankings(code, creatorToken);
    expect(res2.status).toBe(200);
  });

  it("returns correct sorted rankings after one match resolved", async () => {
    const { code, creatorToken, bobToken } = await setupAndStart();

    // Get tournament state to find the first match and winner
    const { GET: getTournament } = await import("@/app/api/tournaments/[code]/route");
    const { NextRequest } = await import("next/server");
    const tRes = await getTournament(
      new NextRequest(`http://localhost/api/tournaments/${code}`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      }),
      { params: Promise.resolve({ code }) }
    );
    const tData = await tRes.json();
    const firstMatch = tData.rounds[0].matches[0];
    const winnerId = firstMatch.slots[0].itemId;

    await setWinner(code, firstMatch.id, winnerId, creatorToken);

    const res = await getRankings(code, bobToken);
    expect(res.status).toBe(200);
    const { rankings } = await res.json();
    expect(rankings).toHaveLength(2);

    // Entries are sorted by points descending
    expect(rankings[0].totalPoints).toBeGreaterThanOrEqual(rankings[1].totalPoints);

    // Ranks are assigned
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].rank).toBeGreaterThanOrEqual(1);
  });

  it("handles ties correctly — tied participants get sequential ranks in alphabetical order", async () => {
    // Both participants start with 0 pts — Alice (creator) and Bob both at 0
    const { code, bobToken } = await setupAndStart();
    const res = await getRankings(code, bobToken);
    const { rankings } = await res.json();
    expect(rankings).toHaveLength(2);
    // Sequential ranks, no shared rank numbers
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].rank).toBe(2);
    // Alphabetical order within the tie: Alice before Bob
    expect(rankings[0].displayName).toBe("Alice");
    expect(rankings[1].displayName).toBe("Bob");
  });

  it("returns 403 when participant belongs to a different tournament", async () => {
    const { code: code1 } = await setupAndStart();
    // Create a second tournament and get a token from it
    const { code: code2, token: strangerToken } = await createTournament({
      name: "Other tournament",
      items: ["A", "B", "C", "D"],
      userName: "Stranger",
    });
    await submitFullBracketPicks(strangerToken, code2);
    await startTournament(code2, strangerToken);

    // Use token from tournament 2 to access tournament 1's rankings
    const res = await getRankings(code1, strangerToken);
    expect(res.status).toBe(403);
  });
});
