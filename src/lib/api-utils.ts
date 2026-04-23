import { NextRequest } from "next/server";
import {
  requireParticipant,
  requireCreator,
  AuthError,
  type TokenPayload,
} from "@/lib/auth";
import { requireUser, type SessionPayload } from "@/lib/session";

type AuthLevel = "participant" | "creator";

/**
 * Handles auth + body parsing in parallel with consistent error responses.
 * Returns null for body if not applicable (GET requests).
 */
export async function handleRequest<T = unknown>(
  req: NextRequest,
  auth: AuthLevel,
  opts: { parseBody: true }
): Promise<
  | { ok: true; payload: TokenPayload; body: T }
  | { ok: false; response: Response }
>;
export async function handleRequest(
  req: NextRequest,
  auth: AuthLevel,
  opts?: { parseBody?: false }
): Promise<
  | { ok: true; payload: TokenPayload }
  | { ok: false; response: Response }
>;
export async function handleRequest<T = unknown>(
  req: NextRequest,
  auth: AuthLevel,
  opts?: { parseBody?: boolean }
): Promise<
  | { ok: true; payload: TokenPayload; body?: T }
  | { ok: false; response: Response }
> {
  const authFn = auth === "creator" ? requireCreator : requireParticipant;
  const authPromise = authFn(req);
  const bodyPromise = opts?.parseBody
    ? req.json().catch(() => null as T | null)
    : Promise.resolve(undefined);

  let payload: TokenPayload;
  try {
    payload = await authPromise;
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, response: Response.json({ error: e.message }, { status: e.status }) };
    }
    throw e;
  }

  if (opts?.parseBody) {
    const body = await bodyPromise;
    if (body === null) {
      return { ok: false, response: Response.json({ error: "Invalid request body." }, { status: 400 }) };
    }
    return { ok: true, payload, body: body as T };
  }

  return { ok: true, payload };
}

/**
 * User-session variant of handleRequest. Resolves the session cookie
 * and (optionally) parses the JSON body in parallel.
 */
export async function handleUserRequest<T = unknown>(
  req: NextRequest,
  opts: { parseBody: true }
): Promise<
  | { ok: true; session: SessionPayload; body: T }
  | { ok: false; response: Response }
>;
export async function handleUserRequest(
  req: NextRequest,
  opts?: { parseBody?: false }
): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: Response }
>;
export async function handleUserRequest<T = unknown>(
  req: NextRequest,
  opts?: { parseBody?: boolean }
): Promise<
  | { ok: true; session: SessionPayload; body?: T }
  | { ok: false; response: Response }
> {
  const sessionPromise = requireUser(req);
  const bodyPromise = opts?.parseBody
    ? req.json().catch(() => null as T | null)
    : Promise.resolve(undefined);

  let session: SessionPayload;
  try {
    session = await sessionPromise;
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, response: Response.json({ error: e.message }, { status: e.status }) };
    }
    throw e;
  }

  if (opts?.parseBody) {
    const body = await bodyPromise;
    if (body === null) {
      return { ok: false, response: Response.json({ error: "Invalid request body." }, { status: 400 }) };
    }
    return { ok: true, session, body: body as T };
  }

  return { ok: true, session };
}
