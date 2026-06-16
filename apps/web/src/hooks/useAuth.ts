import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api';
import { clearTokens, getAccessToken, isRememberExpired, setTokens } from '../lib/authStorage';

interface User {
  id: string;
  email: string;
  nickname: string;
  onboardingDone: boolean;
  role: string;
  permissions?: import('@novel-reader/shared').UserPermissions;
}

interface LoginOptions {
  rememberDays?: 1 | 7 | 30 | 0;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, options?: LoginOptions) => Promise<void>;
  register: (email: string, password: string, nickname: string, code: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isRememberExpired()) {
      clearTokens();
      setUser(null);
      setLoading(false);
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string, options?: LoginOptions) => {
      const rememberDays = options?.rememberDays ?? 0;
      const tokens = await api.login({
        email,
        password,
        rememberDays,
      });
      setTokens(
        tokens.accessToken,
        tokens.refreshToken,
        rememberDays > 0 ? rememberDays : undefined,
      );
      setLoading(true);
      await refresh();
    },
    [refresh],
  );

  const register = useCallback(
    async (email: string, password: string, nickname: string, code: string) => {
      const tokens = await api.register({ email, password, nickname, code });
      clearTokens();
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      setLoading(true);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
