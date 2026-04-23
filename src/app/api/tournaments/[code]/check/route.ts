import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/** Public endpoint — no auth required. Used by the landing page to validate
 *  a tournament code before navigating, giving an early "not found" message. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { code },
    select: { status: true, authMode: true },
  });
  if (!tournament) {
    return Response.json({ exists: false }, { status: 404 });
  }
  return Response.json({
    exists: true,
    status: tournament.status,
    authMode: tournament.authMode,
  });
}
