import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 inline-block -rotate-3 rounded-[6px] border-[3px] border-seal px-3 py-1 font-display text-2xl font-extrabold uppercase text-seal">Not on file</span>
      <h1 className="text-display-md font-bold">We couldn’t find that page</h1>
      <p className="mt-2 text-ink-muted">There is no page at <code className="rounded bg-white px-1.5 py-0.5">{pathname}</code>. It may have been moved or the link has a typo.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/app" className="btn-primary">Go to dashboard</Link>
        <Link to="/" className="btn-secondary">Home page</Link>
      </div>
    </div>
  );
}
