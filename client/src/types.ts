export type Id = string;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type Sex = 'male' | 'female';
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated';
export type ResidencyType = 'non_migrant' | 'migrant' | 'transient';

export interface Resident {
  _id: Id;
  residentNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  fullName: string;
  birthdate: string;
  age: number;
  isSenior: boolean;
  sex: Sex;
  civilStatus: CivilStatus;
  purok: string;
  address: string;
  contactNumber?: string;
  email: string;
  occupation: string;
  isVoter: boolean;
  residencyType: ResidencyType;
  yearsOfResidency: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResidentDetail extends Resident {
  summary: { totalRequests: number; activeRequests: number; totalPaid: number; healthRecords: number; incidentsReported: number };
  recentRequests: DocumentRequest[];
}

export interface DocumentType {
  _id: Id;
  code: string;
  name: string;
  description: string;
  fee: number;
  processingDays: number;
  requirements: string[];
  isActive: boolean;
  timesRequested?: number;
}

export type RequestStatus = 'pending' | 'processing' | 'ready' | 'released' | 'rejected' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'waived';

export interface Fees { unitFee: number; subtotal: number; discountRate: number; discount: number; total: number }

export interface DocumentRequest {
  _id: Id;
  referenceNumber: string;
  resident: Pick<Resident, '_id' | 'firstName' | 'middleName' | 'lastName' | 'suffix' | 'residentNo' | 'birthdate' | 'contactNumber' | 'purok'>;
  documentType: Pick<DocumentType, '_id' | 'name' | 'code' | 'fee' | 'processingDays'>;
  purpose: string;
  copies: number;
  pickupDate: string;
  pickupDateIso: string;
  pickupSlot: string;
  fees: Fees;
  isSenior: boolean;
  status: RequestStatus;
  paymentStatus: PaymentStatus;
  statusHistory: { status: RequestStatus; note: string; changedAt: string }[];
  releasedAt?: string;
  remarks: string;
  daysUntilPickup: number;
  isBehindSchedule: boolean;
  isUnclaimed: boolean;
  nextStatuses: RequestStatus[];
  isActive: boolean;
  daysOverdue?: number;
  payments?: Payment[];
  createdAt: string;
}

export interface Quote {
  documentType: string;
  resident: string;
  unitFee: number;
  copies: number;
  subtotal: number;
  isSenior: boolean;
  discountRate: number;
  discount: number;
  total: number;
  isFree: boolean;
  processingDays: number;
}

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank_transfer' | 'qrph';
export type PaymentCategory = 'document_fee' | 'business_fee' | 'fine' | 'donation' | 'other';

export interface Payment {
  _id: Id;
  orNumber: string;
  request?: { _id: Id; referenceNumber: string; status: RequestStatus } | Id;
  resident?: { _id: Id; firstName: string; lastName: string; residentNo: string } | Id;
  payerName: string;
  amount: number;
  method: PaymentMethod;
  category: PaymentCategory;
  description: string;
  paidAt: string;
  isVoided: boolean;
  voidReason: string;
}

export interface PaymentSummary {
  totalCollected: number;
  transactionCount: number;
  averagePayment: number;
  highestPayment: number;
  lowestPayment: number;
  voidedCount: number;
  voidedAmount: number;
  byMethod: Record<string, number>;
  byCategory: Record<string, number>;
  byDay: { date: string; total: number; count: number }[];
  bestDay: { date: string; total: number; count: number } | null;
}

export interface SlotInfo { slot: string; capacity: number; booked: number; remaining: number; available: boolean }
export interface Availability {
  date: string;
  isOpen: boolean;
  closedReason: string | null;
  slots: SlotInfo[];
  totalCapacity: number;
  totalBooked: number;
  totalRemaining: number;
  isFull: boolean;
}
export interface CalendarDay { date: string; isOpen: boolean; closedReason: string | null; totalRemaining: number; totalBooked: number; isFull: boolean }
export interface ScheduleBlock { _id: Id; date: string; reason: string }

export type IncidentStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';
export interface Incident {
  _id: Id;
  reporterName: string;
  type: string;
  description: string;
  location: string;
  occurredAt: string;
  urgency: Urgency;
  status: IncidentStatus;
  resolutionNotes: string;
  resolvedAt?: string;
  daysOpen: number;
  priorityScore: number;
  isStale: boolean;
  nextStatuses: IncidentStatus[];
  createdAt: string;
}

export type BlotterStatus = 'filed' | 'for_hearing' | 'mediation' | 'settled' | 'escalated' | 'dismissed';
export interface BlotterRecord {
  _id: Id;
  caseNumber: string;
  complainantName: string;
  respondentName: string;
  nature: string;
  details: string;
  incidentDate: string;
  hearingDate?: string;
  status: BlotterStatus;
  actions: { _id: Id; action: string; note: string; date: string }[];
  closedAt?: string;
  daysOpen: number;
  settlementDeadline: string;
  daysToDeadline: number | null;
  isPastDeadline: boolean;
  nextStatuses: BlotterStatus[];
  createdAt: string;
}

export type SosStatus = 'active' | 'acknowledged' | 'resolved';
export interface SosAlert {
  _id: Id;
  resident: Pick<Resident, '_id' | 'firstName' | 'lastName' | 'residentNo' | 'contactNumber' | 'purok'>;
  emergencyType: string;
  message: string;
  location: string;
  status: SosStatus;
  responseMinutes: number | null;
  resolutionMinutes: number | null;
  minutesWaiting: number | null;
  nextStatuses: SosStatus[];
  createdAt: string;
}
export interface SosMetrics {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  averageResponseMinutes: number | null;
  averageResolutionMinutes: number | null;
  fastestResponseMinutes: number | null;
  slowestResponseMinutes: number | null;
  byType: Record<string, number>;
}

export type BulletinCategory = 'announcement' | 'event' | 'advisory' | 'health' | 'emergency';
export interface Bulletin {
  _id: Id;
  title: string;
  content: string;
  category: BulletinCategory;
  eventDate?: string | null;
  expiresAt?: string | null;
  isPinned: boolean;
  isExpired: boolean;
  createdAt: string;
}

export type HealthRecordType = 'checkup' | 'vaccination' | 'prenatal' | 'senior_monitoring';
export interface HealthRecord {
  _id: Id;
  resident: Pick<Resident, '_id' | 'firstName' | 'lastName' | 'residentNo' | 'purok' | 'contactNumber'>;
  recordType: HealthRecordType;
  visitDate: string;
  weightKg?: number;
  heightCm?: number;
  systolic?: number;
  diastolic?: number;
  vaccineName: string;
  doseNumber?: number;
  nextDueDate?: string;
  notes: string;
  bmi: number | null;
  bmiCategory: string | null;
  bloodPressureCategory: string | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export interface Demographics {
  total: number;
  averageAge: number;
  oldestAge: number | null;
  youngestAge: number | null;
  seniors: number;
  voters: number;
  voterRate: number;
  ageBrackets: Record<string, number>;
  bySex: Record<string, number>;
  byPurok: { purok: string; count: number }[];
  byCivilStatus: Record<string, number>;
}

export interface Overview {
  residents: { total: number };
  requests: {
    total: number;
    byStatus: Partial<Record<RequestStatus, number>>;
    active: number;
    pickupsToday: number;
    avgTurnaroundDays: number | null;
    unpaidBalance: number;
    topDocuments: { name: string; count: number }[];
  };
  collections: { today: number; thisMonth: number; allTime: number };
  incidents: { total: number; open: number; byStatus: Record<string, number>; byUrgency: Record<string, number> };
  blotters: { total: number; open: number; byStatus: Record<string, number> };
  sos: { active: number; total: number };
  trend: { month: string; requests: number; collected: number }[];
}

export type AccountType = 'resident' | 'staff';
export type StaffRole = 'super_admin' | 'captain' | 'secretary' | 'treasurer' | 'health_worker' | 'tanod';
export type Capability =
  | 'staff.manage' | 'dashboard.view' | 'residents.view' | 'residents.manage'
  | 'documents.view' | 'documents.process' | 'document_types.manage' | 'schedule.manage'
  | 'payments.view' | 'payments.manage'
  | 'incidents.view' | 'incidents.update' | 'incidents.delete'
  | 'sos.view' | 'sos.respond' | 'sos.delete'
  | 'blotter.view' | 'blotter.manage' | 'bulletins.manage'
  | 'health.view' | 'health.manage' | 'reports.view';

export interface Session {
  id: Id;
  username: string;
  email: string;
  accountType: AccountType;
  role: StaffRole | null;
  roleLabel: string;
  name: string;
  resident: Resident | null;
  mobile: string;
  mustChangePassword: boolean;
  permissions: Capability[];
}

export interface Account {
  _id: Id;
  username: string;
  email: string;
  accountType: AccountType;
  role: StaffRole | null;
  firstName: string;
  lastName: string;
  fullName: string;
  mobile: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  resident?: Pick<Resident, '_id' | 'firstName' | 'lastName' | 'residentNo' | 'purok'> | null;
  createdAt: string;
}
