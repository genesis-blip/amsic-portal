import { createContext, useContext } from 'react';
import type { Capability, Session } from '../types';
import type { OtpChallenge } from '../api/auth';

export interface AuthApi {
  user: Session | null | undefined;
  login: (username: string, password: string, portal: 'resident' | 'staff', remember?: boolean) => Promise<Session | OtpChallenge>;
  verifyOtp: (otpToken: string, code: string, remember?: boolean) => Promise<Session>;
  startSession: (token: string, user: Session, remember?: boolean) => void;
  setUser: (user: Session) => void;
  logout: () => void;
  can: (capability: Capability) => boolean;
}

export const AuthContext = createContext<AuthApi | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const homeFor = (user: Session) => (user.accountType === 'staff' ? '/app' : '/portal');
