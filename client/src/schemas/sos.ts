import { z } from 'zod';
import { requiredText } from './common';

export const EMERGENCY_TYPES = ['medical', 'fire', 'crime', 'flood', 'accident', 'other'] as const;

export const sosSchema = z.object({
  resident: z.string().min(1, 'Choose the resident who needs help'),
  emergencyType: z.enum(EMERGENCY_TYPES),
  message: requiredText('Message', 3, 500),
  location: requiredText('Location', 3, 200),
});
export type SosFormValues = z.infer<typeof sosSchema>;

export const portalSosSchema = sosSchema.omit({ resident: true });
export type PortalSosValues = z.infer<typeof portalSosSchema>;
