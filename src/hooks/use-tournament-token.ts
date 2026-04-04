"use client";

import { useState, useMemo } from "react";
import { getStoredToken, setStoredToken } from "@/lib/token-storage";
import { decodeTokenPayload } from "@/lib/token-client";

type TokenState = {
  token: string | null;
  participantId: string | null;
  isCreator: boolean;
  setTokenFromResponse: (code: string, token: string) => void;
};

/**
 * Manages tournament JWT token from localStorage.
 * Automatically decodes participantId and isCreator.
 * If redirectOnMissing is set, the caller should handle the redirect.
 */
export function useTournamentToken(code: string): TokenState {
  // Read token once from localStorage via lazy init (SSR-safe: returns null on server)
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredToken(code);
  });

  const decoded = useMemo(() => {
    if (!token) return { participantId: null, isCreator: false };
    const payload = decodeTokenPayload(token);
    return {
      participantId: payload?.participantId ?? null,
      isCreator: payload?.isCreator ?? false,
    };
  }, [token]);

  function setTokenFromResponse(tournamentCode: string, newToken: string) {
    setStoredToken(tournamentCode, newToken);
    setToken(newToken);
  }

  return {
    token,
    participantId: decoded.participantId,
    isCreator: decoded.isCreator,
    setTokenFromResponse,
  };
}
