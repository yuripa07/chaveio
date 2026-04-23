import * as arctic from "arctic";

export const GOOGLE_SCOPES = ["openid", "profile", "email"];

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  locale?: string;
}

let cached: arctic.Google | null = null;

function getClient(): arctic.Google {
  if (cached) return cached;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
    );
  }
  cached = new arctic.Google(clientId, clientSecret, redirectUri);
  return cached;
}

export function generateOAuthState(): string {
  return arctic.generateState();
}

export function generateOAuthCodeVerifier(): string {
  return arctic.generateCodeVerifier();
}

export function buildGoogleAuthUrl(state: string, codeVerifier: string): URL {
  return getClient().createAuthorizationURL(state, codeVerifier, GOOGLE_SCOPES);
}

export async function exchangeGoogleCodeForUser(
  code: string,
  codeVerifier: string
): Promise<GoogleUserInfo> {
  const tokens = await getClient().validateAuthorizationCode(code, codeVerifier);
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` },
  });
  if (!response.ok) {
    throw new Error(`Google userinfo request failed: ${response.status}`);
  }
  return (await response.json()) as GoogleUserInfo;
}
