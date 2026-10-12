import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../hooks/useServerErrors';
import { sosApi } from '../api/community';
import { parseApiError } from '../lib/http';
import { EMERGENCY_TYPES, sosSchema, type SosFormValues } from '../schemas/sos';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { Field } from '../components/ui/Field';
import { inputClass } from '../utils/inputClass';
import { Stamp } from '../components/ui/Stamp';
import { ResidentPicker } from '../components/ResidentPicker';
import { formatDateTime, humanize } from '../utils/format';
import type { SosAlert, SosStatus } from '../types';
import { useAuth } from '../auth/authContext';
import { HotlineList } from '../components/HotlineList';

const minutes = (m: number | null) => (m === null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`);

export default function SosPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('active,acknowledged');
  const alerts = useApi(() => sosApi.list({ status }), [status]);
  const metrics = useApi(() => sosApi.metrics(), []);
  const [adding, setAdding] = useState(false);
  const form = useForm<SosFormValues>({ resolver: zodResolver(sosSchema), defaultValues: { resident: '', emergencyType: 'medical', message: '', location: '' } });

  const refresh = () => { void alerts.reload(); void metrics.reload(); };
  const move = async (a: SosAlert, to: SosStatus) => {
    try {
      await sosApi.setStatus(a._id, to);
      toast.success(to === 'acknowledged' ? 'Responder is on the way' : 'Alert resolved');
      refresh();
    } catch (e) { toast.error(parseApiError(e).message); }
  };
  const onSubmit = async (v: SosFormValues) => {
    try {
      await sosApi.create(v);
      toast.success('SOS alert logged');
      setAdding(false);
      form.reset();
      refresh();
    } catch (e) { form.setError('root', { message: applyServerErrors(e, form.setError) }); }
  };

  return (
    <>
      <PageHeader title="SOS alerts" description="Emergency calls from residents. Acknowledge as soon as a tanod or responder is on the way." actions={can('sos.respond') && <button type="button" className="btn-danger" onClick={() => setAdding(true)}>Log an SOS call</button>} />

      {metrics.data && (
        <section className="panel panel-pad mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div><p className="text-sm font-bold text-ink-muted">Waiting now</p><p className={`tabular font-display text-3xl font-extrabold ${metrics.data.active ? 'text-seal' : ''}`}>{metrics.data.active}</p></div>
          <div><p className="text-sm font-bold text-ink-muted">Average response</p><p className="tabular font-display text-3xl font-extrabold">{minutes(metrics.data.averageResponseMinutes)}</p></div>
          <div><p className="text-sm font-bold text-ink-muted">Average to resolve</p><p className="tabular font-display text-3xl font-extrabold">{minutes(metrics.data.averageResolutionMinutes)}</p></div>
          <div><p className="text-sm font-bold text-ink-muted">Fastest response</p><p className="tabular font-display text-3xl font-extrabold">{minutes(metrics.data.fastestResponseMinutes)}</p></div>
        </section>
      )}
      {metrics.error && <div className="mb-6"><ErrorState message={metrics.error} onRetry={metrics.reload} /></div>}

      <div className="mb-3 flex gap-1 border-b border-paper-line" role="tablist" aria-label="Status">
        {[['active,acknowledged', 'Open'], ['resolved', 'Resolved'], ['', 'All']].map(([v, l]) => (
          <button key={l} type="button" role="tab" aria-selected={status === v} onClick={() => setStatus(v)} className={`-mb-px border-b-[3px] px-3 py-2 text-sm font-bold ${status === v ? 'border-seal text-seal' : 'border-transparent text-ink-muted hover:text-ink'}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {alerts.loading && <LoadingState />}
        {alerts.error && <ErrorState message={alerts.error} onRetry={alerts.reload} />}
        {alerts.data && alerts.data.items.length === 0 && <div className="panel"><EmptyState title={status.includes('active') ? 'No open emergencies' : 'No alerts here'} body={status.includes('active') ? 'All SOS calls have been handled.' : undefined} /></div>}
        {alerts.data?.items.map((a) => (
          <article key={a._id} className={`panel p-5 ${a.status === 'active' ? 'border-2 border-seal' : ''}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold">{humanize(a.emergencyType)} emergency</h2><Stamp status={a.status} /></div>
                <p className="mt-1 text-ink-soft">“{a.message}”</p>
                <p className="mt-2 text-sm text-ink-muted">{a.resident.firstName} {a.resident.lastName}, {a.resident.purok}. {a.location}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Called {formatDateTime(a.createdAt)}.
                  {a.status === 'active' && <strong className="text-seal"> Waiting {minutes(a.minutesWaiting)}.</strong>}
                  {a.responseMinutes !== null && ` Responded in ${minutes(a.responseMinutes)}.`}
                  {a.resolutionMinutes !== null && ` Resolved in ${minutes(a.resolutionMinutes)}.`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {a.resident.contactNumber && <a href={`tel:${a.resident.contactNumber}`} className="btn-secondary btn-sm"><Phone className="h-4 w-4" aria-hidden />Call</a>}
                {can('sos.respond') && a.nextStatuses.includes('acknowledged') && <button type="button" className="btn-danger btn-sm" onClick={() => void move(a, 'acknowledged')}>Responder on the way</button>}
                {can('sos.respond') && a.nextStatuses.includes('resolved') && <button type="button" className="btn-primary btn-sm" onClick={() => void move(a, 'resolved')}>Resolve</button>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <HotlineList className="mt-8 max-w-xl" title="Hotlines for responders" />

      <Modal open={adding} title="Log an SOS call" onClose={() => setAdding(false)}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && <p className="field-error">{form.formState.errors.root.message}</p>}
          <Field label="Resident who needs help" htmlFor="sosResident" error={form.formState.errors.resident?.message} required>
            <Controller control={form.control} name="resident" render={({ field }) => (
              <ResidentPicker id="sosResident" value={field.value} error={form.formState.errors.resident?.message} onChange={(v, r) => { field.onChange(v); if (r) form.setValue('location', r.address); }} />
            )} />
          </Field>
          <Field label="Emergency" htmlFor="emergencyType"><select id="emergencyType" className="input" {...form.register('emergencyType')}>{EMERGENCY_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
          <Field label="What is happening" htmlFor="message" error={form.formState.errors.message?.message} required><textarea id="message" rows={2} className={inputClass(form.formState.errors.message?.message)} {...form.register('message')} /></Field>
          <Field label="Location" htmlFor="location" error={form.formState.errors.location?.message} required hint="Filled with the resident’s address; change it if they are elsewhere"><input id="location" className={inputClass(form.formState.errors.location?.message)} {...form.register('location')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn-danger" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : 'Log SOS'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
