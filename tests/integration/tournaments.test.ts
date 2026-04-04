import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  getTournament,
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

  it("rejects missing required fields", async () => {
    const { POST } = await import("@/app/api/tournaments/route");
    const { NextRequest } = await import("next/server");
    const res = await POST(
      new NextRequest("http://localhost/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: ["A", "B", "C", "D"] }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects roundNames with wrong length", async () => {
    const res = await createTournament({
      items: ["A", "B", "C", "D"],
      roundNames: ["Semifinals"],
    });
    expect(res.status).toBe(400);
  });

  it("accepts roundNames with correct length and stores them", async () => {
    const res = await createTournament({
      items: ["A", "B", "C", "D"],
      roundNames: ["Semifinal", "Final"],
    });
    expect(res.status).toBe(201);
    const { code, token } = await res.json();

    const t = await testPrisma.tournament.findUnique({ where: { code } });
    const stored = JSON.parse(t!.roundNames ?? "[]");
    expect(stored).toEqual(["Semifinal", "Final"]);

    void token;
  });

  it("generates correct bracket structure for 8 items (3 rounds)", async () => {
    const { code } = await createTournament({
      items: ["A", "B", "C", "D", "E", "F", "G", "H"],
    }).then((r) => r.json());

    const t = await testPrisma.tournament.findUnique({
      where: { code },
      include: {
        rounds: {
          orderBy: { roundNumber: "asc" },
          include: { matches: { include: { slots: true } } },
        },
      },
    });

    expect(t!.rounds).toHaveLength(3);
    expect(t!.rounds[0].matches).toHaveLength(4);
    expect(t!.rounds[1].matches).toHaveLength(2);
    expect(t!.rounds[2].matches).toHaveLength(1);
    for (const m of t!.rounds[0].matches) expect(m.slots).toHaveLength(2);
    for (const m of t!.rounds[1].matches) expect(m.slots).toHaveLength(0);
    expect(t!.rounds[2].matches[0].slots).toHaveLength(0);
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

  it("generates bracket (rounds + matches + slots) at creation for 4 items", async () => {
    const { code } = await createTournament({
      items: ["Brazil", "Japan", "Germany", "France"],
    }).then((r) => r.json());

    const t = await testPrisma.tournament.findUnique({
      where: { code },
      include: {
        rounds: {
          orderBy: { roundNumber: "asc" },
          include: { matches: { include: { slots: true } } },
        },
      },
    });

    expect(t!.rounds).toHaveLength(2);
    expect(t!.rounds[0].status).toBe("PENDING");
    expect(t!.rounds[0].matches).toHaveLength(2);
    expect(t!.rounds[0].matches[0].slots).toHaveLength(2);
    expect(t!.rounds[0].matches[1].slots).toHaveLength(2);
    expect(t!.rounds[1].status).toBe("PENDING");
    expect(t!.rounds[1].matches).toHaveLength(1);
    expect(t!.rounds[1].matches[0].slots).toHaveLength(0);
  });

  it("GET tournament in LOBBY returns bracket with rounds and matches", async () => {
    const { code, token } = await createTournament().then((r) => r.json());
    const res = await getTournament(code, token);
    const body = await res.json();
    expect(body.rounds).toHaveLength(2);
    expect(body.rounds[0].matches).toHaveLength(2);
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

  it("returns 400 when displayName or password is missing", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const { POST } = await import("@/app/api/tournaments/[code]/join/route");
    const { NextRequest } = await import("next/server");
    const res = await POST(
      new NextRequest(`http://localhost/api/tournaments/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Bob" }),
      }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when joining a FINISHED tournament as new participant", async () => {
    const { code, token: creatorToken } = await createTournament().then((r) => r.json());
    await submitFullBracketPicks(creatorToken, code);
    await startTournament(code, creatorToken);

    const t = await testPrisma.tournament.findUniqueOrThrow({
      where: { code },
      include: {
        rounds: { orderBy: { roundNumber: "asc" }, include: { matches: { include: { slots: true } } } },
      },
    });
    for (const round of t.rounds) {
      for (const match of round.matches) {
        const fresh = await testPrisma.match.findUniqueOrThrow({
          where: { id: match.id },
          include: { slots: true },
        });
        if (fresh.slots.length > 0) {
          await setWinner(code, fresh.id, fresh.slots[0].itemId, creatorToken);
        }
      }
    }

    const res = await joinTournament(code, { displayName: "NewUser", password: "pass" });
    expect(res.status).toBe(403);
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
    void token;
  });

  it("returns 401 without token", async () => {
    const { code } = await createTournament().then((r) => r.json());
    const res = await getTournament(code, null);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent code", async () => {
    const { token } = await createTournament().then((r) => r.json());
    const res = await getTournament("ZZZZZZ", token);
    expect(res.status).toBe(404);
  });

  it("returns 403 when token belongs to a different tournament", async () => {
    const { code: code1 } = await createTournament().then((r) => r.json());
    const { token: strangerToken } = await createTournament({
      name: "Other",
      items: ["W", "X", "Y", "Z"],
      creatorName: "Stranger",
      creatorPassword: "pw",
    }).then((r) => r.json());

    const res = await getTournament(code1, strangerToken);
    expect(res.status).toBe(403);
  });
});
