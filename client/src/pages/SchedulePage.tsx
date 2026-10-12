import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../hooks/useServerErrors';
import { schedulesApi } from '../api/schedules';
import { requestsApi } from '../api/requests';
import { parseApiError } from '../lib/http';
import { blockSchema, type BlockFormValues } from '../schemas/schedule';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Field } from '../components/ui/Field';
import { inputClass } from '../utils/inputClass';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Stamp } from '../components/ui/Stamp';
import { formatDate, formatSlot, fullName, todayIso } from '../utils/format';
import type { ScheduleBlock } from '../types';
import { useAuth } from '../auth/authContext';

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};

export default function SchedulePage() {
  const { can } = useAuth();
  const toast = useToast();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ScheduleBlock | null>(null);

  const cal = useApi(() => schedulesApi.calendar(month), [month]);
  const blocks = useApi(() => schedulesApi.blocks(), []);
  const dayRequests = useApi(() => (day ? requestsApi.list({ pickupFrom: day, pickupTo: day, status: 'pending,processing,ready', sort: 'pickupDate', limit: 50 }) : Promise.resolve(null)), [day]);
  const form = useForm<BlockFormValues>({ resolver: zodResolver(blockSchema), defaultValues: { date: '', reason: '' } });

  const firstWeekday = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  const today = todayIso();

  const onAdd = async (v: BlockFormValues) => {
    try {
      await schedulesApi.addBlock(v);
      toast.success(`${formatDate(v.date)} is now closed for pickups`);
      setAdding(false);
      form.reset();
      void cal.reload();
      void blocks.reload();
    } catch (e) {
      form.setError('root', { message: applyServerErrors(e, form.setError) });
    }
  };

  return (
    <>
      <PageHeader title="Pickup schedule" description="Four one-hour pickup slots per weekday, three residents per slot. Close a day for holidays and events." actions={can('schedule.manage') && <button type="button" className="btn-primary" onClick={() => setAdding(true)}>Close a day</button>} />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel panel-pad">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" className="btn-ghost p-2" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="text-lg font-bold">{formatDate(`${month}-01`, { month: 'long', year: 'numeric' })}</h2>
            <button type="button" className="btn-ghost p-2" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="h-5 w-5" /></button>
          </div>
          {cal.loading && <LoadingState />}
          {cal.error && <ErrorState message={cal.error} onRetry={cal.reload} />}
          {cal.data && (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-bold text-ink-muted">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d} className="py-1">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${month}-${i}`} />)}
                {cal.data.days.map((d) => {
                  const n = Number(d.date.slice(8));
                  const tone = d.isFull ? 'bg-seal text-white' : !d.isOpen ? 'bg-paper text-ink-faint' : d.totalRemaining <= 4 ? 'bg-sunflower-soft text-sunflower-dark' : 'bg-brand-50 text-brand-800';
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setDay(d.date)}
                      title={d.closedReason ?? `${d.totalRemaining} slots open`}
                      className={`flex aspect-square flex-col items-center justify-center rounded-control text-sm ${tone} ${day === d.date ? 'ring-2 ring-stamp' : ''} ${d.date === today ? 'font-extrabold underline' : ''}`}
                    >
                      <span className="font-bold">{n}</span>
                      {d.isOpen && <span className="hidden text-[11px] sm:block">{d.isFull ? 'Full' : `${d.totalRemaining} open`}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-ink-muted">{cal.data.openDays} open days this month, {cal.data.fullDays} fully booked. Select a day to see who is coming.</p>
            </>
          )}
        </section>

        <div className="space-y-6">
          <section className="panel">
            <h2 className="border-b border-paper-line px-5 py-4 text-lg font-bold">{day ? formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Pickups for a day'}</h2>
            {!day && <p className="px-5 py-6 text-ink-muted">Select a day in the calendar.</p>}
            {day && dayRequests.loading && <div className="px-5"><LoadingState /></div>}
            {day && dayRequests.error && <div className="p-5"><ErrorState message={dayRequests.error} onRetry={dayRequests.reload} /></div>}
            {day && dayRequests.data && dayRequests.data.items.length === 0 && <p className="px-5 py-6 text-ink-muted">No pickups booked on this day.</p>}
            {day && dayRequests.data && dayRequests.data.items.length > 0 && (
              <ul>
                {[...dayRequests.data.items].sort((a, b) => a.pickupSlot.localeCompare(b.pickupSlot)).map((r) => (
                  <li key={r._id} className="flex items-center justify-between gap-3 border-b border-paper-rule px-5 py-3 text-sm last:border-0">
                    <span><span className="block font-bold">{formatSlot(r.pickupSlot)}</span>{fullName(r.resident)}, {r.documentType.name}</span>
                    <Stamp status={r.status} />
                  </li>
                ))}
              </ul>
            )}
            {blocks.data && blocks.data.length > 6 && (
              <button type="button" className="btn-ghost btn-sm m-3" onClick={() => setShowAllClosed((v) => !v)}>
                {showAllClosed ? 'Show fewer' : `Show all ${blocks.data.length} closed days`}
              </button>
            )}
          </section>
          <section className="panel">
            <h2 className="border-b border-paper-line px-5 py-4 text-lg font-bold">Closed days</h2>
            {blocks.loading && <div className="px-5"><LoadingState /></div>}
            {blocks.error && <div className="p-5"><ErrorState message={blocks.error} onRetry={blocks.reload} /></div>}
            {blocks.data && blocks.data.length === 0 && <EmptyState title="No closed days ahead" body="Close a day for holidays or barangay events." />}
            {blocks.data && blocks.data.length > 0 && (
              <ul>
                {(showAllClosed ? blocks.data : blocks.data.slice(0, 6)).map((b) => (
                  <li key={b._id} className="flex items-center justify-between gap-3 border-b border-paper-rule px-5 py-3 text-sm last:border-0">
                    <span><span className="block font-bold">{formatDate(b.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span><span className="text-ink-muted">{b.reason}</span></span>
                    {can('schedule.manage') && <button type="button" className="btn-ghost btn-sm text-seal" onClick={() => setRemoving(b)}>Reopen</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Modal open={adding} title="Close a day for pickups" onClose={() => setAdding(false)}>
        <form noValidate onSubmit={form.handleSubmit(onAdd)} className="space-y-4">
          {form.formState.errors.root && <p className="field-error">{form.formState.errors.root.message}</p>}
          <Field label="Date" htmlFor="date" error={form.formState.errors.date?.message} required><input id="date" type="date" min={today} className={inputClass(form.formState.errors.date?.message)} {...form.register('date')} /></Field>
          <Field label="Reason" htmlFor="reason" error={form.formState.errors.reason?.message} required hint="Shown to residents, e.g. Bonifacio Day"><input id="reason" className={inputClass(form.formState.errors.reason?.message)} {...form.register('reason')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : 'Close this day'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={removing !== null}
        title="Reopen this day?"
        message={removing ? `Residents will be able to book pickups on ${formatDate(removing.date)} again.` : ''}
        confirmLabel="Reopen day"
        danger={false}
        onConfirm={async () => {
          try { await schedulesApi.removeBlock(removing!._id); } catch (e) { throw new Error(parseApiError(e).message); }
          toast.success('Day reopened for pickups');
          void cal.reload();
          void blocks.reload();
        }}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}
