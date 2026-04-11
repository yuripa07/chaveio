export type AuthGuardStatus =
  | { ready: false; reason: "not-ready" | "no-token" | "not-creator" }
  | { ready: true; token: string; isCreator: boolean; participantId: string | null };

/**
 * Pure function that resolves the auth guard state for protected pages.
 * Separated from the React hook so it can be unit-tested without a browser environment.
 */
export function resolveAuthGuardStatus(
  tokenReady: boolean,
  token: string | null,
  isCreator: boolean,
  participantId: string | null,
  requireCreator: boolean
): AuthGuardStatus {
  if (!tokenReady) return { ready: false, reason: "not-ready" };
  if (!token) return { ready: false, reason: "no-token" };
  if (requireCreator && !isCreator) return { ready: false, reason: "not-creator" };
  return { ready: true, token, isCreator, participantId };
}
