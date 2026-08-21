export type ChacaraStatus = 'ATIVA' | 'INATIVA' | 'EM_MANUTENCAO' | 'INTERDITADA' | 'VENDIDA' | 'OUTRO';

export type ReservationStatus = 
  | 'PRE_RESERVA'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'CONFIRMADA'
  | 'CHECKIN_REALIZADO'
  | 'HOSPEDADO'
  | 'CHECKOUT_REALIZADO'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'NO_SHOW';

export type ReservationOrigin = 
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'AIRBNB'
  | 'BOOKING'
  | 'SITE_DIRETO'
  | 'INDICACAO'
  | 'TELEFONE'
  | 'OUTRO';

export type BlockReason = 
  | 'MANUTENCAO'
  | 'USO_PROPRIETARIO'
  | 'RESERVA_EXTERNA_MANUAL'
  | 'REFORMA'
  | 'OUTRO';

export interface Owner {
  id: string;
  full_name: string;
  document_number?: string;
  cpf_cnpj?: string;
  email?: string;
  phone?: string;
  bank_info?: Record<string, any>;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChacaraPhoto {
  id: string;
  chacara_id: string;
  url: string;
  is_main: boolean;
  display_order: number;
  created_at?: string;
}

export interface ChacaraStaff {
  id: string;
  chacara_id: string;
  name: string;
  role: string;
  phone?: string;
  notes?: string;
  created_at?: string;
}

export interface Chacara {
  id: string;
  owner_id?: string;
  name: string;
  code?: string;
  description?: string;
  status: ChacaraStatus;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  capacity_people: number;
  bedrooms_count: number;
  bathrooms_count: number;
  has_pool: boolean;
  has_barbecue: boolean;
  has_event_hall: boolean;
  has_wifi: boolean;
  has_air_conditioning: boolean;
  has_equipped_kitchen: boolean;
  rules?: string;
  checkin_time?: string;
  checkout_time?: string;
  daily_rate_standard: number;
  daily_rate_weekend: number;
  daily_rate_holiday?: number;
  deposit_amount: number;
  cleaning_fee: number;
  extra_guest_fee?: number;
  included_guests?: number;
  max_capacity?: number;
  allow_pets?: boolean;
  pet_fee?: number;
  energy_fee?: number;
  event_fee?: number;
  financial_notes?: string;
  main_photo_url?: string;
  notes?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  owner?: Owner;
  photos?: ChacaraPhoto[];
  staff?: ChacaraStaff[];
}

export interface Client {
  id: string;
  full_name: string;
  document_number?: string;
  rg_number?: string;
  email?: string;
  phone: string;
  secondary_phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  tags?: string[];
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  total_reservations?: number;
  total_spent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReservationGuest {
  id: string;
  reservation_id: string;
  full_name: string;
  document_number?: string;
  is_responsible: boolean;
  is_child: boolean;
  vehicle_plate?: string;
  notes?: string;
  created_at?: string;
}

export interface ChacaraBlock {
  id: string;
  chacara_id: string;
  start_date: string;
  end_date: string;
  reason: BlockReason;
  title: string;
  description?: string;
  created_at?: string;
  chacara?: Partial<Chacara>;
}

export interface Reservation {
  id: string;
  chacara_id: string;
  client_id: string;
  code: string;
  checkin_date: string;
  checkin_time: string;
  checkout_date: string;
  checkout_time: string;
  guests_adults: number;
  guests_children: number;
  guests_infants: number;
  guests_pets: number;
  total_guests?: number;
  status: ReservationStatus;
  origin: ReservationOrigin;
  external_reference_id?: string;
  custom_price?: number | null;
  is_custom_price?: boolean;
  expires_at?: string;
  actual_checkin_at?: string;
  actual_checkin_by?: string;
  checkin_notes?: string;
  actual_checkout_at?: string;
  actual_checkout_by?: string;
  checkout_notes?: string;
  chacara_snapshot?: Record<string, any>;
  financial_summary?: {
    daily_rate_applied?: number;
    daily_rates_subtotal?: number;
    cleaning_fee?: number;
    deposit_amount?: number;
    extra_guests_total?: number;
    pet_fee?: number;
    energy_fee?: number;
    event_fee?: number;
    rule_discounts_total?: number;
    rule_surcharges_total?: number;
    manual_adjustment_amount?: number;
    manual_adjustment_reason?: string;
    calculated_total?: number;
    custom_price?: number | null;
    is_custom_price?: boolean;
    total_amount?: number;
    paid_amount?: number;
    payment_status?: string;
    nights_count?: number;
    [key: string]: any;
  };
  created_by?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  canceled_at?: string;
  canceled_by?: string;
  cancel_reason?: string;
  cancellation_fee?: number;
  special_requests?: string;
  internal_notes?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  primary_staff_id?: string;
  staff_ids?: string[];
  staff_names?: string[];
  staff_members?: CrewMember[];
  chacara?: Chacara;
  client?: Client;
  guests_list?: ReservationGuest[];
}

export function getEffectiveReservationPrice(res: Partial<Reservation> | null | undefined): number {
  if (!res) return 0;
  if (res.custom_price != null && !isNaN(Number(res.custom_price))) {
    return Number(res.custom_price);
  }
  const fin = res.financial_summary;
  if (fin?.custom_price != null && !isNaN(Number(fin.custom_price))) {
    return Number(fin.custom_price);
  }
  if (fin?.total_amount != null && !isNaN(Number(fin.total_amount))) {
    return Number(fin.total_amount);
  }
  return 0;
}

export function isCustomReservationPrice(res: Partial<Reservation> | null | undefined): boolean {
  if (!res) return false;
  if (res.is_custom_price !== undefined && res.is_custom_price !== null) {
    return Boolean(res.is_custom_price);
  }
  if (res.custom_price != null) return true;
  if (res.financial_summary?.is_custom_price !== undefined && res.financial_summary?.is_custom_price !== null) {
    return Boolean(res.financial_summary.is_custom_price);
  }
  if (res.financial_summary?.custom_price != null) return true;
  return false;
}

export interface ReservationHistory {
  id: string;
  reservation_id: string;
  action_type: 'CRIACAO' | 'CONFIRMACAO' | 'CANCELAMENTO' | 'MUDANCA_STATUS' | 'EDICAO';
  previous_status?: string;
  new_status?: string;
  performed_by?: string;
  performed_at?: string;
  notes?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  created_at?: string;
}

export type PricingRuleType = 
  | 'SPECIFIC_PERIOD'
  | 'HIGH_SEASON'
  | 'LOW_SEASON'
  | 'HOLIDAY_PACKAGE'
  | 'PROMOTION'
  | 'SURCHARGE'
  | 'WEEKDAY_SPECIAL';

export interface ChacaraPricingRule {
  id: string;
  chacara_id: string;
  name: string;
  rule_type: PricingRuleType;
  start_date?: string;
  end_date?: string;
  days_of_week?: number[]; // 0=Dom, 1=Seg... 6=Sáb
  price_override?: number;
  discount_percentage?: number;
  discount_amount?: number;
  surcharge_percentage?: number;
  surcharge_amount?: number;
  min_stay_nights?: number;
  min_reservation_value?: number;
  priority: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PricingCalculationInput {
  chacara_id: string;
  checkin_date: string; // 'YYYY-MM-DD'
  checkout_date: string; // 'YYYY-MM-DD'
  guests_adults: number;
  guests_children: number;
  guests_pets?: number;
  is_event?: boolean;
  manual_adjustment_amount?: number;
  manual_adjustment_reason?: string;
  custom_price?: number | null;
  is_custom_price?: boolean;
}

export interface DailyRateDetail {
  date: string; // 'YYYY-MM-DD'
  day_of_week: number; // 0-6
  is_weekend: boolean;
  is_holiday: boolean;
  applied_rule_name?: string;
  base_rate: number;
  applied_rate: number;
}

export interface PricingBreakdownResult {
  chacara_id: string;
  checkin_date: string;
  checkout_date: string;
  nights_count: number;
  daily_rates_details: DailyRateDetail[];
  daily_rates_subtotal: number;
  
  total_guests: number;
  included_guests: number;
  extra_guests_count: number;
  extra_guest_fee_per_night: number;
  extra_guests_total: number;
  
  cleaning_fee: number;
  deposit_amount: number;
  pet_fee: number;
  energy_fee: number;
  event_fee: number;
  
  rule_discounts_total: number;
  rule_surcharges_total: number;
  
  manual_adjustment_amount: number;
  manual_adjustment_reason?: string;
  
  total_fees: number;
  subtotal_before_adjustment: number;
  calculated_total: number;
  custom_price: number | null;
  is_custom_price: boolean;
  total_amount: number;
}

export interface PricingAuditLog {
  id: string;
  chacara_id: string;
  rule_id?: string;
  reservation_id?: string;
  action_type?: string;
  action?: string;
  user?: string;
  performed_by?: string;
  performed_by_name?: string;
  description?: string;
  reason?: string;
  old_value?: any;
  new_value?: any;
  details?: Record<string, any>;
  timestamp?: string;
  created_at?: string;
}

export type FinancialStatus = 
  | 'EM_ABERTO'
  | 'PARCIALMENTE_PAGO'
  | 'PAGO'
  | 'VENCIDO'
  | 'CANCELADO'
  | 'REEMBOLSADO';

export type PaymentMethod = 
  | 'PIX'
  | 'DINHEIRO'
  | 'CARTAO_DEBITO'
  | 'CARTAO_CREDITO'
  | 'TRANSFERENCIA'
  | 'BOLETO'
  | 'OUTRO';

export type DepositStatus = 
  | 'PREVISTO'
  | 'RECEBIDO'
  | 'DEVOLVIDO'
  | 'RETIDO_PARCIAL'
  | 'RETIDO_TOTAL';

export interface ReservationCharge {
  id: string;
  reservation_id: string;
  daily_rates_subtotal: number;
  cleaning_fee: number;
  deposit_amount: number;
  pet_fee: number;
  energy_fee: number;
  event_fee: number;
  extra_guests_fee: number;
  discounts_total: number;
  surcharges_total: number;
  manual_adjustment: number;
  total_amount: number;
  due_date?: string;
  status: FinancialStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ReservationPayment {
  id: string;
  reservation_id: string;
  charge_id?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface ReservationDeposit {
  id: string;
  reservation_id: string;
  expected_amount: number;
  received_amount: number;
  received_at?: string;
  returned_amount: number;
  returned_at?: string;
  status: DepositStatus;
  retention_reason?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReservationExpense {
  id: string;
  reservation_id: string;
  description: string;
  amount: number;
  expense_date: string;
  created_by?: string;
  created_at?: string;
}

export interface ReservationRefund {
  id: string;
  reservation_id: string;
  amount: number;
  reason: string;
  refund_date: string;
  payment_method?: PaymentMethod;
  created_by?: string;
  created_at?: string;
}

export interface FinancialAuditLog {
  id: string;
  reservation_id?: string;
  operation: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  reason?: string;
  performed_by?: string;
  ip_address?: string;
  created_at?: string;
}

export interface ReservationFullFinancialSummary {
  reservation_id: string;
  charge: ReservationCharge;
  payments: ReservationPayment[];
  deposit: ReservationDeposit;
  expenses: ReservationExpense[];
  refunds: ReservationRefund[];
  total_contracted: number;
  total_received: number;
  total_expenses: number;
  total_refunds: number;
  net_balance: number;
  financial_status: FinancialStatus;
  audit_logs: FinancialAuditLog[];
}

// ==========================================
// FASE 5: GESTÃO DE EQUIPES (CREW)
// ==========================================

export interface CrewRole {
  id: string;
  nome: string;
  cor: string; // Hex color string, e.g. '#10B981'
  icone?: string; // Icon identifier
  descricao?: string;
  ativo: boolean;
  ordem_exibicao?: number;
  created_at?: string;
  updated_at?: string;
}

export type PaymentFrequency = 'WEEKLY' | 'MONTHLY' | 'PER_RESERVATION';

export interface CrewMember {
  id: string;
  nome: string;
  name?: string;
  full_name?: string;
  role?: string;
  funcao?: string;
  funcao_principal?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  observacoes?: string;
  foto_url?: string;
  ativo: boolean;
  pix_key?: string;
  chave_pix?: string;
  payment_frequency?: PaymentFrequency;
  created_at?: string;
  updated_at?: string;

  // Populated fields for UI convenience
  roles?: CrewRole[];
  chacaras?: Chacara[];
  chacara_ids?: string[];
  role_ids?: string[];
}

export interface CrewReservationPaymentSchedule {
  reference_id: string; // "crew_pay_${member_id}_${reservation_id}"
  member_id: string;
  member_name: string;
  reservation_id: string;
  reservation_code: string;
  chacara_id: string;
  chacara_name?: string;
  checkin_date: string;
  payment_due_date: string; // CHECK-IN - 1 DAY
  pix_key?: string;
  status: 'PENDENTE' | 'AGENDADO' | 'PAGO';
}

export interface CrewMemberRole {
  id: string;
  member_id: string;
  role_id: string;
  created_at?: string;
}

export interface PropertyCrew {
  id: string;
  member_id: string;
  chacara_id: string;
  created_at?: string;
}

export interface CrewAuditLog {
  id: string;
  member_id?: string;
  chacara_id?: string;
  role_id?: string;
  operation: 'CREATE_MEMBER' | 'UPDATE_MEMBER' | 'DELETE_MEMBER' | 'CHANGE_ROLES' | 'CHANGE_PROPERTIES' | 'TOGGLE_MEMBER_STATUS' | 'CREATE_ROLE' | 'UPDATE_ROLE' | 'DELETE_ROLE' | 'LINK_PROPERTY' | 'UNLINK_PROPERTY';
  details: string;
  performed_by?: string;
  created_at?: string;
}

// ==========================================
// FASE 6: CALENDÁRIO OPERACIONAL COMPLETO
// ==========================================

export type OperationalEventTypeCode =
  | 'reserva'
  | 'pre_reserva'
  | 'bloqueio'
  | 'check_in'
  | 'check_out'
  | 'limpeza'
  | 'piscina'
  | 'jardinagem'
  | 'manutencao'
  | 'inspecao'
  | 'prestador_recorrente'
  | 'prestador_eventual'
  | 'reuniao'
  | 'vistoria'
  | 'outro';

export interface OperationalEventType {
  id: string;
  code: OperationalEventTypeCode | string;
  name: string;
  color: string;
  icon: string;
  priority: number;
  description?: string;
  settings?: Record<string, any>;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type OperationalEventStatus =
  | 'AGENDADO'
  | 'CONFIRMADO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'FALTOU'
  | 'CANCELADO'
  | 'REAGENDADO';

export type RecurrenceFrequency =
  | 'DIARIA'
  | 'SEMANAL'
  | 'BISEMANAL'
  | 'MENSAL'
  | 'ANUAL'
  | 'CUSTOMIZADO';

export type EditRecurrenceScope =
  | 'THIS_OCCURRENCE'
  | 'ALL_OCCURRENCES'
  | 'THIS_AND_FUTURE';

export interface OperationalAutomation {
  id?: string;
  type: 'WHATSAPP_24H' | 'REMINDER_12H' | 'NOTIFY_ADMIN_DAY' | 'RELEASE_CHACARA_AFTER' | 'LOG_MAINTENANCE_AFTER' | 'CREATE_CHECKLIST';
  title: string;
  is_active: boolean;
  notes?: string;
}

export interface OperationalRecurrenceRule {
  id: string;
  chacara_id?: string;
  event_type_id: string;
  event_type_code: string;
  title: string;
  description?: string;
  frequency: RecurrenceFrequency;
  recurrence_interval: number; // e.g. every 1 week, every 2 weeks, every 1 month
  days_of_week?: number[]; // 0=Dom, 1=Seg, 2=Ter... 6=Sab
  day_of_month?: number;
  week_position?: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST';
  month_position?: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  has_no_end_date: boolean;
  max_occurrences?: number;
  default_time_start: string; // HH:mm
  default_time_end: string;   // HH:mm
  staff_ids?: string[];
  automations?: OperationalAutomation[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OperationalEvent {
  id: string;
  chacara_id?: string;
  chacara_name?: string;
  recurrence_rule_id?: string;
  event_type_id: string;
  event_type_code: string;
  title: string;
  description?: string;
  start_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_date: string;   // YYYY-MM-DD
  end_time: string;   // HH:mm
  status: OperationalEventStatus;
  priority?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  
  presence_confirmed_at?: string;
  presence_confirmed_by?: string;
  
  absence_reason?: string;
  absence_notes?: string;
  rescheduled_to_date?: string;
  
  staff_ids?: string[];
  staff_names?: string[];
  
  reservation_id?: string;
  metadata?: Record<string, any>;
  automations?: OperationalAutomation[];
  
  created_at?: string;
  updated_at?: string;

  // Joined/calculated UI helpers
  type_info?: OperationalEventType;
  staff_members?: CrewMember[];
  chacara?: Partial<Chacara>;
}

export interface StaffUnavailability {
  id: string;
  member_id: string;
  start_date: string;
  end_date: string;
  reason: string; // e.g., Férias, Folga, Atestado
  notes?: string;
  created_at?: string;
}

export interface OperationalConflict {
  id: string;
  type: 'STAFF_OVERLAP' | 'STAFF_LEAVE' | 'CLEANING_GUEST_OVERLAP' | 'POOL_BLOCKED_PROPERTY' | 'MAINTENANCE_RESERVATION_OVERLAP';
  severity: 'ALERTA' | 'CRITICO';
  title: string;
  description: string;
  event_ids: string[];
  chacara_id?: string;
  staff_id?: string;
  date: string;
  ignored?: boolean;
}

export interface OperationalCalendarIndicators {
  servicos_hoje: number;
  funcionarios_presentes: number;
  funcionarios_ausentes: number;
  proximas_limpezas: number;
  proximas_manutencoes: number;
  prestadores_recorrentes_semana: number;
  servicos_atrasados: number;
  conflitos_encontrados: number;
}



