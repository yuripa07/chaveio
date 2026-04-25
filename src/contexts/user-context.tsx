"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { clearAllStoredTokens } from "@/lib/token-storage";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  tier: string;
}

type UserContextValue = {
  user: AuthUser | null;
  ready: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  ready: false,
  refresh: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const body = (await res.json()) as { user: AuthUser | null };
      setUser(body.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {}
    clearAllStoredTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <UserContext.Provider value={{ user, ready, refresh, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
