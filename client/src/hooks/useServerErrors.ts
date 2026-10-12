import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { parseApiError } from '../lib/http';

export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): string {
  const { message, errors } = parseApiError(err);
  if (errors) {
    Object.entries(errors).forEach(([field, msg]) => setError(field as Path<T>, { type: 'server', message: msg }));
  }
  return message;
}
