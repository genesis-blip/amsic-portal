import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, MessageSquareText } from 'lucide-react';
import { authApi } from '../../api/auth';
import { forgotSchema, resetSchema, type ForgotValues, type ResetValues } from '../../schemas/auth';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { parseApiError } from '../../lib/http';
import { Modal } from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import { BARANGAY_HALL } from '../../data/hotlines';

interface Props { open: boolean; onClose: () => void; onDone: (username: string) => void }

type Step = { name: 'ask' } | { name: 'code'; resetToken: string; message: string } | { name: 'done'; message: string; username: string };

export function ForgotPasswordModal({ open, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>({ name: 'ask' });
  const [formError, setFormError] = useState<string | null>(null);
  const ask = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { username: '' } });
  const reset = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { code: '', newPassword: '', confirmPassword: '' } });

  const close = () => {
    setStep({ name: 'ask' });
    setFormError(null);
    ask.reset();
    reset.reset();
    onClose();
  };

  const sendCode = async (values: ForgotValues) => {
    setFormError(null);
    try {
      const res = await authApi.forgotPassword(values.username);
      setStep({ name: 'code', resetToken: res.resetToken, message: res.message });
    } catch (e) {
      const msg = applyServerErrors(e, ask.setError);
      setFormError(parseApiError(e).errors ? null : msg);
    }
  };

  const savePassword = async (values: ResetValues) => {
    if (step.name !== 'code') return;
    setFormError(null);
    try {
      const res = await authApi.resetPassword(step.resetToken, values.code, values.newPassword);
      setStep({ name: 'done', message: res.message, username: res.username });
    } catch (e) {
      const msg = applyServerErrors(e, reset.setError);
      setFormError(parseApiError(e).errors ? null : msg);
    }
  };

  return (
    <Modal open={open} title="Forgot your password?" onClose={close}>
      {formError && <div className="mb-4"><ErrorState message={formError} /></div>}

      {step.name === 'ask' && (
        <form onSubmit={ask.handleSubmit(sendCode)} noValidate className="space-y-4">
          <p className="text-ink-soft">Enter your username or email. We will text a 6-digit code to the mobile number on your account.</p>
          <Field label="Username or email" htmlFor="fp-username" error={ask.formState.errors.username?.message}>
            <input id="fp-username" autoComplete="username" autoCapitalize="none" className={inputClass(ask.formState.errors.username?.message)} {...ask.register('username')} />
          </Field>
          <p className="text-sm text-ink-muted">
            No mobile number on your account? Visit the Barangay Hall with a valid ID or call{' '}
            <a href={`tel:${BARANGAY_HALL.tel}`} className="font-semibold text-maroon">{BARANGAY_HALL.number}</a>.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={ask.formState.isSubmitting}>{ask.formState.isSubmitting ? 'Sending…' : 'Send code'}</button>
          </div>
        </form>
      )}

      {step.name === 'code' && (
        <form onSubmit={reset.handleSubmit(savePassword)} noValidate className="space-y-4">
          <p className="flex gap-3 rounded-control bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <MessageSquareText className="h-5 w-5 shrink-0" aria-hidden />
            <span>{step.message}</span>
          </p>
          <Field label="6-digit code" htmlFor="fp-code" error={reset.formState.errors.code?.message}>
            <input id="fp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              className={`${inputClass(reset.formState.errors.code?.message)} tabular text-center text-2xl tracking-[0.4em]`} {...reset.register('code')} />
          </Field>
          <Field label="New password" htmlFor="fp-new" error={reset.formState.errors.newPassword?.message} hint="At least 8 characters, with letters and numbers">
            <input id="fp-new" type="password" autoComplete="new-password" className={inputClass(reset.formState.errors.newPassword?.message)} {...reset.register('newPassword')} />
          </Field>
          <Field label="Confirm new password" htmlFor="fp-confirm" error={reset.formState.errors.confirmPassword?.message}>
            <input id="fp-confirm" type="password" autoComplete="new-password" className={inputClass(reset.formState.errors.confirmPassword?.message)} {...reset.register('confirmPassword')} />
          </Field>
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setFormError(null); setStep({ name: 'ask' }); }}>Send a new code</button>
            <button type="submit" className="btn-primary" disabled={reset.formState.isSubmitting}>{reset.formState.isSubmitting ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
      )}

      {step.name === 'done' && (
        <div className="space-y-4">
          <p className="flex gap-3 rounded-control bg-leaf/10 px-4 py-3 text-ink">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-leaf" aria-hidden />
            <span>{step.message}</span>
          </p>
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={() => { const u = step.username; close(); onDone(u); }}>Sign in</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
