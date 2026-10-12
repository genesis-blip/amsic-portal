import { http } from '../lib/http';
import type { Availability, CalendarDay, ScheduleBlock } from '../types';

export const schedulesApi = {
  availability: (date: string) => http.get<Availability>('/schedules/availability', { params: { date } }).then((r) => r.data),
  calendar: (month: string) => http.get<{ month: string; days: CalendarDay[]; openDays: number; fullDays: number }>('/schedules/calendar', { params: { month } }).then((r) => r.data),
  blocks: () => http.get<ScheduleBlock[]>('/schedules/blocks').then((r) => r.data),
  addBlock: (data: { date: string; reason: string }) => http.post<ScheduleBlock>('/schedules/blocks', data).then((r) => r.data),
  removeBlock: (id: string) => http.delete(`/schedules/blocks/${id}`).then((r) => r.data),
};
