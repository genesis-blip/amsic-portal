import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { meApi } from '../../api/auth';
import { INCIDENT_TYPES, URGENCIES, portalIncidentSchema, type PortalIncidentValues } from '../../schemas/incident';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { Field } from '../../components/ui/Field';
import { Stamp } from '../../components/ui/Stamp';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import { formatDate, humanize, todayIso } from '../../utils/format';

const URGENCY_HINT: Record<(typeof URGENCIES)[number], string> = {
  low: 'Can wait a few days',
  medium: 'Should be checked this week',
  high: 'Needs attention today',
  critical: 'Someone could get hurt. For emergencies use SOS',
};

export default function PortalReportPage() {
  const toast = useToast();
  const mine = useApi(() => meApi.incidents(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, watch, formState: { errors, isSubmitting } } = useForm<PortalIncidentValues>({
    resolver: zodResolver(portalIncidentSchema),
    defaultValues: { type: undefined, description: '', location: '', occurredAt: todayIso(), urgency: 'medium' },
  });
  const urgency = watch('urgency');

  const onSubmit = async (values: PortalIncidentValues) => {
    setFormError(null);
    try {
      await meApi.reportIncident(values);
      toast.success('Report sent to the barangay');
      reset();
      void mine.reload();
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <h1 className="font-display text-display-md font-extrabold sm:text-display-lg">Report an incident</h1>
        <p className="mb-6 mt-1 text-ink-muted">The barangay staff and tanods will review it. You can follow the status here.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="panel panel-pad space-y-4">
          {formError && <ErrorState message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What happened" htmlFor="type" error={errors.type?.message} required>
              <select id="type" className={inputClass(errors.type?.message)} {...register('type')}>
                <option value="">Choose a type</option>
                {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
              </select>
            </Field>
            <Field label="When" htmlFor="occurredAt" error={errors.occurredAt?.message} required>
              <input id="occurredAt" type="date" max={todayIso()} className={inputClass(errors.occurredAt?.message)} {...register('occurredAt')} />
            </Field>
          </div>
          <Field label="Where" htmlFor="location" error={errors.location?.message} required hint="Street, landmark or purok">
            <input id="location" className={inputClass(errors.location?.message)} {...register('location')} />
          </Field>
          <Field label="Describe what happened" htmlFor="description" error={errors.description?.message} required>
            <textarea id="description" rows={4} className={inputClass(errors.description?.message)} {...register('description')} />
          </Field>
          <Field label="How urgent" htmlFor="urgency" error={errors.urgency?.message} hint={URGENCY_HINT[urgency]}>
            <select id="urgency" className="input" {...register('urgency')}>{URGENCIES.map((u) => <option key={u} value={u}>{humanize(u)}</option>)}</select>
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send report'}</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold lg:mt-3">My reports</h2>
        <div className="panel">
          {mine.loading && <LoadingState />}
          {mine.error && <div className="p-4"><ErrorState message={mine.error} onRetry={mine.reload} /></div>}
          {mine.data?.items.length === 0 && <EmptyState title="No reports yet" />}
          <ul>
            {mine.data?.items.map((i) => (
              <li key={i._id} className="border-b border-paper-rule px-5 py-4 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{humanize(i.type)}, {formatDate(i.occurredAt)}</p>
                  <Stamp status={i.status} />
                </div>
                <p className="mt-1 text-sm text-ink-muted">{i.location}</p>
                <p className="mt-1 line-clamp-2 text-sm">{i.description}</p>
                {i.resolutionNotes && <p className="mt-2 rounded-control bg-brand-50 px-3 py-2 text-sm text-brand-800"><strong>Barangay:</strong> {i.resolutionNotes}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
