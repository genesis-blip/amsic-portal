import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { residentsApi } from '../../api/residents';
import { parseApiError } from '../../lib/http';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Stamp } from '../../components/ui/Stamp';
import { formatDate, formatPeso, humanize } from '../../utils/format';
import { useAuth } from '../../auth/authContext';

export default function ResidentDetailPage() {
  const { can } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const { data: r, loading, error, reload } = useApi(() => residentsApi.get(id!), [id]);

  if (loading) return <LoadingState />;
  if (error || !r) return <ErrorState message={error ?? 'Resident not found'} onRetry={reload} />;

  const remove = async () => {
    try {
      await residentsApi.remove(r._id);
      toast.success(`${r.fullName} was removed`);
      navigate('/app/residents');
    } catch (e) {
      throw new Error(parseApiError(e).message);
    }
  };

  const facts: [string, string][] = [
    ['Resident no.', r.residentNo], ['Birthdate', `${formatDate(r.birthdate)} (${r.age} years)`], ['Sex', humanize(r.sex)],
    ['Civil status', humanize(r.civilStatus)], ['Purok', r.purok], ['Address', r.address], ['Mobile', r.contactNumber || '—'],
    ['Email', r.email || '—'], ['Occupation', r.occupation || '—'], ['Residency', `${humanize(r.residencyType)}, ${r.yearsOfResidency} years`],
    ['Voter', r.isVoter ? 'Registered voter' : 'Not registered'],
  ];

  return (
    <>
      <PageHeader
        title={r.fullName}
        description={r.isSenior ? 'Senior citizen. Document fees are 20% off.' : undefined}
        back={{ to: '/app/residents', label: 'Residents' }}
        actions={<>
          {can('documents.process') && <Link to={`/app/requests/new?resident=${r._id}`} className="btn-primary">New request</Link>}
          {can('residents.manage') && <Link to={`/app/residents/${r._id}/edit`} className="btn-secondary">Edit</Link>}
          {can('residents.manage') && <button type="button" className="btn-ghost text-seal" onClick={() => setConfirm(true)}>Delete</button>}
        </>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="panel panel-pad">
          <dl className="divide-y divide-paper-rule">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2.5 text-sm">
                <dt className="font-bold text-ink-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="space-y-6">
          <section className="panel panel-pad grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Requests', r.summary.totalRequests], ['Active', r.summary.activeRequests],
              ['Total paid', formatPeso(r.summary.totalPaid)], ['Health visits', r.summary.healthRecords],
            ].map(([k, v]) => (
              <div key={k as string}><p className="text-sm font-bold text-ink-muted">{k}</p><p className="tabular font-display text-xl font-extrabold">{v}</p></div>
            ))}
          </section>
          <section className="panel">
            <h2 className="border-b border-paper-line px-5 py-4 text-lg font-bold">Recent document requests</h2>
            {r.recentRequests.length === 0 ? (
              <p className="px-5 py-8 text-ink-muted">No requests yet.</p>
            ) : (
              <ul>
                {r.recentRequests.map((q) => (
                  <li key={q._id} className="border-b border-paper-rule last:border-0">
                    <Link to={`/app/requests/${q._id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-brand-50/60">
                      <span><span className="block font-bold">{q.documentType.name}</span><span className="text-sm text-ink-muted">{q.referenceNumber}, filed {formatDate(q.createdAt)}</span></span>
                      <Stamp status={q.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this resident?"
        message={`${r.fullName} (${r.residentNo}) will be removed. Residents with active requests cannot be deleted.`}
        confirmLabel="Delete resident"
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}
