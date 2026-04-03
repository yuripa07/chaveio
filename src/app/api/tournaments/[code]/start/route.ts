import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCreator, AuthError } from "@/lib/auth";
import { generateFirstRoundPairs } from "@/lib/bracket";
import { computeRoundPoints } from "@/lib/points";

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
    include: { items: { orderBy: { seed: "asc" } } },
  });

  if (!tournament || tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status !== "LOBBY") {
    return Response.json({ error: "Tournament already started" }, { status: 409 });
  }

  const items = tournament.items;
  const n = items.length;
  const totalRounds = Math.log2(n);
  const pairs = generateFirstRoundPairs(n);

  let roundNames: string[] = [];
  try {
    roundNames = JSON.parse(tournament.roundNames || "[]");
  } catch { /* ignore */ }

  await prisma.$transaction(async (tx) => {
    // Create all rounds
    const rounds = await Promise.all(
      Array.from({ length: totalRounds }, (_, i) => {
        const roundNumber = i + 1;
        return tx.round.create({
          data: {
            tournamentId: tournament.id,
            roundNumber,
            name: roundNames[i] ?? null,
            status: roundNumber === 1 ? "ACTIVE" : "PENDING",
            pointValue: computeRoundPoints(roundNumber, totalRounds, n),
          },
        });
      })
    );

    // Create round 1 matches with slots
    await Promise.all(
      pairs.map(([seed1, seed2], i) => {
        const item1 = items.find((it) => it.seed === seed1)!;
        const item2 = items.find((it) => it.seed === seed2)!;
        return tx.match.create({
          data: {
            tournamentId: tournament.id,
            roundId: rounds[0].id,
            matchNumber: i + 1,
            slots: {
              create: [
                { itemId: item1.id, position: 1 },
                { itemId: item2.id, position: 2 },
              ],
            },
          },
        });
      })
    );

    // Create empty matches for future rounds
    for (let r = 1; r < totalRounds; r++) {
      const matchCount = n / Math.pow(2, r + 1);
      await Promise.all(
        Array.from({ length: matchCount }, (_, i) =>
          tx.match.create({
            data: {
              tournamentId: tournament.id,
              roundId: rounds[r].id,
              matchNumber: i + 1,
            },
          })
        )
      );
    }

    await tx.tournament.update({
      where: { id: tournament.id },
      data: { status: "ACTIVE", startedAt: new Date() },
    });
  });

  return Response.json({ success: true });
}
