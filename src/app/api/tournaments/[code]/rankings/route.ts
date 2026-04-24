import { type NextRequest } from "next/server";
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
    select: { id: true, status: true },
  });

  if (!tournament || tournament.id !== auth.payload.tournamentId) {
    return Response.json({ error: "Tournament not found." }, { status: 403 });
  }

  if (tournament.status === "LOBBY") {
    return Response.json(
      { error: "Rankings are only available after the tournament starts." },
      { status: 403 }
    );
  }

  const [participants, grouped] = await Promise.all([
    prisma.participant.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, displayName: true },
    }),
    prisma.pick.groupBy({
      by: ["participantId"],
      where: { participant: { tournamentId: tournament.id } },
      _sum: { pointsEarned: true },
    }),
  ]);

  const pointsMap = new Map<string, number>();
  for (const g of grouped) {
    pointsMap.set(g.participantId, g._sum.pointsEarned ?? 0);
  }

  const sorted = participants
    .map((p) => ({
      participantId: p.id,
      displayName: p.displayName,
      totalPoints: pointsMap.get(p.id) ?? 0,
      rank: 0,
    }))
    .sort((a, b) =>
      b.totalPoints !== a.totalPoints
        ? b.totalPoints - a.totalPoints
        : a.displayName.localeCompare(b.displayName)
    );

  sorted.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return Response.json({ rankings: sorted });
}
