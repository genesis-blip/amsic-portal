import { z } from 'zod';
import { requiredText } from './common';

export const METHODS = ['cash', 'gcash', 'maya', 'bank_transfer'] as const;
export const CATEGORIES = ['document_fee', 'business_fee', 'fine', 'donation', 'other'] as const;

export const paymentSchema = z.object({
  payerName: requiredText('Payer name', 2, 120),
  amount: z.coerce.number({ invalid_type_error: 'Enter an amount' }).min(1, 'Amount must be at least ₱1').max(100000, 'Amount is too large'),
  method: z.enum(METHODS),
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(200),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const voidSchema = z.object({ reason: requiredText('Reason', 3, 200) });
export type VoidFormValues = z.infer<typeof voidSchema>;

export const requestPaymentSchema = z.object({ method: z.enum(METHODS), payerName: z.string().trim().max(120) });
export type RequestPaymentValues = z.infer<typeof requestPaymentSchema>;
