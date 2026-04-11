import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  getTournament,
  startTournament,
  submitFullBracketPicks,
  kickParticipant,
} from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function setup() {
  const createRes = await createTournament({
    name: "Kick Test",
    items: ["Alpha", "Bravo", "Charlie", "Delta"],
  });
  const { code, token } = await createRes.json();
  const joinRes = await joinTournament(code, { displayName: "Bob", password: "pass123" });
  const { token: bobToken } = await joinRes.json();
  const stateRes = await getTournament(code, token);
  const { participants } = await stateRes.json();
  const bob = participants.find((p: { displayName: string }) => p.displayName === "Bob");
  const alice = participants.find((p: { displayName: string }) => p.displayName === "Alice");
  return { code, token, bobToken, bobId: bob.id, aliceId: alice.id };
}

describe("DELETE /api/tournaments/[code]/participants/[id]", () => {
  it("kicks a participant in LOBBY and removes them from the DB", async () => {
    const { code, token, bobId } = await setup();

    const res = await kickParticipant(code, bobId, token);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const gone = await testPrisma.participant.findUnique({ where: { id: bobId } });
    expect(gone).toBeNull();
  });

  it("kicks a participant in ACTIVE tournament", async () => {
    const { code, token, bobToken, bobId } = await setup();

    await submitFullBracketPicks(token, code);
    await submitFullBracketPicks(bobToken, code);
    await startTournament(code, token);

    const res = await kickParticipant(code, bobId, token);
    expect(res.status).toBe(200);

    const gone = await testPrisma.participant.findUnique({ where: { id: bobId } });
    expect(gone).toBeNull();
  });

  it("returns 400 when creator tries to kick themselves", async () => {
    const { code, token, aliceId } = await setup();
    const res = await kickParticipant(code, aliceId, token);
    expect(res.status).toBe(400);
  });

  it("returns 401 without a token", async () => {
    const { code, bobId } = await setup();
    const res = await kickParticipant(code, bobId, null);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-creator participant", async () => {
    const { code, bobToken, bobId } = await setup();
    const res = await kickParticipant(code, bobId, bobToken);
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown participantId", async () => {
    const { code, token } = await setup();
    const res = await kickParticipant(code, "00000000-0000-0000-0000-000000000000", token);
    expect(res.status).toBe(404);
  });
});
