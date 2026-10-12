import { z } from 'zod';
import { isoDate, requiredText } from './common';

export const blockSchema = z.object({ date: isoDate('Date'), reason: requiredText('Reason', 3, 120) });
export type BlockFormValues = z.infer<typeof blockSchema>;
