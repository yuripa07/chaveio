import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeGoogleCodeForUser } from "@/lib/oauth";
import { clearFlowCookie, consumeFlow } from "@/lib/oauth-flow-cookie";
import { setSessionCookie, signSession } from "@/lib/session";
import { AuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?auth_error=invalid_callback", req.url));
  }

  let codeVerifier: string;
  let returnTo: string;
  try {
    const consumed = await consumeFlow(req, state);
    codeVerifier = consumed.codeVerifier;
    returnTo = consumed.returnTo;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.redirect(new URL("/?auth_error=flow_expired", req.url));
    }
    throw e;
  }

  let googleUser;
  try {
    googleUser = await exchangeGoogleCodeForUser(code, codeVerifier);
  } catch {
    return NextResponse.redirect(new URL("/?auth_error=oauth_failed", req.url));
  }

  const now = new Date();
  const user = await prisma.user.upsert({
    where: { googleSub: googleUser.sub },
    update: {
      email: googleUser.email,
      emailVerified: googleUser.email_verified,
      name: googleUser.name ?? null,
      avatarUrl: googleUser.picture ?? null,
      locale: googleUser.locale ?? null,
      lastLoginAt: now,
    },
    create: {
      googleSub: googleUser.sub,
      email: googleUser.email,
      emailVerified: googleUser.email_verified,
      name: googleUser.name ?? null,
      avatarUrl: googleUser.picture ?? null,
      locale: googleUser.locale ?? null,
      lastLoginAt: now,
    },
    select: { id: true },
  });

  const session = await signSession({ userId: user.id });
  const response = NextResponse.redirect(new URL(returnTo, req.url));
  setSessionCookie(response, session);
  clearFlowCookie(response);
  return response;
}
