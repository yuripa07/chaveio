/**
 * Test fixtures that call the actual Next.js route handlers directly,
 * bypassing HTTP so tests don't need a running server.
 */

import { NextRequest } from "next/server";
import { getFeederMatches } from "@/lib/bracket";
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

// ---- Users / sessions ----

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

/**
 * Creates a Google-mode tournament by calling the real POST /api/tournaments route
 * with a session cookie. Returns {code, token, sessionCookie, userId}.
 */
export async function createTournament(
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
    response: res,
    status: res.status,
    code: payload.code as string,
    token: payload.token as string,
    sessionCookie: user.sessionCookie,
    userId: user.userId,
    error: payload.error as string | undefined,
  };
}

/**
 * Joins a tournament with a Google session cookie.
 * If `session` is not provided, a new User + session is created.
 */
export async function joinTournament(
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
  const response = await POST(
    req("POST", `/api/tournaments/${code}/join`, {}, { sessionCookie: user.sessionCookie }),
    { params: Promise.resolve({ code }) }
  );
  const payload =
    response.status < 400 ? ((await response.json()) as { token?: string }) : null;
  return {
    response,
    status: response.status,
    token: payload?.token,
    sessionCookie: user.sessionCookie,
    userId: user.userId,
  };
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
