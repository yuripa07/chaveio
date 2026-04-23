import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleAuthUrl,
  generateOAuthCodeVerifier,
  generateOAuthState,
} from "@/lib/oauth";
import {
  issueFlowToken,
  sanitizeReturnTo,
  setFlowCookie,
} from "@/lib/oauth-flow-cookie";

export async function GET(req: NextRequest) {
  const rawReturnTo = req.nextUrl.searchParams.get("returnTo");
  const returnTo = sanitizeReturnTo(rawReturnTo);

  const state = generateOAuthState();
  const codeVerifier = generateOAuthCodeVerifier();
  const authUrl = buildGoogleAuthUrl(state, codeVerifier);

  const flowToken = await issueFlowToken({ state, codeVerifier, returnTo });
  const response = NextResponse.redirect(authUrl);
  setFlowCookie(response, flowToken);
  return response;
}
