const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });
export const formatPeso = (n: number | null | undefined) => peso.format(n ?? 0);

export function formatDate(value?: string | null, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', ...opts });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatSlot(slot: string) {
  const [a, b] = slot.split('-');
  const to12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return { text: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`, ampm: h < 12 ? 'AM' : 'PM' };
  };
  const s = to12(a);
  const e = to12(b);
  return s.ampm === e.ampm ? `${s.text}–${e.text} ${e.ampm}` : `${s.text} ${s.ampm}–${e.text} ${e.ampm}`;
}

export const humanize = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—');

export const fullName = (p?: { firstName?: string; middleName?: string; lastName?: string; suffix?: string } | null) =>
  p ? [p.firstName, p.middleName ? `${p.middleName[0]}.` : '', p.lastName, p.suffix].filter(Boolean).join(' ') : '—';

export function todayIso() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export function relativeDays(n: number) {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

const METHOD_LABELS: Record<string, string> = { cash: 'Cash', gcash: 'GCash', maya: 'Maya', bank_transfer: 'Bank transfer', qrph: 'QR Ph (online)' };
export const formatMethod = (m?: string | null) => (m ? METHOD_LABELS[m] ?? humanize(m) : '—');
