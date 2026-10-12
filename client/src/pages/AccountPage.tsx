import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../auth/authContext';
import { authApi } from '../api/auth';
import { mobileSchema, type MobileValues } from '../schemas/auth';
import { applyServerErrors } from '../hooks/useServerErrors';
import { useToast } from '../hooks/useToast';
import { Field } from '../components/ui/Field';
import { ErrorState } from '../components/ui/States';
import { inputClass } from '../utils/inputClass';
import { PageHeader } from '../components/ui/PageHeader';
import { ChangePasswordForm } from './auth/ChangePasswordPage';
import { NAV } from '../components/layout/nav';

function MobileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm<MobileValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: user?.mobile ?? '' },
  });
  const onSubmit = async (values: MobileValues) => {
    setFormError(null);
    try {
      setUser(await authApi.updateMe(values));
      reset(values);
      toast.success('Mobile number saved');
    } catch (e) { setFormError(applyServerErrors(e, setError)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-3 border-t border-paper-line pt-5">
      {formError && <ErrorState message={formError} />}
      <Field label="Mobile number" htmlFor="mobile" error={errors.mobile?.message} hint="When SMS log in codes are on, your code is sent here.">
        <input id="mobile" inputMode="numeric" className={inputClass(errors.mobile?.message)} {...register('mobile')} />
      </Field>
      <button type="submit" className="btn-secondary" disabled={isSubmitting || !isDirty}>{isSubmitting ? 'Saving…' : 'Save number'}</button>
    </form>
  );
}

export default function AccountPage() {
  const { user, can } = useAuth();
  if (!user) return null;
  const pages = NAV.flatMap((g) => g.items).filter((i) => i.cap.some(can)).map((i) => i.label);

  return (
    <>
      <PageHeader title="My account" description="Your login details and the pages your role can open." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-ink-muted">Name</dt><dd className="font-bold">{user.name}</dd>
            <dt className="text-ink-muted">Username</dt><dd>{user.username}</dd>
            <dt className="text-ink-muted">Email</dt><dd>{user.email || 'None'}</dd>
            <dt className="text-ink-muted">Role</dt><dd className="font-bold text-brand-700">{user.roleLabel}</dd>
          </dl>
          <h2 className="mt-6 text-lg font-bold">Pages you can open</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pages.map((p) => <li key={p} className="chip">{p}</li>)}
          </ul>
          <MobileForm />
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-4 text-lg font-bold">Change password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </>
  );
}
