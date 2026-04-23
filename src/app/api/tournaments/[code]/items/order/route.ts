import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleRequest } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const [authResult, { code }] = await Promise.all([
    handleRequest<{ itemIds: string[] }>(req, "creator", { parseBody: true }),
    params,
  ]);
  if (!authResult.ok) return authResult.response;

  const { payload, body } = authResult;
  const { itemIds } = body;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return Response.json(
      { error: "Invalid candidates list." },
      { status: 400 }
    );
  }

  if (new Set(itemIds).size !== itemIds.length) {
    return Response.json(
      { error: "Candidates list contains duplicates." },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    include: {
      items: true,
      participants: { select: { hasSubmittedPicks: true } },
      rounds: {
        where: { roundNumber: 1 },
        include: {
          matches: {
            include: { slots: true },
            orderBy: { matchNumber: "asc" },
          },
        },
      },
    },
  });

  if (!tournament || tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Tournament not found." }, { status: 404 });
  }

  if (tournament.status !== "LOBBY") {
    return Response.json(
      { error: "Tournament has already started." },
      { status: 409 }
    );
  }

  if (tournament.participants.some((p) => p.hasSubmittedPicks)) {
    return Response.json(
      { error: "Cannot reorder: a participant has already submitted picks." },
      { status: 409 }
    );
  }

  const tournamentItemIds = new Set(tournament.items.map((i) => i.id));
  if (
    itemIds.length !== tournamentItemIds.size ||
    !itemIds.every((id) => tournamentItemIds.has(id))
  ) {
    return Response.json(
      { error: "Candidates list does not match tournament." },
      { status: 400 }
    );
  }

  const round1 = tournament.rounds[0];

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      itemIds.map((itemId, index) =>
        tx.tournamentItem.update({
          where: { id: itemId },
          data: { position: index + 1 },
        })
      )
    );

    await Promise.all(
      round1.matches.map((match) => {
        const i = match.matchNumber - 1;
        const slot1 = match.slots.find((s) => s.position === 1)!;
        const slot2 = match.slots.find((s) => s.position === 2)!;
        return Promise.all([
          tx.matchSlot.update({
            where: { id: slot1.id },
            data: { itemId: itemIds[i * 2] },
          }),
          tx.matchSlot.update({
            where: { id: slot2.id },
            data: { itemId: itemIds[i * 2 + 1] },
          }),
        ]);
      })
    );
  });

  return Response.json({ success: true });
}
