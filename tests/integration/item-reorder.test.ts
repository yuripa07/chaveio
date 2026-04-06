import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  getTournament,
  startTournament,
  submitFullBracketPicks,
  reorderItems,
} from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function setupTournament() {
  const createRes = await createTournament({
    name: "Reorder Test",
    items: ["Alpha", "Bravo", "Charlie", "Delta"],
  });
  const { code, token } = await createRes.json();
  const stateRes = await getTournament(code, token);
  const { items } = await stateRes.json();
  return { code, token, items };
}

describe("PATCH /api/tournaments/[code]/items/order", () => {
  it("reorders items: updates seeds and round-1 match slots", async () => {
    const { code, token, items } = await setupTournament();

    // Reverse the item order
    const reversedIds: string[] = [...items]
      .reverse()
      .map((i: { id: string }) => i.id);

    const res = await reorderItems(code, token, reversedIds);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Seeds should reflect new positions
    const updatedItems = await testPrisma.tournamentItem.findMany({
      where: { tournament: { code } },
      orderBy: { seed: "asc" },
    });
    expect(updatedItems.map((i) => i.id)).toEqual(reversedIds);

    // Round-1 slots must match generateFirstRoundPairs(4) = [[1,4],[3,2]]
    // After reverse: reversedIds[0]=seed1, reversedIds[1]=seed2, reversedIds[2]=seed3, reversedIds[3]=seed4
    // Match 1: seed1 (reversedIds[0]) vs seed4 (reversedIds[3])
    // Match 2: seed3 (reversedIds[2]) vs seed2 (reversedIds[1])
    const round1Matches = await testPrisma.match.findMany({
      where: { round: { roundNumber: 1, tournament: { code } } },
      include: { slots: { orderBy: { position: "asc" } } },
      orderBy: { matchNumber: "asc" },
    });

    expect(round1Matches[0].slots[0].itemId).toBe(reversedIds[0]); // seed 1
    expect(round1Matches[0].slots[1].itemId).toBe(reversedIds[3]); // seed 4
    expect(round1Matches[1].slots[0].itemId).toBe(reversedIds[2]); // seed 3
    expect(round1Matches[1].slots[1].itemId).toBe(reversedIds[1]); // seed 2
  });

  it("returns 401 without a token", async () => {
    const { code, items } = await setupTournament();
    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, null, ids);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-creator participant", async () => {
    const { code, items } = await setupTournament();
    const joinRes = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    });
    const { token: participantToken } = await joinRes.json();

    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, participantToken, ids);
    expect(res.status).toBe(403);
  });

  it("returns 409 when tournament is not in LOBBY (ACTIVE)", async () => {
    const { code, token, items } = await setupTournament();

    // Creator submits picks so the tournament can start
    await submitFullBracketPicks(token, code);
    await startTournament(code, token);

    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, token, ids);
    expect(res.status).toBe(409);
  });

  it("returns 409 when a participant has submitted picks", async () => {
    const { code, token, items } = await setupTournament();

    const joinRes = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    });
    const { token: participantToken } = await joinRes.json();
    await submitFullBracketPicks(participantToken, code);

    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, token, ids);
    expect(res.status).toBe(409);
  });

  it("returns 400 for itemIds with wrong length", async () => {
    const { code, token, items } = await setupTournament();
    const shortIds = items.slice(0, 3).map((i: { id: string }) => i.id);
    const res = await reorderItems(code, token, shortIds);
    expect(res.status).toBe(400);
  });

  it("returns 400 for duplicate itemIds", async () => {
    const { code, token, items } = await setupTournament();
    const ids = items.map((i: { id: string }) => i.id);
    const dupIds = [ids[0], ids[0], ids[1], ids[2]];
    const res = await reorderItems(code, token, dupIds);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown itemId", async () => {
    const { code, token, items } = await setupTournament();
    const ids = items.map((i: { id: string }) => i.id);
    ids[0] = "00000000-0000-0000-0000-000000000000";
    const res = await reorderItems(code, token, ids);
    expect(res.status).toBe(400);
  });
});
