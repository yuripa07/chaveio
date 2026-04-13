import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { getOptionalUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const [parsedBody, session] = await Promise.all([
    req.json().catch(() => null),
    getOptionalUser(req),
  ]);

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    include: {
      rounds: { where: { status: "ACTIVE" }, orderBy: { roundNumber: "asc" } },
    },
  });
  if (!tournament) {
    return Response.json({ error: "Tournament not found." }, { status: 404 });
  }

  if (tournament.authMode === "GOOGLE") {
    return handleGoogleJoin(tournament, session);
  }

  return handlePasswordJoin(tournament, parsedBody, session);
}

type TournamentRow = {
  id: string;
  status: string;
  authMode: string;
  passwordHash: string | null;
  rounds: { roundNumber: number }[];
};

async function handleGoogleJoin(
  tournament: TournamentRow,
  session: { userId: string } | null
) {
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

async function handlePasswordJoin(
  tournament: TournamentRow,
  body: unknown,
  session: { userId: string } | null
) {
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { displayName, password } = body as {
    displayName?: string;
    password?: string;
  };

  if (!displayName || !password) {
    return Response.json({ error: "Required fields are missing." }, { status: 400 });
  }

  if (!tournament.passwordHash) {
    return Response.json(
      { error: "This tournament does not use password login." },
      { status: 400 }
    );
  }

  const passwordOk = await bcrypt.compare(password, tournament.passwordHash);
  if (!passwordOk) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }

  const existing = await prisma.participant.findUnique({
    where: { tournamentId_displayName: { tournamentId: tournament.id, displayName } },
  });

  if (existing) {
    if (existing.userId && existing.userId !== session?.userId) {
      return Response.json(
        {
          error:
            "This participant is protected with Google. Sign in with Google to continue.",
        },
        { status: 401 }
      );
    }
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

  let joinedAtRound: number | null = null;
  if (tournament.status === "ACTIVE") {
    joinedAtRound = tournament.rounds[0]?.roundNumber ?? null;
  }

  const participant = await prisma.participant.create({
    data: {
      tournamentId: tournament.id,
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
