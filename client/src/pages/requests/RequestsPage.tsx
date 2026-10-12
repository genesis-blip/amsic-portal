import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { requestsApi } from '../../api/requests';
import { documentTypesApi } from '../../api/documentTypes';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Pagination } from '../../components/ui/Pagination';
import { Stamp } from '../../components/ui/Stamp';
import { formatDate, formatPeso, formatSlot, fullName, relativeDays } from '../../utils/format';
import { useAuth } from '../../auth/authContext';
import { DocumentDownloadButton } from '../../components/DocumentDownloadButton';
import { canDownloadDocument } from '../../utils/documents';

const STATUS_TABS = [
  { value: 'pending,processing,ready', label: 'Active' },
  { value: 'pending', label: 'Received' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'released', label: 'Released' },
  { value: '', label: 'All' },
];

export default function RequestsPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'pending,processing,ready';
  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [sort, setSort] = useState('pickupDate');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const types = useApi(() => documentTypesApi.list(), []);
  const { data, loading, error, reload } = useApi(
    () => requestsApi.list({ search: q, status, documentType, paymentStatus, sort, page, limit: 15 }),
    [q, status, documentType, paymentStatus, sort, page],
  );
  const pageTotal = data ? data.items.reduce((s, r) => s + r.fees.total, 0) : 0;

  return (
    <>
      <PageHeader title="Document requests" description="Every request with its fee, pickup slot and status." actions={can('documents.process') && <Link to="/app/requests/new" className="btn-primary">New request</Link>} />

      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-paper-line" role="tablist" aria-label="Status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={status === t.value}
            onClick={() => { setParams(t.value ? { status: t.value } : { status: '' }); setPage(1); }}
            className={`-mb-px whitespace-nowrap border-b-[3px] px-3 py-2 text-sm font-bold ${status === t.value ? 'border-brand-600 text-brand-800' : 'border-transparent text-ink-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_1fr]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search requests</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input className="input pl-9" placeholder="Reference no., name or purpose" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </label>
        <select className="input" aria-label="Document" value={documentType} onChange={(e) => { setDocumentType(e.target.value); setPage(1); }}>
          <option value="">All documents</option>
          {types.data?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select className="input" aria-label="Payment" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
          <option value="">Paid or unpaid</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="waived">Free</option>
        </select>
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="pickupDate">Pickup date, soonest</option><option value="-pickupDate">Pickup date, latest</option>
          <option value="-createdAt">Newest first</option><option value="createdAt">Oldest first</option>
        </select>
      </div>

      <div className="panel overflow-hidden">
        {loading && <div className="px-4"><LoadingState label="Loading requests…" /></div>}
        {error && <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>}
        {data && data.items.length === 0 && (
          <EmptyState title="No requests here" body="Nothing matches this status and these filters." action={can('documents.process') && <Link to="/app/requests/new" className="btn-primary">New request</Link>} />
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="ledger ledger-stack sm:min-w-[760px]">
                <thead><tr><th>Reference</th><th>Resident and document</th><th>Pickup</th><th className="text-right">Fee</th><th>Status</th><th>PDF</th></tr></thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r._id}>
                      <td><Link to={`/app/requests/${r._id}`} className="tabular font-bold text-brand-800 hover:underline">{r.referenceNumber}</Link></td>
                      <td>
                        <span className="font-bold">{fullName(r.resident)}</span>
                        <span className="block text-ink-muted">{r.documentType.name}{r.copies > 1 ? `, ${r.copies} copies` : ''}</span>
                      </td>
                      <td>
                        {formatDate(r.pickupDateIso)}
                        <span className={`block text-[13px] ${r.isBehindSchedule || r.isUnclaimed ? 'font-bold text-seal' : 'text-ink-muted'}`}>
                          {formatSlot(r.pickupSlot)}{r.isActive ? `, ${relativeDays(r.daysUntilPickup)}` : ''}
                        </span>
                      </td>
                      <td className="tabular text-right">
                        {formatPeso(r.fees.total)}
                        <span className={`block text-[13px] ${r.paymentStatus === 'unpaid' ? 'font-bold text-seal' : 'text-ink-muted'}`}>{r.paymentStatus === 'waived' ? 'Free' : r.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</span>
                      </td>
                      <td><Stamp status={r.status} /></td>
                      <td>
                        {!['rejected', 'cancelled'].includes(r.status) && (canDownloadDocument(r)
                          ? <DocumentDownloadButton path={`/document-requests/${r._id}/certificate`} request={r} open label="View PDF" className="btn-primary btn-sm whitespace-nowrap" />
                          : <DocumentDownloadButton path={`/document-requests/${r._id}/certificate?preview=1`} request={r} open label="Preview" className="btn-secondary btn-sm whitespace-nowrap" />)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-paper-rule px-3 pt-3 text-sm text-ink-muted">Fees on this page: <strong className="tabular text-ink">{formatPeso(pageTotal)}</strong></p>
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}
