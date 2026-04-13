import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { handleUserRequest } from "@/lib/api-utils";

interface LinkBody {
  displayName?: string;
  password?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const result = await handleUserRequest<LinkBody>(req, { parseBody: true });
  if (!result.ok) return result.response;
  const { session, body } = result;

  const { displayName, password } = body;
  if (!displayName || !password) {
    return Response.json({ error: "Required fields are missing." }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    select: { id: true, authMode: true, passwordHash: true },
  });
  if (!tournament) {
    return Response.json({ error: "Tournament not found." }, { status: 404 });
  }

  if (tournament.authMode !== "PASSWORD" || !tournament.passwordHash) {
    return Response.json(
      { error: "This tournament does not use password login." },
      { status: 400 }
    );
  }

  const passwordOk = await bcrypt.compare(password, tournament.passwordHash);
  if (!passwordOk) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }

  const participant = await prisma.participant.findUnique({
    where: {
      tournamentId_displayName: { tournamentId: tournament.id, displayName },
    },
  });
  if (!participant) {
    return Response.json({ error: "Participant not found." }, { status: 404 });
  }

  if (participant.userId && participant.userId !== session.userId) {
    return Response.json(
      { error: "This participant is already linked to another account." },
      { status: 409 }
    );
  }

  if (participant.userId !== session.userId) {
    const otherLinked = await prisma.participant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: tournament.id,
          userId: session.userId,
        },
      },
      select: { id: true },
    });
    if (otherLinked && otherLinked.id !== participant.id) {
      return Response.json(
        { error: "This account is already linked to another participant." },
        { status: 409 }
      );
    }

    await prisma.participant.update({
      where: { id: participant.id },
      data: { userId: session.userId },
    });
  }

  const token = await signToken({
    participantId: participant.id,
    tournamentId: tournament.id,
    isCreator: participant.isCreator,
  });
  return Response.json({ token }, { status: 200 });
}
