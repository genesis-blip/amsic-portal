import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { residentsApi } from '../../api/residents';
import { emptyResident, PUROKS, residentSchema, type ResidentFormValues } from '../../schemas/resident';
import { Field } from '../../components/ui/Field';
import { inputClass } from '../../utils/inputClass';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../hooks/useToast';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { parseApiError } from '../../lib/http';
import { toDateInput } from '../../utils/format';

export default function ResidentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: emptyResident,
  });

  useEffect(() => {
    if (!id) return;
    residentsApi.get(id)
      .then((r) => reset({
        firstName: r.firstName, middleName: r.middleName, lastName: r.lastName, suffix: r.suffix, birthdate: toDateInput(r.birthdate),
        sex: r.sex, civilStatus: r.civilStatus, purok: r.purok as ResidentFormValues['purok'], address: r.address, contactNumber: r.contactNumber ?? '',
        email: r.email, occupation: r.occupation, isVoter: r.isVoter, residencyType: r.residencyType, yearsOfResidency: r.yearsOfResidency,
      }))
      .catch((e) => setLoadError(parseApiError(e).message))
      .finally(() => setLoading(false));
  }, [id, reset]);

  const onSubmit = async (values: ResidentFormValues) => {
    setFormError(null);
    try {
      const saved = isEdit ? await residentsApi.update(id!, values) : await residentsApi.create(values);
      toast.success(isEdit ? 'Resident updated' : `Resident added as ${saved.residentNo}`);
      navigate(`/app/residents/${saved._id}`);
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  const birthdate = watch('birthdate');
  const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <>
      <PageHeader title={isEdit ? 'Edit resident' : 'Add resident'} back={{ to: isEdit ? `/app/residents/${id}` : '/app/residents', label: isEdit ? 'Back to resident' : 'Residents' }} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="panel panel-pad space-y-8">
        {formError && <ErrorState message={formError} />}
        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-3 font-display text-lg font-bold">Name</legend>
          <Field label="First name" htmlFor="firstName" error={errors.firstName?.message} required><input id="firstName" className={inputClass(errors.firstName?.message)} {...register('firstName')} /></Field>
          <Field label="Middle name" htmlFor="middleName" error={errors.middleName?.message}><input id="middleName" className={inputClass(errors.middleName?.message)} {...register('middleName')} /></Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message} required><input id="lastName" className={inputClass(errors.lastName?.message)} {...register('lastName')} /></Field>
          <Field label="Suffix" htmlFor="suffix" error={errors.suffix?.message} hint="Jr., III"><input id="suffix" className={inputClass(errors.suffix?.message)} {...register('suffix')} /></Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-3 font-display text-lg font-bold">Personal details</legend>
          <Field label="Birthdate" htmlFor="birthdate" error={errors.birthdate?.message} hint={age !== null && age >= 0 ? `${age} years old${age >= 60 ? ', senior citizen' : ''}` : undefined} required>
            <input id="birthdate" type="date" className={inputClass(errors.birthdate?.message)} {...register('birthdate')} />
          </Field>
          <Field label="Sex" htmlFor="sex" error={errors.sex?.message} required>
            <select id="sex" className={inputClass(errors.sex?.message)} {...register('sex')}><option value="female">Female</option><option value="male">Male</option></select>
          </Field>
          <Field label="Civil status" htmlFor="civilStatus" error={errors.civilStatus?.message}>
            <select id="civilStatus" className="input" {...register('civilStatus')}>
              <option value="single">Single</option><option value="married">Married</option><option value="widowed">Widowed</option><option value="separated">Separated</option>
            </select>
          </Field>
          <Field label="Occupation" htmlFor="occupation" error={errors.occupation?.message}><input id="occupation" className={inputClass(errors.occupation?.message)} {...register('occupation')} /></Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-3 font-display text-lg font-bold">Address and contact</legend>
          <Field label="Purok" htmlFor="purok" error={errors.purok?.message} required>
            <select id="purok" className={inputClass(errors.purok?.message)} {...register('purok')}>{PUROKS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          </Field>
          <Field label="House no. and street" htmlFor="address" error={errors.address?.message} className="sm:col-span-1 lg:col-span-3" required>
            <input id="address" className={inputClass(errors.address?.message)} {...register('address')} />
          </Field>
          <Field label="Mobile number" htmlFor="contactNumber" error={errors.contactNumber?.message} hint="09XXXXXXXXX">
            <input id="contactNumber" inputMode="numeric" className={inputClass(errors.contactNumber?.message)} {...register('contactNumber')} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}><input id="email" type="email" className={inputClass(errors.email?.message)} {...register('email')} /></Field>
          <Field label="Residency" htmlFor="residencyType" error={errors.residencyType?.message}>
            <select id="residencyType" className="input" {...register('residencyType')}>
              <option value="non_migrant">Non-migrant (5+ years)</option><option value="migrant">Migrant</option><option value="transient">Transient</option>
            </select>
          </Field>
          <Field label="Years living here" htmlFor="yearsOfResidency" error={errors.yearsOfResidency?.message}>
            <input id="yearsOfResidency" type="number" min={0} className={inputClass(errors.yearsOfResidency?.message)} {...register('yearsOfResidency')} />
          </Field>
          <label className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <input type="checkbox" className="h-5 w-5 accent-brand-600" {...register('isVoter')} />
            <span className="font-bold text-ink-soft">Registered voter in this barangay</span>
          </label>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 border-t border-paper-line pt-5 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add resident'}</button>
        </div>
      </form>
    </>
  );
}
