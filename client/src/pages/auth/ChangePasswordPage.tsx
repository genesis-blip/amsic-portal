import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordValues } from '../../schemas/auth';
import { authApi } from '../../api/auth';
import { homeFor, useAuth } from '../../auth/authContext';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { useToast } from '../../hooks/useToast';
import { Field } from '../../components/ui/Field';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import { AuthShell } from './AuthShell';

export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    setFormError(null);
    try {
      const res = await authApi.changePassword(values);
      setUser(res.user);
      reset();
      toast.success('Password changed');
      onDone?.();
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <ErrorState message={formError} />}
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message} required>
        <input id="currentPassword" type="password" autoComplete="current-password" className={inputClass(errors.currentPassword?.message)} {...register('currentPassword')} />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message} hint="At least 8 characters, with letters and numbers" required>
        <input id="newPassword" type="password" autoComplete="new-password" className={inputClass(errors.newPassword?.message)} {...register('newPassword')} />
      </Field>
      <Field label="Type the new password again" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
        <input id="confirmPassword" type="password" autoComplete="new-password" className={inputClass(errors.confirmPassword?.message)} {...register('confirmPassword')} />
      </Field>
      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (user === undefined) return <div className="p-10"><LoadingState /></div>;
  if (user === null) return <Navigate to="/login" replace />;
  return (
    <AuthShell
      tone={user.accountType}
      title="Set a new password"
      intro="You logged in with a temporary password. Choose your own password before continuing."
      footer={<button type="button" className="font-bold underline underline-offset-2" onClick={logout}>Log out instead</button>}
    >
      <ChangePasswordForm onDone={() => navigate(homeFor(user), { replace: true })} />
    </AuthShell>
  );
}
