import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import { createTournament, startTournament, joinTournament, submitFullBracketPicks } from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function checkCode(code: string) {
  const { GET } = await import("@/app/api/tournaments/[code]/check/route");
  const { NextRequest } = await import("next/server");
  return GET(
    new NextRequest(`http://localhost/api/tournaments/${code}/check`),
    { params: Promise.resolve({ code }) }
  );
}

describe("GET /api/tournaments/[code]/check", () => {
  it("returns exists:true and status LOBBY for a new tournament", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const res = await checkCode(code);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(true);
    expect(body.status).toBe("LOBBY");
  });

  it("returns 404 with exists:false for an unknown code", async () => {
    const res = await checkCode("ZZZZZZ");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.exists).toBe(false);
  });

  it("reflects ACTIVE status after tournament is started", async () => {
    const { code, token: creatorToken } = await createTournament().then((r) => r.json());
    const { token: bobToken } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    }).then((r) => r.json());
    await submitFullBracketPicks(creatorToken, code);
    await submitFullBracketPicks(bobToken, code);
    await startTournament(code, creatorToken);

    const res = await checkCode(code);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(true);
    expect(body.status).toBe("ACTIVE");
  });

  it("does not require authentication", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const res = await checkCode(code);
    expect(res.status).toBe(200);
  });
});
