import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { getOptionalUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await getOptionalUser(req);

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    include: {
      rounds: { where: { status: "ACTIVE" }, orderBy: { roundNumber: "asc" } },
    },
  });
  if (!tournament) {
    return Response.json({ error: "Tournament not found." }, { status: 404 });
  }

  if (!session) {
    return Response.json(
      { error: "Sign in required to join this tournament." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true },
  });
  if (!user) {
    return Response.json(
      { error: "Sign in required to join this tournament." },
      { status: 401 }
    );
  }

  const existing = await prisma.participant.findUnique({
    where: {
      tournamentId_userId: { tournamentId: tournament.id, userId: user.id },
    },
  });

  if (existing) {
    const token = await signToken({
      participantId: existing.id,
      tournamentId: tournament.id,
      isCreator: existing.isCreator,
    });
    return Response.json({ token }, { status: 200 });
  }

  if (tournament.status === "FINISHED") {
    return Response.json(
      { error: "This tournament has ended. New participants cannot join." },
      { status: 403 }
    );
  }

  const baseName = user.name?.trim() || "Participante";
  const displayName = await resolveUniqueDisplayName(tournament.id, baseName);

  let joinedAtRound: number | null = null;
  if (tournament.status === "ACTIVE") {
    joinedAtRound = tournament.rounds[0]?.roundNumber ?? null;
  }

  const participant = await prisma.participant.create({
    data: {
      tournamentId: tournament.id,
      userId: user.id,
      displayName,
      joinedAtRound,
      hasSubmittedPicks: false,
    },
  });

  const token = await signToken({
    participantId: participant.id,
    tournamentId: tournament.id,
    isCreator: false,
  });
  return Response.json({ token }, { status: 201 });
}

async function resolveUniqueDisplayName(
  tournamentId: string,
  baseName: string
): Promise<string> {
  const taken = await prisma.participant.findMany({
    where: {
      tournamentId,
      OR: [{ displayName: baseName }, { displayName: { startsWith: `${baseName} ` } }],
    },
    select: { displayName: true },
  });
  if (taken.length === 0) return baseName;

  const takenSet = new Set(taken.map((p) => p.displayName));
  if (!takenSet.has(baseName)) return baseName;

  for (let suffix = 2; suffix <= takenSet.size + 2; suffix++) {
    const candidate = `${baseName} ${suffix}`;
    if (!takenSet.has(candidate)) return candidate;
  }
  return `${baseName} ${takenSet.size + 2}`;
}
