import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { KeyRound, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../auth/authContext';
import { NAV } from './nav';

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <img src="/logo.png" alt="" className="h-10 w-10 rounded-full bg-white p-0.5" />
      <span className="leading-tight">
        <span className="block font-display text-[17px] font-extrabold text-white">Barangay Amsic</span>
        <span className="block text-[12px] text-brand-100">Angeles City, Pampanga</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.cap.some(can)) })).filter((g) => g.items.length > 0);
  return (
    <nav aria-label="Main" className="space-y-6">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[12px] font-bold text-brand-200">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-control px-3 py-2 text-[14px] font-bold transition-colors ${
                      isActive ? 'bg-white text-brand-800' : 'text-brand-50 hover:bg-brand-900'
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBox({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="mt-auto border-t border-brand-700 pt-4">
      <p className="px-3 font-bold text-white">{user.name}</p>
      <p className="px-3 text-[13px] text-brand-200">{user.roleLabel}</p>
      <div className="mt-3 grid gap-0.5">
        <NavLink to="/app/account" onClick={onNavigate} className="flex items-center gap-3 rounded-control px-3 py-2 text-[14px] font-bold text-brand-50 hover:bg-brand-900">
          <KeyRound className="h-[18px] w-[18px]" aria-hidden /> My account
        </NavLink>
        <button type="button" onClick={logout} className="flex items-center gap-3 rounded-control px-3 py-2 text-left text-[14px] font-bold text-brand-50 hover:bg-brand-900">
          <LogOut className="h-[18px] w-[18px]" aria-hidden /> Log out
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto bg-brand-800 px-4 py-6 lg:flex">
        <div className="mb-8 px-2"><Brand /></div>
        <NavList />
        <div className="mt-auto pt-8"><UserBox /></div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-brand-800 px-4 py-3 lg:hidden">
        <Brand />
        <button type="button" className="rounded-control p-2 text-white hover:bg-brand-900" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-brand-800 px-4 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <Brand />
              <button type="button" className="rounded-control p-2 text-white hover:bg-brand-900" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="mt-8"><UserBox onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
