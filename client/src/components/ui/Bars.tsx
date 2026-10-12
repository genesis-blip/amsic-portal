interface BarsProps { rows: { label: string; value: number; display?: string }[]; tone?: 'brand' | 'stamp' | 'sunflower'; wideLabels?: boolean }

const FILL = { brand: 'bg-brand-500', stamp: 'bg-stamp', sunflower: 'bg-sunflower' };

export function Bars({ rows, tone = 'brand', wideLabels = false }: BarsProps) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className={`grid items-center gap-x-3 gap-y-1 text-sm ${wideLabels ? 'grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,14rem)_1fr_auto]' : 'grid-cols-[minmax(0,7.5rem)_1fr_auto]'}`}>
          <span className={`text-ink-soft ${wideLabels ? 'col-span-2 sm:col-span-1' : 'truncate'}`}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-paper">
            <span className={`block h-full rounded-full ${FILL[tone]}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="tabular min-w-[2.5rem] text-right font-bold">{r.display ?? r.value}</span>
        </li>
      ))}
    </ul>
  );
}
