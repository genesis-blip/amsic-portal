import { http } from '../lib/http';
import type { DocumentType } from '../types';
import type { DocumentTypePayload } from '../schemas/documentType';

export const documentTypesApi = {
  list: (params: { active?: string; search?: string } = {}) => http.get<DocumentType[]>('/document-types', { params }).then((r) => r.data),
  create: (data: DocumentTypePayload) => http.post<DocumentType>('/document-types', data).then((r) => r.data),
  update: (id: string, data: DocumentTypePayload) => http.put<DocumentType>(`/document-types/${id}`, data).then((r) => r.data),
  remove: (id: string) => http.delete(`/document-types/${id}`).then((r) => r.data),
};
