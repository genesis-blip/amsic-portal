import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterValues } from '../../schemas/auth';
import { PUROKS } from '../../schemas/resident';
import { authApi } from '../../api/auth';
import { homeFor, useAuth } from '../../auth/authContext';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { useToast } from '../../hooks/useToast';
import { Field } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import { AuthShell } from './AuthShell';

export default function RegisterPage() {
  const { user, startSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '', middleName: '', lastName: '', suffix: '', birthdate: '', sex: undefined, civilStatus: 'single',
      purok: undefined, address: '', contactNumber: '', email: '', username: '', password: '', confirmPassword: '',
    },
  });

  if (user) return <Navigate to={homeFor(user)} replace />;

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      const res = await authApi.register(values);
      startSession(res.token, res.user);
      toast.success(`Welcome, ${res.user.resident?.firstName ?? res.user.username}! Your resident number is ${res.user.resident?.residentNo}.`);
      navigate('/portal', { replace: true });
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  const birthdate = watch('birthdate');
  const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  return (
    <AuthShell
      tone="resident"
      wide
      title="Create a resident account"
      intro="For residents of Barangay Amsic. If you are already in the barangay records, use the same name and birthdate and your account will be linked to it."
      footer={<>Already have an account? <Link to="/login" className="font-bold text-brand-700 underline underline-offset-2">Log in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        {formError && <ErrorState message={formError} />}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-lg font-bold">About you</legend>
          <Field label="First name" htmlFor="firstName" error={errors.firstName?.message} required><input id="firstName" autoComplete="given-name" className={inputClass(errors.firstName?.message)} {...register('firstName')} /></Field>
          <Field label="Middle name" htmlFor="middleName" error={errors.middleName?.message}><input id="middleName" autoComplete="additional-name" className={inputClass(errors.middleName?.message)} {...register('middleName')} /></Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message} required><input id="lastName" autoComplete="family-name" className={inputClass(errors.lastName?.message)} {...register('lastName')} /></Field>
          <Field label="Suffix" htmlFor="suffix" error={errors.suffix?.message} hint="Jr., III"><input id="suffix" className={inputClass(errors.suffix?.message)} {...register('suffix')} /></Field>
          <Field label="Birthdate" htmlFor="birthdate" error={errors.birthdate?.message} required hint={age !== null && age >= 0 ? `${age} years old${age >= 60 ? ': you get the 20% senior discount' : ''}` : undefined}>
            <input id="birthdate" type="date" autoComplete="bday" className={inputClass(errors.birthdate?.message)} {...register('birthdate')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sex" htmlFor="sex" error={errors.sex?.message} required>
              <select id="sex" className={inputClass(errors.sex?.message)} {...register('sex')}><option value="">Choose</option><option value="female">Female</option><option value="male">Male</option></select>
            </Field>
            <Field label="Civil status" htmlFor="civilStatus" error={errors.civilStatus?.message}>
              <select id="civilStatus" className="input" {...register('civilStatus')}>
                <option value="single">Single</option><option value="married">Married</option><option value="widowed">Widowed</option><option value="separated">Separated</option>
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-lg font-bold">Address and contact</legend>
          <Field label="Purok" htmlFor="purok" error={errors.purok?.message} required>
            <select id="purok" className={inputClass(errors.purok?.message)} {...register('purok')}><option value="">Choose your purok</option>{PUROKS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          </Field>
          <Field label="House no. and street" htmlFor="address" error={errors.address?.message} required>
            <input id="address" autoComplete="street-address" className={inputClass(errors.address?.message)} {...register('address')} />
          </Field>
          <Field label="Mobile number" htmlFor="contactNumber" error={errors.contactNumber?.message} hint="09XXXXXXXXX" required>
            <input id="contactNumber" inputMode="numeric" autoComplete="tel" className={inputClass(errors.contactNumber?.message)} {...register('contactNumber')} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message} hint="Optional. You can log in with it too.">
            <input id="email" type="email" autoComplete="email" className={inputClass(errors.email?.message)} {...register('email')} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-lg font-bold">Your login</legend>
          <Field label="Username" htmlFor="username" error={errors.username?.message} hint="4 to 30 characters, no spaces" required className="sm:col-span-2">
            <input id="username" autoComplete="username" autoCapitalize="none" className={inputClass(errors.username?.message)} {...register('username')} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters, with letters and numbers" required>
            <input id="password" type="password" autoComplete="new-password" className={inputClass(errors.password?.message)} {...register('password')} />
          </Field>
          <Field label="Type the password again" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
            <input id="confirmPassword" type="password" autoComplete="new-password" className={inputClass(errors.confirmPassword?.message)} {...register('confirmPassword')} />
          </Field>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand-600" {...register('agree')} />
              <span className="text-ink-soft">I live in Barangay Amsic and the details above are true. I will bring a valid ID when I claim documents.</span>
            </label>
            {errors.agree && <p className="field-error">{errors.agree.message}</p>}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
