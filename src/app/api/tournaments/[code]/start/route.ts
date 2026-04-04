import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCreator, AuthError } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  let payload;
  try {
    payload = await requireCreator(req);
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
      participants: true,
      rounds: { orderBy: { roundNumber: "asc" } },
    },
  });

  if (!tournament || tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status !== "LOBBY") {
    return Response.json({ error: "Tournament already started" }, { status: 409 });
  }

  // All participants must have submitted full bracket picks
  const pending = tournament.participants.filter((p) => !p.hasSubmittedPicks);
  if (pending.length > 0) {
    return Response.json(
      {
        error: "All participants must submit their bracket picks before starting",
        pendingParticipants: pending.map((p) => p.displayName),
      },
      { status: 409 }
    );
  }

  // Bracket was already created at tournament creation — just activate round 1
  const round1 = tournament.rounds.find((r) => r.roundNumber === 1);
  if (!round1) {
    return Response.json({ error: "Bracket not found" }, { status: 500 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: round1.id },
      data: { status: "ACTIVE" },
    });
    await tx.tournament.update({
      where: { id: tournament.id },
      data: { status: "ACTIVE", startedAt: new Date() },
    });
  });

  return Response.json({ success: true });
}
