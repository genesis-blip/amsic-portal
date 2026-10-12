import { http } from '../lib/http';
import type { Demographics, Paginated, Resident, ResidentDetail } from '../types';
import type { ResidentFormValues } from '../schemas/resident';

export interface ResidentQuery { search?: string; purok?: string; sex?: string; ageGroup?: string; isVoter?: string; sort?: string; page?: number; limit?: number }

export const residentsApi = {
  list: (params: ResidentQuery) => http.get<Paginated<Resident>>('/residents', { params }).then((r) => r.data),
  get: (id: string) => http.get<ResidentDetail>(`/residents/${id}`).then((r) => r.data),
  demographics: () => http.get<Demographics>('/residents/demographics').then((r) => r.data),
  create: (data: ResidentFormValues) => http.post<Resident>('/residents', data).then((r) => r.data),
  update: (id: string, data: ResidentFormValues) => http.put<Resident>(`/residents/${id}`, data).then((r) => r.data),
  remove: (id: string) => http.delete(`/residents/${id}`).then((r) => r.data),
};
