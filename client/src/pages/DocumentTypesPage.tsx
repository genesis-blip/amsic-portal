import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../hooks/useServerErrors';
import { documentTypesApi } from '../api/documentTypes';
import { parseApiError } from '../lib/http';
import { documentTypeSchema, toDocumentTypePayload, type DocumentTypeFormValues } from '../schemas/documentType';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { inputClass } from '../utils/inputClass';
import { formatPeso } from '../utils/format';
import type { DocumentType } from '../types';

const EMPTY: DocumentTypeFormValues = { code: '', name: '', description: '', fee: 40, processingDays: 1, requirementsText: '', isActive: true };

export default function DocumentTypesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => documentTypesApi.list(), []);
  const [editing, setEditing] = useState<DocumentType | 'new' | null>(null);
  const [deleting, setDeleting] = useState<DocumentType | null>(null);
  const form = useForm<DocumentTypeFormValues>({ resolver: zodResolver(documentTypeSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;

  const open = (t: DocumentType | 'new') => {
    form.reset(t === 'new' ? EMPTY : { code: t.code, name: t.name, description: t.description, fee: t.fee, processingDays: t.processingDays, requirementsText: t.requirements.join(', '), isActive: t.isActive });
    setEditing(t);
  };

  const onSubmit = async (v: DocumentTypeFormValues) => {
    try {
      const payload = toDocumentTypePayload(v);
      if (editing === 'new') await documentTypesApi.create(payload);
      else if (editing) await documentTypesApi.update(editing._id, payload);
      toast.success(editing === 'new' ? `${v.name} added` : `${v.name} updated`);
      setEditing(null);
      void reload();
    } catch (e) {
      form.setError('root', { message: applyServerErrors(e, form.setError) });
    }
  };

  const active = data?.filter((t) => t.isActive).length ?? 0;

  return (
    <>
      <PageHeader title="Document types" description="The documents residents can request, with their fee per copy and processing time." actions={<button type="button" className="btn-primary" onClick={() => open('new')}>Add document type</button>} />
      <div className="panel overflow-hidden">
        {loading && <div className="px-4"><LoadingState /></div>}
        {error && <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>}
        {data && data.length === 0 && <EmptyState title="No document types yet" action={<button type="button" className="btn-primary" onClick={() => open('new')}>Add document type</button>} />}
        {data && data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="ledger ledger-stack sm:min-w-[720px]">
                <thead><tr><th>Document</th><th className="text-right">Fee</th><th className="text-right">Ready in</th><th className="text-right">Requested</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {data.map((t) => (
                    <tr key={t._id}>
                      <td><span className="font-bold">{t.name}</span><span className="block text-[13px] text-ink-muted">Code: {t.code}{t.requirements.length ? `. Bring ${t.requirements.join(', ')}` : ''}</span></td>
                      <td className="tabular text-right">{t.code === 'indigency' ? 'Free' : formatPeso(t.fee)}</td>
                      <td className="text-right">{t.processingDays === 0 ? 'Same day' : `${t.processingDays} d`}</td>
                      <td className="tabular text-right">{t.timesRequested ?? 0}</td>
                      <td>{t.isActive ? <span className="chip bg-brand-50 text-brand-700">Available</span> : <span className="chip">Not offered</span>}</td>
                      <td className="whitespace-nowrap text-right">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => open(t)}>Edit</button>
                        <button type="button" className="btn-ghost btn-sm text-seal" onClick={() => setDeleting(t)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-3 py-3 text-sm text-ink-muted">{active} of {data.length} documents are currently offered.</p>
          </>
        )}
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'Add document type' : 'Edit document type'} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && <p className="field-error">{errors.root.message}</p>}
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field label="Code" htmlFor="code" error={errors.code?.message} required hint="e.g. clearance"><input id="code" className={inputClass(errors.code?.message)} {...form.register('code')} /></Field>
            <Field label="Name" htmlFor="name" error={errors.name?.message} required><input id="name" className={inputClass(errors.name?.message)} {...form.register('name')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fee per copy (₱)" htmlFor="fee" error={errors.fee?.message} required><input id="fee" type="number" step="0.01" min={0} className={inputClass(errors.fee?.message)} {...form.register('fee')} /></Field>
            <Field label="Processing days" htmlFor="processingDays" error={errors.processingDays?.message} required><input id="processingDays" type="number" min={0} max={30} className={inputClass(errors.processingDays?.message)} {...form.register('processingDays')} /></Field>
          </div>
          <Field label="Requirements" htmlFor="requirementsText" hint="Separate with commas" error={errors.requirementsText?.message}><input id="requirementsText" className="input" {...form.register('requirementsText')} /></Field>
          <Field label="Description" htmlFor="description" error={errors.description?.message}><textarea id="description" rows={2} className="input" {...form.register('description')} /></Field>
          <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-brand-600" {...form.register('isActive')} /><span className="font-bold text-ink-soft">Residents can request this document</span></label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : editing === 'new' ? 'Add document type' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this document type?"
        message={deleting ? `${deleting.name} will be removed. Documents that were already requested cannot be deleted; switch them to "not offered" instead.` : ''}
        confirmLabel="Delete"
        onConfirm={async () => {
          try { await documentTypesApi.remove(deleting!._id); } catch (e) { throw new Error(parseApiError(e).message); }
          toast.success(`${deleting!.name} deleted`);
          void reload();
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
