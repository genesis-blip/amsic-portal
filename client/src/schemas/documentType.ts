import { z } from 'zod';
import { requiredText } from './common';

export const documentTypeSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,30}$/, '2–30 lowercase letters, numbers, - or _'),
  name: requiredText('Name', 3, 80),
  description: z.string().trim().max(300),
  fee: z.coerce.number({ invalid_type_error: 'Enter a fee' }).min(0, 'Fee cannot be negative').max(5000, 'Fee is too high'),
  processingDays: z.coerce.number({ invalid_type_error: 'Enter days' }).int('Whole days only').min(0, 'Cannot be negative').max(30, 'Max 30 days'),
  requirementsText: z.string().max(500),
  isActive: z.boolean(),
});
export type DocumentTypeFormValues = z.infer<typeof documentTypeSchema>;

export const toDocumentTypePayload = ({ requirementsText, ...rest }: DocumentTypeFormValues) => ({
  ...rest,
  requirements: requirementsText.split(',').map((s) => s.trim()).filter(Boolean),
});
export type DocumentTypePayload = ReturnType<typeof toDocumentTypePayload>;
