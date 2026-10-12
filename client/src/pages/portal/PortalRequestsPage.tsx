import { useState } from 'react';
import { Link } from 'react-router-dom';
import { meApi } from '../../api/auth';
import { useApi } from '../../hooks/useApi';
import { Stamp } from '../../components/ui/Stamp';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { DocumentDownloadButton } from '../../components/DocumentDownloadButton';
import { canDownloadDocument } from '../../utils/documents';
import { formatDate, formatPeso, formatSlot } from '../../utils/format';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending,processing,ready', label: 'In progress' },
  { value: 'released', label: 'Claimed' },
  { value: 'cancelled,rejected', label: 'Cancelled or rejected' },
];

export default function PortalRequestsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => meApi.requests({ status: status || undefined, sort: '-createdAt', page }), [status, page]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-display-md font-extrabold sm:text-display-lg">My requests</h1>
          <p className="mt-1 text-ink-muted">Every document you requested, newest first.</p>
        </div>
        <Link to="/portal/requests/new" className="btn-primary">Request a document</Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f.label} type="button" aria-pressed={status === f.value} onClick={() => { setStatus(f.value); setPage(1); }}
            className={`rounded-full border px-3 py-1 text-sm font-bold ${status === f.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-paper-line bg-white text-ink-soft hover:border-brand-300'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="panel">
        {loading && <LoadingState />}
        {error && <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>}
        {data?.items.length === 0 && <EmptyState title="No requests here" action={<Link to="/portal/requests/new" className="btn-primary">Request a document</Link>} />}
        {data && data.items.length > 0 && (
          <>
            <table className="ledger ledger-stack">
              <thead><tr><th>Reference</th><th>Document</th><th>Pickup</th><th className="text-right">Fee</th><th>Status</th><th>PDF</th></tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r._id}>
                    <td><Link to={`/portal/requests/${r._id}`} className="tabular font-bold text-brand-800 hover:underline">{r.referenceNumber}</Link></td>
                    <td>{r.documentType.name}{r.copies > 1 ? ` (${r.copies} copies)` : ''}</td>
                    <td>{formatDate(r.pickupDateIso, { weekday: 'short', month: 'short', day: 'numeric' })}, {formatSlot(r.pickupSlot)}</td>
                    <td className="tabular text-right">{r.paymentStatus === 'waived' ? 'Free' : formatPeso(r.fees.total)} <Stamp status={r.paymentStatus} tilt={false} label={r.paymentStatus === 'waived' ? 'Free' : undefined} /></td>
                    <td><Stamp status={r.status} /></td>
                    <td>
                      {!['rejected', 'cancelled'].includes(r.status) && (canDownloadDocument(r)
                        ? <DocumentDownloadButton path={`/me/requests/${r._id}/certificate`} request={r} open label="View PDF" className="btn-primary btn-sm whitespace-nowrap" />
                        : <DocumentDownloadButton path={`/me/requests/${r._id}/certificate?preview=1`} request={r} open label="Preview" className="btn-secondary btn-sm whitespace-nowrap" />)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}
