import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pin } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../hooks/useServerErrors';
import { bulletinsApi } from '../api/community';
import { parseApiError } from '../lib/http';
import { BULLETIN_CATEGORIES, bulletinSchema, type BulletinFormValues } from '../schemas/bulletin';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { inputClass } from '../utils/inputClass';
import { formatDate, humanize, toDateInput } from '../utils/format';
import type { Bulletin } from '../types';

const EMPTY: BulletinFormValues = { title: '', content: '', category: 'announcement', eventDate: undefined, expiresAt: undefined, isPinned: false };
const EDGE: Record<string, string> = { emergency: 'border-l-seal', health: 'border-l-brand-500', event: 'border-l-stamp', advisory: 'border-l-sunflower', announcement: 'border-l-ink-faint' };

export default function BulletinsPage() {
  const toast = useToast();
  const [category, setCategory] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const { data, loading, error, reload } = useApi(() => bulletinsApi.list({ category, includeExpired: String(showExpired) }), [category, showExpired]);
  const [editing, setEditing] = useState<Bulletin | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Bulletin | null>(null);
  const form = useForm<BulletinFormValues>({ resolver: zodResolver(bulletinSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;

  const open = (b: Bulletin | 'new') => {
    form.reset(b === 'new' ? EMPTY : { title: b.title, content: b.content, category: b.category, eventDate: toDateInput(b.eventDate) || undefined, expiresAt: toDateInput(b.expiresAt) || undefined, isPinned: b.isPinned });
    setEditing(b);
  };
  const onSubmit = async (v: BulletinFormValues) => {
    const payload = { ...v, eventDate: v.eventDate ?? '', expiresAt: v.expiresAt ?? '' } as BulletinFormValues;
    try {
      if (editing === 'new') await bulletinsApi.create(payload); else if (editing) await bulletinsApi.update(editing._id, payload);
      toast.success(editing === 'new' ? 'Posted to the bulletin board' : 'Bulletin updated');
      setEditing(null);
      void reload();
    } catch (e) { form.setError('root', { message: applyServerErrors(e, form.setError) }); }
  };

  return (
    <>
      <PageHeader title="Bulletin board" description="Announcements residents see on the home page. Pinned posts stay on top; expired posts are hidden." actions={<button type="button" className="btn-primary" onClick={() => open('new')}>Post announcement</button>} />
      <div className="panel mb-4 flex flex-wrap items-center gap-4 p-4">
        <select className="input max-w-xs" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>{BULLETIN_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-bold text-ink-soft"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} />Show expired posts</label>
      </div>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && <div className="panel"><EmptyState title="Nothing posted" body="Post an announcement for residents." action={<button type="button" className="btn-primary" onClick={() => open('new')}>Post announcement</button>} /></div>}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((b) => (
          <article key={b._id} className={`panel flex flex-col border-l-4 p-5 ${EDGE[b.category]} ${b.isExpired ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-ink-muted">{humanize(b.category)}{b.isExpired ? ', expired' : ''}</p>
              {b.isPinned && <Pin className="h-4 w-4 shrink-0 text-brand-600" aria-label="Pinned" />}
            </div>
            <h2 className="mt-1 font-display text-xl font-bold">{b.title}</h2>
            <p className="mt-2 flex-1 whitespace-pre-line text-ink-soft">{b.content}</p>
            <p className="mt-3 text-sm text-ink-muted">Posted {formatDate(b.createdAt)}{b.eventDate ? `. Event on ${formatDate(b.eventDate)}` : ''}{b.expiresAt ? `. Shown until ${formatDate(b.expiresAt)}` : ''}</p>
            <div className="mt-3 flex gap-1 border-t border-paper-rule pt-3">
              <button type="button" className="btn-ghost btn-sm" onClick={() => open(b)}>Edit</button>
              <button type="button" className="btn-ghost btn-sm text-seal" onClick={() => setDeleting(b)}>Delete</button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'Post announcement' : 'Edit announcement'} onClose={() => setEditing(null)} wide>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && <p className="field-error">{errors.root.message}</p>}
          <Field label="Title" htmlFor="title" error={errors.title?.message} required><input id="title" className={inputClass(errors.title?.message)} {...form.register('title')} /></Field>
          <Field label="Message" htmlFor="content" error={errors.content?.message} required><textarea id="content" rows={5} className={inputClass(errors.content?.message)} {...form.register('content')} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category" htmlFor="category"><select id="category" className="input" {...form.register('category')}>{BULLETIN_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select></Field>
            <Field label="Event date" htmlFor="eventDate" error={errors.eventDate?.message}><input id="eventDate" type="date" className={inputClass(errors.eventDate?.message)} {...form.register('eventDate')} /></Field>
            <Field label="Hide after" htmlFor="expiresAt" error={errors.expiresAt?.message}><input id="expiresAt" type="date" className={inputClass(errors.expiresAt?.message)} {...form.register('expiresAt')} /></Field>
          </div>
          <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-brand-600" {...form.register('isPinned')} /><span className="font-bold text-ink-soft">Pin to the top</span></label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : editing === 'new' ? 'Post' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={deleting !== null} title="Delete this announcement?" message={deleting ? `“${deleting.title}” will be removed from the bulletin board.` : ''} confirmLabel="Delete"
        onConfirm={async () => { try { await bulletinsApi.remove(deleting!._id); } catch (e) { throw new Error(parseApiError(e).message); } toast.success('Announcement deleted'); void reload(); }}
        onClose={() => setDeleting(null)} />
    </>
  );
}
