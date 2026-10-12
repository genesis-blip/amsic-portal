import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Printer } from 'lucide-react';
import { meApi } from '../../api/auth';
import { useAuth } from '../../auth/authContext';
import { profileSchema, type ProfileValues } from '../../schemas/auth';
import { PUROKS } from '../../schemas/resident';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { Field } from '../../components/ui/Field';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import { formatDate, formatPeso, fullName, humanize } from '../../utils/format';
import { ChangePasswordForm } from '../auth/ChangePasswordPage';
import type { Resident } from '../../types';

function DigitalId({ r }: { r: Resident }) {
  return (
    <div className="mx-auto w-full max-w-[26rem] overflow-hidden rounded-[18px] border border-brand-700 bg-white shadow-lift print:shadow-none">
      <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
        <img src="/logo.png" alt="" className="h-11 w-11 rounded-full bg-white p-0.5" />
        <div className="leading-tight">
          <p className="text-[11px] text-brand-100">Republic of the Philippines</p>
          <p className="font-display text-[17px] font-extrabold">Barangay Amsic</p>
          <p className="text-[11px] text-brand-100">Angeles City, Pampanga</p>
        </div>
      </div>
      <div className="px-5 pb-5 pt-4">
        <p className="text-[11px] font-bold text-ink-muted">Resident ID</p>
        <p className="tabular font-display text-2xl font-extrabold tracking-wide text-stamp-dark">{r.residentNo}</p>
        <p className="mt-3 font-display text-xl font-extrabold leading-tight">{fullName(r)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-[11px] font-bold text-ink-muted">Birthdate</dt><dd>{formatDate(r.birthdate)}</dd></div>
          <div><dt className="text-[11px] font-bold text-ink-muted">Sex</dt><dd>{humanize(r.sex)}</dd></div>
          <div><dt className="text-[11px] font-bold text-ink-muted">Civil status</dt><dd>{humanize(r.civilStatus)}</dd></div>
          <div><dt className="text-[11px] font-bold text-ink-muted">Purok</dt><dd>{r.purok}</dd></div>
          <div className="col-span-2"><dt className="text-[11px] font-bold text-ink-muted">Address</dt><dd>{r.address}</dd></div>
        </dl>
        {r.isSenior && <p className="mt-4 inline-block -rotate-2 rounded-[4px] border-2 border-seal px-2 py-0.5 font-display text-[12px] font-extrabold uppercase tracking-wide text-seal">Senior citizen</p>}
      </div>
    </div>
  );
}

export default function PortalProfilePage() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const payments = useApi(() => meApi.payments(), []);
  const health = useApi(() => meApi.healthRecords(), []);
  const r = user?.resident;
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty }, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: r ? { contactNumber: r.contactNumber ?? '', email: r.email, address: r.address, purok: r.purok as ProfileValues['purok'], civilStatus: r.civilStatus, occupation: r.occupation } : undefined,
  });

  if (!user || !r) return <LoadingState />;

  const onSubmit = async (values: ProfileValues) => {
    setFormError(null);
    try {
      const updated = await meApi.updateProfile(values);
      setUser(updated);
      reset(values);
      toast.success('Contact details saved');
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  return (
    <div className="space-y-10">
      <section className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="font-display text-display-md font-extrabold sm:text-display-lg print:hidden">My profile</h1>
          <p className="mb-5 mt-1 text-ink-muted print:hidden">Show this ID at the barangay hall. Bring a government ID too when claiming documents.</p>
          <DigitalId r={r} />
          <div className="mt-4 flex justify-center gap-2 print:hidden">
            <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print ID</button>
            <button type="button" className="btn-ghost btn-sm" onClick={logout}><LogOut className="h-4 w-4" aria-hidden /> Log out</button>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="panel panel-pad space-y-4 print:hidden">
          <h2 className="text-lg font-bold">Contact details</h2>
          <p className="hint -mt-2">To correct your name or birthdate, visit the barangay hall.</p>
          {formError && <ErrorState message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile number" htmlFor="contactNumber" error={errors.contactNumber?.message} hint="09XXXXXXXXX"><input id="contactNumber" inputMode="numeric" className={inputClass(errors.contactNumber?.message)} {...register('contactNumber')} /></Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message}><input id="email" type="email" className={inputClass(errors.email?.message)} {...register('email')} /></Field>
            <Field label="Purok" htmlFor="purok" error={errors.purok?.message}><select id="purok" className="input" {...register('purok')}>{PUROKS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Civil status" htmlFor="civilStatus" error={errors.civilStatus?.message}>
              <select id="civilStatus" className="input" {...register('civilStatus')}><option value="single">Single</option><option value="married">Married</option><option value="widowed">Widowed</option><option value="separated">Separated</option></select>
            </Field>
            <Field label="House no. and street" htmlFor="address" error={errors.address?.message} className="sm:col-span-2"><input id="address" className={inputClass(errors.address?.message)} {...register('address')} /></Field>
            <Field label="Occupation" htmlFor="occupation" error={errors.occupation?.message} className="sm:col-span-2"><input id="occupation" className={inputClass(errors.occupation?.message)} {...register('occupation')} /></Field>
          </div>
          <button type="submit" className="btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting ? 'Saving…' : 'Save details'}</button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 print:hidden">
        <div className="panel">
          <h2 className="border-b border-paper-line px-5 py-4 text-lg font-bold">Health center visits</h2>
          {health.loading && <LoadingState />}
          {health.error && <div className="p-4"><ErrorState message={health.error} onRetry={health.reload} /></div>}
          {health.data?.items.length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">No visits recorded.</p>}
          <ul>
            {health.data?.items.map((h) => (
              <li key={h._id} className="border-b border-paper-rule px-5 py-3 text-sm last:border-0">
                <p className="font-bold">{humanize(h.recordType)}{h.vaccineName ? `: ${h.vaccineName}${h.doseNumber ? `, dose ${h.doseNumber}` : ''}` : ''}</p>
                <p className="text-ink-muted">{formatDate(h.visitDate)}{h.nextDueDate ? `. Next visit ${formatDate(h.nextDueDate)}` : ''}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2 className="border-b border-paper-line px-5 py-4 text-lg font-bold">Official receipts</h2>
          {payments.loading && <LoadingState />}
          {payments.error && <div className="p-4"><ErrorState message={payments.error} onRetry={payments.reload} /></div>}
          {payments.data?.items.length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">No payments yet.</p>}
          <ul>
            {payments.data?.items.map((p) => (
              <li key={p._id} className="flex justify-between gap-3 border-b border-paper-rule px-5 py-3 text-sm last:border-0">
                <span><span className="tabular block font-bold">{p.orNumber}</span><span className="text-ink-muted">{p.description || humanize(p.category)}, {formatDate(p.paidAt)}</span></span>
                <span className="tabular font-bold">{formatPeso(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel panel-pad max-w-xl print:hidden">
        <h2 className="mb-4 text-lg font-bold">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
