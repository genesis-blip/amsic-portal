import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../hooks/useServerErrors';
import { healthApi } from '../api/community';
import { parseApiError } from '../lib/http';
import { healthSchema, RECORD_TYPES, type HealthFormValues } from '../schemas/health';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { inputClass } from '../utils/inputClass';
import { ResidentPicker } from '../components/ResidentPicker';
import { formatDate, humanize, relativeDays, todayIso, toDateInput } from '../utils/format';
import type { HealthRecord } from '../types';
import { useAuth } from '../auth/authContext';

const EMPTY: HealthFormValues = { resident: '', recordType: 'checkup', visitDate: todayIso(), weightKg: undefined, heightCm: undefined, systolic: undefined, diastolic: undefined, vaccineName: '', doseNumber: undefined, nextDueDate: undefined, notes: '' };
const BP_TONE: Record<string, string> = { high: 'text-seal font-bold', elevated: 'text-sunflower-dark font-bold', normal: 'text-brand-700' };

export default function HealthPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [recordType, setRecordType] = useState('');
  const records = useApi(() => healthApi.list({ recordType }), [recordType]);
  const due = useApi(() => healthApi.due(30), []);
  const [editing, setEditing] = useState<HealthRecord | 'new' | null>(null);
  const [deleting, setDeleting] = useState<HealthRecord | null>(null);
  const form = useForm<HealthFormValues>({ resolver: zodResolver(healthSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;
  const [weight, height, type] = form.watch(['weightKg', 'heightCm', 'recordType']);
  const bmiPreview = weight && height ? Math.round((Number(weight) / (Number(height) / 100) ** 2) * 10) / 10 : null;

  const open = (r: HealthRecord | 'new') => {
    form.reset(r === 'new' ? EMPTY : {
      resident: r.resident._id, recordType: r.recordType, visitDate: toDateInput(r.visitDate), weightKg: r.weightKg, heightCm: r.heightCm, systolic: r.systolic, diastolic: r.diastolic,
      vaccineName: r.vaccineName, doseNumber: r.doseNumber, nextDueDate: toDateInput(r.nextDueDate) || undefined, notes: r.notes,
    });
    setEditing(r);
  };
  const onSubmit = async (v: HealthFormValues) => {
    try {
      if (editing === 'new') await healthApi.create(v); else if (editing) await healthApi.update(editing._id, v);
      toast.success(editing === 'new' ? 'Health record saved' : 'Health record updated');
      setEditing(null);
      void records.reload();
      void due.reload();
    } catch (e) { form.setError('root', { message: applyServerErrors(e, form.setError) }); }
  };

  return (
    <>
      <PageHeader title="Health records" description="Check-ups, vaccinations, prenatal and senior monitoring visits at the barangay health center." actions={can('health.manage') && <button type="button" className="btn-primary" onClick={() => open('new')}>Record a visit</button>} />

      <section className="panel mb-6">
        <h2 className="border-b border-paper-line px-5 py-4 text-lg font-bold">Follow-ups due in the next 30 days</h2>
        {due.loading && <div className="px-5"><LoadingState /></div>}
        {due.error && <div className="p-5"><ErrorState message={due.error} onRetry={due.reload} /></div>}
        {due.data && due.data.total === 0 && <p className="px-5 py-6 text-ink-muted">No follow-ups due. Everyone is up to date.</p>}
        {due.data && due.data.total > 0 && (
          <ul className="grid sm:grid-cols-2">
            {[...due.data.overdue, ...due.data.upcoming].map((r) => (
              <li key={r._id} className="flex items-center justify-between gap-3 border-b border-paper-rule px-5 py-3 text-sm">
                <span><span className="block font-bold">{r.resident.firstName} {r.resident.lastName}</span><span className="text-ink-muted">{humanize(r.recordType)}{r.vaccineName ? `, ${r.vaccineName}` : ''}</span></span>
                <span className={`shrink-0 text-right ${r.isOverdue ? 'font-bold text-seal' : 'text-ink-soft'}`}>{r.isOverdue ? `Overdue, ${-r.daysUntilDue!} days` : `Due ${relativeDays(r.daysUntilDue!)}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="panel overflow-hidden">
        <div className="border-b border-paper-line p-4">
          <select className="input max-w-xs" aria-label="Record type" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
            <option value="">All visit types</option>{RECORD_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
          </select>
        </div>
        {records.loading && <div className="px-4"><LoadingState /></div>}
        {records.error && <div className="p-4"><ErrorState message={records.error} onRetry={records.reload} /></div>}
        {records.data && records.data.items.length === 0 && <EmptyState title="No visits recorded" action={can('health.manage') && <button type="button" className="btn-primary" onClick={() => open('new')}>Record a visit</button>} />}
        {records.data && records.data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="ledger ledger-stack sm:min-w-[760px]">
              <thead><tr><th>Resident</th><th>Visit</th><th>BMI</th><th>Blood pressure</th><th>Next visit</th><th /></tr></thead>
              <tbody>
                {records.data.items.map((r) => (
                  <tr key={r._id}>
                    <td className="font-bold">{r.resident.firstName} {r.resident.lastName}<span className="block font-normal text-[13px] text-ink-muted">{r.resident.purok}</span></td>
                    <td>{humanize(r.recordType)}<span className="block text-[13px] text-ink-muted">{formatDate(r.visitDate)}{r.vaccineName ? `, ${r.vaccineName} dose ${r.doseNumber ?? 1}` : ''}</span></td>
                    <td className="tabular">{r.bmi ?? '—'}{r.bmiCategory && <span className="block text-[13px] text-ink-muted">{humanize(r.bmiCategory)}</span>}</td>
                    <td className="tabular">{r.systolic ? `${r.systolic}/${r.diastolic}` : '—'}{r.bloodPressureCategory && <span className={`block text-[13px] ${BP_TONE[r.bloodPressureCategory]}`}>{humanize(r.bloodPressureCategory)}</span>}</td>
                    <td className={r.isOverdue ? 'font-bold text-seal' : ''}>{r.nextDueDate ? formatDate(r.nextDueDate) : '—'}</td>
                    <td className="whitespace-nowrap text-right">
                      {can('health.manage') && <button type="button" className="btn-ghost btn-sm" onClick={() => open(r)}>Edit</button>}
                      {can('health.manage') && <button type="button" className="btn-ghost btn-sm text-seal" onClick={() => setDeleting(r)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'Record a visit' : 'Edit visit'} onClose={() => setEditing(null)} wide>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && <p className="field-error">{errors.root.message}</p>}
          <Field label="Resident" htmlFor="hResident" error={errors.resident?.message} required>
            <Controller control={form.control} name="resident" render={({ field }) => (editing && editing !== 'new'
              ? <input id="hResident" className="input bg-paper" disabled value={`${editing.resident.firstName} ${editing.resident.lastName} (${editing.resident.residentNo})`} />
              : <ResidentPicker id="hResident" value={field.value} onChange={(v) => field.onChange(v)} error={errors.resident?.message} />)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visit type" htmlFor="recordType"><select id="recordType" className="input" {...form.register('recordType')}>{RECORD_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
            <Field label="Visit date" htmlFor="visitDate" error={errors.visitDate?.message} required><input id="visitDate" type="date" max={todayIso()} className={inputClass(errors.visitDate?.message)} {...form.register('visitDate')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Weight (kg)" htmlFor="weightKg" error={errors.weightKg?.message}><input id="weightKg" type="number" step="0.1" className={inputClass(errors.weightKg?.message)} {...form.register('weightKg')} /></Field>
            <Field label="Height (cm)" htmlFor="heightCm" error={errors.heightCm?.message} hint={bmiPreview ? `BMI ${bmiPreview}` : undefined}><input id="heightCm" type="number" className={inputClass(errors.heightCm?.message)} {...form.register('heightCm')} /></Field>
            <Field label="Systolic" htmlFor="systolic" error={errors.systolic?.message}><input id="systolic" type="number" className={inputClass(errors.systolic?.message)} {...form.register('systolic')} /></Field>
            <Field label="Diastolic" htmlFor="diastolic" error={errors.diastolic?.message}><input id="diastolic" type="number" className={inputClass(errors.diastolic?.message)} {...form.register('diastolic')} /></Field>
          </div>
          {type === 'vaccination' && (
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Vaccine" htmlFor="vaccineName" error={errors.vaccineName?.message} required><input id="vaccineName" className={inputClass(errors.vaccineName?.message)} {...form.register('vaccineName')} /></Field>
              <Field label="Dose no." htmlFor="doseNumber" error={errors.doseNumber?.message}><input id="doseNumber" type="number" min={1} className={inputClass(errors.doseNumber?.message)} {...form.register('doseNumber')} /></Field>
            </div>
          )}
          <Field label="Next visit" htmlFor="nextDueDate" error={errors.nextDueDate?.message} hint="Leave blank if no follow-up is needed"><input id="nextDueDate" type="date" className={inputClass(errors.nextDueDate?.message)} {...form.register('nextDueDate')} /></Field>
          <Field label="Notes" htmlFor="notes"><textarea id="notes" rows={2} className="input" {...form.register('notes')} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save visit'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={deleting !== null} title="Delete this health record?" message="The visit and its measurements will be removed permanently." confirmLabel="Delete record"
        onConfirm={async () => { try { await healthApi.remove(deleting!._id); } catch (e) { throw new Error(parseApiError(e).message); } toast.success('Health record deleted'); void records.reload(); void due.reload(); }}
        onClose={() => setDeleting(null)} />
    </>
  );
}
