import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCreator, AuthError } from "@/lib/auth";
import { getNextRoundSlot } from "@/lib/bracket";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
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

  const { code, id: matchId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { winnerId } = body as { winnerId: string };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      slots: true,
      round: true,
      tournament: true,
    },
  });

  if (!match || match.tournament.code !== code) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (match.status === "COMPLETE") {
    return Response.json({ error: "Match already resolved" }, { status: 409 });
  }

  const validItem = match.slots.find((s) => s.itemId === winnerId);
  if (!validItem) {
    return Response.json({ error: "Winner not in match slots" }, { status: 400 });
  }

  const { matchIndex, slotPosition } = getNextRoundSlot(match.matchNumber);
  const pointValue = match.round.pointValue;
  const roundNumber = match.round.roundNumber;
  const tournamentId = match.tournament.id;

  // All participants must have submitted picks before any match can be resolved
  const pendingCount = await prisma.participant.count({
    where: { tournamentId, hasSubmittedPicks: false },
  });
  if (pendingCount > 0) {
    return Response.json(
      { error: "All participants must submit their picks before matches can be resolved" },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // Mark match complete
    await tx.match.update({
      where: { id: matchId },
      data: { status: "COMPLETE", winnerId },
    });

    // Score picks
    const picks = await tx.pick.findMany({ where: { matchId } });
    await Promise.all(
      picks.map((pick) =>
        tx.pick.update({
          where: { id: pick.id },
          data: {
            isCorrect: pick.pickedItemId === winnerId,
            pointsEarned: pick.pickedItemId === winnerId ? pointValue : 0,
          },
        })
      )
    );

    // Find next round and advance winner
    const nextRound = await tx.round.findUnique({
      where: { tournamentId_roundNumber: { tournamentId, roundNumber: roundNumber + 1 } },
      include: { matches: true },
    });

    if (nextRound) {
      const nextMatch = nextRound.matches.find((m) => m.matchNumber === matchIndex + 1);
      if (nextMatch) {
        await tx.matchSlot.create({
          data: { matchId: nextMatch.id, itemId: winnerId, position: slotPosition },
        });
      }
    }

    // Check if all matches in current round are complete
    const pendingMatches = await tx.match.count({
      where: { roundId: match.round.id, status: { not: "COMPLETE" } },
    });

    if (pendingMatches === 0) {
      await tx.round.update({
        where: { id: match.round.id },
        data: { status: "COMPLETE" },
      });

      if (nextRound) {
        await tx.round.update({
          where: { id: nextRound.id },
          data: { status: "ACTIVE" },
        });
      } else {
        // Final round complete → finish tournament
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: "FINISHED", endedAt: new Date() },
        });
      }
    }
  });

  return Response.json({ success: true });
}
