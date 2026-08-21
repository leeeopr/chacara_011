export type EmergencyTransactionType = 
  | 'APORTE_AUTOMATICO'
  | 'APORTE_MANUAL'
  | 'RETIRADA_DESPESA'
  | 'ESTORNO_REEMBOLSO'
  | 'AJUSTE_MANUAL';

export interface EmergencyFund {
  id: string;
  name: string;
  description: string;
  default_percentage: number; // usually 20.00 or user-configured
  current_balance: number;
  status: 'ATIVO' | 'INATIVO';
  created_at: string;
  updated_at: string;
}

export interface EmergencyFundTransaction {
  id: string;
  fund_id: string;
  chacara_id?: string | null;
  chacara_name?: string | null;
  reservation_id?: string | null;
  reservation_code?: string | null;
  payment_id?: string | null;
  refund_id?: string | null;
  transaction_type: EmergencyTransactionType;
  amount: number; // positive for entries, negative for exits/expenses
  gross_amount?: number | null; // the base amount (e.g. total payment amount)
  percentage_applied?: number | null; // e.g. 20
  balance_after: number;
  category: string;
  description: string;
  performed_by?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ChacaraEmergencyContribution {
  chacara_id: string;
  chacara_name: string;
  reservations_count: number;
  reservations_gross_volume: number; // Total contracted value of reservations for this chacara
  ideal_speculated_amount: number;   // Automatically calculated: volume * percentage
  total_allocated: number;          // Actual realized contributions from payments
  total_used: number;               // Expenses on repairs
  net_contribution: number;         // Current net balance for this property
  coverage_percentage: number;      // (total_allocated / ideal_speculated_amount) * 100
  transactions_count: number;
}

export interface EmergencyFundSummary {
  fund: EmergencyFund;
  current_balance: number;
  total_accumulated: number;
  total_used: number;
  total_refunded: number;
  contributing_reservations_count: number;
  total_reservations_count: number;
  total_reservations_gross_volume: number; // Total volume in R$ of all active reservations made
  ideal_speculated_accumulated: number;    // Ideal value: total_reservations_gross_volume * (percentage / 100)
  speculated_coverage_percentage: number;  // (current_balance / ideal_speculated_accumulated) * 100
  pending_speculated_balance: number;      // ideal_speculated_accumulated - total_accumulated
  configured_percentage: number;
  contributions_by_chacara: ChacaraEmergencyContribution[];
  recent_entries: EmergencyFundTransaction[];
  recent_exits: EmergencyFundTransaction[];
  all_transactions: EmergencyFundTransaction[];
}

export interface RecordExpenseInput {
  amount: number;
  description: string;
  chacara_id?: string;
  category?: string;
  notes?: string;
  performed_by?: string;
}

export interface RecordManualContributionInput {
  amount: number;
  description: string;
  chacara_id?: string;
  notes?: string;
  performed_by?: string;
}

export interface RecordManualWithdrawalInput {
  amount: number;
  description: string;
  chacara_id?: string;
  notes?: string;
  performed_by?: string;
}
