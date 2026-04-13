import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "./auth";

export const SESSION_COOKIE = "chaveio_session";
export const SESSION_EXPIRY = "30d";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_VERSION = 1;

export interface SessionPayload {
  userId: string;
  v: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: { userId: string }): Promise<string> {
  return new SignJWT({ userId: payload.userId, v: SESSION_VERSION })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(SESSION_EXPIRY)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as SessionPayload;
}

function readSessionCookie(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireUser(req: NextRequest): Promise<SessionPayload> {
  const token = readSessionCookie(req);
  if (!token) throw new AuthError("Sign in required.", 401);
  try {
    return await verifySession(token);
  } catch {
    throw new AuthError("Sign in required.", 401);
  }
}

export async function getOptionalUser(req: NextRequest): Promise<SessionPayload | null> {
  const token = readSessionCookie(req);
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({ ...cookieOptions(SESSION_MAX_AGE_SECONDS), value: token });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({ ...cookieOptions(0), value: "" });
}
