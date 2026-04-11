import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleRequest } from "@/lib/api-utils";
import { getNextRoundSlot } from "@/lib/bracket";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  const [auth, { code, id: matchId }] = await Promise.all([
    handleRequest<{ winnerId: string }>(req, "creator", { parseBody: true }),
    params,
  ]);
  if (!auth.ok) return auth.response;

  const { winnerId } = auth.body;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { slots: true, round: true, tournament: true },
  });

  if (!match || match.tournament.code !== code) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.tournament.id !== auth.payload.tournamentId) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }
  if (match.status === "COMPLETE") {
    return Response.json({ error: "Match already resolved" }, { status: 409 });
  }
  if (!match.slots.some((s) => s.itemId === winnerId)) {
    return Response.json({ error: "Winner is not in this match" }, { status: 400 });
  }

  // All participants must have submitted picks
  const pendingCount = await prisma.participant.count({
    where: { tournamentId: match.tournament.id, hasSubmittedPicks: false },
  });
  if (pendingCount > 0) {
    return Response.json(
      { error: "All participants must submit their picks before resolving matches" },
      { status: 409 }
    );
  }

  const { matchIndex, slotPosition } = getNextRoundSlot(match.matchNumber);
  const { pointValue, roundNumber } = match.round;
  const tournamentId = match.tournament.id;

  await prisma.$transaction(async (tx) => {
    // Mark match complete + score picks
    const [, picks] = await Promise.all([
      tx.match.update({ where: { id: matchId }, data: { status: "COMPLETE", winnerId } }),
      tx.pick.findMany({ where: { matchId } }),
    ]);

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

    // Advance winner to next round
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

    // Check if current round is fully complete
    const pendingMatches = await tx.match.count({
      where: { roundId: match.round.id, status: { not: "COMPLETE" } },
    });

    if (pendingMatches === 0) {
      await tx.round.update({ where: { id: match.round.id }, data: { status: "COMPLETE" } });

      if (nextRound) {
        await tx.round.update({ where: { id: nextRound.id }, data: { status: "ACTIVE" } });
      } else {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: "FINISHED", endedAt: new Date() },
        });
      }
    }
  });

  return Response.json({ success: true });
}
