import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleUserRequest } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const result = await handleUserRequest(req);
  if (!result.ok) return result.response;
  const { session } = result;

  const rows = await prisma.participant.findMany({
    where: { userId: session.userId },
    include: {
      tournament: {
        include: { _count: { select: { participants: true } } },
      },
    },
    orderBy: { tournament: { createdAt: "desc" } },
  });

  const tournaments = rows.map((p) => ({
    code: p.tournament.code,
    name: p.tournament.name,
    status: p.tournament.status,
    isCreator: p.isCreator,
    hasSubmittedPicks: p.hasSubmittedPicks,
    participantCount: p.tournament._count.participants,
    createdAt: p.tournament.createdAt.toISOString(),
    startedAt: p.tournament.startedAt?.toISOString() ?? null,
    endedAt: p.tournament.endedAt?.toISOString() ?? null,
  }));

  return Response.json({ tournaments });
}
