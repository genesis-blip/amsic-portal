import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Siren } from 'lucide-react';
import { meApi } from '../../api/auth';
import { useAuth } from '../../auth/authContext';
import { EMERGENCY_TYPES, portalSosSchema, type PortalSosValues } from '../../schemas/sos';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { applyServerErrors } from '../../hooks/useServerErrors';
import { Field } from '../../components/ui/Field';
import { Stamp } from '../../components/ui/Stamp';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { inputClass } from '../../utils/inputClass';
import { formatDateTime, humanize } from '../../utils/format';
import { HotlineList } from '../../components/HotlineList';

export default function PortalSosPage() {
  const { user } = useAuth();
  const toast = useToast();
  const history = useApi(() => meApi.sos(), []);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const home = user?.resident ? `${user.resident.address}, ${user.resident.purok}` : '';
  const { register, handleSubmit, setError, setValue, formState: { errors, isSubmitting } } = useForm<PortalSosValues>({
    resolver: zodResolver(portalSosSchema),
    defaultValues: { emergencyType: 'medical', message: '', location: home },
  });

  const open = history.data?.items.find((a) => a.status !== 'resolved');

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { setGeoMsg('This phone or browser cannot share location.'); return; }
    setGeoMsg('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { latitude: Number(p.coords.latitude.toFixed(6)), longitude: Number(p.coords.longitude.toFixed(6)) };
        setCoords(c);
        setValue('location', `${c.latitude}, ${c.longitude} (near ${home})`.slice(0, 200), { shouldValidate: true });
        setGeoMsg('Location added.');
      },
      () => setGeoMsg('Location was not shared. Type where you are instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async (values: PortalSosValues) => {
    setFormError(null);
    try {
      await meApi.sendSos({ ...values, ...(coords ?? {}) });
      toast.success('SOS sent. Stay where you are if it is safe.');
      void history.reload();
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  if (history.loading) return <LoadingState />;
  if (history.error) return <ErrorState message={history.error} onRetry={history.reload} />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="flex items-center gap-3 font-display text-display-md font-extrabold text-seal-dark sm:text-display-lg"><Siren className="h-9 w-9" aria-hidden /> Emergency SOS</h1>
      <p className="mt-1 text-ink-muted">Alerts the tanods and barangay staff on duty. For fire or life-threatening emergencies, also call 911.</p>

      {open ? (
        <section className={`mt-6 rounded-panel border-2 p-6 ${open.status === 'active' ? 'border-seal bg-seal-soft' : 'border-stamp bg-stamp-soft'}`} aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">{open.status === 'active' ? 'Waiting for a responder' : 'Help is on the way'}</h2>
            <Stamp status={open.status} />
          </div>
          <p className="mt-2 text-ink-soft">{humanize(open.emergencyType)}: {open.message}</p>
          <p className="mt-1 text-sm text-ink-muted">Sent {formatDateTime(open.createdAt)} from {open.location}</p>
          <button type="button" className="btn-secondary btn-sm mt-4" onClick={() => void history.reload()}>Refresh status</button>
        </section>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="panel panel-pad mt-6 space-y-4">
          {formError && <ErrorState message={formError} />}
          <fieldset>
            <legend className="label">What kind of emergency</legend>
            <div className="grid grid-cols-3 gap-2">
              {EMERGENCY_TYPES.map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" value={t} className="peer sr-only" {...register('emergencyType')} />
                  <span className="block rounded-control border-2 border-paper-line bg-white px-2 py-2.5 text-center text-sm font-bold peer-checked:border-seal peer-checked:bg-seal-soft peer-checked:text-seal-dark peer-focus-visible:ring-2 peer-focus-visible:ring-stamp">{humanize(t)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="What is happening" htmlFor="message" error={errors.message?.message} required>
            <textarea id="message" rows={2} className={inputClass(errors.message?.message)} placeholder="Hal. Nahimatay ang lolo ko, hindi makahinga" {...register('message')} />
          </Field>
          <Field label="Where are you" htmlFor="location" error={errors.location?.message} required>
            <input id="location" className={inputClass(errors.location?.message)} {...register('location')} />
          </Field>
          <div>
            <button type="button" className="btn-secondary btn-sm" onClick={useMyLocation}><MapPin className="h-4 w-4" aria-hidden /> Use my current location</button>
            {geoMsg && <p className="hint">{geoMsg}</p>}
          </div>
          <button type="submit" className="btn-danger w-full py-4 text-lg" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send SOS now'}</button>
        </form>
      )}

      <HotlineList className="mt-10" title="Call for help" />

      {history.data && history.data.items.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Past alerts</h2>
          <ul className="panel">
            {history.data.items.map((a) => (
              <li key={a._id} className="flex items-center justify-between gap-3 border-b border-paper-rule px-5 py-3 text-sm last:border-0">
                <span><span className="font-bold">{humanize(a.emergencyType)}</span> <span className="text-ink-muted">{formatDateTime(a.createdAt)}</span></span>
                <Stamp status={a.status} tilt={false} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
