import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant, AuthError } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  let payload;
  try {
    payload = await requireParticipant(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const { code } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    include: {
      items: { orderBy: { seed: "asc" } },
      participants: {
        select: {
          id: true,
          displayName: true,
          isCreator: true,
          hasSubmittedPicks: true,
          joinedAtRound: true,
        },
      },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          matches: {
            orderBy: { matchNumber: "asc" },
            include: { slots: true },
          },
        },
      },
    },
  });

  if (!tournament) {
    return Response.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { items, participants, rounds, ...tournamentData } = tournament;
  return Response.json({ tournament: tournamentData, participants, items, rounds });
}
