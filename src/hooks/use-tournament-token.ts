"use client";

import { useMemo, useSyncExternalStore, useCallback } from "react";
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  subscribeStoredToken,
} from "@/lib/token-storage";
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

const getMountedServerSnapshot = () => false;
const getMountedClientSnapshot = () => true;
const getTokenServerSnapshot = () => null;

/**
 * Manages tournament JWT token from localStorage.
 * Automatically decodes participantId and isCreator.
 *
 * Uses useSyncExternalStore so that tokenReady returns false during SSR and
 * the first hydration render, then flips to true once mounted. Callers
 * should wait for tokenReady before redirecting on missing token to avoid
 * false redirects during hydration.
 */
export function useTournamentToken(code: string): TokenState {
  const token = useSyncExternalStore(
    subscribeStoredToken,
    () => getStoredToken(code),
    getTokenServerSnapshot,
  );

  const tokenReady = useSyncExternalStore(
    subscribeStoredToken,
    getMountedClientSnapshot,
    getMountedServerSnapshot,
  );

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
  }, []);

  const clearToken = useCallback(() => {
    clearStoredToken(code);
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
