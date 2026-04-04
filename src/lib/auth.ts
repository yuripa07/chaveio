import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { JWT_EXPIRY } from "@/constants/auth";

export interface TokenPayload {
  participantId: string;
  tournamentId: string;
  isCreator: boolean;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as TokenPayload;
}

function extractBearer(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function requireParticipant(req: NextRequest): Promise<TokenPayload> {
  const token = extractBearer(req);
  if (!token) throw new AuthError("Missing token", 401);
  try {
    return await verifyToken(token);
  } catch {
    throw new AuthError("Invalid token", 401);
  }
}

export async function requireCreator(req: NextRequest): Promise<TokenPayload> {
  const payload = await requireParticipant(req);
  if (!payload.isCreator) throw new AuthError("Creator only", 403);
  return payload;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
