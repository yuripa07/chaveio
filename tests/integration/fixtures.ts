/**
 * Test fixtures that call the actual Next.js route handlers directly,
 * bypassing HTTP so tests don't need a running server.
 */

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { generateFirstRoundPairs, getFeederMatches } from "@/lib/bracket";
import { computeRoundPoints } from "@/lib/points";
import { generateCode } from "@/lib/codes";
import { signToken } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { testPrisma } from "./helpers";

const BASE = "http://localhost";

type ReqOptions = {
  token?: string | null;
  sessionCookie?: string | null;
};

function req(
  method: string,
  path: string,
  body?: unknown,
  opts: ReqOptions = {}
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.sessionCookie) headers["Cookie"] = `${SESSION_COOKIE}=${opts.sessionCookie}`;
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---- Users / sessions (for Google-mode flows) ----

export async function createUserAndSession(opts: {
  name?: string;
  email?: string;
  googleSub?: string;
} = {}) {
  const unique = Math.random().toString(36).slice(2, 10);
  const email = opts.email ?? `user-${unique}@example.com`;
  const googleSub = opts.googleSub ?? `google-sub-${unique}`;
  const name = opts.name ?? `User ${unique}`;

  const user = await testPrisma.user.create({
    data: {
      googleSub,
      email,
      emailVerified: true,
      name,
    },
  });
  const sessionCookie = await signSession({ userId: user.id });
  return { user, userId: user.id, sessionCookie, name };
}

// ---- Tournaments ----

type CreateTournamentBody = {
  name?: string;
  items?: string[];
  creatorName?: string;
  creatorPassword?: string;
  roundNames?: string[];
};

/**
 * Creates a legacy PASSWORD-mode tournament via direct Prisma inserts.
 * This simulates an existing production tournament that predates Google auth —
 * used to exercise the legacy password join path in regression tests.
 * Returns a Response-shaped object so existing call sites (res.json()) keep working.
 */
export async function createTournament(body: CreateTournamentBody = {}) {
  const name = body.name ?? "Best Country";
  const items = body.items ?? ["Brazil", "Japan", "Germany", "France"];
  const creatorName = body.creatorName ?? "Alice";
  const creatorPassword = body.creatorPassword ?? "pass123";
  const roundNames = body.roundNames;

  if (!isPowerOfTwo(items.length)) {
    return Response.json(
      { error: "Number of candidates must be 4, 8, 16, or 32." },
      { status: 400 }
    );
  }

  const totalRounds = Math.log2(items.length);
  if (roundNames && roundNames.length !== totalRounds) {
    return Response.json(
      { error: `Tournament must have exactly ${totalRounds} round themes.` },
      { status: 400 }
    );
  }

  const code = await generateUniqueCode();
  const passwordHash = await bcrypt.hash(creatorPassword, 10);

  const { tournamentId, participantId } = await insertLegacyTournament({
    code,
    name,
    passwordHash,
    items,
    roundNames: roundNames ?? [],
    creatorName,
  });

  const token = await signToken({
    participantId,
    tournamentId,
    isCreator: true,
  });

  return Response.json({ code, token }, { status: 201 });
}

/**
 * Creates a GOOGLE-mode tournament by calling the real POST /api/tournaments route
 * with a session cookie. Returns {code, token, sessionCookie, userId, user}.
 */
export async function createGoogleTournament(
  opts: {
    name?: string;
    items?: string[];
    roundNames?: string[];
    userName?: string;
    session?: { sessionCookie: string; userId: string };
  } = {}
) {
  const user = opts.session
    ? { sessionCookie: opts.session.sessionCookie, userId: opts.session.userId }
    : await createUserAndSession({ name: opts.userName ?? "Alice" });

  const { POST } = await import("@/app/api/tournaments/route");
  const res = await POST(
    req(
      "POST",
      "/api/tournaments",
      {
        name: opts.name ?? "Best Country",
        items: opts.items ?? ["Brazil", "Japan", "Germany", "France"],
        roundNames: opts.roundNames,
      },
      { sessionCookie: user.sessionCookie }
    )
  );
  const payload = await res.json();
  return {
    status: res.status,
    code: payload.code as string,
    token: payload.token as string,
    sessionCookie: user.sessionCookie,
    userId: user.userId,
  };
}

export async function joinTournament(
  code: string,
  body: { displayName: string; password: string }
) {
  const { POST } = await import("@/app/api/tournaments/[code]/join/route");
  return POST(req("POST", `/api/tournaments/${code}/join`, body), {
    params: Promise.resolve({ code }),
  });
}

/**
 * Joins a GOOGLE-mode tournament with a session cookie (no body).
 * If `session` is not provided, a new User + session is created.
 */
export async function joinTournamentWithGoogle(
  code: string,
  opts: {
    session?: { sessionCookie: string; userId: string };
    userName?: string;
  } = {}
) {
  const user = opts.session
    ? { sessionCookie: opts.session.sessionCookie, userId: opts.session.userId }
    : await createUserAndSession({ name: opts.userName ?? "Participant" });
  const { POST } = await import("@/app/api/tournaments/[code]/join/route");
  return {
    response: await POST(
      req("POST", `/api/tournaments/${code}/join`, {}, { sessionCookie: user.sessionCookie }),
      { params: Promise.resolve({ code }) }
    ),
    sessionCookie: user.sessionCookie,
    userId: user.userId,
  };
}

export async function linkGoogleToParticipant(
  code: string,
  opts: {
    sessionCookie: string;
    displayName: string;
    password: string;
  }
) {
  const { POST } = await import("@/app/api/tournaments/[code]/link-google/route");
  return POST(
    req(
      "POST",
      `/api/tournaments/${code}/link-google`,
      { displayName: opts.displayName, password: opts.password },
      { sessionCookie: opts.sessionCookie }
    ),
    { params: Promise.resolve({ code }) }
  );
}

export async function getTournament(code: string, token: string | null) {
  const { GET } = await import("@/app/api/tournaments/[code]/route");
  return GET(req("GET", `/api/tournaments/${code}`, undefined, { token }), {
    params: Promise.resolve({ code }),
  });
}

// ---- Tournament lifecycle ----

export async function startTournament(code: string, token: string) {
  const { POST } = await import("@/app/api/tournaments/[code]/start/route");
  return POST(req("POST", `/api/tournaments/${code}/start`, undefined, { token }), {
    params: Promise.resolve({ code }),
  });
}

export async function setWinner(
  code: string,
  matchId: string,
  winnerId: string,
  token: string
) {
  const { POST } = await import(
    "@/app/api/tournaments/[code]/matches/[id]/winner/route"
  );
  return POST(
    req(
      "POST",
      `/api/tournaments/${code}/matches/${matchId}/winner`,
      { winnerId },
      { token }
    ),
    { params: Promise.resolve({ code, id: matchId }) }
  );
}

// ---- Picks ----

export async function submitPicks(
  token: string,
  body: { tournamentCode: string; picks: { matchId: string; pickedItemId: string }[] }
) {
  const { POST } = await import("@/app/api/picks/route");
  return POST(req("POST", "/api/picks", body, { token }));
}

export async function getPicks(token: string, tournamentCode: string) {
  const { GET } = await import("@/app/api/picks/route");
  return GET(
    req("GET", `/api/picks?tournamentCode=${tournamentCode}`, undefined, { token })
  );
}

export async function getRankings(code: string, token: string | null) {
  const { GET } = await import("@/app/api/tournaments/[code]/rankings/route");
  return GET(req("GET", `/api/tournaments/${code}/rankings`, undefined, { token }), {
    params: Promise.resolve({ code }),
  });
}

export async function kickParticipant(
  code: string,
  participantId: string,
  token: string | null
) {
  const { DELETE } = await import(
    "@/app/api/tournaments/[code]/participants/[id]/route"
  );
  return DELETE(
    req(
      "DELETE",
      `/api/tournaments/${code}/participants/${participantId}`,
      undefined,
      { token }
    ),
    { params: Promise.resolve({ code, id: participantId }) }
  );
}

export async function reorderItems(
  code: string,
  token: string | null,
  itemIds: string[]
) {
  const { PATCH } = await import(
    "@/app/api/tournaments/[code]/items/order/route"
  );
  return PATCH(
    req("PATCH", `/api/tournaments/${code}/items/order`, { itemIds }, { token }),
    { params: Promise.resolve({ code }) }
  );
}

/**
 * Builds and submits a valid full-bracket prediction for a participant.
 * Always picks slot position 1 items, cascading deterministically through rounds.
 * Useful for getting participants past the picks gate in lifecycle tests.
 */
export async function submitFullBracketPicks(token: string, code: string) {
  const body = await getTournament(code, token).then((r) => r.json());
  const rounds: {
    roundNumber: number;
    matches: { id: string; matchNumber: number; slots: { itemId: string; position: number }[] }[];
  }[] = body.rounds;

  const pickedByRoundMatch = new Map<string, string>();
  const picks: { matchId: string; pickedItemId: string }[] = [];

  for (const round of rounds) {
    for (const match of round.matches) {
      let pickedItemId: string;

      if (round.roundNumber === 1) {
        pickedItemId = match.slots[0].itemId;
      } else if (match.slots.length > 0) {
        pickedItemId = match.slots[0].itemId;
      } else {
        const [f1Num] = getFeederMatches(match.matchNumber);
        const prevRound = round.roundNumber - 1;
        pickedItemId = pickedByRoundMatch.get(`${prevRound}:${f1Num}`)!;
      }

      pickedByRoundMatch.set(`${round.roundNumber}:${match.matchNumber}`, pickedItemId);
      picks.push({ matchId: match.id, pickedItemId });
    }
  }

  return submitPicks(token, { tournamentCode: code, picks });
}

// ---- Internals ----

function isPowerOfTwo(n: number) {
  return n >= 4 && n <= 32 && (n & (n - 1)) === 0;
}

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateCode();
    const exists = await testPrisma.tournament.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Failed to generate unique tournament code");
}

async function insertLegacyTournament(params: {
  code: string;
  name: string;
  passwordHash: string;
  items: string[];
  roundNames: string[];
  creatorName: string;
}) {
  const { code, name, passwordHash, items, roundNames, creatorName } = params;
  const n = items.length;
  const numRounds = Math.log2(n);

  return testPrisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        code,
        name,
        passwordHash,
        authMode: "PASSWORD",
        roundNames: JSON.stringify(roundNames),
        items: {
          create: items.map((itemName, i) => ({ name: itemName, seed: i + 1 })),
        },
      },
      include: { items: { orderBy: { seed: "asc" } } },
    });

    const participant = await tx.participant.create({
      data: {
        tournamentId: tournament.id,
        displayName: creatorName,
        isCreator: true,
      },
    });

    const rounds = await Promise.all(
      Array.from({ length: numRounds }, (_, i) => {
        const roundNumber = i + 1;
        return tx.round.create({
          data: {
            tournamentId: tournament.id,
            roundNumber,
            name: roundNames[i] ?? null,
            status: "PENDING",
            pointValue: computeRoundPoints(roundNumber, numRounds, n),
          },
        });
      })
    );

    const pairs = generateFirstRoundPairs(n);
    await Promise.all(
      pairs.map(([seed1, seed2], i) => {
        const item1 = tournament.items.find((it) => it.seed === seed1)!;
        const item2 = tournament.items.find((it) => it.seed === seed2)!;
        return tx.match.create({
          data: {
            tournamentId: tournament.id,
            roundId: rounds[0].id,
            matchNumber: i + 1,
            slots: {
              create: [
                { itemId: item1.id, position: 1 },
                { itemId: item2.id, position: 2 },
              ],
            },
          },
        });
      })
    );

    for (let r = 1; r < numRounds; r++) {
      const matchCount = n / Math.pow(2, r + 1);
      await Promise.all(
        Array.from({ length: matchCount }, (_, i) =>
          tx.match.create({
            data: {
              tournamentId: tournament.id,
              roundId: rounds[r].id,
              matchNumber: i + 1,
            },
          })
        )
      );
    }

    return { tournamentId: tournament.id, participantId: participant.id };
  });
}
