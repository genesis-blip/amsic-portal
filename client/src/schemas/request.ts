import { z } from 'zod';
import { isoDate, requiredText } from './common';

export const SLOTS = ['08:00-09:00', '09:00-10:00', '13:00-14:00', '14:00-15:00'] as const;

export const requestSchema = z.object({
  resident: z.string().min(1, 'Choose a resident'),
  documentType: z.string().min(1, 'Choose a document'),
  purpose: requiredText('Purpose', 3, 200),
  copies: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole copies only').min(1, 'At least 1 copy').max(10, 'At most 10 copies'),
  pickupDate: isoDate('Pickup date'),
  pickupSlot: z.enum(SLOTS, { errorMap: () => ({ message: 'Choose a pickup time' }) }),
  remarks: z.string().trim().max(300),
});

export type RequestFormValues = z.infer<typeof requestSchema>;

export const statusNoteSchema = z.object({ note: z.string().trim().max(300) });
export type StatusNoteValues = z.infer<typeof statusNoteSchema>;

export const portalRequestSchema = requestSchema.omit({ resident: true, remarks: true });
export type PortalRequestValues = z.infer<typeof portalRequestSchema>;
