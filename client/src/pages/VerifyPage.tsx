import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { http } from '../lib/http';
import { useApi } from '../hooks/useApi';
import { ErrorState, LoadingState } from '../components/ui/States';
import { formatDate, humanize } from '../utils/format';

interface Verification { referenceNumber: string; document: string; issuedTo: string; status: string; valid: boolean; issuedAt: string | null }

export default function VerifyPage() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(reference ?? '');
  const result = useApi(() => (reference ? http.get<Verification>(`/verify/${encodeURIComponent(reference)}`).then((r) => r.data) : Promise.resolve(null)), [reference]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) navigate(`/verify/${encodeURIComponent(input.trim().toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Barangay Amsic seal" className="h-11 w-11" />
          <span className="font-display text-lg font-extrabold leading-tight">Barangay Amsic<span className="block font-sans text-[13px] font-normal text-ink-muted">Document verification</span></span>
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16 sm:px-6">
        <h1 className="font-display text-display-md font-extrabold">Check a barangay document</h1>
        <p className="mt-1 text-ink-muted">Type the reference number printed on the document, or scan its QR code.</p>
        <form onSubmit={submit} className="mt-5 flex gap-2">
          <label htmlFor="ref" className="sr-only">Reference number</label>
          <input id="ref" className="input tabular uppercase" placeholder="BRG-2026-00012" value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="btn-primary">Check</button>
        </form>

        <div className="mt-6">
          {reference && result.loading && <LoadingState label="Checking the records…" />}
          {reference && result.error && (
            result.error.includes('not found')
              ? (
                <div className="panel panel-pad flex gap-3 border-seal">
                  <ShieldAlert className="h-7 w-7 shrink-0 text-seal" aria-hidden />
                  <div><p className="font-display text-lg font-bold text-seal-dark">No document with this number</p><p className="text-ink-muted">Check the number. If it is correct, the document may not be genuine. Contact the barangay hall.</p></div>
                </div>
              )
              : <ErrorState message={result.error} onRetry={result.reload} />
          )}
          {result.data && (
            <div className={`panel panel-pad flex gap-3 ${result.data.valid ? 'border-leaf' : 'border-sunflower-dark'}`}>
              {result.data.valid ? <BadgeCheck className="h-7 w-7 shrink-0 text-leaf" aria-hidden /> : <ShieldAlert className="h-7 w-7 shrink-0 text-sunflower-dark" aria-hidden />}
              <div className="min-w-0">
                <p className={`font-display text-lg font-bold ${result.data.valid ? 'text-leaf-dark' : 'text-sunflower-dark'}`}>
                  {result.data.valid ? 'Genuine document of Barangay Amsic' : 'This request has not been issued'}
                </p>
                <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
                  <dt className="text-ink-muted">Reference no.</dt><dd className="tabular font-bold">{result.data.referenceNumber}</dd>
                  <dt className="text-ink-muted">Document</dt><dd>{result.data.document}</dd>
                  <dt className="text-ink-muted">Issued to</dt><dd>{result.data.issuedTo}</dd>
                  <dt className="text-ink-muted">Issued on</dt><dd>{result.data.issuedAt ? formatDate(result.data.issuedAt) : '—'}</dd>
                  <dt className="text-ink-muted">Status</dt><dd>{humanize(result.data.status === 'pending' ? 'received' : result.data.status)}</dd>
                </dl>
                <p className="hint mt-3">Compare the name and document with the printed copy.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
