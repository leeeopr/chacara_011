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
}
