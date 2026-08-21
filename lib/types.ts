export type AppointmentStatus = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'ATENDIDO' | 'FALTOU';
export type UserRole = 'SECRETARIA' | 'FONO' | 'DONA' | 'admin' | 'owner';
export type PatientCategory = 'SUS' | 'CONVENIO' | 'PARTICULAR';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

export interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  color?: string;
  is_active?: boolean;
  default_price?: number;
}

export interface Patient {
  id?: string;
  full_name: string;
  whatsapp: string;
  birth_date?: string | null;
  fono_id?: string | null;
  category?: PatientCategory;
  company_id?: string | null;
  status?: 'ATIVO' | 'INATIVO';
}

export interface Professional {
  id: string;
  nome: string;
}

export interface Appointment {
  id: string;
  patient_id?: string | null;
  patient_name: string;
  appointment_date: string;
  start_time: string;
  end_time?: string;
  appointment_type_id?: string;
  recurring_schedule_id?: string | null;
  whatsapp: string;
  birth_date?: string | null;
  status: AppointmentStatus;
  cancel_reason?: string;
  makeup_status?: 'PENDENTE' | 'REPOSTA' | 'DISPENSADA' | null;
  linked_to_absence_id?: string | null;
  fono_id?: string;
  treatment_enabled?: boolean;
  treatment_total_sessions?: number | null;
  treatment_session_number?: number | null;
  billing_company_id?: string | null;
  agreed_price?: number | null;
  discount_value?: number | null;
  price_source?: 'DEFAULT_PRICE' | 'COMPANY_PRICE' | 'MANUAL_OVERRIDE' | null;
  net_value?: number | null;
  commission_rate_snapshot?: number | null;
  invoice_needed?: boolean;
  parent_appointment_id?: string | null;
  is_continuation?: boolean;
  continuation_notes?: string | null;
  is_prolonged?: boolean;
  patients: Patient | null;
  appointment_types?: AppointmentType | null;
  profiles?: {
    full_name: string;
  } | null;
}

export type TaskType = 'macro' | 'micro';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  type: TaskType;
  parentId?: string | null;
  created_at?: string;
}

export type EvolutionStatus = 'BACKLOG' | 'EM DESENVOLVIMENTO' | 'CONCLUÍDA' | 'CANCELADA';
export type PackStatus = 'OPEN' | 'CLOSED';

export interface EvolutionPack {
  id: string;
  number: number;
  max_weight: number;
  status: PackStatus;
  created_at: string;
  completed_at?: string | null;
  evolutions?: Evolution[];
}

export interface Evolution {
  id: string;
  pack_id: string;
  title: string;
  description?: string;
  weight: number;
  status: EvolutionStatus;
  category?: string;
  implementation_notes?: string;
  created_at: string;
}

export interface ScheduleBlock {
  id: string;
  fono_id: string;
  block_mode: 'single_day' | 'continuous_period' | 'weekly_recurring' | 'weekly_within_period';
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  weekdays?: number[]; // [0, 1, 2, 3, 4, 5, 6] onde 0=domingo, 1=segunda, etc.
  block_date?: string; // legada
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  reason?: string;
  is_recurring?: boolean;
  created_at?: string;
  profiles?: {
    full_name: string;
  } | null;
}

export type FrequencyType = 'WEEKLY' | 'BIWEEKLY' | 'CUSTOM_INTERVAL';
export type ScheduleOccurrenceStatus = 'PENDING' | 'GENERATED' | 'CANCELLED';
export type ExceptionStatus = 'CANCELLED' | 'RESCHEDULED' | 'BLOCKED';

export interface RecurringSchedule {
  id: string;
  patient_id: string;
  professional_id: string;
  clinic_id?: string | null;
  frequency_type: FrequencyType;
  interval_value: number;
  weekdays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  start_time: string; // HH:mm
  duration: number; // minutes
  starts_at: string; // YYYY-MM-DD
  ends_at?: string | null; // YYYY-MM-DD
  effective_from: string; // YYYY-MM-DD
  effective_until?: string | null; // YYYY-MM-DD
  status: 'ACTIVE' | 'SUSPENDED' | 'ENDED';
  parent_schedule_id?: string | null;
  version: number;
  appointment_type_id?: string | null;
  treatment_enabled?: boolean;
  treatment_total_sessions?: number | null;
  next_session_number?: number | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  
  // Joins
  patients?: Patient | null;
  profiles?: { id: string; full_name: string } | null;
  appointment_types?: AppointmentType | null;
  attended_sessions_count?: number;
}

export interface ScheduleOccurrence {
  id: string;
  recurring_schedule_id: string;
  appointment_id?: string | null;
  occurrence_date: string; // YYYY-MM-DD
  status: ScheduleOccurrenceStatus;
  generated_at: string;
  superseded_by?: string | null;
  
  // Joins
  recurring_schedules?: RecurringSchedule | null;
  appointments?: Appointment | null;
}

export interface ScheduleException {
  id: string;
  occurrence_id: string;
  original_date: string; // YYYY-MM-DD
  new_date?: string | null; // YYYY-MM-DD (nullable)
  reason?: string | null;
  status: ExceptionStatus;
  created_at: string;
}

export type CompanyStatus = 'ACTIVE' | 'INACTIVE';
export type CompanyLimitType = 'NONE' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Company {
  id: string;
  name: string;
  status: CompanyStatus;
  limit_value: number;
  limit_type: CompanyLimitType;
  block_on_limit: boolean;
  document_number?: string | null;
  phone?: string | null;
  email?: string | null;
  billing_day?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CompanyFormData = Omit<Company, 'id' | 'created_at' | 'updated_at'>;

export interface CompanyFilters {
  name?: string;
  status?: CompanyStatus | 'ALL';
}

export interface CompanySummary {
  total: number;
  active: number;
  inactive: number;
}

export interface CompanyPrice {
  id: string;
  company_id?: string | null;
  appointment_type_id: string;
  price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Joins
  companies?: Company | null;
  appointment_types?: AppointmentType | null;
}

export interface CompanyPriceFormData {
  company_id?: string | null;
  appointment_type_id: string;
  price: number;
  is_active: boolean;
}

export interface CompanyPriceFilters {
  company_id?: string | 'ALL' | 'PARTICULAR';
  appointment_type_id?: string | 'ALL';
  is_active?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export type BillingStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED' | 'CANCELLED';
export type BillingTransactionStatus = 'PENDING' | 'CLEARED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'PIX' | 'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'BOLETO';

export interface Billing {
  id: string;
  appointment_id?: string | null;
  billing_company_id?: string | null;
  gross_total: number;
  discount_total: number;
  net_total: number;
  status: BillingStatus;
  due_date: string;
  invoice_needed: boolean;
  invoice_number?: string | null;
  created_at: string;
  updated_at: string;

  // Joins (optional)
  appointments?: Appointment | null;
  companies?: Company | null;
  billing_transactions?: BillingTransaction[];
}

export interface BillingTransaction {
  id: string;
  billing_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  status: BillingTransactionStatus;
  installments?: number;
  created_at: string;
  updated_at: string;
  
  // Joins (optional)
  billings?: Billing | null;
}

export interface AgendaBlock {
  id: string;
  profile_id: string;
  title: string;
  description?: string | null;
  weekday: number; // 0 to 6
  start_time: string; // "HH:mm:ss" or "HH:mm"
  end_time: string; // "HH:mm:ss" or "HH:mm"
  color?: string | null;
  category?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Joins (optional)
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  agenda_block_tasks?: AgendaBlockTask[];
}

export interface AgendaBlockTask {
  id: string;
  block_id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export type WeeklyClosingStatus = 'DRAFT' | 'FINAL' | 'REOPENED';

export interface WeeklyClosing {
  id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  closed_by?: string | null; // Profile ID
  total_revenue: number;
  total_payout: number;
  company_revenue: number;
  status: WeeklyClosingStatus;
  data_snapshot: any; // JSONB
  created_at?: string;
  updated_at?: string;

  // Joins (optional)
  profiles?: {
    id: string;
    full_name: string;
  } | null;
}





