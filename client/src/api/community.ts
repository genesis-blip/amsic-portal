import { http } from '../lib/http';
import type { BlotterRecord, BlotterStatus, Bulletin, HealthRecord, Incident, IncidentStatus, Overview, SosAlert, SosMetrics, SosStatus } from '../types';
import type { IncidentFormValues } from '../schemas/incident';
import type { BlotterFormValues } from '../schemas/blotter';
import type { BulletinFormValues } from '../schemas/bulletin';
import type { HealthFormValues } from '../schemas/health';
import type { SosFormValues } from '../schemas/sos';

type List<T> = { items: T[]; total: number };

export const incidentsApi = {
  list: (params: { search?: string; status?: string; type?: string; urgency?: string; sort?: string }) => http.get<List<Incident>>('/incidents', { params }).then((r) => r.data),
  create: (data: IncidentFormValues) => http.post<Incident>('/incidents', data).then((r) => r.data),
  update: (id: string, data: IncidentFormValues) => http.put<Incident>(`/incidents/${id}`, data).then((r) => r.data),
  setStatus: (id: string, status: IncidentStatus, resolutionNotes?: string) => http.patch<Incident>(`/incidents/${id}/status`, { status, resolutionNotes }).then((r) => r.data),
  remove: (id: string) => http.delete(`/incidents/${id}`).then((r) => r.data),
};

export const blottersApi = {
  list: (params: { search?: string; status?: string }) => http.get<List<BlotterRecord>>('/blotters', { params }).then((r) => r.data),
  get: (id: string) => http.get<BlotterRecord>(`/blotters/${id}`).then((r) => r.data),
  create: (data: BlotterFormValues) => http.post<BlotterRecord>('/blotters', data).then((r) => r.data),
  update: (id: string, data: BlotterFormValues) => http.put<BlotterRecord>(`/blotters/${id}`, data).then((r) => r.data),
  setStatus: (id: string, status: BlotterStatus, extra: { hearingDate?: string; note?: string } = {}) => http.patch<BlotterRecord>(`/blotters/${id}/status`, { status, ...extra }).then((r) => r.data),
  addAction: (id: string, data: { action: string; note?: string }) => http.post<BlotterRecord>(`/blotters/${id}/actions`, data).then((r) => r.data),
  remove: (id: string) => http.delete(`/blotters/${id}`).then((r) => r.data),
};

export const sosApi = {
  list: (params: { status?: string }) => http.get<List<SosAlert>>('/sos-alerts', { params }).then((r) => r.data),
  metrics: () => http.get<SosMetrics>('/sos-alerts/metrics').then((r) => r.data),
  create: (data: SosFormValues) => http.post<SosAlert>('/sos-alerts', data).then((r) => r.data),
  setStatus: (id: string, status: SosStatus) => http.patch<SosAlert>(`/sos-alerts/${id}/status`, { status }).then((r) => r.data),
  remove: (id: string) => http.delete(`/sos-alerts/${id}`).then((r) => r.data),
};

export const bulletinsApi = {
  list: (params: { search?: string; category?: string; includeExpired?: string } = {}) => http.get<Bulletin[]>('/bulletins', { params }).then((r) => r.data),
  create: (data: BulletinFormValues) => http.post<Bulletin>('/bulletins', data).then((r) => r.data),
  update: (id: string, data: BulletinFormValues) => http.put<Bulletin>(`/bulletins/${id}`, data).then((r) => r.data),
  remove: (id: string) => http.delete(`/bulletins/${id}`).then((r) => r.data),
};

export const healthApi = {
  list: (params: { resident?: string; recordType?: string }) => http.get<List<HealthRecord>>('/health-records', { params }).then((r) => r.data),
  due: (days = 30) => http.get<{ days: number; overdue: HealthRecord[]; upcoming: HealthRecord[]; total: number }>('/health-records/due', { params: { days } }).then((r) => r.data),
  create: (data: HealthFormValues) => http.post<HealthRecord>('/health-records', data).then((r) => r.data),
  update: (id: string, data: HealthFormValues) => http.put<HealthRecord>(`/health-records/${id}`, data).then((r) => r.data),
  remove: (id: string) => http.delete(`/health-records/${id}`).then((r) => r.data),
};

export const statsApi = {
  overview: () => http.get<Overview>('/stats/overview').then((r) => r.data),
};
