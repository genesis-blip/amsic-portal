import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { SESSION_EXPIRED_EVENT, tokenStore } from '../lib/http';
import { useToast } from '../hooks/useToast';
import type { Capability, Session } from '../types';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null | undefined>(() => (tokenStore.get() ? undefined : null));
  const toast = useToast();

  useEffect(() => {
    if (!tokenStore.get()) return;
    let alive = true;
    authApi.me()
      .then((u) => alive && setUser(u))
      .catch(() => { if (alive) { tokenStore.clear(); setUser(null); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onExpired = () => { setUser(null); toast.error('Your session has ended. Please log in again.'); };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [toast]);

  const startSession = useCallback((token: string, u: Session, remember = true) => { tokenStore.set(token, remember); setUser(u); }, []);

  const login = useCallback(async (username: string, password: string, portal: 'resident' | 'staff', remember = true) => {
    const res = await authApi.login(username, password, portal);
    if ('otpRequired' in res) return res;
    startSession(res.token, res.user, remember);
    return res.user;
  }, [startSession]);

  const verifyOtp = useCallback(async (otpToken: string, code: string, remember = true) => {
    const res = await authApi.verifyOtp(otpToken, code);
    startSession(res.token, res.user, remember);
    return res.user;
  }, [startSession]);

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const can = useCallback((capability: Capability) => !!user?.permissions.includes(capability), [user]);

  const value = useMemo(() => ({ user, login, verifyOtp, startSession, setUser, logout, can }), [user, login, verifyOtp, startSession, logout, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
