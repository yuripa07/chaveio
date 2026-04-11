import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleRequest } from "@/lib/api-utils";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  const [auth, { code, id }] = await Promise.all([
    handleRequest(req, "creator"),
    params,
  ]);
  if (!auth.ok) return auth.response;

  const tournament = await prisma.tournament.findUnique({
    where: { code },
  });

  if (!tournament || tournament.id !== auth.payload.tournamentId) {
    return Response.json({ error: "Tournament not found." }, { status: 404 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id },
  });

  if (!participant || participant.tournamentId !== tournament.id) {
    return Response.json({ error: "Participant not found." }, { status: 404 });
  }

  if (participant.isCreator) {
    return Response.json({ error: "Cannot kick the tournament creator." }, { status: 400 });
  }

  await prisma.participant.delete({ where: { id } });

  return Response.json({ success: true });
}
