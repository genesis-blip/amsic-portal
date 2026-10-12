import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { applyServerErrors } from '../hooks/useServerErrors';
import { paymentsApi } from '../api/payments';
import { CATEGORIES, METHODS, paymentSchema, voidSchema, type PaymentFormValues, type VoidFormValues } from '../schemas/payment';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { Field } from '../components/ui/Field';
import { inputClass } from '../utils/inputClass';
import { Bars } from '../components/ui/Bars';
import { Stamp } from '../components/ui/Stamp';
import { formatDate, formatDateTime, formatPeso, humanize, todayIso, formatMethod } from '../utils/format';
import type { Payment } from '../types';
import { useAuth } from '../auth/authContext';

const monthStart = () => `${todayIso().slice(0, 7)}-01`;

export default function PaymentsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const q = useDebounce(search);

  const summary = useApi(() => paymentsApi.summary({ from, to }), [from, to]);
  const list = useApi(() => paymentsApi.list({ search: q, method, from, to, page }), [q, method, from, to, page]);
  const addForm = useForm<PaymentFormValues>({ resolver: zodResolver(paymentSchema), defaultValues: { payerName: '', amount: 0, method: 'cash', category: 'business_fee', description: '' } });
  const voidForm = useForm<VoidFormValues>({ resolver: zodResolver(voidSchema), defaultValues: { reason: '' } });
  const rangeInvalid = from > to;

  const refresh = () => { void summary.reload(); void list.reload(); };

  const onAdd = async (v: PaymentFormValues) => {
    try {
      const p = await paymentsApi.create(v);
      toast.success(`Payment recorded, ${p.orNumber}`);
      setAdding(false);
      addForm.reset();
      refresh();
    } catch (e) {
      addForm.setError('root', { message: applyServerErrors(e, addForm.setError) });
    }
  };
  const onVoid = async (v: VoidFormValues) => {
    if (!voiding) return;
    try {
      await paymentsApi.void(voiding._id, v.reason);
      toast.success(`${voiding.orNumber} voided`);
      setVoiding(null);
      voidForm.reset();
      refresh();
    } catch (e) {
      voidForm.setError('root', { message: applyServerErrors(e, voidForm.setError) });
    }
  };

  return (
    <>
      <PageHeader title="Payments" description="Official receipts for document fees, permits, fines and donations." actions={can('payments.manage') && <button type="button" className="btn-primary" onClick={() => setAdding(true)}>Record other payment</button>} />

      <div className="panel mb-6 flex flex-wrap items-end gap-3 p-4">
        <Field label="From" htmlFor="from"><input id="from" type="date" className="input" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></Field>
        <Field label="To" htmlFor="to"><input id="to" type="date" className="input" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></Field>
        <div className="flex gap-2 pb-0.5">
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setFrom(todayIso()); setTo(todayIso()); }}>Today</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setFrom(monthStart()); setTo(todayIso()); }}>This month</button>
        </div>
        {rangeInvalid && <p className="field-error w-full">The start date must be before the end date.</p>}
      </div>

      {summary.loading && <LoadingState />}
      {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}
      {summary.data && (
        <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="panel panel-pad">
            <p className="text-sm font-bold text-ink-muted">Collected from {formatDate(from)} to {formatDate(to)}</p>
            <p className="tabular font-display text-[2.5rem] font-extrabold leading-tight">{formatPeso(summary.data.totalCollected)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink-muted">Receipts</dt><dd className="tabular font-bold">{summary.data.transactionCount}</dd></div>
              <div><dt className="text-ink-muted">Average</dt><dd className="tabular font-bold">{formatPeso(summary.data.averagePayment)}</dd></div>
              <div><dt className="text-ink-muted">Biggest day</dt><dd className="tabular font-bold">{summary.data.bestDay ? `${formatDate(summary.data.bestDay.date, { month: 'short', day: 'numeric' })}, ${formatPeso(summary.data.bestDay.total)}` : '—'}</dd></div>
              <div><dt className="text-ink-muted">Voided</dt><dd className="tabular font-bold">{summary.data.voidedCount} ({formatPeso(summary.data.voidedAmount)})</dd></div>
            </dl>
          </section>
          <section className="panel panel-pad grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 font-bold">By method</h2>
              {Object.keys(summary.data.byMethod).length === 0 ? <p className="text-sm text-ink-muted">No payments in this range.</p> : (
                <Bars tone="stamp" rows={Object.entries(summary.data.byMethod).map(([k, v]) => ({ label: formatMethod(k), value: v, display: formatPeso(v) }))} />
              )}
            </div>
            <div>
              <h2 className="mb-3 font-bold">By category</h2>
              {Object.keys(summary.data.byCategory).length === 0 ? <p className="text-sm text-ink-muted">No payments in this range.</p> : (
                <Bars rows={Object.entries(summary.data.byCategory).map(([k, v]) => ({ label: humanize(k), value: v, display: formatPeso(v) }))} />
              )}
            </div>
          </section>
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-paper-line p-4 sm:grid-cols-[2fr_1fr]">
          <input className="input" aria-label="Search payments" placeholder="OR number, payer or description" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="input" aria-label="Method" value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
            <option value="">All methods</option>{[...METHODS, 'qrph'].map((m) => <option key={m} value={m}>{formatMethod(m)}</option>)}
          </select>
        </div>
        {list.loading && <div className="px-4"><LoadingState /></div>}
        {list.error && <div className="p-4"><ErrorState message={list.error} onRetry={list.reload} /></div>}
        {list.data && list.data.items.length === 0 && <EmptyState title="No payments in this range" body="Change the dates or record a payment." />}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="ledger ledger-stack sm:min-w-[720px]">
                <thead><tr><th>OR no.</th><th>Paid by</th><th>For</th><th>Method</th><th className="text-right">Amount</th><th /></tr></thead>
                <tbody>
                  {list.data.items.map((p) => {
                    const req = typeof p.request === 'object' ? p.request : null;
                    return (
                      <tr key={p._id} className={p.isVoided ? 'opacity-60' : ''}>
                        <td className="tabular font-bold">{p.orNumber}<span className="block text-[13px] font-normal text-ink-muted">{formatDateTime(p.paidAt)}</span></td>
                        <td>{p.payerName}</td>
                        <td>{req ? <Link to={`/app/requests/${req._id}`} className="font-bold text-brand-800 hover:underline">{req.referenceNumber}</Link> : humanize(p.category)}<span className="block text-[13px] text-ink-muted">{p.description}</span></td>
                        <td>{formatMethod(p.method)}</td>
                        <td className={`tabular text-right font-bold ${p.isVoided ? 'line-through' : ''}`}>{formatPeso(p.amount)}</td>
                        <td className="text-right">{p.isVoided ? <Stamp status="voided" tilt={false} /> : can('payments.manage') && <button type="button" className="btn-ghost btn-sm text-seal" onClick={() => setVoiding(p)}>Void</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />
          </>
        )}
      </div>

      <Modal open={adding} title="Record other payment" onClose={() => setAdding(false)}>
        <form noValidate onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
          <p className="text-sm text-ink-muted">Document fees are paid from the request page so the amount always matches.</p>
          {addForm.formState.errors.root && <p className="field-error">{addForm.formState.errors.root.message}</p>}
          <Field label="Paid by" htmlFor="payerName" error={addForm.formState.errors.payerName?.message} required><input id="payerName" className={inputClass(addForm.formState.errors.payerName?.message)} {...addForm.register('payerName')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₱)" htmlFor="amount" error={addForm.formState.errors.amount?.message} required><input id="amount" type="number" step="0.01" min={1} className={inputClass(addForm.formState.errors.amount?.message)} {...addForm.register('amount')} /></Field>
            <Field label="Method" htmlFor="pmethod"><select id="pmethod" className="input" {...addForm.register('method')}>{METHODS.map((m) => <option key={m} value={m}>{formatMethod(m)}</option>)}</select></Field>
          </div>
          <Field label="Category" htmlFor="category"><select id="category" className="input" {...addForm.register('category')}>{CATEGORIES.filter((c) => c !== 'document_fee').map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select></Field>
          <Field label="Description" htmlFor="description" error={addForm.formState.errors.description?.message}><input id="description" className="input" placeholder="e.g. Sari-sari store permit renewal" {...addForm.register('description')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={addForm.formState.isSubmitting}>{addForm.formState.isSubmitting ? 'Saving…' : 'Record payment'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={voiding !== null} title={`Void ${voiding?.orNumber ?? ''}`} onClose={() => setVoiding(null)}>
        <form noValidate onSubmit={voidForm.handleSubmit(onVoid)} className="space-y-4">
          <p className="text-ink-soft">The receipt stays on record but no longer counts in totals. If it paid for a document request, that request becomes unpaid again.</p>
          {voidForm.formState.errors.root && <p className="field-error">{voidForm.formState.errors.root.message}</p>}
          <Field label="Reason" htmlFor="reason" error={voidForm.formState.errors.reason?.message} required><input id="reason" className={inputClass(voidForm.formState.errors.reason?.message)} {...voidForm.register('reason')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setVoiding(null)}>Keep receipt</button>
            <button type="submit" className="btn-danger" disabled={voidForm.formState.isSubmitting}>{voidForm.formState.isSubmitting ? 'Voiding…' : 'Void receipt'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
