import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps { title: string; description?: string; actions?: ReactNode; back?: { to: string; label: string } }

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {back && (
        <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-display-md font-bold sm:text-display-lg">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
