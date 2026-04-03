import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/codes";
import { signToken } from "@/lib/auth";

function isPowerOfTwo(n: number) {
  return n >= 4 && n <= 32 && (n & (n - 1)) === 0;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, items, creatorName, creatorPassword, roundNames } = body as {
    name: string;
    items: string[];
    creatorName: string;
    creatorPassword: string;
    roundNames?: string[];
  };

  if (!name || !creatorName || !creatorPassword) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!Array.isArray(items) || !isPowerOfTwo(items.length)) {
    return Response.json(
      { error: "items must be a power of 2 between 4 and 32" },
      { status: 400 }
    );
  }

  const totalRounds = Math.log2(items.length);
  if (roundNames && roundNames.length !== totalRounds) {
    return Response.json(
      { error: `roundNames must have exactly ${totalRounds} entries` },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(creatorPassword, 10);

  // Generate unique code (retry on collision)
  let code = "";
  for (let i = 0; i < 5; i++) {
    const candidate = generateCode();
    const exists = await prisma.tournament.findUnique({ where: { code: candidate } });
    if (!exists) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return Response.json({ error: "Failed to generate unique code" }, { status: 500 });
  }

  const tournament = await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.create({
      data: {
        code,
        name,
        roundNames: JSON.stringify(roundNames ?? []),
        items: {
          create: items.map((itemName, i) => ({ name: itemName, seed: i + 1 })),
        },
      },
    });

    const participant = await tx.participant.create({
      data: {
        tournamentId: t.id,
        displayName: creatorName,
        passwordHash,
        isCreator: true,
      },
    });

    return { t, participant };
  });

  const token = await signToken({
    participantId: tournament.participant.id,
    tournamentId: tournament.t.id,
    isCreator: true,
  });

  return Response.json({ code, token }, { status: 201 });
}
