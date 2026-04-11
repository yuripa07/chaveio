import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { displayName, password } = body as {
    displayName: string;
    password: string;
  };

  if (!displayName || !password) {
    return Response.json({ error: "Campos obrigatórios não preenchidos" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    include: {
      rounds: { where: { status: "ACTIVE" }, orderBy: { roundNumber: "asc" } },
    },
  });
  if (!tournament) {
    return Response.json({ error: "Torneio não encontrado" }, { status: 404 });
  }

  const passwordOk = await bcrypt.compare(password, tournament.passwordHash);
  if (!passwordOk) {
    return Response.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const existing = await prisma.participant.findUnique({
    where: { tournamentId_displayName: { tournamentId: tournament.id, displayName } },
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
      { error: "Este torneio já foi finalizado. Novos participantes não podem entrar." },
      { status: 403 }
    );
  }

  let joinedAtRound: number | null = null;
  if (tournament.status === "ACTIVE") {
    const activeRound = tournament.rounds[0];
    joinedAtRound = activeRound?.roundNumber ?? null;
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
