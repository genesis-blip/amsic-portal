import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { meApi, type OnlinePayment } from '../api/auth';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { parseApiError } from '../lib/http';
import { formatPeso } from '../utils/format';

interface Props { requestId: string; amount: number; onPaid: () => void }

export function OnlinePayPanel({ requestId, amount, onPaid }: Props) {
  const toast = useToast();
  const options = useApi(() => meApi.paymentOptions(), []);
  const [qr, setQr] = useState<OnlinePayment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const secondsLeft = qr?.expiresAt ? Math.max(0, Math.floor((new Date(qr.expiresAt).getTime() - now) / 1000)) : 0;
  const expired = !!qr && secondsLeft === 0;

  useEffect(() => {
    if (!qr || qr.paid || expired) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      meApi.paymentStatus(requestId).then((s) => {
        if (s.paid) { toast.success('Payment received. Thank you!'); onPaid(); }
      }).catch(() => undefined);
    }, 5000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [qr, expired, requestId, onPaid, toast]);

  if (options.loading || !options.data?.online) return null;
  if (amount < 20) return <p className="mt-3 text-sm text-ink-muted">Online payment starts at ₱20.00. Pay this one at the barangay hall.</p>;

  const start = async () => {
    setBusy(true); setError(null);
    try {
      const res = await meApi.startPayment(requestId);
      if (res.paid) { onPaid(); return; }
      setNow(Date.now());
      setQr(res);
    } catch (e) { setError(parseApiError(e).message); } finally { setBusy(false); }
  };

  const simulate = async () => {
    setBusy(true); setError(null);
    try {
      await meApi.simulatePayment(requestId);
      toast.success('Test payment recorded');
      onPaid();
    } catch (e) { setError(parseApiError(e).message); } finally { setBusy(false); }
  };

  return (
    <div className="mt-4 border-t border-paper-line pt-4">
      {error && <p className="field-error mb-2" role="alert">{error}</p>}
      {!qr || expired ? (
        <>
          {expired && <p className="mb-2 text-sm text-seal">That QR code expired. Make a new one.</p>}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void start()}>
            <QrCode className="h-5 w-5" aria-hidden /> {busy ? 'Making QR code…' : `Pay ${formatPeso(amount)} online`}
          </button>
          <p className="hint text-center">QR Ph: scan with GCash, Maya or any bank app</p>
        </>
      ) : (
        <div className="text-center">
          <img src={qr.qrImage} alt={`QR Ph code to pay ${formatPeso(amount)}`} className="mx-auto h-56 w-56 rounded-control border border-paper-line bg-white p-2 [image-rendering:pixelated]" />
          <p className="mt-2 font-display text-xl font-extrabold">{formatPeso(qr.amount ?? amount)}</p>
          <p className="text-sm text-ink-muted" aria-live="polite">
            Waiting for payment. Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </p>
          <p className="hint">This page updates by itself after you pay.</p>
          {qr.testMode && (
            <div className="mt-3 rounded-control border border-dashed border-sunflower-dark bg-sunflower-soft px-3 py-2 text-left text-[13px] text-sunflower-dark">
              PayMongo test mode: real e-wallets cannot pay this QR.
              <button type="button" className="btn-secondary btn-sm mt-2 w-full" disabled={busy} onClick={() => void simulate()}>Simulate a successful payment</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
