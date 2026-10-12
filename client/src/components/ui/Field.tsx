import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-seal"> *</span>}
      </label>
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
