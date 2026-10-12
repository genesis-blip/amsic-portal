import { Link } from 'react-router-dom';
import { Clock, MapPin, Phone } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { schedulesApi } from '../api/schedules';
import { documentTypesApi } from '../api/documentTypes';
import { bulletinsApi } from '../api/community';
import { ErrorState, LoadingState } from '../components/ui/States';
import { formatDate, formatPeso, formatSlot, humanize, todayIso } from '../utils/format';
import type { Availability } from '../types';
import { HotlineList } from '../components/HotlineList';
import { BARANGAY_HALL } from '../data/hotlines';

function nextWeekdays(count: number) {
  const days: string[] = [];
  const d = new Date(`${todayIso()}T00:00:00Z`);
  while (days.length < count) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function SlotBoard() {
  const { data, loading, error, reload } = useApi<Availability[]>(() => Promise.all(nextWeekdays(5).map((d) => schedulesApi.availability(d))), []);
  if (loading) return <LoadingState label="Checking pickup slots…" />;
  if (error || !data) return <ErrorState message={error ?? 'Could not load slots'} onRetry={reload} />;
  const slots = data[0].slots.map((s) => s.slot);
  return (
    <div>
      <table className="w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">Remaining pickup slots for the next five weekdays</caption>
        <thead>
          <tr>
            <th className="w-[4.5rem] pb-2 pr-1 text-left font-display text-[13px] font-bold text-brand-100 sm:w-28">Time</th>
            {data.map((d) => (
              <th key={d.date} className="pb-2 text-center font-display text-[12px] font-bold text-white sm:text-[13px]">
                {formatDate(d.date, { weekday: 'short' })}
                <span className="block font-sans text-[12px] font-normal text-brand-100">{formatDate(d.date, { month: 'short', day: 'numeric' })}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot}>
              <td className="py-1.5 pr-1 text-[13px] leading-tight text-brand-50 sm:whitespace-nowrap sm:text-sm">{formatSlot(slot)}</td>
              {data.map((d) => {
                const s = d.slots.find((x) => x.slot === slot)!;
                const closedOrFull = !d.isOpen ? 'Closed' : s.remaining === 0 ? 'Full' : null;
                const tone = !d.isOpen ? 'bg-brand-900/70 text-brand-200' : s.remaining === 0 ? 'bg-brand-500 text-white' : s.remaining === 1 ? 'bg-sunflower text-ink' : 'bg-white text-brand-800';
                return (
                  <td key={d.date} className="p-0.5 text-center sm:p-1">
                    <span className={`block rounded-[6px] px-0.5 py-1.5 text-[12px] font-bold ${tone}`} title={d.closedReason ?? undefined}>
                      {closedOrFull ?? <>{s.remaining}<span className="hidden sm:inline"> left</span></>}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LandingPage() {
  const types = useApi(() => documentTypesApi.list({ active: 'true' }), []);
  const news = useApi(() => bulletinsApi.list(), []);

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Barangay Amsic seal" className="h-11 w-11" />
          <span className="font-display text-lg font-extrabold leading-tight">Barangay Amsic<span className="block font-sans text-[13px] font-normal text-ink-muted">Angeles City, Pampanga</span></span>
        </Link>
        <nav aria-label="Log in" className="flex items-center gap-2">
          <Link to="/staff/login" className="btn-ghost hidden sm:inline-flex">Staff portal</Link>
          <Link to="/login" className="btn-secondary">Log in</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-12">
        <div className="min-w-0">
          <h1 className="font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-display-xl">
            Barangay papers, ready on the day you choose.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-ink-soft">
            Request a clearance, residency or indigency certificate, book a pickup hour, and see the exact fee before you leave home.
            Senior citizens get 20% off automatically.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/portal/requests/new" className="btn-primary px-5 py-3 text-base">Request a document</Link>
            <a href="#fees" className="btn-secondary px-5 py-3 text-base">See fees</a>
          </div>
        </div>
        <div className="min-w-0 rounded-[20px] bg-brand-800 p-4 shadow-lift sm:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-white">Pickup slots this week</h2>
            <span className="hidden text-[13px] text-brand-100 sm:inline">Updates as people book</span>
          </div>
          <SlotBoard />
        </div>
      </section>

      <section className="border-y border-paper-line bg-white">
        <ol className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {[
            ['Fill in the request', 'Choose the document, the purpose and how many copies. The fee is computed for you.'],
            ['Book a pickup hour', 'Pick a weekday and a one-hour slot. Full slots and holidays cannot be booked.'],
            ['Pay and claim', 'Pay at the treasurer’s window, then bring a valid ID on your pickup day.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-600 font-display font-extrabold text-brand-700">{i + 1}</span>
              <div>
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="mt-1 text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="fees" className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="text-display-md font-bold">Documents and fees</h2>
          <p className="mt-1 text-ink-muted">Fees are per copy. Certificate of Indigency is free. A number in a slot is how many places are left.</p>
          <div className="panel mt-5 overflow-x-auto">
            {types.loading && <LoadingState />}
            {types.error && <div className="p-4"><ErrorState message={types.error} onRetry={types.reload} /></div>}
            {types.data && (
              <table className="ledger">
                <thead><tr><th>Document</th><th className="text-right">Fee</th><th className="text-right">Ready in</th></tr></thead>
                <tbody>
                  {types.data.map((t) => (
                    <tr key={t._id}>
                      <td className="font-bold">{t.name}</td>
                      <td className="tabular text-right">{t.code === 'indigency' ? 'Free' : formatPeso(t.fee)}</td>
                      <td className="text-right text-ink-muted">{t.processingDays === 0 ? 'Same day' : `${t.processingDays} day${t.processingDays > 1 ? 's' : ''}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-display-md font-bold">From the bulletin board</h2>
          <div className="mt-5 space-y-4">
            {news.loading && <LoadingState />}
            {news.error && <ErrorState message={news.error} onRetry={news.reload} />}
            {news.data?.slice(0, 3).map((b) => (
              <article key={b._id} className="border-l-4 border-brand-500 bg-white px-4 py-3 shadow-panel">
                <p className="text-[13px] font-bold text-brand-700">{humanize(b.category)}{b.eventDate ? `, ${formatDate(b.eventDate)}` : ''}</p>
                <h3 className="mt-0.5 font-display text-[17px] font-bold">{b.title}</h3>
                <p className="mt-1 line-clamp-2 text-ink-muted">{b.content}</p>
              </article>
            ))}
            {news.data?.length === 0 && <p className="text-ink-muted">No announcements right now.</p>}
          </div>
        </div>
      </section>

      <div className="border-t border-paper-line bg-white">
        <HotlineList variant="grid" className="mx-auto max-w-6xl px-4 py-14 sm:px-6" />
      </div>

      <footer className="bg-brand-800 text-brand-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
          <p className="flex gap-2"><MapPin className="h-5 w-5 shrink-0" aria-hidden /> Barangay Hall, Amsic, Angeles City, Pampanga</p>
          <p className="flex gap-2"><Clock className="h-5 w-5 shrink-0" aria-hidden /> Monday to Friday, 8 AM to 5 PM</p>
          <p className="flex gap-2"><Phone className="h-5 w-5 shrink-0" aria-hidden /> Barangay Hall <a href={`tel:${BARANGAY_HALL.tel}`} className="font-bold text-white underline underline-offset-2">{BARANGAY_HALL.number}</a></p>
        </div>
      </footer>
    </div>
  );
}
