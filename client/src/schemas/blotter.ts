import { z } from 'zod';
import { isoDate, notFuture, requiredText } from './common';

export const blotterSchema = z.object({
  complainantName: requiredText('Complainant', 2, 120),
  respondentName: requiredText('Respondent', 2, 120),
  nature: requiredText('Nature of complaint', 3, 120),
  details: requiredText('Details', 10, 2000),
  incidentDate: notFuture('Incident date'),
});
export type BlotterFormValues = z.infer<typeof blotterSchema>;

export const actionSchema = z.object({ action: requiredText('Action', 3, 120), note: z.string().trim().max(500) });
export type ActionFormValues = z.infer<typeof actionSchema>;

export const hearingSchema = z.object({ hearingDate: isoDate('Hearing date'), note: z.string().trim().max(500) });
export type HearingFormValues = z.infer<typeof hearingSchema>;
