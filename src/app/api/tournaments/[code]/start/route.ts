import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleRequest } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = await handleRequest(req, "creator");
  if (!auth.ok) return auth.response;

  const { code } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    include: {
      participants: true,
      rounds: { orderBy: { roundNumber: "asc" } },
    },
  });

  if (!tournament || tournament.id !== auth.payload.tournamentId) {
    return Response.json({ error: "Torneio não encontrado" }, { status: 404 });
  }

  if (tournament.status !== "LOBBY") {
    return Response.json({ error: "O torneio já foi iniciado" }, { status: 409 });
  }

  const pending = tournament.participants.filter((p) => !p.hasSubmittedPicks);
  if (pending.length > 0) {
    return Response.json(
      {
        error: "Todos os participantes precisam enviar seus palpites antes de iniciar o torneio",
        pendingParticipants: pending.map((p) => p.displayName),
      },
      { status: 409 }
    );
  }

  const round1 = tournament.rounds.find((r) => r.roundNumber === 1);
  if (!round1) {
    return Response.json({ error: "Chaveamento não encontrado" }, { status: 500 });
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.round.update({ where: { id: round1.id }, data: { status: "ACTIVE" } }),
      tx.tournament.update({ where: { id: tournament.id }, data: { status: "ACTIVE", startedAt: new Date() } }),
    ]);
  });

  return Response.json({ success: true });
}
