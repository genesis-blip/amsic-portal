import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { residentsApi } from '../../api/residents';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Pagination } from '../../components/ui/Pagination';
import { PUROKS } from '../../schemas/resident';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../auth/authContext';

export default function ResidentsPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [purok, setPurok] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [sex, setSex] = useState('');
  const [sort, setSort] = useState('lastName');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const { data, loading, error, reload } = useApi(
    () => residentsApi.list({ search: q, purok, ageGroup, sex, sort, page, limit: 15 }),
    [q, purok, ageGroup, sex, sort, page],
  );
  const filtersOn = Boolean(q || purok || ageGroup || sex);
  const seniorsShown = data ? data.items.filter((r) => r.isSenior).length : 0;
  const reset = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  return (
    <>
      <PageHeader title="Residents" description="Everyone registered in Barangay Amsic. Search by name, resident number, address or phone." actions={can('residents.manage') && <Link to="/app/residents/new" className="btn-primary">Add resident</Link>} />

      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search residents</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input className="input pl-9" placeholder="Search residents" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        </label>
        <select className="input" aria-label="Purok" value={purok} onChange={(e) => reset(setPurok)(e.target.value)}>
          <option value="">All puroks</option>
          {PUROKS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input" aria-label="Age group" value={ageGroup} onChange={(e) => reset(setAgeGroup)(e.target.value)}>
          <option value="">All ages</option>
          <option value="child">Children (0–12)</option>
          <option value="youth">Youth (13–17)</option>
          <option value="adult">Adults (18–59)</option>
          <option value="senior">Seniors (60+)</option>
        </select>
        <select className="input" aria-label="Sex" value={sex} onChange={(e) => reset(setSex)(e.target.value)}>
          <option value="">Any sex</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="lastName">Name A–Z</option>
          <option value="-createdAt">Newest first</option>
          <option value="birthdate">Oldest first</option>
          <option value="-birthdate">Youngest first</option>
          <option value="purok">By purok</option>
        </select>
      </div>

      <div className="panel overflow-hidden">
        {loading && <div className="px-4"><LoadingState label="Loading residents…" /></div>}
        {error && <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>}
        {data && data.items.length === 0 && (
          <EmptyState
            title={filtersOn ? 'No resident matches these filters' : 'No residents yet'}
            body={filtersOn ? 'Try a shorter name or clear a filter.' : 'Add the first resident to start issuing documents.'}
            action={!filtersOn && can('residents.manage') && <Link to="/app/residents/new" className="btn-primary">Add resident</Link>}
          />
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="ledger ledger-stack sm:min-w-[640px]">
                <thead><tr><th>Name</th><th>Resident no.</th><th>Age</th><th>Purok</th><th>Contact</th><th>Registered</th></tr></thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <Link to={`/app/residents/${r._id}`} className="font-bold text-brand-800 hover:underline">{r.lastName}, {r.firstName} {r.middleName ? `${r.middleName[0]}.` : ''}</Link>
                        {r.isSenior && <span className="chip ml-2 bg-sunflower-soft text-sunflower-dark">Senior</span>}
                      </td>
                      <td className="tabular text-ink-muted">{r.residentNo}</td>
                      <td className="tabular">{r.age}</td>
                      <td>{r.purok}</td>
                      <td className="tabular text-ink-muted">{r.contactNumber || '—'}</td>
                      <td className="text-ink-muted">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {seniorsShown > 0 && <p className="border-t border-paper-rule px-3 pt-3 text-sm text-ink-muted">{seniorsShown} of the {data.items.length} residents on this page are senior citizens and get 20% off document fees.</p>}
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}
