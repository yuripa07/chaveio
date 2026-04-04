import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant, AuthError } from "@/lib/auth";
import { validateBracketPicks } from "@/lib/picks-validation";

export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = await requireParticipant(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tournamentCode, picks } = body as {
    tournamentCode: string;
    picks: { matchId: string; pickedItemId: string }[];
  };

  const tournament = await prisma.tournament.findUnique({
    where: { code: tournamentCode },
    include: {
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

  if (!tournament || tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status === "FINISHED") {
    return Response.json({ error: "Tournament is already finished" }, { status: 409 });
  }

  const participant = await prisma.participant.findUniqueOrThrow({
    where: { id: payload.participantId },
  });

  // Block updates to already-scored picks
  const completedMatchIds = tournament.rounds
    .flatMap((r) => r.matches)
    .filter((m) => m.status === "COMPLETE")
    .map((m) => m.id);

  const attemptedOnComplete = picks.filter((p) => completedMatchIds.includes(p.matchId));
  if (attemptedOnComplete.length > 0) {
    return Response.json(
      { error: "Cannot change picks for already-resolved matches" },
      { status: 409 }
    );
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
    for (const pick of picks) {
      await tx.pick.upsert({
        where: {
          participantId_matchId: {
            participantId: payload.participantId,
            matchId: pick.matchId,
          },
        },
        create: {
          participantId: payload.participantId,
          matchId: pick.matchId,
          pickedItemId: pick.pickedItemId,
        },
        update: { pickedItemId: pick.pickedItemId },
      });
    }
    await tx.participant.update({
      where: { id: payload.participantId },
      data: { hasSubmittedPicks: true },
    });
  });

  return Response.json({ success: true });
}

export async function GET(req: NextRequest) {
  let payload;
  try {
    payload = await requireParticipant(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const { searchParams } = new URL(req.url);
  const tournamentCode = searchParams.get("tournamentCode");

  if (!tournamentCode) {
    return Response.json({ error: "Missing tournamentCode" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { code: tournamentCode },
  });

  if (!tournament || tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Tournament not found" }, { status: 404 });
  }

  const picks = await prisma.pick.findMany({
    where: { participantId: payload.participantId },
    include: { pickedItem: true },
  });

  return Response.json({ picks });
}
