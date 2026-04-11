import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleRequest } from "@/lib/api-utils";
import { validateBracketPicks } from "@/lib/picks-validation";

type PickEntry = { matchId: string; pickedItemId: string };

export async function POST(req: NextRequest) {
  const auth = await handleRequest<{ tournamentCode: string; picks: PickEntry[] }>(
    req, "participant", { parseBody: true }
  );
  if (!auth.ok) return auth.response;

  const { tournamentCode, picks } = auth.body;

  const tournament = await prisma.tournament.findUnique({
    where: { code: tournamentCode },
    include: {
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          matches: { orderBy: { matchNumber: "asc" }, include: { slots: true } },
        },
      },
    },
  });

  if (!tournament || tournament.id !== auth.payload.tournamentId) {
    return Response.json({ error: "Torneio não encontrado" }, { status: 404 });
  }
  if (tournament.status === "FINISHED") {
    return Response.json({ error: "Este torneio já foi finalizado" }, { status: 409 });
  }

  const participant = await prisma.participant.findUniqueOrThrow({
    where: { id: auth.payload.participantId },
  });

  // Block updates to already-scored picks
  const completedMatchIds = new Set(
    tournament.rounds.flatMap((r) => r.matches).filter((m) => m.status === "COMPLETE").map((m) => m.id)
  );
  if (picks.some((p) => completedMatchIds.has(p.matchId))) {
    return Response.json({ error: "Não é possível alterar palpites de partidas já resolvidas" }, { status: 409 });
  }

  const validation = validateBracketPicks({
    picks,
    rounds: tournament.rounds,
    joinedAtRound: participant.joinedAtRound,
  });
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      picks.map((pick) =>
        tx.pick.upsert({
          where: {
            participantId_matchId: {
              participantId: auth.payload.participantId,
              matchId: pick.matchId,
            },
          },
          create: {
            participantId: auth.payload.participantId,
            matchId: pick.matchId,
            pickedItemId: pick.pickedItemId,
          },
          update: { pickedItemId: pick.pickedItemId },
        })
      )
    );
    await tx.participant.update({
      where: { id: auth.payload.participantId },
      data: { hasSubmittedPicks: true },
    });
  });

  return Response.json({ success: true });
}

export async function GET(req: NextRequest) {
  const auth = await handleRequest(req, "participant");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const tournamentCode = searchParams.get("tournamentCode");

  if (!tournamentCode) {
    return Response.json({ error: "Código do torneio não informado" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { code: tournamentCode } });
  if (!tournament || tournament.id !== auth.payload.tournamentId) {
    return Response.json({ error: "Torneio não encontrado" }, { status: 404 });
  }

  const picks = await prisma.pick.findMany({
    where: { participantId: auth.payload.participantId },
    include: { pickedItem: true },
  });

  return Response.json({ picks });
}
