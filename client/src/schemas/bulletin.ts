import { z } from 'zod';
import { optionalIsoDate, requiredText } from './common';

export const BULLETIN_CATEGORIES = ['announcement', 'event', 'advisory', 'health', 'emergency'] as const;

export const bulletinSchema = z
  .object({
    title: requiredText('Title', 4, 120),
    content: requiredText('Content', 10, 3000),
    category: z.enum(BULLETIN_CATEGORIES),
    eventDate: optionalIsoDate,
    expiresAt: optionalIsoDate,
    isPinned: z.boolean(),
  })
  .refine((v) => !v.eventDate || !v.expiresAt || v.expiresAt >= v.eventDate, { path: ['expiresAt'], message: 'Expiry must be on or after the event date' });
export type BulletinFormValues = z.infer<typeof bulletinSchema>;
