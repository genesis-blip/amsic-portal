import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ClipboardList, FilePlus2, Home, LogOut, Siren, TriangleAlert, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/authContext';

const LINKS = [
  { to: '/portal', label: 'Home', icon: Home, end: true },
  { to: '/portal/requests/new', label: 'Request', icon: FilePlus2 },
  { to: '/portal/requests', label: 'My requests', icon: ClipboardList, end: true },
  { to: '/portal/report', label: 'Report', icon: TriangleAlert },
  { to: '/portal/profile', label: 'Profile', icon: UserRound },
];

export function PortalLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <header className="sticky top-0 z-40 border-b border-paper-line bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/portal" className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="" className="h-10 w-10 shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[16px] font-extrabold">Barangay Amsic</span>
              <span className="block truncate text-[13px] text-ink-muted">{user?.name}</span>
            </span>
          </Link>
          <nav aria-label="Resident portal" className="ml-auto hidden items-center gap-1 md:flex">
            {LINKS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `rounded-control px-3 py-2 text-sm font-bold ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-paper'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <Link to="/portal/sos" className="btn-danger ml-auto px-3 py-2 md:ml-2">
            <Siren className="h-5 w-5" aria-hidden /> SOS
          </Link>
          <button type="button" onClick={logout} className="btn-ghost hidden px-2 md:inline-flex" aria-label="Log out" title="Log out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 md:pt-10">
        <Outlet />
      </main>

      <nav aria-label="Resident portal" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-paper-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden print:hidden">
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${isActive ? 'text-brand-700' : 'text-ink-muted'}`}>
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
