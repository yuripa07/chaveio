import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { testPrisma, resetDb } from "./helpers";
import { createTournament, createUserAndSession, joinTournament } from "./fixtures";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = "http://localhost";

function req(sessionCookie?: string) {
  const headers: Record<string, string> = {};
  if (sessionCookie) headers["Cookie"] = `${SESSION_COOKIE}=${sessionCookie}`;
  return new NextRequest(`${BASE}/api/users/tournaments`, { method: "GET", headers });
}

async function getHistory(sessionCookie?: string) {
  const { GET } = await import("@/app/api/users/tournaments/route");
  return GET(req(sessionCookie));
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /api/users/tournaments", () => {
  it("returns 401 without a session", async () => {
    const res = await getHistory();
    expect(res.status).toBe(401);
  });

  it("returns empty list for a user with no tournaments", async () => {
    const { sessionCookie } = await createUserAndSession();
    const res = await getHistory(sessionCookie);
    expect(res.status).toBe(200);
    const { tournaments } = await res.json();
    expect(tournaments).toEqual([]);
  });

  it("returns tournament with isCreator=true after creating one", async () => {
    const { code, sessionCookie } = await createTournament({ name: "My Cup" });
    const res = await getHistory(sessionCookie);
    expect(res.status).toBe(200);
    const { tournaments } = await res.json();
    expect(tournaments).toHaveLength(1);
    expect(tournaments[0].code).toBe(code);
    expect(tournaments[0].name).toBe("My Cup");
    expect(tournaments[0].isCreator).toBe(true);
    expect(tournaments[0].status).toBe("LOBBY");
    expect(tournaments[0].participantCount).toBe(1);
  });

  it("returns tournament with isCreator=false after joining one", async () => {
    const { code } = await createTournament();
    const joiner = await createUserAndSession({ name: "Bob" });
    await joinTournament(code, { session: joiner });

    const res = await getHistory(joiner.sessionCookie);
    expect(res.status).toBe(200);
    const { tournaments } = await res.json();
    expect(tournaments).toHaveLength(1);
    expect(tournaments[0].code).toBe(code);
    expect(tournaments[0].isCreator).toBe(false);
    expect(tournaments[0].participantCount).toBe(2);
  });

  it("does not return tournaments from other users", async () => {
    await createTournament({ name: "Other Cup" });
    const outsider = await createUserAndSession({ name: "Outsider" });

    const res = await getHistory(outsider.sessionCookie);
    expect(res.status).toBe(200);
    const { tournaments } = await res.json();
    expect(tournaments).toEqual([]);
  });

  it("returns multiple tournaments ordered newest first", async () => {
    const alice = await createUserAndSession({ name: "Alice" });
    await createTournament({ name: "First Cup", session: alice });
    await createTournament({ name: "Second Cup", session: alice });

    const res = await getHistory(alice.sessionCookie);
    const { tournaments } = await res.json();
    expect(tournaments).toHaveLength(2);
    expect(tournaments[0].name).toBe("Second Cup");
    expect(tournaments[1].name).toBe("First Cup");
  });

  it("includes correct fields in each entry", async () => {
    const { code, sessionCookie } = await createTournament({ name: "Field Check" });
    const { tournaments } = await (await getHistory(sessionCookie)).json();
    const entry = tournaments[0];
    expect(entry).toMatchObject({
      code,
      name: "Field Check",
      status: "LOBBY",
      isCreator: true,
      hasSubmittedPicks: false,
      participantCount: 1,
    });
    expect(typeof entry.createdAt).toBe("string");
    expect(entry.startedAt).toBeNull();
    expect(entry.endedAt).toBeNull();
  });
});
