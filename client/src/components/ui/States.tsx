import type { ReactNode } from 'react';
import { AlertTriangle, FileSearch, Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-2 py-10 text-ink-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-seal/30 bg-seal-soft p-5 sm:flex-row sm:items-center" role="alert">
      <AlertTriangle className="h-5 w-5 shrink-0 text-seal" aria-hidden />
      <p className="flex-1 font-bold text-seal-dark">{message}</p>
      {onRetry && <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <FileSearch className="mb-3 h-8 w-8 text-brand-300" aria-hidden />
      <p className="font-display text-lg font-bold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
