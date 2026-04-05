import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/codes";
import { signToken } from "@/lib/auth";
import { generateFirstRoundPairs } from "@/lib/bracket";
import { computeRoundPoints } from "@/lib/points";

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

  // Start hash immediately, generate code in parallel
  const hashPromise = bcrypt.hash(creatorPassword, 10);

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

  const passwordHash = await hashPromise;

  const tournament = await prisma.$transaction(async (tx) => {
    const newTournament = await tx.tournament.create({
      data: {
        code,
        name,
        roundNames: JSON.stringify(roundNames ?? []),
        items: {
          create: items.map((itemName, i) => ({ name: itemName, seed: i + 1 })),
        },
      },
      include: { items: { orderBy: { seed: "asc" } } },
    });

    const participant = await tx.participant.create({
      data: {
        tournamentId: newTournament.id,
        displayName: creatorName,
        passwordHash,
        isCreator: true,
      },
    });

    // Generate bracket at creation so participants can predict before start
    const n = newTournament.items.length;
    const numRounds = Math.log2(n);
    const pairs = generateFirstRoundPairs(n);
    let parsedRoundNames: string[] = [];
    try {
      parsedRoundNames = JSON.parse(newTournament.roundNames || "[]");
    } catch {}

    const rounds = await Promise.all(
      Array.from({ length: numRounds }, (_, i) => {
        const roundNumber = i + 1;
        return tx.round.create({
          data: {
            tournamentId: newTournament.id,
            roundNumber,
            name: parsedRoundNames[i] ?? null,
            status: "PENDING",
            pointValue: computeRoundPoints(roundNumber, numRounds, n),
          },
        });
      })
    );

    // Round 1 matches with seeded slots
    await Promise.all(
      pairs.map(([seed1, seed2], i) => {
        const item1 = newTournament.items.find((it) => it.seed === seed1)!;
        const item2 = newTournament.items.find((it) => it.seed === seed2)!;
        return tx.match.create({
          data: {
            tournamentId: newTournament.id,
            roundId: rounds[0].id,
            matchNumber: i + 1,
            slots: {
              create: [
                { itemId: item1.id, position: 1 },
                { itemId: item2.id, position: 2 },
              ],
            },
          },
        });
      })
    );

    // Empty matches for rounds 2+
    for (let r = 1; r < numRounds; r++) {
      const matchCount = n / Math.pow(2, r + 1);
      await Promise.all(
        Array.from({ length: matchCount }, (_, i) =>
          tx.match.create({
            data: {
              tournamentId: newTournament.id,
              roundId: rounds[r].id,
              matchNumber: i + 1,
            },
          })
        )
      );
    }

    return { newTournament, participant };
  });

  const token = await signToken({
    participantId: tournament.participant.id,
    tournamentId: tournament.newTournament.id,
    isCreator: true,
  });

  return Response.json({ code, token }, { status: 201 });
}
