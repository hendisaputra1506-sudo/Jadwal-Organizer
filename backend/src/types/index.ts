export type UserRole = 'ADMIN' | 'USER';

export type EventStatus =
  | 'DRAFT'
  | 'WAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DatePrecision =
  | 'UNKNOWN'
  | 'MONTH'
  | 'WEEK'
  | 'CANDIDATES'
  | 'EXACT';

export type ConflictLevel = 'DEFINITE' | 'POTENTIAL' | 'NONE';

export interface ConflictItem {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  timeRange: string | null;
  locationName: string | null;
  level: 'DEFINITE' | 'POTENTIAL';
  reason: string;
}

export interface CandidateConflictStatus {
  candidateDate: string;
  hasConflict: boolean;
  level: ConflictLevel;
  conflicts: ConflictItem[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  highestLevel: ConflictLevel;
  conflicts: ConflictItem[];
  allCandidatesConflict?: boolean;
  candidatesBreakdown?: CandidateConflictStatus[];
}

export interface JwtUserPayload {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
}

export type NotificationType =
  | 'ASSIGNMENT'
  | 'REMINDER_H1'
  | 'REMINDER_TODAY'
  | 'EVENT_UPDATED';

export interface EventOfficerInput {
  userId: string;
  role?: string | null;
  notes?: string | null;
}
