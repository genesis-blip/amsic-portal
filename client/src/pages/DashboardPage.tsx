import { Link } from 'react-router-dom';
import { Siren } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { statsApi } from '../api/community';
import { requestsApi } from '../api/requests';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { Bars } from '../components/ui/Bars';
import { Stamp } from '../components/ui/Stamp';
import { formatDate, formatPeso, fullName, humanize, todayIso } from '../utils/format';
import { useAuth } from '../auth/authContext';

function Figure({ label, value, note, alert }: { label: string; value: string | number; note?: string; alert?: boolean }) {
  return (
    <div className={`border-l-4 px-4 py-2 ${alert ? 'border-seal' : 'border-brand-500'}`}>
      <p className="text-sm font-bold text-ink-muted">{label}</p>
      <p className={`tabular font-display text-[2rem] font-extrabold leading-tight ${alert ? 'text-seal' : 'text-ink'}`}>{value}</p>
      {note && <p className="text-[13px] text-ink-muted">{note}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi(() => statsApi.overview(), []);
  const overdue = useApi(() => (can('documents.view') ? requestsApi.overdue() : Promise.resolve(null)), []);

  return (
    <>
      <PageHeader
        title="Today at the Barangay Hall"
        description={formatDate(todayIso(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        actions={can('documents.process') && <Link to="/app/requests/new" className="btn-primary">New request</Link>}
      />
      {loading && <LoadingState label="Loading today’s numbers…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          {data.sos.active > 0 && (
            <Link to="/app/sos" className="mb-6 flex items-center gap-3 rounded-panel bg-seal px-5 py-4 font-bold text-white shadow-lift hover:bg-seal-dark">
              <Siren className="h-6 w-6 shrink-0" aria-hidden />
              {data.sos.active} active SOS alert{data.sos.active > 1 ? 's' : ''} waiting for a responder. Open SOS alerts.
            </Link>
          )}

          <section className="panel panel-pad grid grid-cols-2 gap-y-5 lg:grid-cols-4">
            <Figure label="Pickups today" value={data.requests.pickupsToday} note="booked for today" />
            <Figure label="Active requests" value={data.requests.active} note={`${data.requests.byStatus.pending ?? 0} newly received`} />
            <Figure label="Collected today" value={formatPeso(data.collections.today)} note={`${formatPeso(data.collections.thisMonth)} this month`} />
            <Figure label="Unpaid balance" value={formatPeso(data.requests.unpaidBalance)} note="on open requests" alert={data.requests.unpaidBalance > 0} />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {can('documents.view') && (
            <section className="panel">
              <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">
                <h2 className="text-lg font-bold">Needs follow-up</h2>
                <Link to="/app/requests?status=pending,processing,ready" className="text-sm font-bold text-stamp hover:underline">All active requests</Link>
              </div>
              {overdue.loading && <div className="px-5"><LoadingState /></div>}
              {overdue.error && <div className="p-5"><ErrorState message={overdue.error} onRetry={overdue.reload} /></div>}
              {overdue.data && overdue.data.total === 0 && <p className="px-5 py-8 text-ink-muted">Nothing is overdue. Every active request is on schedule.</p>}
              {overdue.data && overdue.data.total > 0 && (
                <ul>
                  {[...overdue.data.unclaimed, ...overdue.data.behindSchedule].map((r) => (
                    <li key={r._id} className="border-b border-paper-rule last:border-0">
                      <Link to={`/app/requests/${r._id}`} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-brand-50/60">
                        <div className="min-w-0">
                          <p className="font-bold">{fullName(r.resident)}</p>
                          <p className="text-sm text-ink-muted">{r.documentType.name}, {r.referenceNumber}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Stamp status="overdue" label={r.status === 'ready' ? 'Unclaimed' : 'Late'} />
                          <p className="mt-1 text-[13px] text-seal">{r.daysOverdue} day{r.daysOverdue === 1 ? '' : 's'} past pickup</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            )}

            <section className="panel panel-pad">
              <h2 className="mb-4 text-lg font-bold">Requests by status</h2>
              <Bars rows={(['pending', 'processing', 'ready', 'released', 'rejected', 'cancelled'] as const).map((s) => ({ label: s === 'pending' ? 'Received' : humanize(s), value: data.requests.byStatus[s] ?? 0 }))} />
              <p className="mt-4 border-t border-paper-rule pt-3 text-sm text-ink-muted">
                Average turnaround: <strong className="text-ink">{data.requests.avgTurnaroundDays ?? '—'} days</strong> from request to release
              </p>
            </section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="panel panel-pad">
              <h2 className="mb-4 text-lg font-bold">Last six months</h2>
              <Bars tone="stamp" rows={data.trend.map((t) => ({ label: formatDate(`${t.month}-01`, { month: 'long' }), value: t.collected, display: formatPeso(t.collected) }))} />
              <p className="mt-3 text-sm text-ink-muted">Money collected per month. {data.trend.reduce((s, t) => s + t.requests, 0)} requests were filed in this period.</p>
            </section>
            <section className="panel panel-pad">
              <h2 className="mb-4 text-lg font-bold">Most requested documents</h2>
              <Bars tone="sunflower" wideLabels rows={data.requests.topDocuments.map((d) => ({ label: d.name, value: d.count }))} />
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-paper-rule pt-4 text-center text-sm">
                <Link to="/app/residents" className="rounded-control px-2 py-2 hover:bg-brand-50"><span className="tabular block font-display text-xl font-extrabold">{data.residents.total}</span>residents</Link>
                <Link to="/app/incidents" className="rounded-control px-2 py-2 hover:bg-brand-50"><span className="tabular block font-display text-xl font-extrabold">{data.incidents.open}</span>open incidents</Link>
                <Link to="/app/blotters" className="rounded-control px-2 py-2 hover:bg-brand-50"><span className="tabular block font-display text-xl font-extrabold">{data.blotters.open}</span>open cases</Link>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
