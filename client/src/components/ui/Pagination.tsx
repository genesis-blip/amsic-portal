interface PaginationProps { page: number; pages: number; total: number; onPage: (p: number) => void }

export function Pagination({ page, pages, total, onPage }: PaginationProps) {
  if (pages <= 1) return <p className="px-3 py-3 text-sm text-ink-muted">{total} record{total === 1 ? '' : 's'}</p>;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
      <span className="text-ink-muted">Page {page} of {pages} ({total} records)</span>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
