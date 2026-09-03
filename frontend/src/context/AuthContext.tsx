import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiCall, AUTH_EXPIRED_EVENT, AUTH_USER_KEY, TOKEN_KEY } from '../api/client';
import type { AuthData } from '../api/types';

interface AuthContextValue {
  user: AuthData | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthData>;
  logout: () => void;
  updateSession: (changes: Partial<Omit<AuthData, 'token'>>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthData | null {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!token || !raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthData | null>(() => readStoredUser());

  const login = useCallback(async (email: string, password: string): Promise<AuthData> => {
    const response = await apiCall<AuthData>('POST', '/auth/login', { email, password });
    window.localStorage.setItem(TOKEN_KEY, response.data.token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data));
    setUser(response.data);
    return response.data;
  }, []);

  const logout = useCallback((): void => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  }, []);

  const updateSession = useCallback((changes: Partial<Omit<AuthData, 'token'>>): void => {
    setUser((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current, ...changes };
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    function handleExpired() {
      setUser(null);
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, login, logout, updateSession }),
    [user, login, logout, updateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
