import { http } from '../lib/http';
import type { DocumentRequest, Paginated, Quote, RequestStatus } from '../types';
import type { RequestFormValues } from '../schemas/request';

export interface RequestQuery { search?: string; status?: string; documentType?: string; paymentStatus?: string; from?: string; to?: string; pickupFrom?: string; pickupTo?: string; resident?: string; sort?: string; page?: number; limit?: number }

export const requestsApi = {
  list: (params: RequestQuery) => http.get<Paginated<DocumentRequest>>('/document-requests', { params }).then((r) => r.data),
  get: (id: string) => http.get<DocumentRequest>(`/document-requests/${id}`).then((r) => r.data),
  overdue: () => http.get<{ behindSchedule: DocumentRequest[]; unclaimed: DocumentRequest[]; total: number }>('/document-requests/overdue').then((r) => r.data),
  quote: (data: { resident: string; documentType: string; copies: number }) => http.post<Quote>('/document-requests/quote', data).then((r) => r.data),
  create: (data: RequestFormValues) => http.post<DocumentRequest>('/document-requests', data).then((r) => r.data),
  update: (id: string, data: Partial<RequestFormValues>) => http.put<DocumentRequest>(`/document-requests/${id}`, data).then((r) => r.data),
  setStatus: (id: string, status: RequestStatus, note = '') => http.patch<DocumentRequest>(`/document-requests/${id}/status`, { status, note }).then((r) => r.data),
  remove: (id: string) => http.delete(`/document-requests/${id}`).then((r) => r.data),
};
