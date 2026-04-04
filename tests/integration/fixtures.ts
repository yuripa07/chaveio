/**
 * Test fixtures that call the actual Next.js route handlers directly,
 * bypassing HTTP so tests don't need a running server.
 */

import { NextRequest } from "next/server";
import { getFeederMatches } from "@/lib/bracket";

const BASE = "http://localhost";

function req(method: string, path: string, body?: unknown, token?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---- Tournaments ----

type CreateTournamentBody = {
  name?: string;
  items?: string[];
  creatorName?: string;
  creatorPassword?: string;
  roundNames?: string[];
};

export async function createTournament(body: CreateTournamentBody = {}) {
  const { POST } = await import("@/app/api/tournaments/route");
  return POST(
    req("POST", "/api/tournaments", {
      name: body.name ?? "Best Country",
      items: body.items ?? ["Brazil", "Japan", "Germany", "France"],
      creatorName: body.creatorName ?? "Alice",
      creatorPassword: body.creatorPassword ?? "pass123",
      roundNames: body.roundNames,
    })
  );
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

export async function getTournament(code: string, token: string | null) {
  const { GET } = await import("@/app/api/tournaments/[code]/route");
  return GET(req("GET", `/api/tournaments/${code}`, undefined, token), {
    params: Promise.resolve({ code }),
  });
}

// ---- Tournament lifecycle ----

export async function startTournament(code: string, token: string) {
  const { POST } = await import("@/app/api/tournaments/[code]/start/route");
  return POST(req("POST", `/api/tournaments/${code}/start`, undefined, token), {
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
    req("POST", `/api/tournaments/${code}/matches/${matchId}/winner`, { winnerId }, token),
    { params: Promise.resolve({ code, id: matchId }) }
  );
}

// ---- Picks ----

export async function submitPicks(
  token: string,
  body: { tournamentCode: string; picks: { matchId: string; pickedItemId: string }[] }
) {
  const { POST } = await import("@/app/api/picks/route");
  return POST(req("POST", "/api/picks", body, token));
}

export async function getPicks(token: string, tournamentCode: string) {
  const { GET } = await import("@/app/api/picks/route");
  return GET(req("GET", `/api/picks?tournamentCode=${tournamentCode}`, undefined, token));
}

export async function getRankings(code: string, token: string | null) {
  const { GET } = await import("@/app/api/tournaments/[code]/rankings/route");
  return GET(req("GET", `/api/tournaments/${code}/rankings`, undefined, token), {
    params: Promise.resolve({ code }),
  });
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

  // Map matchNumber → pickedItemId per round (for cascade computation)
  const pickedByRoundMatch = new Map<string, string>(); // key: `${round}:${matchNum}`
  const picks: { matchId: string; pickedItemId: string }[] = [];

  for (const round of rounds) {
    for (const match of round.matches) {
      let pickedItemId: string;

      if (round.roundNumber === 1) {
        // Pick the first slot item
        pickedItemId = match.slots[0].itemId;
      } else if (match.slots.length > 0) {
        // Late-joiner round: real slots are populated — pick the first one
        pickedItemId = match.slots[0].itemId;
      } else {
        // Future round with no real slots: derive from feeder picks
        const [f1Num, f2Num] = getFeederMatches(match.matchNumber);
        const prevRound = round.roundNumber - 1;
        // Pick whoever won feeder match 1 (deterministic)
        pickedItemId = pickedByRoundMatch.get(`${prevRound}:${f1Num}`)!;
      }

      pickedByRoundMatch.set(`${round.roundNumber}:${match.matchNumber}`, pickedItemId);
      picks.push({ matchId: match.id, pickedItemId });
    }
  }

  return submitPicks(token, { tournamentCode: code, picks });
}
