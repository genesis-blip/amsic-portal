import { Link } from 'react-router-dom';
import { FilePlus2, Siren, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../auth/authContext';
import { meApi } from '../../api/auth';
import { bulletinsApi } from '../../api/community';
import { useApi } from '../../hooks/useApi';
import { Stamp } from '../../components/ui/Stamp';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { formatDate, formatDateTime, formatPeso, formatSlot, humanize, relativeDays } from '../../utils/format';
import { HotlineList } from '../../components/HotlineList';

export default function PortalHomePage() {
  const { user } = useAuth();
  const active = useApi(() => meApi.requests({ status: 'pending,processing,ready', sort: 'pickupDate' }), []);
  const news = useApi(() => bulletinsApi.list(), []);
  const sos = useApi(() => meApi.sos(), []);
  const openSos = sos.data?.items.find((a) => a.status !== 'resolved');

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-display-md font-extrabold sm:text-display-lg">Magandang araw, {user?.resident?.firstName}.</h1>
        <p className="mt-1 text-ink-muted">Resident no. {user?.resident?.residentNo}, {user?.resident?.purok}</p>
      </section>

      {openSos && (
        <Link to="/portal/sos" className="block rounded-panel border-2 border-seal bg-seal-soft px-5 py-4">
          <p className="font-display text-lg font-bold text-seal-dark">Your SOS is {openSos.status === 'active' ? 'waiting for a responder' : 'acknowledged: help is on the way'}</p>
          <p className="text-sm text-seal-dark">Sent {formatDateTime(openSos.createdAt)}. Open to see the status.</p>
        </Link>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Link to="/portal/requests/new" className="panel flex items-center gap-4 p-5 hover:border-brand-300">
          <FilePlus2 className="h-8 w-8 shrink-0 text-brand-600" aria-hidden />
          <span><span className="block font-display text-lg font-bold">Request a document</span><span className="text-sm text-ink-muted">Clearance, residency, indigency and more</span></span>
        </Link>
        <Link to="/portal/report" className="panel flex items-center gap-4 p-5 hover:border-brand-300">
          <TriangleAlert className="h-8 w-8 shrink-0 text-sunflower-dark" aria-hidden />
          <span><span className="block font-display text-lg font-bold">Report an incident</span><span className="text-sm text-ink-muted">Noise, theft, disputes, hazards</span></span>
        </Link>
        <Link to="/portal/sos" className="flex items-center gap-4 rounded-panel bg-seal p-5 text-white shadow-panel hover:bg-seal-dark">
          <Siren className="h-8 w-8 shrink-0" aria-hidden />
          <span><span className="block font-display text-lg font-bold">Emergency SOS</span><span className="text-sm text-white/85">Alert the tanod and barangay staff</span></span>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold">Requests in progress</h2>
          <Link to="/portal/requests" className="text-sm font-bold text-brand-700 hover:underline">All my requests</Link>
        </div>
        <div className="panel">
          {active.loading && <LoadingState />}
          {active.error && <div className="p-4"><ErrorState message={active.error} onRetry={active.reload} /></div>}
          {active.data?.items.length === 0 && (
            <EmptyState title="Nothing in progress" body="Requests you file show up here until you claim them." action={<Link to="/portal/requests/new" className="btn-primary">Request a document</Link>} />
          )}
          <ul>
            {active.data?.items.map((r) => (
              <li key={r._id} className="border-b border-paper-rule last:border-0">
                <Link to={`/portal/requests/${r._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-brand-50/60">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{r.documentType.name}</span>
                    <span className="text-sm text-ink-muted">{r.referenceNumber}. Pickup {formatDate(r.pickupDateIso, { weekday: 'short', month: 'short', day: 'numeric' })}, {formatSlot(r.pickupSlot)} ({relativeDays(r.daysUntilPickup)})</span>
                  </span>
                  <span className="tabular text-sm font-bold">{r.paymentStatus === 'waived' ? 'Free' : formatPeso(r.fees.total)}{r.paymentStatus === 'unpaid' && <span className="block text-[12px] font-normal text-seal">to pay at the hall</span>}</span>
                  <Stamp status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HotlineList variant="grid" />

      <section>
        <h2 className="mb-3 text-xl font-bold">Bulletin board</h2>
        {news.loading && <LoadingState />}
        {news.error && <ErrorState message={news.error} onRetry={news.reload} />}
        {news.data?.length === 0 && <p className="text-ink-muted">No announcements right now.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {news.data?.slice(0, 6).map((b) => (
            <article key={b._id} className="border-l-4 border-brand-500 bg-white px-4 py-3 shadow-panel">
              <p className="text-[13px] font-bold text-brand-700">{humanize(b.category)}{b.eventDate ? `, ${formatDate(b.eventDate)}` : ''}{b.isPinned ? ', pinned' : ''}</p>
              <h3 className="mt-0.5 font-display text-[17px] font-bold">{b.title}</h3>
              <p className="mt-1 whitespace-pre-line text-ink-muted">{b.content}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
