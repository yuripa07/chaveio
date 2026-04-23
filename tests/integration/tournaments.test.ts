import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  createUserAndSession,
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
  it("creates a tournament with creator linked to the user", async () => {
    const { status, code, token, userId } = await createTournament({
      name: "Best Country",
      items: ["Brazil", "Japan", "Germany", "France"],
      userName: "Alice",
    });
    expect(status).toBe(201);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(token).toBeTruthy();

    const tournament = await testPrisma.tournament.findUniqueOrThrow({
      where: { code },
      include: { items: true, participants: true },
    });
    expect(tournament.creatorUserId).toBe(userId);
    expect(tournament.items).toHaveLength(4);
    expect(tournament.participants).toHaveLength(1);
    expect(tournament.participants[0].isCreator).toBe(true);
    expect(tournament.participants[0].userId).toBe(userId);
    expect(tournament.participants[0].displayName).toBe("Alice");
  });

  it("rejects creation without a session", async () => {
    const { POST } = await import("@/app/api/tournaments/route");
    const { NextRequest } = await import("next/server");
    const res = await POST(
      new NextRequest("http://localhost/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unauthorized",
          items: ["A", "B", "C", "D"],
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects creation with a tampered session cookie", async () => {
    const { POST } = await import("@/app/api/tournaments/route");
    const { NextRequest } = await import("next/server");
    const { SESSION_COOKIE } = await import("@/lib/session");
    const res = await POST(
      new NextRequest("http://localhost/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE}=not-a-real-jwt`,
        },
        body: JSON.stringify({
          name: "Tampered",
          items: ["A", "B", "C", "D"],
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects non-power-of-2 item counts", async () => {
    const { status } = await createTournament({
      name: "Bad Tournament",
      items: ["A", "B", "C"],
      userName: "Bob",
    });
    expect(status).toBe(400);
  });

  it("rejects item count above 32", async () => {
    const { status } = await createTournament({
      name: "Too Big",
      items: Array.from({ length: 64 }, (_, i) => `Item ${i}`),
      userName: "Bob",
    });
    expect(status).toBe(400);
  });

  it("rejects missing name", async () => {
    const { status } = await createTournament({
      name: "",
      items: ["A", "B", "C", "D"],
    });
    expect(status).toBe(400);
  });

  it("rejects roundNames with wrong length", async () => {
    const { status } = await createTournament({
      items: ["A", "B", "C", "D"],
      roundNames: ["Semifinals"],
    });
    expect(status).toBe(400);
  });

  it("accepts roundNames with correct length and stores them", async () => {
    const { status, code } = await createTournament({
      items: ["A", "B", "C", "D"],
      roundNames: ["Semifinal", "Final"],
    });
    expect(status).toBe(201);

    const t = await testPrisma.tournament.findUnique({ where: { code } });
    expect(JSON.parse(t!.roundNames ?? "[]")).toEqual(["Semifinal", "Final"]);
  });

  it("generates correct bracket structure for 8 items (3 rounds)", async () => {
    const { code } = await createTournament({
      items: ["A", "B", "C", "D", "E", "F", "G", "H"],
    });

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

  it("generates bracket (rounds + matches + slots) at creation for 4 items", async () => {
    const { code } = await createTournament({
      items: ["Brazil", "Japan", "Germany", "France"],
    });

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
    expect(t!.rounds[0].matches).toHaveLength(2);
    expect(t!.rounds[1].matches[0].slots).toHaveLength(0);
  });

  it("GET tournament in LOBBY returns bracket with rounds and matches", async () => {
    const { code, token } = await createTournament();
    const res = await getTournament(code, token);
    const body = await res.json();
    expect(body.rounds).toHaveLength(2);
    expect(body.rounds[0].matches).toHaveLength(2);
  });
});

describe("POST /api/tournaments/[code]/join", () => {
  it("returns 401 without a session cookie", async () => {
    const { code } = await createTournament();
    const { POST } = await import("@/app/api/tournaments/[code]/join/route");
    const { NextRequest } = await import("next/server");
    const res = await POST(
      new NextRequest(`http://localhost/api/tournaments/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(401);
  });

  it("creates a new participant and returns a token", async () => {
    const { code } = await createTournament();
    const { response, token } = await joinTournament(code, { userName: "Bob" });
    expect(response.status).toBe(201);
    expect(token).toBeTruthy();
  });

  it("re-issues token when the same user joins again", async () => {
    const { code } = await createTournament();
    const bob = await createUserAndSession({ name: "Bob" });
    await joinTournament(code, { session: bob });
    const { response, token } = await joinTournament(code, { session: bob });
    expect(response.status).toBe(200);
    expect(token).toBeTruthy();
  });

  it("returns 404 for unknown tournament code", async () => {
    const { response } = await joinTournament("XXXXXX", { userName: "Bob" });
    expect(response.status).toBe(404);
  });

  it("returns 403 when joining a FINISHED tournament as new participant", async () => {
    const { code, token: creatorToken } = await createTournament();
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

    const { response } = await joinTournament(code, { userName: "NewUser" });
    expect(response.status).toBe(403);
  });
});

describe("GET /api/tournaments/[code]", () => {
  it("returns tournament state with participants", async () => {
    const { code, token } = await createTournament();
    const { token: bobToken } = await joinTournament(code, { userName: "Bob" });

    const res = await getTournament(code, bobToken!);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tournament.code).toBe(code);
    expect(body.participants).toHaveLength(2);
    expect(body.items).toHaveLength(4);
    void token;
  });

  it("returns 401 without token", async () => {
    const { code } = await createTournament();
    const res = await getTournament(code, null);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent code", async () => {
    const { token } = await createTournament();
    const res = await getTournament("ZZZZZZ", token);
    expect(res.status).toBe(404);
  });

  it("returns 403 when token belongs to a different tournament", async () => {
    const { code: code1 } = await createTournament();
    const { token: strangerToken } = await createTournament({
      name: "Other",
      items: ["W", "X", "Y", "Z"],
      userName: "Stranger",
    });

    const res = await getTournament(code1, strangerToken);
    expect(res.status).toBe(403);
  });
});
