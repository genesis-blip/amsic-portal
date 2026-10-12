import { useApi } from '../hooks/useApi';
import { residentsApi } from '../api/residents';
import { statsApi } from '../api/community';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { Bars } from '../components/ui/Bars';
import { formatDate, formatPeso, humanize } from '../utils/format';

export default function ReportsPage() {
  const demo = useApi(() => residentsApi.demographics(), []);
  const stats = useApi(() => statsApi.overview(), []);

  return (
    <>
      <PageHeader title="Reports" description="Population profile and service numbers for the barangay assembly and the annual report." actions={<button type="button" className="btn-secondary" onClick={() => window.print()}>Print</button>} />
      {(demo.loading || stats.loading) && <LoadingState />}
      {demo.error && <ErrorState message={demo.error} onRetry={demo.reload} />}
      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} />}

      {demo.data && (
        <>
          <h2 className="mb-3 text-display-md font-bold">Population</h2>
          <section className="panel panel-pad mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <div><p className="text-sm font-bold text-ink-muted">Residents</p><p className="tabular font-display text-3xl font-extrabold">{demo.data.total}</p></div>
            <div><p className="text-sm font-bold text-ink-muted">Average age</p><p className="tabular font-display text-3xl font-extrabold">{demo.data.averageAge}</p><p className="text-[13px] text-ink-muted">youngest {demo.data.youngestAge}, oldest {demo.data.oldestAge}</p></div>
            <div><p className="text-sm font-bold text-ink-muted">Senior citizens</p><p className="tabular font-display text-3xl font-extrabold">{demo.data.seniors}</p><p className="text-[13px] text-ink-muted">{demo.data.total ? Math.round((demo.data.seniors / demo.data.total) * 100) : 0}% of residents</p></div>
            <div><p className="text-sm font-bold text-ink-muted">Registered voters</p><p className="tabular font-display text-3xl font-extrabold">{demo.data.voters}</p><p className="text-[13px] text-ink-muted">{demo.data.voterRate}% of adults</p></div>
          </section>
          <div className="mb-10 grid gap-6 lg:grid-cols-3">
            <section className="panel panel-pad"><h3 className="mb-4 font-bold">Age groups</h3><Bars rows={Object.entries(demo.data.ageBrackets).map(([k, v]) => ({ label: `${k} years`, value: v }))} /></section>
            <section className="panel panel-pad"><h3 className="mb-4 font-bold">By purok</h3><Bars tone="stamp" rows={demo.data.byPurok.map((p) => ({ label: p.purok, value: p.count }))} /></section>
            <section className="panel panel-pad">
              <h3 className="mb-4 font-bold">Sex and civil status</h3>
              <Bars tone="sunflower" rows={[...Object.entries(demo.data.bySex), ...Object.entries(demo.data.byCivilStatus)].map(([k, v]) => ({ label: humanize(k), value: v }))} />
            </section>
          </div>
        </>
      )}

      {stats.data && (
        <>
          <h2 className="mb-3 text-display-md font-bold">Services</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="panel overflow-x-auto">
              <table className="ledger">
                <thead><tr><th>Month</th><th className="text-right">Requests filed</th><th className="text-right">Collected</th></tr></thead>
                <tbody>
                  {stats.data.trend.map((t) => (
                    <tr key={t.month}><td>{formatDate(`${t.month}-01`, { month: 'long', year: 'numeric' })}</td><td className="tabular text-right">{t.requests}</td><td className="tabular text-right">{formatPeso(t.collected)}</td></tr>
                  ))}
                  <tr className="font-bold"><td>Total</td><td className="tabular text-right">{stats.data.trend.reduce((s, t) => s + t.requests, 0)}</td><td className="tabular text-right">{formatPeso(stats.data.trend.reduce((s, t) => s + t.collected, 0))}</td></tr>
                </tbody>
              </table>
            </section>
            <section className="panel panel-pad space-y-5">
              <div><h3 className="mb-3 font-bold">Incidents by urgency</h3><Bars tone="sunflower" rows={['critical', 'high', 'medium', 'low'].map((u) => ({ label: humanize(u), value: stats.data!.incidents.byUrgency[u] ?? 0 }))} /></div>
              <div><h3 className="mb-3 font-bold">Blotter cases by status</h3><Bars rows={Object.entries(stats.data.blotters.byStatus).map(([k, v]) => ({ label: humanize(k), value: v }))} /></div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
