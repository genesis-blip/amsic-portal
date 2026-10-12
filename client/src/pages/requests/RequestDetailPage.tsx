import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { requestsApi } from '../../api/requests';
import { paymentsApi } from '../../api/payments';
import { parseApiError } from '../../lib/http';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { METHODS, requestPaymentSchema, type RequestPaymentValues as PayValues } from '../../schemas/payment';
import { statusNoteSchema as noteSchema, type StatusNoteValues as NoteValues } from '../../schemas/request';
import { DocumentDownloadButton } from '../../components/DocumentDownloadButton';
import { canDownloadDocument } from '../../utils/documents';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field } from '../../components/ui/Field';
import { inputClass } from '../../utils/inputClass';
import { Stamp } from '../../components/ui/Stamp';
import { formatDate, formatDateTime, formatPeso, formatSlot, fullName, humanize, relativeDays, formatMethod } from '../../utils/format';
import type { RequestStatus } from '../../types';
import { useAuth } from '../../auth/authContext';

const ACTION_LABEL: Record<RequestStatus, string> = {
  pending: 'Mark received', processing: 'Start processing', ready: 'Mark ready for pickup', released: 'Release to resident', rejected: 'Reject', cancelled: 'Cancel request',
};
const needsNote = (s: RequestStatus) => s === 'rejected' || s === 'cancelled';


export default function RequestDetailPage() {
  const { can } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: r, loading, error, reload } = useApi(() => requestsApi.get(id!), [id]);
  const [target, setTarget] = useState<RequestStatus | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<RequestStatus | null>(null);

  const noteForm = useForm<NoteValues>({ resolver: zodResolver(noteSchema), defaultValues: { note: '' } });
  const payForm = useForm<PayValues>({ resolver: zodResolver(requestPaymentSchema), defaultValues: { method: 'cash', payerName: '' } });

  if (loading) return <LoadingState />;
  if (error || !r) return <ErrorState message={error ?? 'Request not found'} onRetry={reload} />;

  const changeStatus = async (status: RequestStatus, note = '') => {
    setBusy(status);
    try {
      await requestsApi.setStatus(r._id, status, note);
      toast.success(`${r.referenceNumber}: ${ACTION_LABEL[status].toLowerCase()} done`);
      setTarget(null);
      noteForm.reset();
      await reload();
    } catch (e) {
      const msg = parseApiError(e).message;
      if (target) noteForm.setError('note', { message: parseApiError(e).errors?.note ?? msg });
      else toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const onAction = (s: RequestStatus) => (needsNote(s) ? setTarget(s) : void changeStatus(s));

  const onPay = async (v: PayValues) => {
    try {
      const p = await paymentsApi.create({ request: r._id, amount: r.fees.total, method: v.method, payerName: v.payerName || fullName(r.resident), category: 'document_fee', description: '' });
      toast.success(`Payment recorded, ${p.orNumber}`);
      setPaying(false);
      payForm.reset();
      await reload();
    } catch (e) {
      payForm.setError('root', { message: applyServerErrors(e, payForm.setError) });
    }
  };

  const canPay = can('payments.manage') && r.paymentStatus === 'unpaid' && !['rejected', 'cancelled'].includes(r.status);
  const canProcess = can('documents.process');
  const releaseBlocked = r.nextStatuses.includes('released') && r.paymentStatus === 'unpaid';

  return (
    <>
      <PageHeader
        title={r.referenceNumber}
        description={`${r.documentType.name} for ${fullName(r.resident)}`}
        back={{ to: '/app/requests', label: 'Document requests' }}
        actions={<>
          {canDownloadDocument(r) && <DocumentDownloadButton path={`/document-requests/${r._id}/certificate`} request={r} open label="View PDF" className="btn-secondary" />}
          {canDownloadDocument(r) && <DocumentDownloadButton path={`/document-requests/${r._id}/certificate`} request={r} label="Download PDF" />}
          {!canDownloadDocument(r) && !['rejected', 'cancelled'].includes(r.status) && (
            <DocumentDownloadButton path={`/document-requests/${r._id}/certificate?preview=1`} request={r} open label="Preview PDF" className="btn-secondary" />
          )}
          {canProcess && r.status === 'pending' && r.paymentStatus !== 'paid' && <Link to={`/app/requests/${r._id}/edit`} className="btn-secondary">Edit</Link>}
          {canProcess && r.paymentStatus !== 'paid' && r.status !== 'released' && <button type="button" className="btn-ghost text-seal" onClick={() => setConfirmDelete(true)}>Delete</button>}
        </>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="panel panel-pad">
            <div className="mb-5 flex flex-wrap items-center gap-4">
              <span className="scale-125"><Stamp status={r.status} /></span>
              {r.isUnclaimed && <Stamp status="overdue" label="Unclaimed" />}
              {r.isBehindSchedule && <Stamp status="overdue" label="Behind schedule" />}
            </div>
            {!canProcess ? (
              <p className="text-ink-muted">Only the secretary or super admin can change the status of a request.</p>
            ) : r.nextStatuses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {r.nextStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={needsNote(s) ? 'btn-secondary' : 'btn-primary'}
                    disabled={busy !== null || (s === 'released' && releaseBlocked)}
                    onClick={() => onAction(s)}
                  >
                    {busy === s ? 'Saving…' : ACTION_LABEL[s]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-ink-muted">This request is closed. No more status changes are allowed.</p>
            )}
            {releaseBlocked && <p className="hint mt-2 text-seal">Record the payment before releasing the document.</p>}
          </section>

          <section className="panel panel-pad">
            <h2 className="mb-3 text-lg font-bold">Details</h2>
            <dl className="divide-y divide-paper-rule text-sm">
              {[
                ['Resident', <Link key="r" to={`/app/residents/${r.resident._id}`} className="font-bold text-brand-800 hover:underline">{fullName(r.resident)} ({r.resident.residentNo})</Link>],
                ['Purok', r.resident.purok],
                ['Document', `${r.documentType.name}, ${r.copies} cop${r.copies > 1 ? 'ies' : 'y'}`],
                ['Purpose', r.purpose],
                ['Pickup', `${formatDate(r.pickupDateIso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${formatSlot(r.pickupSlot)}${r.isActive ? ` (${relativeDays(r.daysUntilPickup)})` : ''}`],
                ['Filed', formatDateTime(r.createdAt)],
                ['Notes', r.remarks || '—'],
              ].map(([k, v]) => (
                <div key={k as string} className="grid grid-cols-[7rem_1fr] gap-3 py-2.5"><dt className="font-bold text-ink-muted">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>

          <section className="panel panel-pad">
            <h2 className="mb-4 text-lg font-bold">History</h2>
            <ol className="relative space-y-4 border-l-2 border-brand-200 pl-5">
              {r.statusHistory.map((h, i) => (
                <li key={`${h.changedAt}-${i}`} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500" aria-hidden />
                  <p className="font-bold">{h.status === 'pending' ? 'Received' : humanize(h.status)}</p>
                  <p className="text-sm text-ink-muted">{formatDateTime(h.changedAt)}{h.note ? `. ${h.note}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel panel-pad">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Fee</h2>
              <Stamp status={r.paymentStatus} label={r.paymentStatus === 'waived' ? 'Free' : undefined} tilt={false} />
            </div>
            <dl className="tabular space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">{r.copies} × {formatPeso(r.fees.unitFee)}</dt><dd>{formatPeso(r.fees.subtotal)}</dd></div>
              {r.fees.discount > 0 && <div className="flex justify-between text-brand-700"><dt>Senior discount ({r.fees.discountRate * 100}%)</dt><dd>−{formatPeso(r.fees.discount)}</dd></div>}
              <div className="flex justify-between border-t border-paper-line pt-2 font-display text-xl font-extrabold"><dt>Total</dt><dd>{formatPeso(r.fees.total)}</dd></div>
            </dl>
            {canPay && <button type="button" className="btn-primary mt-4 w-full" onClick={() => setPaying(true)}>Record payment</button>}
          </section>
          <section className="panel">
            <h2 className="border-b border-paper-line px-5 py-4 text-lg font-bold">Receipts</h2>
            {r.payments && r.payments.length > 0 ? (
              <ul>
                {r.payments.map((p) => (
                  <li key={p._id} className="flex items-center justify-between gap-3 border-b border-paper-rule px-5 py-3 text-sm last:border-0">
                    <span><span className="tabular block font-bold">{p.orNumber}</span><span className="text-ink-muted">{formatMethod(p.method)}, {formatDateTime(p.paidAt)}</span></span>
                    <span className="text-right"><span className="tabular block font-bold">{formatPeso(p.amount)}</span>{p.isVoided && <Stamp status="voided" tilt={false} />}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-6 text-sm text-ink-muted">No payment recorded yet.</p>}
          </section>
        </aside>
      </div>

      <Modal open={target !== null} title={target ? ACTION_LABEL[target] : ''} onClose={() => { setTarget(null); noteForm.reset(); }}>
        <form noValidate onSubmit={noteForm.handleSubmit((v) => target && changeStatus(target, v.note))} className="space-y-4">
          <Field label={target === 'rejected' ? 'Reason for rejecting' : 'Reason (optional)'} htmlFor="note" error={noteForm.formState.errors.note?.message} required={target === 'rejected'}>
            <textarea id="note" rows={3} className={inputClass(noteForm.formState.errors.note?.message)} {...noteForm.register('note')} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setTarget(null)}>Go back</button>
            <button type="submit" className="btn-danger" disabled={busy !== null}>{busy ? 'Saving…' : target ? ACTION_LABEL[target] : ''}</button>
          </div>
        </form>
      </Modal>

      <Modal open={paying} title="Record payment" onClose={() => setPaying(false)}>
        <form noValidate onSubmit={payForm.handleSubmit(onPay)} className="space-y-4">
          {payForm.formState.errors.root && <p className="field-error">{payForm.formState.errors.root.message}</p>}
          <p className="rounded-control bg-brand-50 px-4 py-3">Amount due: <strong className="tabular font-display text-xl">{formatPeso(r.fees.total)}</strong></p>
          <Field label="Paid by" htmlFor="payerName" hint={`Leave blank for ${fullName(r.resident)}`} error={payForm.formState.errors.payerName?.message}>
            <input id="payerName" className="input" {...payForm.register('payerName')} />
          </Field>
          <Field label="Method" htmlFor="method" error={payForm.formState.errors.method?.message}>
            <select id="method" className="input" {...payForm.register('method')}>{METHODS.map((m) => <option key={m} value={m}>{formatMethod(m)}</option>)}</select>
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setPaying(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={payForm.formState.isSubmitting}>{payForm.formState.isSubmitting ? 'Saving…' : 'Record payment'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this request?"
        message={`${r.referenceNumber} will be removed and its pickup slot freed. Paid or released requests cannot be deleted.`}
        confirmLabel="Delete request"
        onConfirm={async () => {
          try { await requestsApi.remove(r._id); } catch (e) { throw new Error(parseApiError(e).message); }
          toast.success(`${r.referenceNumber} deleted`);
          navigate('/app/requests');
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
