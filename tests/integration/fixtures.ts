/**
 * Test fixtures that call the actual Next.js route handlers directly,
 * bypassing HTTP so tests don't need a running server.
 */

import { NextRequest } from "next/server";

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
  theme?: string;
  items?: string[];
  creatorName?: string;
  creatorPassword?: string;
};

export async function createTournament(body: CreateTournamentBody = {}) {
  const { POST } = await import("@/app/api/tournaments/route");
  return POST(
    req("POST", "/api/tournaments", {
      name: body.name ?? "Best Country",
      theme: body.theme ?? "Geography",
      items: body.items ?? ["Brazil", "Japan", "Germany", "France"],
      creatorName: body.creatorName ?? "Alice",
      creatorPassword: body.creatorPassword ?? "pass123",
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
