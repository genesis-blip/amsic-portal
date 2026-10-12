import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Landmark, PhoneCall } from 'lucide-react';
import { HOTLINES } from '../../data/hotlines';

export function LoginBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen font-poppins">
      <div aria-hidden className="fixed inset-0 scale-[1.06] bg-[url('/login-bg.jpg')] bg-cover bg-center blur-[5px] brightness-95" />
      <div aria-hidden className="fixed inset-0 bg-gradient-to-b from-[rgba(74,13,19,0.42)] via-[rgba(74,13,19,0.32)] to-[rgba(34,10,13,0.55)]" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-5">{children}</main>
    </div>
  );
}

function PanelHotlines() {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <nav aria-label="Emergency hotlines" className="mx-auto mt-7 w-full max-w-[280px] overflow-hidden rounded-xl border border-gold-100/35 bg-white/[0.07]">
      <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-gold-100 hover:bg-white/5">
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-100" />
        <PhoneCall className="h-3.5 w-3.5" aria-hidden /> Emergency Hotlines
        <ChevronDown className={`h-3.5 w-3.5 opacity-75 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      <ul id={listId} hidden={!open} className="border-t border-white/10 pb-1">
        {HOTLINES.map((h) => (
          <li key={h.label}>
            <a href={`tel:${h.tel}`} className="flex flex-col px-4 py-2 text-left hover:bg-white/5">
              <span className="text-[12px] text-maroon-100">{h.label}</span>
              <span className="text-[14px] font-semibold tracking-wide text-white">{h.number}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BrandPanel({ subtitle }: { subtitle: string }) {
  return (
    <aside aria-label="Barangay Amsic" className="relative flex w-full items-center justify-center bg-maroon px-8 py-9 text-white md:py-12">
      <div className="w-full text-center">
        <img src="/barangay-logo-round.png" alt="" className="mx-auto mb-4 h-16 w-16 rounded-full bg-white object-cover shadow-[0_6px_14px_rgba(0,0,0,0.25)] md:mb-6 md:h-24 md:w-24" />
        <h1 className="font-poppins text-[1.35rem] font-semibold text-white md:text-[1.7rem]">Barangay Amsic</h1>
        <p className="mt-1 text-[14px] text-maroon-100">{subtitle}</p>
        <div className="mx-auto mt-5 flex w-[200px] items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-white/30" />
          <Landmark className="h-5 w-5 text-gold-100" />
          <span className="h-px flex-1 bg-white/30" />
        </div>
        <PanelHotlines />
      </div>
    </aside>
  );
}

export function LoginCard({ form, subtitle }: { form: ReactNode; subtitle: string }) {
  return (
    <div className="grid w-full max-w-[920px] overflow-hidden rounded-[20px] border border-white/35 shadow-[0_8px_16px_rgba(20,6,8,0.28),0_30px_60px_-10px_rgba(20,6,8,0.45)] max-md:max-w-[440px] md:grid-cols-[1.05fr_0.95fr]">
      <div className="order-2 flex items-center bg-white/[0.97] px-7 py-9 md:order-1 md:px-11 md:py-12">
        <div className="w-full">{form}</div>
      </div>
      <div className="order-1 flex md:order-2"><BrandPanel subtitle={subtitle} /></div>
    </div>
  );
}
