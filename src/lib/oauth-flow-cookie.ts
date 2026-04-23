import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "./auth";

export const FLOW_COOKIE = "chaveio_oauth_flow";
const FLOW_EXPIRY = "5m";
const FLOW_MAX_AGE_SECONDS = 5 * 60;
const RETURN_TO_ALLOWED = /^\/(?:tournament(?:\/[A-Z0-9]+)?)?$/;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/";
  return RETURN_TO_ALLOWED.test(raw) ? raw : "/";
}

export interface FlowPayload {
  state: string;
  codeVerifier: string;
  returnTo: string;
}

export async function issueFlowToken(payload: FlowPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(FLOW_EXPIRY)
    .sign(getSecret());
}

function cookieOptions(maxAge: number) {
  return {
    name: FLOW_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setFlowCookie(response: NextResponse, token: string) {
  response.cookies.set({ ...cookieOptions(FLOW_MAX_AGE_SECONDS), value: token });
}

export function clearFlowCookie(response: NextResponse) {
  response.cookies.set({ ...cookieOptions(0), value: "" });
}

export async function consumeFlow(
  req: NextRequest,
  stateFromQuery: string
): Promise<{ codeVerifier: string; returnTo: string }> {
  const cookie = req.cookies.get(FLOW_COOKIE)?.value;
  if (!cookie) throw new AuthError("OAuth flow expired or invalid.", 400);
  let payload: FlowPayload;
  try {
    const { payload: decoded } = await jwtVerify(cookie, getSecret());
    payload = decoded as unknown as FlowPayload;
  } catch {
    throw new AuthError("OAuth flow expired or invalid.", 400);
  }
  if (payload.state !== stateFromQuery) {
    throw new AuthError("OAuth flow expired or invalid.", 400);
  }
  return { codeVerifier: payload.codeVerifier, returnTo: payload.returnTo };
}
