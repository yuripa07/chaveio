"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/token-storage";
import { decodeTokenPayload } from "@/lib/token-client";

type TokenState = {
  token: string | null;
  /** true once the localStorage read has completed after mount */
  tokenReady: boolean;
  participantId: string | null;
  isCreator: boolean;
  setTokenFromResponse: (code: string, token: string) => void;
  clearToken: () => void;
};

/**
 * Manages tournament JWT token from localStorage.
 * Automatically decodes participantId and isCreator.
 *
 * token starts as null on every render (SSR-safe). After mount, the stored
 * value is read and tokenReady flips to true. Callers should wait for
 * tokenReady before redirecting on missing token to avoid false redirects
 * during hydration.
 */
export function useTournamentToken(code: string): TokenState {
  // Always null on first render — matches server, avoids hydration mismatch.
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Read localStorage after mount (browser-only).
  useEffect(() => {
    setToken(getStoredToken(code));
    setTokenReady(true);
  }, [code]);

  const decoded = useMemo(() => {
    if (!token) return { participantId: null, isCreator: false };
    const payload = decodeTokenPayload(token);
    return {
      participantId: payload?.participantId ?? null,
      isCreator: payload?.isCreator ?? false,
    };
  }, [token]);

  const setTokenFromResponse = useCallback((tournamentCode: string, newToken: string) => {
    setStoredToken(tournamentCode, newToken);
    setToken(newToken);
  }, []);

  const clearToken = useCallback(() => {
    clearStoredToken(code);
    setToken(null);
  }, [code]);

  return {
    token,
    tokenReady,
    participantId: decoded.participantId,
    isCreator: decoded.isCreator,
    setTokenFromResponse,
    clearToken,
  };
}
