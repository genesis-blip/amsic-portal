import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { meApi } from '../../api/auth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { Stamp } from '../../components/ui/Stamp';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { formatDate, formatDateTime, formatPeso, formatSlot, relativeDays, formatMethod } from '../../utils/format';
import { OnlinePayPanel } from '../../components/OnlinePayPanel';
import { DocumentDownloadButton } from '../../components/DocumentDownloadButton';
import { canDownloadDocument } from '../../utils/documents';
import type { RequestStatus } from '../../types';

const STEPS: { status: RequestStatus; label: string; hint: string }[] = [
  { status: 'pending', label: 'Received', hint: 'The barangay has your request.' },
  { status: 'processing', label: 'Processing', hint: 'Staff are preparing your document.' },
  { status: 'ready', label: 'Ready for pickup', hint: 'Come on your pickup day with a valid ID.' },
  { status: 'released', label: 'Claimed', hint: 'You received the document.' },
];

export default function PortalRequestDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: r, loading, error, reload } = useApi(() => meApi.request(id!), [id]);
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <LoadingState />;
  if (error || !r) return <ErrorState message={error ?? 'Request not found'} onRetry={reload} />;

  const closed = r.status === 'cancelled' || r.status === 'rejected';
  const reached = (s: RequestStatus) => r.statusHistory.some((h) => h.status === s);
  const lastNote = [...r.statusHistory].reverse().find((h) => h.note && h.status === r.status)?.note;

  return (
    <>
      <Link to="/portal/requests" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden /> My requests</Link>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="tabular font-display text-display-md font-extrabold sm:text-display-lg">{r.referenceNumber}</h1>
        <span className="scale-125"><Stamp status={r.status} /></span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel panel-pad">
          <h2 className="mb-4 text-lg font-bold">{closed ? `This request was ${r.status}` : 'Where your request is'}</h2>
          {closed ? (
            <p className="text-ink-soft">{lastNote ?? 'No reason was given.'}</p>
          ) : (
            <ol className="space-y-0">
              {STEPS.map((s, i) => {
                const done = reached(s.status);
                const current = r.status === s.status;
                const at = r.statusHistory.find((h) => h.status === s.status)?.changedAt;
                return (
                  <li key={s.status} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < STEPS.length - 1 && <span className={`absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-0.5 ${reached(STEPS[i + 1].status) ? 'bg-brand-500' : 'bg-paper-line'}`} aria-hidden />}
                    <span className={`relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-extrabold ${done ? 'border-brand-600 bg-brand-600 text-white' : 'border-paper-line bg-white text-ink-faint'}`}>{i + 1}</span>
                    <div>
                      <p className={`font-bold ${current ? 'text-brand-800' : done ? '' : 'text-ink-faint'}`}>{s.label}{current && <span className="ml-2 chip bg-brand-50 text-brand-700">Now</span>}</p>
                      <p className="text-sm text-ink-muted">{at ? formatDateTime(at) : s.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {r.status === 'pending' && (
            <div className="mt-6 border-t border-paper-line pt-4">
              <button type="button" className="btn-ghost text-seal" onClick={() => setCancelling(true)}>Cancel this request</button>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {!['rejected', 'cancelled'].includes(r.status) && (
            <section className={`panel panel-pad border-2 ${canDownloadDocument(r) ? 'border-leaf' : 'border-paper-rule'}`}>
              <h2 className="text-lg font-bold">Your {r.documentType.name}</h2>
              {canDownloadDocument(r) ? (
                <>
                  <p className="mt-1 text-sm text-ink-soft">Your official soft copy is ready. View it online, or download it to print or show on your phone. It has a QR code anyone can scan to check that it is genuine.</p>
                  <div className="mt-4 grid gap-2">
                    <DocumentDownloadButton path={`/me/requests/${r._id}/certificate`} request={r} open label="View PDF online" className="btn-primary w-full" />
                    <DocumentDownloadButton path={`/me/requests/${r._id}/certificate`} request={r} label="Download PDF" className="btn-secondary w-full" />
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-ink-soft">
                    See how your document will look. The preview is marked &quot;not yet valid&quot;.
                    {['ready', 'released'].includes(r.status)
                      ? ' Pay the fee below to get the official copy.'
                      : ' The official copy unlocks once the barangay marks it ready and the fee is paid.'}
                  </p>
                  <DocumentDownloadButton path={`/me/requests/${r._id}/certificate?preview=1`} request={r} open label="View preview (PDF)" className="btn-secondary mt-4 w-full" />
                </>
              )}
            </section>
          )}
          <section className="panel panel-pad">
            <dl className="divide-y divide-paper-rule text-sm">
              {[
                ['Document', `${r.documentType.name}, ${r.copies} cop${r.copies > 1 ? 'ies' : 'y'}`],
                ['Purpose', r.purpose],
                ['Pickup', `${formatDate(r.pickupDateIso, { weekday: 'long', month: 'long', day: 'numeric' })}, ${formatSlot(r.pickupSlot)}${r.isActive ? ` (${relativeDays(r.daysUntilPickup)})` : ''}`],
                ['Filed', formatDateTime(r.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 py-2.5"><dt className="font-bold text-ink-muted">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
          <section className="panel panel-pad">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Fee</h2>
              <Stamp status={r.paymentStatus} label={r.paymentStatus === 'waived' ? 'Free' : undefined} tilt={false} />
            </div>
            <dl className="tabular space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">{r.copies} × {formatPeso(r.fees.unitFee)}</dt><dd>{formatPeso(r.fees.subtotal)}</dd></div>
              {r.fees.discount > 0 && <div className="flex justify-between text-brand-700"><dt>Senior discount ({r.fees.discountRate * 100}%)</dt><dd>−{formatPeso(r.fees.discount)}</dd></div>}
              <div className="flex justify-between border-t border-paper-line pt-2 font-display text-xl font-extrabold"><dt>Total</dt><dd>{formatPeso(r.fees.total)}</dd></div>
            </dl>
            {r.paymentStatus === 'unpaid' && !closed && (
              <>
                <p className="mt-3 text-sm text-ink-soft">Pay at the treasurer’s window on your pickup day, or pay now online. Either way you get an official receipt.</p>
                <OnlinePayPanel requestId={r._id} amount={r.fees.total} onPaid={() => void reload()} />
              </>
            )}
            {r.payments?.filter((p) => !p.isVoided).map((p) => (
              <p key={p._id} className="mt-3 text-sm text-ink-soft">Paid {formatPeso(p.amount)} by {formatMethod(p.method)}, OR no. <span className="tabular font-bold">{p.orNumber}</span>, {formatDateTime(p.paidAt)}</p>
            ))}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={cancelling}
        title="Cancel this request?"
        message="Your pickup slot will be given to someone else. You can file a new request any time."
        confirmLabel="Cancel request"
        onClose={() => setCancelling(false)}
        onConfirm={async () => {
          await meApi.cancelRequest(r._id);
          toast.success('Request cancelled');
          setCancelling(false);
          void reload();
        }}
      />
    </>
  );
}
