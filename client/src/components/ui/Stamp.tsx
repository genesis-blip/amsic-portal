type Tone = 'green' | 'blue' | 'red' | 'amber' | 'grey';

const TONES: Record<Tone, string> = {
  green: 'border-leaf text-leaf-dark',
  blue: 'border-stamp text-stamp',
  red: 'border-seal text-seal',
  amber: 'border-sunflower-dark text-sunflower-dark',
  grey: 'border-ink-faint text-ink-muted',
};

const STATUS_TONE: Record<string, Tone> = {
  pending: 'amber', processing: 'blue', ready: 'green', released: 'green', rejected: 'red', cancelled: 'grey',
  paid: 'green', unpaid: 'red', waived: 'grey', voided: 'grey',
  open: 'red', under_review: 'blue', resolved: 'green', dismissed: 'grey',
  filed: 'amber', for_hearing: 'blue', mediation: 'blue', settled: 'green', escalated: 'red',
  active: 'red', acknowledged: 'blue',
  critical: 'red', high: 'red', medium: 'amber', low: 'grey',
  overdue: 'red',
};

const LABELS: Record<string, string> = { pending: 'Received', for_hearing: 'For hearing', under_review: 'Under review' };

export function Stamp({ status, label, tilt = true }: { status: string; label?: string; tilt?: boolean }) {
  const tone = TONES[STATUS_TONE[status] ?? 'grey'];
  const text = label ?? LABELS[status] ?? status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-[4px] border-2 px-1.5 py-px font-display text-[11px] font-extrabold uppercase leading-4 tracking-wide ${tone} ${tilt ? '-rotate-2' : ''}`}
    >
      {text}
    </span>
  );
}
