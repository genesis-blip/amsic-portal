import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { applyServerErrors } from '../hooks/useServerErrors';
import { incidentsApi } from '../api/community';
import { parseApiError } from '../lib/http';
import { closeIncidentSchema, incidentSchema, INCIDENT_TYPES, URGENCIES, type CloseIncidentValues, type IncidentFormValues } from '../schemas/incident';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { inputClass } from '../utils/inputClass';
import { Stamp } from '../components/ui/Stamp';
import { formatDate, humanize, todayIso, toDateInput } from '../utils/format';
import type { Incident, IncidentStatus } from '../types';
import { useAuth } from '../auth/authContext';

const EMPTY: IncidentFormValues = { reporterName: '', type: 'noise', description: '', location: '', occurredAt: todayIso(), urgency: 'medium' };

export default function IncidentsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('open,under_review');
  const [urgency, setUrgency] = useState('');
  const [sort, setSort] = useState('priority');
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => incidentsApi.list({ status, urgency, sort, search: q }), [status, urgency, sort, q]);

  const [editing, setEditing] = useState<Incident | 'new' | null>(null);
  const [closing, setClosing] = useState<{ incident: Incident; to: IncidentStatus } | null>(null);
  const [deleting, setDeleting] = useState<Incident | null>(null);
  const form = useForm<IncidentFormValues>({ resolver: zodResolver(incidentSchema), defaultValues: EMPTY });
  const closeForm = useForm<CloseIncidentValues>({ resolver: zodResolver(closeIncidentSchema), defaultValues: { resolutionNotes: '' } });

  const open = (i: Incident | 'new') => {
    form.reset(i === 'new' ? EMPTY : { reporterName: i.reporterName, type: i.type as IncidentFormValues['type'], description: i.description, location: i.location, occurredAt: toDateInput(i.occurredAt), urgency: i.urgency });
    setEditing(i);
  };

  const onSave = async (v: IncidentFormValues) => {
    try {
      if (editing === 'new') await incidentsApi.create(v); else if (editing) await incidentsApi.update(editing._id, v);
      toast.success(editing === 'new' ? 'Incident reported' : 'Incident updated');
      setEditing(null);
      void reload();
    } catch (e) {
      form.setError('root', { message: applyServerErrors(e, form.setError) });
    }
  };

  const review = async (i: Incident) => {
    try {
      await incidentsApi.setStatus(i._id, 'under_review');
      toast.success('Incident is now under review');
      void reload();
    } catch (e) { toast.error(parseApiError(e).message); }
  };

  const onClose = async (v: CloseIncidentValues) => {
    if (!closing) return;
    try {
      await incidentsApi.setStatus(closing.incident._id, closing.to, v.resolutionNotes);
      toast.success(`Incident ${closing.to}`);
      setClosing(null);
      closeForm.reset();
      void reload();
    } catch (e) {
      closeForm.setError('root', { message: applyServerErrors(e, closeForm.setError) });
    }
  };

  const staleCount = data?.items.filter((i) => i.isStale).length ?? 0;

  return (
    <>
      <PageHeader title="Incident reports" description="Reports from residents, sorted by urgency and how long they have waited." actions={can('incidents.update') && <button type="button" className="btn-primary" onClick={() => open('new')}>Report incident</button>} />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" aria-label="Search incidents" placeholder="Reporter, place or description" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open,under_review">Still open</option><option value="open">New</option><option value="under_review">Under review</option><option value="resolved,dismissed">Closed</option><option value="">All</option>
        </select>
        <select className="input" aria-label="Urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option value="">Any urgency</option>{URGENCIES.map((u) => <option key={u} value={u}>{humanize(u)}</option>)}
        </select>
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="priority">Most urgent first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
      </div>
      {staleCount > 0 && <p className="mb-4 rounded-control bg-seal-soft px-4 py-3 text-sm font-bold text-seal-dark">{staleCount} report{staleCount > 1 ? 's have' : ' has'} waited longer than allowed for its urgency.</p>}

      <div className="space-y-3">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.items.length === 0 && <div className="panel"><EmptyState title="No incidents here" body="Nothing matches these filters." /></div>}
        {data?.items.map((i) => (
          <article key={i._id} className={`panel border-l-4 p-5 ${i.isStale ? 'border-l-seal' : 'border-l-brand-500'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold">{humanize(i.type)}</h2>
                  <Stamp status={i.urgency} label={`${i.urgency}`} tilt={false} />
                  {i.isStale && <Stamp status="overdue" label="Waiting too long" tilt={false} />}
                </div>
                <p className="mt-1 text-ink-soft">{i.description}</p>
                <p className="mt-2 text-sm text-ink-muted">{i.location}. Reported by {i.reporterName} on {formatDate(i.occurredAt)}, {i.daysOpen} day{i.daysOpen === 1 ? '' : 's'} {i.resolvedAt ? 'to close' : 'open'}.</p>
                {i.resolutionNotes && <p className="mt-2 text-sm"><strong>Outcome:</strong> {i.resolutionNotes}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                <Stamp status={i.status} />
                <div className="flex flex-wrap gap-1">
                  {can('incidents.update') && i.nextStatuses.includes('under_review') && <button type="button" className="btn-primary btn-sm" onClick={() => void review(i)}>Start review</button>}
                  {can('incidents.update') && i.nextStatuses.includes('resolved') && <button type="button" className="btn-primary btn-sm" onClick={() => setClosing({ incident: i, to: 'resolved' })}>Resolve</button>}
                  {can('incidents.update') && i.nextStatuses.includes('dismissed') && <button type="button" className="btn-secondary btn-sm" onClick={() => setClosing({ incident: i, to: 'dismissed' })}>Dismiss</button>}
                  {can('incidents.update') && ['open', 'under_review'].includes(i.status) && <button type="button" className="btn-ghost btn-sm" onClick={() => open(i)}>Edit</button>}
                  {can('incidents.delete') && <button type="button" className="btn-ghost btn-sm text-seal" onClick={() => setDeleting(i)}>Delete</button>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'Report an incident' : 'Edit incident'} onClose={() => setEditing(null)} wide>
        <form noValidate onSubmit={form.handleSubmit(onSave)} className="space-y-4">
          {form.formState.errors.root && <p className="field-error">{form.formState.errors.root.message}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reported by" htmlFor="reporterName" error={form.formState.errors.reporterName?.message} required><input id="reporterName" className={inputClass(form.formState.errors.reporterName?.message)} {...form.register('reporterName')} /></Field>
            <Field label="Date it happened" htmlFor="occurredAt" error={form.formState.errors.occurredAt?.message} required><input id="occurredAt" type="date" max={todayIso()} className={inputClass(form.formState.errors.occurredAt?.message)} {...form.register('occurredAt')} /></Field>
            <Field label="Type" htmlFor="type" error={form.formState.errors.type?.message} required><select id="type" className="input" {...form.register('type')}>{INCIDENT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
            <Field label="Urgency" htmlFor="urgency"><select id="urgency" className="input" {...form.register('urgency')}>{URGENCIES.map((u) => <option key={u} value={u}>{humanize(u)}</option>)}</select></Field>
          </div>
          <Field label="Location" htmlFor="location" error={form.formState.errors.location?.message} required><input id="location" className={inputClass(form.formState.errors.location?.message)} {...form.register('location')} /></Field>
          <Field label="What happened" htmlFor="description" error={form.formState.errors.description?.message} required><textarea id="description" rows={4} className={inputClass(form.formState.errors.description?.message)} {...form.register('description')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : editing === 'new' ? 'Submit report' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={closing !== null} title={closing?.to === 'resolved' ? 'Resolve incident' : 'Dismiss incident'} onClose={() => setClosing(null)}>
        <form noValidate onSubmit={closeForm.handleSubmit(onClose)} className="space-y-4">
          {closeForm.formState.errors.root && <p className="field-error">{closeForm.formState.errors.root.message}</p>}
          <Field label={closing?.to === 'resolved' ? 'How was it resolved?' : 'Why is it dismissed?'} htmlFor="resolutionNotes" error={closeForm.formState.errors.resolutionNotes?.message} required>
            <textarea id="resolutionNotes" rows={3} className={inputClass(closeForm.formState.errors.resolutionNotes?.message)} {...closeForm.register('resolutionNotes')} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setClosing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={closeForm.formState.isSubmitting}>{closing?.to === 'resolved' ? 'Mark resolved' : 'Dismiss report'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this incident report?"
        message="The report and its outcome will be removed permanently."
        confirmLabel="Delete report"
        onConfirm={async () => {
          try { await incidentsApi.remove(deleting!._id); } catch (e) { throw new Error(parseApiError(e).message); }
          toast.success('Incident report deleted');
          void reload();
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
