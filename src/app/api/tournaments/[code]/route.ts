import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleRequest } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = await handleRequest(req, "participant");
  if (!auth.ok) return auth.response;

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
    return Response.json({ error: "Torneio não encontrado" }, { status: 404 });
  }

  if (tournament.id !== auth.payload.tournamentId) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const isStillParticipant = tournament.participants.some(
    (p) => p.id === auth.payload.participantId
  );
  if (!isStillParticipant) {
    return Response.json({ error: "Você não é mais um participante deste torneio" }, { status: 403 });
  }

  const { items, participants, rounds, ...tournamentData } = tournament;
  return Response.json({ tournament: tournamentData, participants, items, rounds });
}
