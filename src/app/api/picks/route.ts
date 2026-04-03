import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant, AuthError } from "@/lib/auth";

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
  });

  if (!tournament || tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status !== "LOBBY") {
    return Response.json(
      { error: "Picks can only be submitted during LOBBY" },
      { status: 409 }
    );
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
