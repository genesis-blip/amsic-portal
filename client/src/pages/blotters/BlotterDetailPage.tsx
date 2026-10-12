import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { blottersApi } from '../../api/community';
import { parseApiError } from '../../lib/http';
import { actionSchema, hearingSchema, type ActionFormValues, type HearingFormValues } from '../../schemas/blotter';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field } from '../../components/ui/Field';
import { inputClass } from '../../utils/inputClass';
import { Stamp } from '../../components/ui/Stamp';
import { formatDate, formatDateTime, humanize } from '../../utils/format';
import type { BlotterStatus } from '../../types';
import { useAuth } from '../../auth/authContext';

const ACTION: Record<BlotterStatus, string> = {
  filed: 'Filed', for_hearing: 'Set hearing', mediation: 'Move to mediation', settled: 'Mark settled', escalated: 'Escalate', dismissed: 'Dismiss case',
};

export default function BlotterDetailPage() {
  const { can } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: b, loading, error, reload } = useApi(() => blottersApi.get(id!), [id]);
  const [hearing, setHearing] = useState(false);
  const [confirm, setConfirm] = useState<BlotterStatus | 'delete' | null>(null);
  const actionForm = useForm<ActionFormValues>({ resolver: zodResolver(actionSchema), defaultValues: { action: '', note: '' } });
  const hearingForm = useForm<HearingFormValues>({ resolver: zodResolver(hearingSchema), defaultValues: { hearingDate: '', note: '' } });

  if (loading) return <LoadingState />;
  if (error || !b) return <ErrorState message={error ?? 'Case not found'} onRetry={reload} />;

  const addAction = async (v: ActionFormValues) => {
    try {
      await blottersApi.addAction(b._id, v);
      toast.success('Action added to the case');
      actionForm.reset();
      void reload();
    } catch (e) { actionForm.setError('root', { message: applyServerErrors(e, actionForm.setError) }); }
  };
  const setHearingDate = async (v: HearingFormValues) => {
    try {
      await blottersApi.setStatus(b._id, 'for_hearing', v);
      toast.success(`Hearing set for ${formatDate(v.hearingDate)}`);
      setHearing(false);
      hearingForm.reset();
      void reload();
    } catch (e) { hearingForm.setError('root', { message: applyServerErrors(e, hearingForm.setError) }); }
  };

  return (
    <>
      <PageHeader title={`Case ${b.caseNumber}`} description={`${b.complainantName} vs. ${b.respondentName}`} back={{ to: '/app/blotters', label: 'Blotter' }}
        actions={can('blotter.manage') && <button type="button" className="btn-ghost text-seal" onClick={() => setConfirm('delete')}>Delete</button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <section className="panel panel-pad">
            <div className="mb-4 flex items-center gap-3"><span className="scale-125"><Stamp status={b.status} /></span></div>
            <p className={`mb-4 text-sm ${b.isPastDeadline ? 'font-bold text-seal' : 'text-ink-muted'}`}>
              {b.daysToDeadline === null ? `Closed on ${formatDate(b.closedAt)}, ${b.daysOpen} days after filing.` : b.isPastDeadline ? `${-b.daysToDeadline} days past the settlement deadline (${formatDate(b.settlementDeadline)}).` : `${b.daysToDeadline} days left to settle, until ${formatDate(b.settlementDeadline)}.`}
            </p>
            {can('blotter.manage') && b.nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {b.nextStatuses.map((s) => (
                  <button key={s} type="button" className={s === 'settled' ? 'btn-primary' : 'btn-secondary'} onClick={() => (s === 'for_hearing' ? setHearing(true) : setConfirm(s))}>{ACTION[s]}</button>
                ))}
              </div>
            )}
          </section>
          <section className="panel panel-pad">
            <dl className="divide-y divide-paper-rule text-sm">
              {[['Nature', b.nature], ['Incident date', formatDate(b.incidentDate)], ['Hearing', b.hearingDate ? formatDate(b.hearingDate, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Not set'], ['Details', b.details]].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7rem_1fr] gap-3 py-2.5"><dt className="font-bold text-ink-muted">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
        </div>
        <section className="panel panel-pad">
          <h2 className="mb-4 text-lg font-bold">Case log</h2>
          <ol className="relative space-y-4 border-l-2 border-brand-200 pl-5">
            {b.actions.map((a) => (
              <li key={a._id} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500" aria-hidden />
                <p className="font-bold">{a.action}</p>
                <p className="text-sm text-ink-muted">{formatDateTime(a.date)}{a.note ? `. ${a.note}` : ''}</p>
              </li>
            ))}
          </ol>
          {can('blotter.manage') && <form noValidate onSubmit={actionForm.handleSubmit(addAction)} className="mt-6 space-y-3 border-t border-paper-line pt-5">
            <h3 className="font-bold">Add to the log</h3>
            {actionForm.formState.errors.root && <p className="field-error">{actionForm.formState.errors.root.message}</p>}
            <Field label="What was done" htmlFor="action" error={actionForm.formState.errors.action?.message} required><input id="action" className={inputClass(actionForm.formState.errors.action?.message)} placeholder="e.g. Summons served" {...actionForm.register('action')} /></Field>
            <Field label="Note" htmlFor="note" error={actionForm.formState.errors.note?.message}><input id="note" className="input" {...actionForm.register('note')} /></Field>
            <button type="submit" className="btn-secondary" disabled={actionForm.formState.isSubmitting}>Add to log</button>
          </form>}
        </section>
      </div>

      <Modal open={hearing} title="Set a hearing" onClose={() => setHearing(false)}>
        <form noValidate onSubmit={hearingForm.handleSubmit(setHearingDate)} className="space-y-4">
          {hearingForm.formState.errors.root && <p className="field-error">{hearingForm.formState.errors.root.message}</p>}
          <Field label="Hearing date" htmlFor="hearingDate" error={hearingForm.formState.errors.hearingDate?.message} required hint="Must be a future date"><input id="hearingDate" type="date" className={inputClass(hearingForm.formState.errors.hearingDate?.message)} {...hearingForm.register('hearingDate')} /></Field>
          <Field label="Note" htmlFor="hnote"><input id="hnote" className="input" placeholder="e.g. Both parties notified" {...hearingForm.register('note')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setHearing(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={hearingForm.formState.isSubmitting}>Set hearing</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'delete' ? 'Delete this case?' : `${confirm ? ACTION[confirm] : ''}?`}
        message={confirm === 'delete' ? `Case ${b.caseNumber} and its log will be removed permanently.` : `The case will move to "${confirm ? humanize(confirm) : ''}".${confirm && ['settled', 'escalated', 'dismissed'].includes(confirm) ? ' This closes the case.' : ''}`}
        confirmLabel={confirm === 'delete' ? 'Delete case' : confirm ? ACTION[confirm] : ''}
        danger={confirm === 'delete' || confirm === 'dismissed' || confirm === 'escalated'}
        onConfirm={async () => {
          try {
            if (confirm === 'delete') { await blottersApi.remove(b._id); toast.success(`Case ${b.caseNumber} deleted`); navigate('/app/blotters'); return; }
            await blottersApi.setStatus(b._id, confirm as BlotterStatus);
            toast.success(`Case ${b.caseNumber}: ${humanize(confirm as string).toLowerCase()}`);
            void reload();
          } catch (e) { throw new Error(parseApiError(e).message); }
        }}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
