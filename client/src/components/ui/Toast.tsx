import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ToastContext, type ToastApi } from './toastContext';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastKind = 'success' | 'error';
interface ToastItem { id: number; kind: ToastKind; message: string }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:items-end" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control px-4 py-3 text-sm font-bold text-white shadow-lift ${t.kind === 'success' ? 'bg-leaf-dark' : 'bg-seal'}`}>
            {t.kind === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
