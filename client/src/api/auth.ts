import { http } from '../lib/http';
import type { Account, DocumentRequest, HealthRecord, Incident, Paginated, Payment, Quote, Session, SosAlert, StaffRole } from '../types';
import type { ChangePasswordValues, ProfileValues, RegisterValues, StaffAccountValues } from '../schemas/auth';
import type { RequestFormValues } from '../schemas/request';
import type { PortalIncidentValues } from '../schemas/incident';
import type { PortalSosValues } from '../schemas/sos';

type List<T> = { items: T[]; total: number };
type Portal = 'resident' | 'staff';

export interface OtpChallenge { otpRequired: true; otpToken: string; sentTo: string; expiresInMinutes: number }
export type LoginResponse = { token: string; user: Session } | OtpChallenge;
export interface OnlinePayment { paid: boolean; qrImage?: string; expiresAt?: string; amount?: number; testMode?: boolean; expired?: boolean }

export const authApi = {
  login: (username: string, password: string, portal: Portal) =>
    http.post<LoginResponse>('/auth/login', { username, password, portal }).then((r) => r.data),
  verifyOtp: (otpToken: string, code: string) => http.post<{ token: string; user: Session }>('/auth/verify-otp', { otpToken, code }).then((r) => r.data),
  resendOtp: (otpToken: string) => http.post<{ message: string; otpToken: string }>('/auth/resend-otp', { otpToken }).then((r) => r.data),
  forgotPassword: (username: string) =>
    http.post<{ message: string; resetToken: string; expiresInMinutes: number }>('/auth/forgot-password', { username }).then((r) => r.data),
  resetPassword: (resetToken: string, code: string, newPassword: string) =>
    http.post<{ message: string; username: string }>('/auth/reset-password', { resetToken, code, newPassword }).then((r) => r.data),
  updateMe: (data: { mobile: string }) => http.patch<Session>('/auth/me', data).then((r) => r.data),
  register: (data: RegisterValues) => http.post<{ token: string; user: Session }>('/auth/register', data).then((r) => r.data),
  me: () => http.get<Session>('/auth/me').then((r) => r.data),
  changePassword: (data: ChangePasswordValues) => http.post<{ message: string; user: Session }>('/auth/change-password', data).then((r) => r.data),
};

export const meApi = {
  updateProfile: (data: ProfileValues) => http.patch<Session>('/me', data).then((r) => r.data),
  requests: (params: { status?: string; sort?: string; page?: number } = {}) => http.get<Paginated<DocumentRequest>>('/me/requests', { params }).then((r) => r.data),
  request: (id: string) => http.get<DocumentRequest & { payments: Payment[] }>(`/me/requests/${id}`).then((r) => r.data),
  quote: (data: { documentType: string; copies: number }) => http.post<Quote>('/me/requests/quote', data).then((r) => r.data),
  createRequest: (data: Omit<RequestFormValues, 'resident' | 'remarks'>) => http.post<DocumentRequest>('/me/requests', data).then((r) => r.data),
  cancelRequest: (id: string) => http.patch<DocumentRequest>(`/me/requests/${id}/cancel`).then((r) => r.data),
  paymentOptions: () => http.get<{ online: boolean; testMode: boolean }>('/me/payment-options').then((r) => r.data),
  startPayment: (id: string) => http.post<OnlinePayment>(`/me/requests/${id}/pay`).then((r) => r.data),
  paymentStatus: (id: string) => http.get<OnlinePayment>(`/me/requests/${id}/pay`).then((r) => r.data),
  simulatePayment: (id: string) => http.post<OnlinePayment>(`/me/requests/${id}/pay/simulate`).then((r) => r.data),
  incidents: () => http.get<List<Incident>>('/me/incidents').then((r) => r.data),
  reportIncident: (data: PortalIncidentValues) => http.post<Incident>('/me/incidents', data).then((r) => r.data),
  sos: () => http.get<List<SosAlert>>('/me/sos').then((r) => r.data),
  sendSos: (data: PortalSosValues & { latitude?: number; longitude?: number }) => http.post<SosAlert>('/me/sos', data).then((r) => r.data),
  payments: () => http.get<List<Payment>>('/me/payments').then((r) => r.data),
  healthRecords: () => http.get<List<HealthRecord>>('/me/health-records').then((r) => r.data),
};

export const accountsApi = {
  list: (params: { type: 'staff' | 'resident'; search?: string; role?: string; page?: number }) => http.get<Paginated<Account>>('/accounts', { params }).then((r) => r.data),
  createStaff: (data: StaffAccountValues) => http.post<{ account: Account; temporaryPassword?: string }>('/accounts', data).then((r) => r.data),
  update: (id: string, data: Partial<{ role: StaffRole; isActive: boolean; firstName: string; lastName: string; email: string; mobile: string }>) => http.patch<Account>(`/accounts/${id}`, data).then((r) => r.data),
  resetPassword: (id: string) => http.post<{ message: string; temporaryPassword: string }>(`/accounts/${id}/reset-password`).then((r) => r.data),
};
