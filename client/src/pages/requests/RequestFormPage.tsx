import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestsApi } from '../../api/requests';
import { documentTypesApi } from '../../api/documentTypes';
import { schedulesApi } from '../../api/schedules';
import { residentsApi } from '../../api/residents';
import { requestSchema, SLOTS, type RequestFormValues } from '../../schemas/request';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { parseApiError } from '../../lib/http';
import { Field } from '../../components/ui/Field';
import { inputClass } from '../../utils/inputClass';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { ResidentPicker } from '../../components/ResidentPicker';
import { formatDate, formatPeso, formatSlot, fullName, todayIso } from '../../utils/format';
import type { Availability, Quote } from '../../types';

const PURPOSES = ['Employment', 'School requirement', 'Scholarship application', 'Bank account opening', 'Medical assistance', 'Business registration', 'Travel requirement', 'Loan application'];
const tomorrow = () => { const d = new Date(`${todayIso()}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

export default function RequestFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [residentLabel, setResidentLabel] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Availability | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const types = useApi(() => documentTypesApi.list({ active: 'true' }), []);
  const { register, control, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting } } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { resident: params.get('resident') ?? '', documentType: '', purpose: '', copies: 1, pickupDate: '', pickupSlot: undefined, remarks: '' },
  });

  useEffect(() => {
    const preset = params.get('resident');
    const job = id
      ? requestsApi.get(id).then((r) => {
        if (r.status !== 'pending') throw new Error(`Only received (pending) requests can be edited. This one is ${r.status}.`);
        setResidentLabel(`${fullName(r.resident)} (${r.resident.residentNo})`);
        reset({ resident: r.resident._id, documentType: r.documentType._id, purpose: r.purpose, copies: r.copies, pickupDate: r.pickupDateIso, pickupSlot: r.pickupSlot as RequestFormValues['pickupSlot'], remarks: r.remarks });
      })
      : preset
        ? residentsApi.get(preset).then((r) => setResidentLabel(`${r.fullName} (${r.residentNo})`))
        : Promise.resolve();
    job.catch((e) => setLoadError(parseApiError(e).message)).finally(() => setLoading(false));
  }, [id, params, reset]);

  const [resident, documentType, copies, pickupDate, pickupSlot] = watch(['resident', 'documentType', 'copies', 'pickupDate', 'pickupSlot']);
  const debouncedCopies = useDebounce(copies, 300);

  useEffect(() => {
    setQuoteError(null);
    const n = Number(debouncedCopies);
    if (!resident || !documentType || !Number.isInteger(n) || n < 1 || n > 10) { setQuote(null); return; }
    let alive = true;
    requestsApi.quote({ resident, documentType, copies: n })
      .then((q) => alive && setQuote(q))
      .catch((e) => { if (alive) { setQuote(null); setQuoteError(parseApiError(e).message); } });
    return () => { alive = false; };
  }, [resident, documentType, debouncedCopies]);

  useEffect(() => {
    setSlotsError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) { setSlots(null); return; }
    let alive = true;
    schedulesApi.availability(pickupDate)
      .then((a) => alive && setSlots(a))
      .catch((e) => alive && setSlotsError(parseApiError(e).message));
    return () => { alive = false; };
  }, [pickupDate]);

  const onSubmit = async (values: RequestFormValues) => {
    setFormError(null);
    try {
      const saved = isEdit
        ? await requestsApi.update(id!, { purpose: values.purpose, copies: values.copies, pickupDate: values.pickupDate, pickupSlot: values.pickupSlot, remarks: values.remarks })
        : await requestsApi.create(values);
      toast.success(isEdit ? 'Request updated' : `Request received as ${saved.referenceNumber}`);
      navigate(`/app/requests/${saved._id}`);
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  if (loading || types.loading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} />;
  if (types.error) return <ErrorState message={types.error} onRetry={types.reload} />;

  return (
    <>
      <PageHeader title={isEdit ? 'Edit request' : 'New document request'} back={{ to: isEdit ? `/app/requests/${id}` : '/app/requests', label: isEdit ? 'Back to request' : 'Document requests' }} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="panel panel-pad space-y-5">
          {formError && <ErrorState message={formError} />}
          <Field label="Resident" htmlFor="resident" error={errors.resident?.message} required hint={isEdit ? 'The resident cannot be changed.' : undefined}>
            <Controller
              control={control}
              name="resident"
              render={({ field }) => (isEdit
                ? <input id="resident" className="input bg-paper" value={residentLabel} disabled />
                : <ResidentPicker id="resident" value={field.value} onChange={(v) => field.onChange(v)} error={errors.resident?.message} initialLabel={residentLabel} />)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="Document" htmlFor="documentType" error={errors.documentType?.message} required>
              <select id="documentType" className={inputClass(errors.documentType?.message)} disabled={isEdit} {...register('documentType')}>
                <option value="">Choose a document</option>
                {types.data?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Copies" htmlFor="copies" error={errors.copies?.message} required>
              <input id="copies" type="number" min={1} max={10} className={inputClass(errors.copies?.message)} {...register('copies')} />
            </Field>
          </div>
          <Field label="Purpose" htmlFor="purpose" error={errors.purpose?.message} required>
            <input id="purpose" list="purposes" className={inputClass(errors.purpose?.message)} {...register('purpose')} />
            <datalist id="purposes">{PURPOSES.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
          <Field label="Pickup date" htmlFor="pickupDate" error={errors.pickupDate?.message} required hint="Monday to Friday, at least one day ahead">
            <input id="pickupDate" type="date" min={tomorrow()} className={inputClass(errors.pickupDate?.message)} {...register('pickupDate')} />
          </Field>
          <fieldset>
            <legend className="label">Pickup time <span className="text-seal">*</span></legend>
            {!slots && !slotsError && <p className="hint">Choose a date to see open hours.</p>}
            {slotsError && <p className="field-error">{slotsError}</p>}
            {slots && !slots.isOpen && <p className="rounded-control bg-seal-soft px-3 py-2 text-sm font-bold text-seal-dark">{slots.closedReason}. Choose another date.</p>}
            {slots && slots.isOpen && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SLOTS.map((s) => {
                  const info = slots.slots.find((x) => x.slot === s)!;
                  const mine = isEdit && s === pickupSlot;
                  const disabled = !info.available && !mine;
                  return (
                    <label key={s} className={`cursor-pointer rounded-control border-2 px-3 py-2.5 text-center text-sm ${pickupSlot === s ? 'border-brand-600 bg-brand-50' : 'border-paper-line bg-white'} ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-brand-300'}`}>
                      <input type="radio" value={s} disabled={disabled} className="sr-only" {...register('pickupSlot')} />
                      <span className="block font-bold">{formatSlot(s)}</span>
                      <span className={`text-[13px] ${info.remaining === 0 ? 'text-seal' : 'text-ink-muted'}`}>{info.remaining === 0 ? 'Full' : `${info.remaining} of ${info.capacity} open`}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {errors.pickupSlot && <p className="field-error">{errors.pickupSlot.message}</p>}
          </fieldset>
          <Field label="Notes for the staff" htmlFor="remarks" error={errors.remarks?.message}>
            <textarea id="remarks" rows={2} className={inputClass(errors.remarks?.message)} {...register('remarks')} />
          </Field>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="panel panel-pad">
            <h2 className="mb-3 text-lg font-bold">Fee</h2>
            {quoteError && <p className="field-error">{quoteError}</p>}
            {!quote && !quoteError && <p className="text-ink-muted">Choose a resident and a document to see the fee.</p>}
            {quote && (
              <dl className="tabular space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-muted">{quote.copies} × {formatPeso(quote.unitFee)}</dt><dd>{formatPeso(quote.subtotal)}</dd></div>
                {quote.discount > 0 && <div className="flex justify-between text-brand-700"><dt>Senior citizen discount ({quote.discountRate * 100}%)</dt><dd>−{formatPeso(quote.discount)}</dd></div>}
                <div className="flex justify-between border-t border-paper-line pt-2 font-display text-xl font-extrabold"><dt>Total</dt><dd>{quote.isFree ? 'Free' : formatPeso(quote.total)}</dd></div>
                <p className="pt-1 text-ink-muted">Usually ready in {quote.processingDays === 0 ? 'the same day' : `${quote.processingDays} working day${quote.processingDays > 1 ? 's' : ''}`}.</p>
              </dl>
            )}
          </section>
          {pickupDate && pickupSlot && (
            <p className="rounded-panel border-l-4 border-stamp bg-stamp-soft px-4 py-3 text-sm text-stamp-dark">
              Pickup on <strong>{formatDate(pickupDate, { weekday: 'long', month: 'long', day: 'numeric' })}</strong>, {formatSlot(pickupSlot)}.
            </p>
          )}
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Submit request'}</button>
        </aside>
      </form>
    </>
  );
}
