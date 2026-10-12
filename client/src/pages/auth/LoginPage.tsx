import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, type LoginValues } from '../../schemas/auth';
import { homeFor, useAuth } from '../../auth/authContext';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { Field } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import { canOpen } from '../../components/layout/nav';
import { LoginBackdrop, LoginCard } from './LoginLayout';
import { OtpStep } from './OtpStep';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import type { OtpChallenge } from '../../api/auth';
import type { Session } from '../../types';

export default function LoginPage({ portal }: { portal: 'resident' | 'staff' }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [formError, setFormError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const { register, handleSubmit, setError, setValue, setFocus, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  if (user) return <Navigate to={homeFor(user)} replace />;

  const goHome = (u: Session) => {
    const home = homeFor(u);
    const back = from?.startsWith(home) && canOpen(from, u.permissions) ? from : home;
    navigate(u.mustChangePassword ? '/change-password' : back, { replace: true });
  };

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const res = await login(values.username, values.password, portal, remember);
      if ('otpRequired' in res) setChallenge(res);
      else goHome(res);
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  const staff = portal === 'staff';
  const form = (
    <>
      <div className="mb-7">
        <img src="/logo.png" alt="" className="mb-4 h-12 w-12 object-contain" />
        <h2 className="font-poppins text-[1.6rem] font-semibold text-ink">{challenge ? 'Enter your code' : staff ? 'Staff sign in' : 'Welcome back'}</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          {staff ? 'For barangay officials, staff, health workers and tanods.' : 'Sign in to access the Barangay Amsic Portal'}
        </p>
      </div>

      {challenge ? (
        <OtpStep challenge={challenge} remember={remember} onDone={goHome} onCancel={() => setChallenge(null)} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {formError && <ErrorState message={formError} />}
          <Field label="Username" htmlFor="username" error={errors.username?.message}>
            <input id="username" autoComplete="username" autoCapitalize="none" placeholder="Enter your username or email" className={inputClass(errors.username?.message)} {...register('username')} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className={`${inputClass(errors.password?.message)} pr-11`} {...register('password')} />
              <button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-muted hover:text-ink" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </Field>
          <div className="flex items-center justify-between text-[14px]">
            <label className="flex cursor-pointer items-center gap-2 py-1 text-ink-soft">
              <input type="checkbox" className="h-5 w-5 accent-maroon" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <button type="button" className="font-semibold text-maroon hover:underline" onClick={() => setForgot(true)}>Forgot password?</button>
          </div>
          <button type="submit" className="btn w-full bg-maroon py-3 text-base font-semibold text-white shadow-[0_4px_14px_rgba(147,27,39,0.28)] hover:-translate-y-px hover:bg-[#7A1818] hover:shadow-[0_6px_18px_rgba(147,27,39,0.36)] active:translate-y-0" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-1.5 text-center text-[14px] text-ink-soft">
        {staff ? (
          <p>Resident? <Link to="/login" className="font-semibold text-maroon hover:underline">Go to the resident sign in</Link></p>
        ) : (
          <>
            <p>Don&apos;t have an account? <Link to="/register" className="font-semibold text-maroon hover:underline">Create one</Link></p>
            <p>Barangay staff? <Link to="/staff/login" className="font-semibold text-maroon hover:underline">Staff portal</Link></p>
          </>
        )}
      </div>

      <ForgotPasswordModal open={forgot} onClose={() => setForgot(false)}
        onDone={(username) => { setValue('username', username); setValue('password', ''); setFormError(null); setFocus('password'); }} />
    </>
  );

  return (
    <LoginBackdrop>
      <LoginCard form={form} subtitle={staff ? 'Staff portal' : 'Community portal'} />
    </LoginBackdrop>
  );
}
