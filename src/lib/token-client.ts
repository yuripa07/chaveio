/**
 * Decodes a JWT payload client-side (no signature verification).
 * Safe to use for display purposes only — server always re-verifies.
 */
export function decodeTokenPayload(token: string): {
  participantId: string;
  tournamentId: string;
  isCreator: boolean;
} | null {
  try {
    const [, payloadB64] = token.split(".");
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
