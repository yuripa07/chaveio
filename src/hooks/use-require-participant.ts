"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTournamentToken } from "@/hooks/use-tournament-token";
import { resolveAuthGuardStatus, type AuthGuardStatus } from "@/lib/auth-guard";

type Options = {
  requireCreator?: boolean;
};

/**
 * Auth guard for protected pages. Redirects unauthenticated users to the lobby
 * and optionally redirects non-creators to the bracket page.
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
  const router = useRouter();

  const status = resolveAuthGuardStatus(tokenReady, token, isCreator, participantId, requireCreator);

  const reason = status.ready ? null : status.reason;

  useEffect(() => {
    if (reason === null || reason === "not-ready") return;
    if (reason === "no-token") {
      router.replace(`/tournament/${code}`);
    } else if (reason === "not-creator") {
      router.replace(`/tournament/${code}/bracket`);
    }
  }, [reason, code, router]);

  return status;
}
