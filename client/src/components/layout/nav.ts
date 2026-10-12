import {
  BarChart3, BookOpen, CalendarDays, ClipboardList, FileText, HeartPulse, Home, Megaphone, Receipt, Siren, TriangleAlert, UserCog, Users,
} from 'lucide-react';
import type { Capability } from '../../types';

type NavItem = { to: string; label: string; icon: typeof Home; cap: Capability[]; end?: boolean };
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Front desk', items: [
    { to: '/app', label: 'Dashboard', icon: Home, end: true, cap: ['dashboard.view'] },
    { to: '/app/requests', label: 'Document requests', icon: ClipboardList, cap: ['documents.view'] },
    { to: '/app/schedule', label: 'Pickup schedule', icon: CalendarDays, cap: ['documents.view'] },
    { to: '/app/payments', label: 'Payments', icon: Receipt, cap: ['payments.view'] },
  ] },
  { group: 'Records', items: [
    { to: '/app/residents', label: 'Residents', icon: Users, cap: ['residents.view'] },
    { to: '/app/health', label: 'Health records', icon: HeartPulse, cap: ['health.view'] },
  ] },
  { group: 'Peace and order', items: [
    { to: '/app/sos', label: 'SOS alerts', icon: Siren, cap: ['sos.view'] },
    { to: '/app/incidents', label: 'Incident reports', icon: TriangleAlert, cap: ['incidents.view'] },
    { to: '/app/blotters', label: 'Blotter', icon: BookOpen, cap: ['blotter.view'] },
  ] },
  { group: 'Community', items: [
    { to: '/app/bulletins', label: 'Bulletin board', icon: Megaphone, cap: ['bulletins.manage'] },
    { to: '/app/reports', label: 'Reports', icon: BarChart3, cap: ['reports.view'] },
    { to: '/app/document-types', label: 'Document types', icon: FileText, cap: ['document_types.manage'] },
  ] },
  { group: 'Administration', items: [
    { to: '/app/accounts', label: 'Accounts', icon: UserCog, cap: ['staff.manage', 'residents.manage'] },
  ] },
];

export function canOpen(path: string, permissions: Capability[]) {
  const items = NAV.flatMap((g) => g.items).filter((i) => i.to !== '/app' && path.startsWith(i.to));
  const match = items.sort((a, b) => b.to.length - a.to.length)[0];
  return !match || match.cap.some((c) => permissions.includes(c));
}
