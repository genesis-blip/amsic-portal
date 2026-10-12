import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquareText } from 'lucide-react';
import { authApi, type OtpChallenge } from '../../api/auth';
import { useAuth } from '../../auth/authContext';
import { otpSchema, type OtpValues } from '../../schemas/auth';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { parseApiError } from '../../lib/http';
import { Field } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import type { Session } from '../../types';

interface Props { challenge: OtpChallenge; remember?: boolean; onDone: (user: Session) => void; onCancel: () => void }

export function OtpStep({ challenge, remember = true, onDone, onCancel }: Props) {
  const { verifyOtp } = useAuth();
  const [otpToken, setOtpToken] = useState(challenge.otpToken);
  const [wait, setWait] = useState(60);
  const [info, setInfo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const onSubmit = async (values: OtpValues) => {
    setFormError(null);
    try {
      onDone(await verifyOtp(otpToken, values.code, remember));
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  const resend = async () => {
    setFormError(null);
    try {
      const res = await authApi.resendOtp(otpToken);
      setOtpToken(res.otpToken);
      setInfo(res.message);
      setWait(60);
    } catch (e) {
      setFormError(parseApiError(e).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="flex gap-3 rounded-control bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <MessageSquareText className="h-5 w-5 shrink-0" aria-hidden />
        <span>We texted a 6-digit code to <strong>{challenge.sentTo}</strong>. It expires in {challenge.expiresInMinutes} minutes.</span>
      </p>
      {info && <p className="hint">{info}</p>}
      {formError && <ErrorState message={formError} />}
      <Field label="Log in code" htmlFor="code" error={errors.code?.message}>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
          className={`${inputClass(errors.code?.message)} tabular text-center font-display text-2xl tracking-[0.4em]`} {...register('code')} />
      </Field>
      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={isSubmitting}>{isSubmitting ? 'Checking…' : 'Verify and log in'}</button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className="btn-ghost btn-sm" disabled={wait > 0} onClick={() => void resend()}>
          {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>Use another account</button>
      </div>
    </form>
  );
}
