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

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  created_at?: string;
  _count?: {
    events: number;
  };
}

export interface Location {
  id: string;
  name: string;
  created_at?: string;
  _count?: {
    events: number;
  };
}

export interface EventCandidateDate {
  id: string;
  event_id: string;
  candidate_date: string;
}

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

export interface EventItem {
  id: string;
  name: string;
  category_id: string;
  category: Category;
  status: EventStatus;
  date_precision: DatePrecision;
  estimated_month?: string | null;
  estimated_week_label?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_all_day: boolean;
  location_name?: string | null;
  location_id?: string | null;
  location?: Location | null;
  description?: string | null;
  contact_info?: string | null;
  requirements_notes?: string | null;
  is_deleted: boolean;
  created_by_id: string;
  created_by?: {
    id: string;
    name: string;
    username?: string;
  };
  updated_by_id?: string | null;
  updated_by?: {
    id: string;
    name: string;
    username?: string;
  } | null;
  created_at: string;
  updated_at: string;
  candidate_dates?: EventCandidateDate[];
  attachments?: EventAttachment[];
  conflictReport?: ConflictCheckResult | null;
  isOverdue?: boolean;
}

export interface EventAttachment {
  id: string;
  event_id: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  drive_file_id?: string | null;
  drive_view_url: string;
  drive_download_url?: string | null;
  created_at: string;
}

export interface DriveStatus {
  isConfigured: boolean;
  message: string;
  mode: 'google_drive' | 'local_fallback';
}
