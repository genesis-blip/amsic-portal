import { http } from '../lib/http';
import type { Paginated, Payment, PaymentSummary } from '../types';
import type { PaymentFormValues } from '../schemas/payment';

export interface PaymentQuery { search?: string; method?: string; category?: string; voided?: string; from?: string; to?: string; page?: number }

export const paymentsApi = {
  list: (params: PaymentQuery) => http.get<Paginated<Payment>>('/payments', { params }).then((r) => r.data),
  summary: (params: { from?: string; to?: string }) => http.get<PaymentSummary>('/payments/summary', { params }).then((r) => r.data),
  create: (data: PaymentFormValues & { request?: string }) => http.post<Payment>('/payments', data).then((r) => r.data),
  void: (id: string, reason: string) => http.patch<Payment>(`/payments/${id}/void`, { reason }).then((r) => r.data),
};
