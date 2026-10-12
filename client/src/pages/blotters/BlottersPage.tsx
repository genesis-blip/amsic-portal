import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { blottersApi } from '../../api/community';
import { blotterSchema, type BlotterFormValues } from '../../schemas/blotter';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Modal } from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { inputClass } from '../../utils/inputClass';
import { Stamp } from '../../components/ui/Stamp';
import { formatDate, todayIso } from '../../utils/format';
import { useAuth } from '../../auth/authContext';

const EMPTY: BlotterFormValues = { complainantName: '', respondentName: '', nature: '', details: '', incidentDate: todayIso() };

export default function BlottersPage() {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState('filed,for_hearing,mediation');
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => blottersApi.list({ status, search: q }), [status, q]);
  const [adding, setAdding] = useState(false);
  const form = useForm<BlotterFormValues>({ resolver: zodResolver(blotterSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: BlotterFormValues) => {
    try {
      const b = await blottersApi.create(v);
      toast.success(`Case ${b.caseNumber} filed`);
      navigate(`/app/blotters/${b._id}`);
    } catch (e) {
      form.setError('root', { message: applyServerErrors(e, form.setError) });
    }
  };

  const pastDeadline = data?.items.filter((b) => b.isPastDeadline).length ?? 0;

  return (
    <>
      <PageHeader title="Blotter" description="Complaints between residents. Each case should be settled within 15 days of filing." actions={can('blotter.manage') && <button type="button" className="btn-primary" onClick={() => { form.reset(EMPTY); setAdding(true); }}>File a complaint</button>} />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-[2fr_1fr]">
        <input className="input" aria-label="Search cases" placeholder="Case no., complainant, respondent or nature" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="filed,for_hearing,mediation">Open cases</option><option value="settled">Settled</option><option value="escalated,dismissed">Escalated or dismissed</option><option value="">All</option>
        </select>
      </div>
      {pastDeadline > 0 && <p className="mb-4 rounded-control bg-seal-soft px-4 py-3 text-sm font-bold text-seal-dark">{pastDeadline} open case{pastDeadline > 1 ? 's are' : ' is'} past the 15-day settlement period.</p>}
      <div className="panel overflow-hidden">
        {loading && <div className="px-4"><LoadingState /></div>}
        {error && <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>}
        {data && data.items.length === 0 && <EmptyState title="No cases here" body="Nothing matches this status." />}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="ledger ledger-stack sm:min-w-[720px]">
              <thead><tr><th>Case</th><th>Parties</th><th>Nature</th><th>Deadline</th><th>Status</th></tr></thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b._id}>
                    <td><Link to={`/app/blotters/${b._id}`} className="tabular font-bold text-brand-800 hover:underline">{b.caseNumber}</Link><span className="block text-[13px] text-ink-muted">Filed {formatDate(b.createdAt)}</span></td>
                    <td>{b.complainantName}<span className="block text-ink-muted">vs. {b.respondentName}</span></td>
                    <td>{b.nature}</td>
                    <td className={b.isPastDeadline ? 'font-bold text-seal' : ''}>{b.daysToDeadline === null ? 'Closed' : b.isPastDeadline ? `${-b.daysToDeadline} days late` : `${b.daysToDeadline} days left`}</td>
                    <td><Stamp status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={adding} title="File a complaint" onClose={() => setAdding(false)} wide>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && <p className="field-error">{errors.root.message}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Complainant" htmlFor="complainantName" error={errors.complainantName?.message} required><input id="complainantName" className={inputClass(errors.complainantName?.message)} {...form.register('complainantName')} /></Field>
            <Field label="Respondent" htmlFor="respondentName" error={errors.respondentName?.message} required><input id="respondentName" className={inputClass(errors.respondentName?.message)} {...form.register('respondentName')} /></Field>
            <Field label="Nature of complaint" htmlFor="nature" error={errors.nature?.message} required><input id="nature" className={inputClass(errors.nature?.message)} placeholder="e.g. Unpaid debt" {...form.register('nature')} /></Field>
            <Field label="Date of incident" htmlFor="incidentDate" error={errors.incidentDate?.message} required><input id="incidentDate" type="date" max={todayIso()} className={inputClass(errors.incidentDate?.message)} {...form.register('incidentDate')} /></Field>
          </div>
          <Field label="Details" htmlFor="details" error={errors.details?.message} required><textarea id="details" rows={4} className={inputClass(errors.details?.message)} {...form.register('details')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Filing…' : 'File complaint'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
