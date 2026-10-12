import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { homeFor, useAuth } from './authContext';
import { LoadingState } from '../components/ui/States';
import type { AccountType, Capability } from '../types';

interface Props {
  type: AccountType;
  anyOf?: Capability[];
  children: ReactNode;
}

export function RequireAuth({ type, anyOf, children }: Props) {
  const { user, can } = useAuth();
  const location = useLocation();

  if (user === undefined) return <div className="p-10"><LoadingState label="Checking your session…" /></div>;
  if (user === null) return <Navigate to={type === 'staff' ? '/staff/login' : '/login'} replace state={{ from: location.pathname }} />;
  if (user.accountType !== type) return <Navigate to={homeFor(user)} replace />;
  if (user.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  if (anyOf && !anyOf.some(can)) return <NoAccess />;
  return <>{children}</>;
}

function NoAccess() {
  return (
    <div className="panel panel-pad mx-auto mt-10 max-w-lg text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-seal" aria-hidden />
      <h1 className="mt-3 text-xl font-bold">Not part of your role</h1>
      <p className="mt-1 text-ink-muted">Your account cannot open this page. Ask the super admin if you need access.</p>
    </div>
  );
}
