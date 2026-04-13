import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOptionalUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getOptionalUser(req);
  if (!session) return Response.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      tier: true,
    },
  });
  return Response.json({ user });
}
