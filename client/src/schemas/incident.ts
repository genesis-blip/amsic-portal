import { z } from 'zod';
import { notFuture, requiredText } from './common';

export const INCIDENT_TYPES = ['noise', 'theft', 'vandalism', 'dispute', 'accident', 'fire', 'flood', 'stray_animal', 'other'] as const;
export const URGENCIES = ['low', 'medium', 'high', 'critical'] as const;

export const incidentSchema = z.object({
  reporterName: requiredText('Reporter name', 2, 120),
  type: z.enum(INCIDENT_TYPES, { errorMap: () => ({ message: 'Choose a type' }) }),
  description: requiredText('Description', 10, 1000),
  location: requiredText('Location', 3, 200),
  occurredAt: notFuture('Date of incident'),
  urgency: z.enum(URGENCIES),
});
export type IncidentFormValues = z.infer<typeof incidentSchema>;

export const closeIncidentSchema = z.object({ resolutionNotes: requiredText('Resolution notes', 5, 1000) });
export type CloseIncidentValues = z.infer<typeof closeIncidentSchema>;

export const portalIncidentSchema = incidentSchema.omit({ reporterName: true });
export type PortalIncidentValues = z.infer<typeof portalIncidentSchema>;
