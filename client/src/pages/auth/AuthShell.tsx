import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LoginBackdrop } from './LoginLayout';

interface Props {
  tone: 'resident' | 'staff';
  title: string;
  intro: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function AuthShell({ tone, title, intro, children, footer, wide }: Props) {
  return (
    <LoginBackdrop>
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="overflow-hidden rounded-[20px] border border-white/35 bg-white/[0.97] shadow-[0_8px_16px_rgba(20,6,8,0.28),0_30px_60px_-10px_rgba(20,6,8,0.45)]">
          <Link to="/" className="flex items-center gap-3 bg-maroon px-6 py-4 text-white">
            <img src="/barangay-logo-round.png" alt="" className="h-11 w-11 rounded-full bg-white object-cover" />
            <span className="leading-tight">
              <span className="block font-poppins text-lg font-semibold">Barangay Amsic</span>
              <span className="block text-[13px] text-maroon-100">{tone === 'staff' ? 'Staff portal' : 'Community portal'}</span>
            </span>
          </Link>
          <div className="px-6 py-7 sm:px-9">
            <h1 className="font-poppins text-[1.5rem] font-semibold text-ink">{title}</h1>
            <p className="mt-1 text-ink-soft">{intro}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-white [&_a]:text-white">{footer}</div>}
      </div>
    </LoginBackdrop>
  );
}
