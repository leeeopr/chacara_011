export interface PaymentDocument {
  id: string;
  reservation_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  payment_date: string; // YYYY-MM-DD
  amount: number;
  description?: string;
  competencia: string; // YYYY-MM
  observacoes?: string;
  uploaded_at: string;
  uploaded_by?: string;
  public_url?: string;
  cpf?: string; // CPF do pagador/responsável pelo pagamento (Carnê-Leão)
  payer_document?: string; // Coluna persistida no banco Supabase
  payer_name?: string;
  is_deducted?: boolean; // Se foi lançado/deduzido no Carnê-Leão
  deducted_at?: string; // Data em que foi marcado como deduzido
}

export interface FiscalReservationItem {
  reservation_id: string;
  code: string;
  chacara_id: string;
  chacara_nome: string;
  client_id?: string;
  client_nome: string;
  client_document?: string; // CPF or CNPJ for Carnê-Leão
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  status: string;
  documents: PaymentDocument[];
  total_proven_amount: number;
  has_documents: boolean;
  has_multiple_documents: boolean;
}

export interface FiscalChacaraGroup {
  chacara_id: string;
  chacara_nome: string;
  total_estadias: number;
  total_recebido: number;
  total_comprovado: number;
  reservas: FiscalReservationItem[];
}

export interface FiscalCompetenceSummary {
  competencia: string; // YYYY-MM
  year: number;
  month: number;
  label: string; // e.g. "Agosto / 2026"
  total_estadias: number;
  total_recebido: number;
  total_comprovado: number;
  estadias_sem_comprovante: number;
  estadias_com_multiplos: number;
  chacaras: FiscalChacaraGroup[];
}

export interface UploadDocumentDTO {
  reservation_id: string;
  chacara_id: string;
  file: File;
  payment_date: string;
  amount: number;
  description?: string;
  competencia?: string; // YYYY-MM
  observacoes?: string;
  uploaded_by?: string;
  cpf?: string; // CPF do pagador
  payer_document?: string;
}

export interface UpdatePaymentDocumentDTO {
  cpf?: string;
  amount?: number;
  payment_date?: string;
  competencia?: string;
  description?: string;
  observacoes?: string;
}

/**
 * Item para visualização direta na central de Carnê-Leão
 * Vincula Reserva -> Comprovante -> CPF
 */
export interface CarneLeaoDocEntry {
  id: string; // ID do comprovante
  document: PaymentDocument;
  reservation_id: string;
  reservation_code: string;
  chacara_id: string;
  chacara_nome: string;
  client_id?: string;
  client_nome: string;
  client_document?: string;
  checkin_date: string;
  checkout_date: string;
  payment_date: string;
  amount: number;
  cpf: string;
  cpf_status: 'INFORMADO' | 'PENDENTE';
  file_name: string;
  public_url?: string;
  competencia?: string;
  description?: string;
  is_deducted?: boolean;
  deducted_at?: string;
}
