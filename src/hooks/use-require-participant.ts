"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { useUser } from "@/contexts/user-context";
import { resolveAuthGuardStatus, AUTH_GUARD_REASON, type AuthGuardStatus } from "@/lib/auth-guard";

type Options = {
  requireCreator?: boolean;
};

/**
 * Auth guard for protected pages. Redirects unauthenticated users to the lobby
 * and optionally redirects non-creators to the bracket page.
 *
 * Requires both a valid tournament token (localStorage) AND an active user session.
 * This ensures logout immediately revokes access even when a token still exists.
 *
 * Returns an AuthGuardStatus discriminated union:
 *   { ready: false } — auth not yet confirmed; page should render its skeleton
 *   { ready: true, token, isCreator, participantId } — auth confirmed; page can load data
 *
 * Use clearToken via useTournamentToken() directly in the page for API error handling.
 */
export function useRequireParticipant(
  code: string,
  options?: Options
): AuthGuardStatus {
  const requireCreator = options?.requireCreator ?? false;
  const { token, tokenReady, isCreator, participantId } = useTournamentToken(code);
  const { user, ready: userReady } = useUser();
  const router = useRouter();

  const status = resolveAuthGuardStatus(
    tokenReady,
    userReady,
    token,
    user !== null,
    isCreator,
    participantId,
    requireCreator
  );

  const reason = status.ready ? null : status.reason;

  useEffect(() => {
    if (reason === null || reason === AUTH_GUARD_REASON.NOT_READY) return;
    if (reason === AUTH_GUARD_REASON.NO_TOKEN) {
      router.replace(`/tournament/${code}`);
    } else if (reason === AUTH_GUARD_REASON.NOT_CREATOR) {
      router.replace(`/tournament/${code}/bracket`);
    }
  }, [reason, code, router]);

  return status;
}
