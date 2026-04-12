export const AUTH_GUARD_REASON = {
  NOT_READY: "not-ready",
  NO_TOKEN: "no-token",
  NOT_CREATOR: "not-creator",
} as const;

export type AuthGuardReason = (typeof AUTH_GUARD_REASON)[keyof typeof AUTH_GUARD_REASON];

export type AuthGuardStatus =
  | { ready: false; reason: AuthGuardReason }
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
  if (!tokenReady) return { ready: false, reason: AUTH_GUARD_REASON.NOT_READY };
  if (!token) return { ready: false, reason: AUTH_GUARD_REASON.NO_TOKEN };
  if (requireCreator && !isCreator) return { ready: false, reason: AUTH_GUARD_REASON.NOT_CREATOR };
  return { ready: true, token, isCreator, participantId };
}
