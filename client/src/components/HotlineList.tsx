import { Phone } from 'lucide-react';
import { HOTLINES } from '../data/hotlines';

interface Props {
  variant?: 'grid' | 'list';
  title?: string;
  className?: string;
}

export function HotlineList({ variant = 'list', title = 'Emergency hotlines', className = '' }: Props) {
  if (variant === 'grid') {
    return (
      <section className={className} aria-labelledby="hotlines-title">
        <h2 id="hotlines-title" className="text-display-md font-bold">{title}</h2>
        <p className="mt-1 text-ink-muted">Tap a number to call. Save them on your phone before you need them.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOTLINES.map((h) => (
            <li key={h.label}>
              <a href={`tel:${h.tel}`} className={`flex items-center gap-4 rounded-panel border px-4 py-3 transition-colors ${h.urgent ? 'border-seal bg-seal text-white hover:bg-seal-dark' : 'border-paper-line bg-white hover:border-brand-300 hover:bg-brand-50'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${h.urgent ? 'bg-white/15' : 'bg-brand-50 text-brand-600'}`}><Phone className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-bold ${h.urgent ? 'text-white/85' : 'text-ink-muted'}`}>{h.label}</span>
                  <span className="tabular block font-display text-lg font-extrabold leading-tight">{h.number}</span>
                  {h.note && <span className={`block text-[13px] ${h.urgent ? 'text-white/80' : 'text-ink-muted'}`}>{h.note}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section className={className} aria-label={title}>
      <h2 className="mb-2 font-display text-[15px] font-bold">{title}</h2>
      <ul className="divide-y divide-paper-rule rounded-control border border-paper-line bg-white">
        {HOTLINES.map((h) => (
          <li key={h.label}>
            <a href={`tel:${h.tel}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-brand-50">
              <span className={h.urgent ? 'font-bold text-seal' : 'text-ink-soft'}>{h.label}</span>
              <span className={`tabular whitespace-nowrap font-bold ${h.urgent ? 'text-seal' : 'text-ink'}`}>{h.number}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
