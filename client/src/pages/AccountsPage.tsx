import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { accountsApi } from '../api/auth';
import { useAuth } from '../auth/authContext';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../hooks/useServerErrors';
import { parseApiError } from '../lib/http';
import { ROLE_LABELS, STAFF_ROLES, staffAccountSchema, type StaffAccountValues } from '../schemas/auth';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { inputClass } from '../utils/inputClass';
import { formatDateTime } from '../utils/format';
import type { Account, StaffRole } from '../types';

type Tab = 'staff' | 'resident';

export default function AccountsPage() {
  const { user, can } = useAuth();
  const toast = useToast();
  const tabs: Tab[] = [...(can('staff.manage') ? ['staff' as const] : []), ...(can('residents.manage') ? ['resident' as const] : [])];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, loading, error, reload } = useApi(() => accountsApi.list({ type: tab, search: q, page }), [tab, q, page]);
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<Account | null>(null);
  const [resetting, setResetting] = useState<Account | null>(null);
  const [temp, setTemp] = useState<{ username: string; password: string } | null>(null);

  const changeRole = async (a: Account, role: StaffRole) => {
    try {
      await accountsApi.update(a._id, { role });
      toast.success(`${a.fullName} is now ${ROLE_LABELS[role]}`);
      void reload();
    } catch (e) { toast.error(parseApiError(e).message); }
  };

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Who can log in. Deactivated accounts cannot log in but their records stay."
        actions={tab === 'staff' && <button type="button" className="btn-primary" onClick={() => setAdding(true)}>Add staff account</button>}
      />

      {tabs.length > 1 && (
        <div className="mb-4 inline-flex rounded-control border border-paper-line bg-white p-1" role="tablist">
          {tabs.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setPage(1); }}
              className={`rounded-[8px] px-4 py-1.5 text-sm font-bold ${tab === t ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-brand-50'}`}>
              {t === 'staff' ? 'Staff' : 'Residents'}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <label htmlFor="acc-search" className="sr-only">Search accounts</label>
        <input id="acc-search" className="input" placeholder="Search name, username or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="panel">
        {loading && <LoadingState />}
        {error && <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>}
        {data && data.items.length === 0 && <EmptyState title="No accounts found" />}
        {data && data.items.length > 0 && (
          <>
            <table className="ledger ledger-stack">
              <thead><tr><th>Name</th><th>Username</th><th>{tab === 'staff' ? 'Role' : 'Resident no.'}</th><th>Last login</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {data.items.map((a) => {
                  const self = a._id === user?.id;
                  const name = a.resident ? `${a.resident.firstName} ${a.resident.lastName}` : a.fullName;
                  return (
                    <tr key={a._id}>
                      <td className="font-bold">{name}{self && <span className="ml-2 chip">You</span>}</td>
                      <td>{a.username}</td>
                      <td>
                        {tab === 'staff'
                          ? (
                            <select aria-label={`Role of ${name}`} className="input py-1.5 text-sm" value={a.role ?? ''} disabled={self} onChange={(e) => void changeRole(a, e.target.value as StaffRole)}>
                              {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                          )
                          : a.resident?.residentNo}
                      </td>
                      <td className="text-ink-muted">{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : 'Never'}</td>
                      <td>
                        {a.isActive ? <span className="chip bg-leaf-soft text-leaf-dark">Active</span> : <span className="chip bg-seal-soft text-seal-dark">Deactivated</span>}
                        {a.mustChangePassword && <span className="chip ml-1 bg-sunflower-soft text-sunflower-dark">Temporary password</span>}
                      </td>
                      <td className="text-right sm:whitespace-nowrap">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setResetting(a)}>Reset password</button>
                        {!self && <button type="button" className={`btn-ghost btn-sm ${a.isActive ? 'text-seal' : ''}`} onClick={() => setToggling(a)}>{a.isActive ? 'Deactivate' : 'Activate'}</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </div>

      <AddStaffModal open={adding} onClose={() => setAdding(false)} onCreated={(username, password) => { setAdding(false); void reload(); if (password) setTemp({ username, password }); }} />

      <ConfirmDialog
        open={!!toggling}
        title={toggling?.isActive ? 'Deactivate account?' : 'Activate account?'}
        message={toggling?.isActive ? `${toggling.username} will be logged out and cannot log in until activated again.` : `${toggling?.username} will be able to log in again.`}
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        danger={!!toggling?.isActive}
        onClose={() => setToggling(null)}
        onConfirm={async () => {
          await accountsApi.update(toggling!._id, { isActive: !toggling!.isActive });
          toast.success(toggling!.isActive ? 'Account deactivated' : 'Account activated');
          setToggling(null);
          void reload();
        }}
      />

      <ConfirmDialog
        open={!!resetting}
        title="Reset password?"
        message={`${resetting?.username} gets a temporary password and must choose a new one on the next log in.`}
        confirmLabel="Reset password"
        danger={false}
        onClose={() => setResetting(null)}
        onConfirm={async () => {
          const res = await accountsApi.resetPassword(resetting!._id);
          setTemp({ username: resetting!.username, password: res.temporaryPassword });
          setResetting(null);
          void reload();
        }}
      />

      <Modal open={!!temp} title="Temporary password" onClose={() => setTemp(null)}>
        <p className="text-ink-soft">Give this to <strong>{temp?.username}</strong>. It is shown only once.</p>
        <p className="tabular mt-4 rounded-control border-2 border-dashed border-stamp bg-stamp-soft px-4 py-3 text-center font-display text-2xl font-extrabold tracking-wide text-stamp-dark">{temp?.password}</p>
        <div className="mt-6 flex justify-end"><button type="button" className="btn-primary" onClick={() => setTemp(null)}>Done</button></div>
      </Modal>
    </>
  );
}

function AddStaffModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (username: string, password?: string) => void }) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<StaffAccountValues>({
    resolver: zodResolver(staffAccountSchema),
    defaultValues: { firstName: '', lastName: '', username: '', email: '', mobile: '', role: 'secretary' },
  });
  const close = () => { reset(); setFormError(null); onClose(); };
  const onSubmit = async (values: StaffAccountValues) => {
    setFormError(null);
    try {
      const res = await accountsApi.createStaff(values);
      toast.success(`Account ${res.account.username} created`);
      reset();
      onCreated(res.account.username, res.temporaryPassword);
    } catch (e) { setFormError(applyServerErrors(e, setError)); }
  };
  return (
    <Modal open={open} title="Add staff account" onClose={close}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <ErrorState message={formError} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="s-first" error={errors.firstName?.message} required><input id="s-first" className={inputClass(errors.firstName?.message)} {...register('firstName')} /></Field>
          <Field label="Last name" htmlFor="s-last" error={errors.lastName?.message} required><input id="s-last" className={inputClass(errors.lastName?.message)} {...register('lastName')} /></Field>
        </div>
        <Field label="Username" htmlFor="s-user" error={errors.username?.message} required><input id="s-user" autoCapitalize="none" className={inputClass(errors.username?.message)} {...register('username')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="s-email" error={errors.email?.message}><input id="s-email" type="email" className={inputClass(errors.email?.message)} {...register('email')} /></Field>
          <Field label="Mobile number" htmlFor="s-mobile" error={errors.mobile?.message} hint="Receives the SMS log in code"><input id="s-mobile" inputMode="numeric" className={inputClass(errors.mobile?.message)} {...register('mobile')} /></Field>
        </div>
        <Field label="Role" htmlFor="s-role" error={errors.role?.message} required>
          <select id="s-role" className={inputClass(errors.role?.message)} {...register('role')}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
        </Field>
        <p className="hint">A temporary password is made for the account. They choose their own on the first log in.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create account'}</button>
        </div>
      </form>
    </Modal>
  );
}
