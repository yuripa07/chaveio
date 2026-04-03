import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import { createTournament, joinTournament, getTournament } from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /api/tournaments", () => {
  it("creates a tournament and returns a code + token", async () => {
    const res = await createTournament({
      name: "Best Country",
      items: ["Brazil", "Japan", "Germany", "France"],
      creatorName: "Alice",
      creatorPassword: "pass123",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(body.token).toBeTruthy();
  });

  it("rejects non-power-of-2 item counts", async () => {
    const res = await createTournament({
      name: "Bad Tournament",
            items: ["A", "B", "C"],
      creatorName: "Bob",
      creatorPassword: "pass",
    });
    expect(res.status).toBe(400);
  });

  it("rejects item count below 4", async () => {
    const res = await createTournament({
      name: "Too Small",
            items: ["A", "B"],
      creatorName: "Bob",
      creatorPassword: "pass",
    });
    expect(res.status).toBe(400);
  });

  it("rejects item count above 32", async () => {
    const res = await createTournament({
      name: "Too Big",
            items: Array.from({ length: 64 }, (_, i) => `Item ${i}`),
      creatorName: "Bob",
      creatorPassword: "pass",
    });
    expect(res.status).toBe(400);
  });

  it("persists tournament and creator in DB", async () => {
    const res = await createTournament({
      name: "Best Country",
      items: ["Brazil", "Japan", "Germany", "France"],
      creatorName: "Alice",
      creatorPassword: "pass123",
    });
    const { code } = await res.json();
    const tournament = await testPrisma.tournament.findUnique({
      where: { code },
      include: { items: true, participants: true },
    });
    expect(tournament).toBeTruthy();
    expect(tournament!.items).toHaveLength(4);
    expect(tournament!.participants).toHaveLength(1);
    expect(tournament!.participants[0].isCreator).toBe(true);
    expect(tournament!.status).toBe("LOBBY");
  });
});

describe("POST /api/tournaments/[code]/join", () => {
  it("creates a new participant and returns a token", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const res = await joinTournament(code, {
      displayName: "Bob",
      password: "secret",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeTruthy();
  });

  it("re-issues token when same name + correct password", async () => {
    const { code } = await createTournament().then((r) => r.json());
    await joinTournament(code, { displayName: "Bob", password: "secret" });
    const res = await joinTournament(code, {
      displayName: "Bob",
      password: "secret",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
  });

  it("returns 401 for wrong password", async () => {
    const { code } = await createTournament().then((r) => r.json());
    await joinTournament(code, { displayName: "Bob", password: "secret" });
    const res = await joinTournament(code, {
      displayName: "Bob",
      password: "wrong",
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown tournament code", async () => {
    const res = await joinTournament("XXXXXX", {
      displayName: "Bob",
      password: "pass",
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/tournaments/[code]", () => {
  it("returns tournament state with participants", async () => {
    const { code, token } = await createTournament().then((r) => r.json());
    const { token: bobToken } = await joinTournament(code, {
      displayName: "Bob",
      password: "pass",
    }).then((r) => r.json());

    const res = await getTournament(code, bobToken);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tournament.code).toBe(code);
    expect(body.participants).toHaveLength(2);
    expect(body.items).toHaveLength(4);
    void token; // creator token unused here
  });

  it("returns 401 without token", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const res = await getTournament(code, null);
    expect(res.status).toBe(401);
  });
});
