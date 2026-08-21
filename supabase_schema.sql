-- ==============================================================================
-- SCHEMA COMPLETO SUPABASE - GESTÃO INTEGRAL DE CHÁCARAS & ALUGUEL TEMPORADA
-- ==============================================================================
-- Este script cria todas as tabelas, índices, triggers, funções de cálculo,
-- políticas de segurança (Row Level Security - RLS), buckets de armazenamento
-- e dados iniciais necessários para o funcionamento 100% real do sistema.
--
-- EXECUÇÃO:
-- 1. Abra o seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá no menu lateral esquerdo em "SQL Editor" -> "New Query"
-- 3. Cole todo este código e clique em "Run" (Executar)
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. FUNÇÕES AUXILIARES E TRIGGERS GERAIS
-- ==============================================================================

-- Função para atualizar automaticamente a coluna updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABELAS PRINCIPAIS: PROPRIETÁRIOS & CHÁCARAS
-- ==============================================================================

-- Tabela de Proprietários
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_number TEXT,
  cpf_cnpj TEXT,
  email TEXT,
  phone TEXT,
  bank_info JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Chácaras / Imóveis
CREATE TABLE IF NOT EXISTS public.chacaras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVA', -- 'ATIVA', 'INATIVA', 'EM_MANUTENCAO', 'INTERDITADA', 'VENDIDA'
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  capacity_people INTEGER NOT NULL DEFAULT 10,
  max_capacity INTEGER NOT NULL DEFAULT 15,
  bedrooms_count INTEGER NOT NULL DEFAULT 1,
  bathrooms_count INTEGER NOT NULL DEFAULT 1,
  has_pool BOOLEAN NOT NULL DEFAULT false,
  has_barbecue BOOLEAN NOT NULL DEFAULT false,
  has_event_hall BOOLEAN NOT NULL DEFAULT false,
  has_wifi BOOLEAN NOT NULL DEFAULT false,
  has_air_conditioning BOOLEAN NOT NULL DEFAULT false,
  has_equipped_kitchen BOOLEAN NOT NULL DEFAULT false,
  rules TEXT,
  checkin_time TEXT NOT NULL DEFAULT '14:00',
  checkout_time TEXT NOT NULL DEFAULT '12:00',
  daily_rate_standard NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  daily_rate_weekend NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  daily_rate_holiday NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cleaning_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  extra_guest_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  included_guests INTEGER NOT NULL DEFAULT 10,
  allow_pets BOOLEAN NOT NULL DEFAULT false,
  pet_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  energy_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  event_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  financial_notes TEXT,
  main_photo_url TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fotos da Chácara
CREATE TABLE IF NOT EXISTS public.chacara_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipe vinculada à Chácara (legado / rápido)
CREATE TABLE IF NOT EXISTS public.chacara_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bloqueios Operacionais e Manutenções no Calendário
CREATE TABLE IF NOT EXISTS public.chacara_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'MANUTENCAO', -- 'MANUTENCAO', 'USO_PROPRIETARIO', 'RESERVA_EXTERNA_MANUAL', 'REFORMA', 'OUTRO'
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. REGRAS DE PRECIFICAÇÃO DINÂMICA & AUDITORIA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.chacara_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'SPECIFIC_PERIOD', 'HIGH_SEASON', 'LOW_SEASON', 'HOLIDAY_PACKAGE', 'PROMOTION', 'SURCHARGE', 'WEEKDAY_SPECIAL'
  start_date DATE,
  end_date DATE,
  days_of_week INTEGER[] DEFAULT '{}',
  price_override NUMERIC(12,2),
  discount_percentage NUMERIC(5,2),
  discount_amount NUMERIC(12,2),
  surcharge_percentage NUMERIC(5,2),
  surcharge_amount NUMERIC(12,2),
  min_stay_nights INTEGER,
  min_reservation_value NUMERIC(12,2),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.chacara_pricing_rules(id) ON DELETE SET NULL,
  reservation_id UUID,
  action_type TEXT,
  action TEXT,
  user_name TEXT,
  performed_by TEXT,
  performed_by_name TEXT,
  description TEXT,
  reason TEXT,
  old_value JSONB,
  new_value JSONB,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. CLIENTES / HÓSPEDES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_number TEXT,
  rg_number TEXT,
  cpf_cnpj TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  blacklist_reason TEXT,
  total_reservations INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. RESERVAS E HÓSPEDES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  checkin_date DATE NOT NULL,
  checkin_time TEXT NOT NULL DEFAULT '14:00',
  checkout_date DATE NOT NULL,
  checkout_time TEXT NOT NULL DEFAULT '12:00',
  guests_adults INTEGER NOT NULL DEFAULT 1,
  guests_children INTEGER NOT NULL DEFAULT 0,
  guests_infants INTEGER NOT NULL DEFAULT 0,
  guests_pets INTEGER NOT NULL DEFAULT 0,
  total_guests INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PRE_RESERVA', -- 'PRE_RESERVA', 'AGUARDANDO_CONFIRMACAO', 'CONFIRMADA', 'CHECKIN_REALIZADO', 'HOSPEDADO', 'CHECKOUT_REALIZADO', 'FINALIZADA', 'CANCELADA', 'NO_SHOW'
  origin TEXT NOT NULL DEFAULT 'WHATSAPP', -- 'WHATSAPP', 'INSTAGRAM', 'AIRBNB', 'BOOKING', 'SITE_DIRETO', 'INDICACAO', 'TELEFONE', 'OUTRO'
  external_reference_id TEXT,
  custom_price NUMERIC(12,2),
  is_custom_price BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  actual_checkin_at TIMESTAMPTZ,
  actual_checkin_by TEXT,
  checkin_notes TEXT,
  actual_checkout_at TIMESTAMPTZ,
  actual_checkout_by TEXT,
  checkout_notes TEXT,
  chacara_snapshot JSONB,
  financial_summary JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancelled_at TIMESTAMPTZ,
  canceled_by TEXT,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancellation_fee NUMERIC(12,2) DEFAULT 0.00,
  special_requests TEXT,
  internal_notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  primary_staff_id UUID,
  staff_ids UUID[] DEFAULT '{}',
  staff_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lista de Acompanhantes da Reserva
CREATE TABLE IF NOT EXISTS public.reservation_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  document_number TEXT,
  is_responsible BOOLEAN NOT NULL DEFAULT false,
  is_child BOOLEAN NOT NULL DEFAULT false,
  vehicle_plate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de Status da Reserva
CREATE TABLE IF NOT EXISTS public.reservation_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'CRIACAO', 'CONFIRMACAO', 'CANCELAMENTO', 'MUDANCA_STATUS', 'EDICAO'
  previous_status TEXT,
  new_status TEXT,
  performed_by TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. FINANCEIRO DETALHADO POR RESERVA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reservation_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  daily_rates_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cleaning_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pet_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  energy_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  event_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  extra_guests_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discounts_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  surcharges_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  manual_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'EM_ABERTO', -- 'EM_ABERTO', 'PARCIALMENTE_PAGO', 'PAGO', 'VENCIDO', 'CANCELADO', 'REEMBOLSADO'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.reservation_charges(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'PIX', -- 'PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'TRANSFERENCIA', 'BOLETO', 'OUTRO'
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  received_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  received_at TIMESTAMPTZ,
  returned_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  returned_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PREVISTO', -- 'PREVISTO', 'RECEBIDO', 'DEVOLVIDO', 'RETIDO_PARCIAL', 'RETIDO_TOTAL'
  retention_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'PIX',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  performed_by TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. RESERVA DE EMERGÊNCIA & MANUTENÇÕES (REGRA 20%)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.emergency_funds (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL DEFAULT 'Reserva de Emergência',
  description TEXT NOT NULL DEFAULT 'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais, manutenções emergenciais e reparos na infraestrutura das chácaras.',
  default_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emergency_fund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.emergency_funds(id) ON DELETE CASCADE,
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  chacara_name TEXT,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  reservation_code TEXT,
  payment_id UUID REFERENCES public.reservation_payments(id) ON DELETE SET NULL,
  refund_id UUID REFERENCES public.reservation_refunds(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL, -- 'APORTE_AUTOMATICO', 'APORTE_MANUAL', 'RETIRADA_DESPESA', 'ESTORNO_REEMBOLSO', 'AJUSTE_MANUAL'
  amount NUMERIC(12,2) NOT NULL, -- Positivo para entradas/aportes, negativo para saídas/reparos
  gross_amount NUMERIC(12,2),
  percentage_applied NUMERIC(5,2),
  balance_after NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  category TEXT NOT NULL DEFAULT 'RECEITA_ALUGUEL_20%',
  description TEXT NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. GESTÃO FISCAL, COMPROVANTES & CARNÊ-LEÃO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reservation_payment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  observacoes TEXT,
  competencia TEXT NOT NULL, -- Formato 'YYYY-MM'
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by TEXT
);

-- ==============================================================================
-- 10. GESTÃO DE EQUIPE (CREW)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#10B981',
  icone TEXT,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_exibicao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  name TEXT,
  full_name TEXT,
  role TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  observacoes TEXT,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  pix_key TEXT,
  payment_frequency TEXT NOT NULL DEFAULT 'PER_RESERVATION', -- 'WEEKLY', 'MONTHLY', 'PER_RESERVATION'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crew_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.crew_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.property_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, chacara_id)
);

CREATE TABLE IF NOT EXISTS public.crew_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.crew_roles(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  details TEXT NOT NULL,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 11. CALENDÁRIO OPERACIONAL & EVENTOS RECORRENTES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.operational_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT NOT NULL DEFAULT 'Calendar',
  priority INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operational_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES public.operational_event_types(id) ON DELETE RESTRICT,
  event_type_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'SEMANAL', -- 'DIARIA', 'SEMANAL', 'BISEMANAL', 'MENSAL', 'ANUAL', 'CUSTOMIZADO'
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  days_of_week INTEGER[] DEFAULT '{}',
  day_of_month INTEGER,
  week_position TEXT,
  month_position INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  has_no_end_date BOOLEAN NOT NULL DEFAULT true,
  max_occurrences INTEGER,
  default_time_start TEXT NOT NULL DEFAULT '09:00',
  default_time_end TEXT NOT NULL DEFAULT '11:00',
  staff_ids UUID[] DEFAULT '{}',
  automations JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operational_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
  chacara_name TEXT,
  recurrence_rule_id UUID REFERENCES public.operational_recurrence_rules(id) ON DELETE SET NULL,
  event_type_id UUID NOT NULL REFERENCES public.operational_event_types(id) ON DELETE RESTRICT,
  event_type_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_date DATE NOT NULL,
  end_time TEXT NOT NULL DEFAULT '11:00',
  status TEXT NOT NULL DEFAULT 'AGENDADO', -- 'AGENDADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'FALTOU', 'CANCELADO', 'REAGENDADO'
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  presence_confirmed_at TIMESTAMPTZ,
  presence_confirmed_by TEXT,
  absence_reason TEXT,
  absence_notes TEXT,
  rescheduled_to_date DATE,
  staff_ids UUID[] DEFAULT '{}',
  staff_names TEXT[] DEFAULT '{}',
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  automations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 12. PENDÊNCIAS & CHECKLISTS OPERACIONAIS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pendencias_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_exibicao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pendencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES public.pendencias_grupos(id) ON DELETE SET NULL,
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  chacara_nome TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prazo DATE,
  prazo_hora TEXT,
  prioridade TEXT NOT NULL DEFAULT 'Média', -- 'Baixa', 'Média', 'Alta', 'Urgente'
  status TEXT NOT NULL DEFAULT 'Aberta', -- 'Aberta', 'Em andamento', 'Aguardando devolução', 'Devolvida', 'Concluída', 'Cancelada'
  criado_por TEXT,
  criado_por_nome TEXT,
  criado_por_email TEXT,
  responsavel_atual TEXT,
  responsavel_atual_nome TEXT,
  responsavel_atual_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pendencias_subitens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendencia_id UUID NOT NULL REFERENCES public.pendencias(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_por TEXT,
  concluido_por_nome TEXT,
  concluido_em TIMESTAMPTZ,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pendencias_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendencia_id UUID NOT NULL REFERENCES public.pendencias(id) ON DELETE CASCADE,
  de_usuario_id TEXT,
  de_usuario_nome TEXT,
  para_usuario_id TEXT,
  para_usuario_nome TEXT,
  tipo_acao TEXT NOT NULL,
  observacoes TEXT,
  status_anterior TEXT,
  status_novo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pendencias_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendencia_id UUID REFERENCES public.pendencias(id) ON DELETE CASCADE,
  destinatario_id TEXT NOT NULL,
  destinatario_email TEXT,
  remetente_id TEXT,
  remetente_nome TEXT,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 13. GESTÃO DE COMPRAS & SUPRIMENTOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.house_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  chacara_nome TEXT,
  task_id UUID REFERENCES public.pendencias(id) ON DELETE SET NULL,
  task_titulo TEXT,
  transaction_id UUID,
  depends_on_purchase_id UUID REFERENCES public.house_purchases(id) ON DELETE SET NULL,
  depends_on_purchase_name TEXT,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'un',
  estimated_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  paid_price NUMERIC(12,2),
  priority TEXT NOT NULL DEFAULT 'ESTRUTURA', -- 'INFRAESTRUTURA', 'ESTRUTURA', 'SUPERESTRUTURA', 'URGENTE', 'ALTA', 'NORMAL', 'BAIXA'
  status TEXT NOT NULL DEFAULT 'A_COMPRAR', -- 'A_COMPRAR', 'EM_COTACAO', 'AGUARDANDO_DEPENDENCIA', 'COMPRADO', 'CANCELADO'
  responsible_id TEXT,
  responsible_name TEXT,
  due_date DATE,
  category TEXT NOT NULL DEFAULT 'Manutenção',
  supplier TEXT,
  product_url TEXT,
  primary_image_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.house_purchases(id) ON DELETE CASCADE,
  storage_path TEXT,
  public_url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 14. GOOGLE CALENDAR INTEGRAÇÕES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.google_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  summary TEXT,
  sync_reservations BOOLEAN NOT NULL DEFAULT true,
  sync_cleaning BOOLEAN NOT NULL DEFAULT true,
  sync_maintenance BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 15. TRIGGERS AUTOMÁTICOS PARA UPDATED_AT
-- ==============================================================================

DO $$
BEGIN
  CREATE TRIGGER trg_chacaras_updated_at BEFORE UPDATE ON public.chacaras FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_owners_updated_at BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_emergency_funds_updated_at BEFORE UPDATE ON public.emergency_funds FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_crew_members_updated_at BEFORE UPDATE ON public.crew_members FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_operational_events_updated_at BEFORE UPDATE ON public.operational_events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_pendencias_updated_at BEFORE UPDATE ON public.pendencias FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_house_purchases_updated_at BEFORE UPDATE ON public.house_purchases FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN others THEN NULL;
END $$;

-- ==============================================================================
-- 16. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(checkin_date, checkout_date);
CREATE INDEX IF NOT EXISTS idx_reservations_chacara ON public.reservations(chacara_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client ON public.reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON public.reservations(code);

CREATE INDEX IF NOT EXISTS idx_payments_reservation ON public.reservation_payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.reservation_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_emergency_tx_fund ON public.emergency_fund_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_emergency_tx_chacara ON public.emergency_fund_transactions(chacara_id);
CREATE INDEX IF NOT EXISTS idx_emergency_tx_created ON public.emergency_fund_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_fiscal_docs_res ON public.reservation_payment_documents(reservation_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_comp ON public.reservation_payment_documents(competencia);

CREATE INDEX IF NOT EXISTS idx_op_events_dates ON public.operational_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_op_events_chacara ON public.operational_events(chacara_id);

CREATE INDEX IF NOT EXISTS idx_pendencias_status ON public.pendencias(status);
CREATE INDEX IF NOT EXISTS idx_pendencias_grupo ON public.pendencias(grupo_id);

CREATE INDEX IF NOT EXISTS idx_purchases_chacara ON public.house_purchases(chacara_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.house_purchases(status);

-- ==============================================================================
-- 17. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacaras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chacara_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_payment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias_subitens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Chave Anônima / Autenticada
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'owners', 'chacaras', 'chacara_photos', 'chacara_staff', 'chacara_blocks',
    'chacara_pricing_rules', 'pricing_audit_logs', 'clients', 'reservations',
    'reservation_guests', 'reservation_status_history', 'reservation_charges',
    'reservation_payments', 'reservation_deposits', 'reservation_expenses',
    'reservation_refunds', 'financial_audit_logs', 'emergency_funds',
    'emergency_fund_transactions', 'reservation_payment_documents',
    'crew_roles', 'crew_members', 'crew_member_roles', 'property_crew',
    'crew_audit_logs', 'operational_event_types', 'operational_recurrence_rules',
    'operational_events', 'staff_unavailability', 'pendencias_grupos',
    'pendencias', 'pendencias_subitens', 'pendencias_historico',
    'pendencias_notificacoes', 'house_purchases', 'purchase_images',
    'google_calendar_integrations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Permissao Total Publica" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Permissao Total Publica" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ==============================================================================
-- 18. STORAGE BUCKETS (COMPROVANTES, FOTOS E ANEXOS)
-- ==============================================================================

-- Criação dos buckets no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('comprovantes_fiscais', 'comprovantes_fiscais', true),
  ('chacara_photos', 'chacara_photos', true),
  ('purchase_images', 'purchase_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acesso público para os buckets de armazenamento
DROP POLICY IF EXISTS "Acesso Publico Comprovantes" ON storage.objects;
CREATE POLICY "Acesso Publico Comprovantes" ON storage.objects
  FOR ALL USING (bucket_id IN ('comprovantes_fiscais', 'chacara_photos', 'purchase_images'))
  WITH CHECK (bucket_id IN ('comprovantes_fiscais', 'chacara_photos', 'purchase_images'));

-- ==============================================================================
-- 19. CARGA DE DADOS INICIAIS (SEEDS OBRIGATÓRIOS DO SISTEMA)
-- ==============================================================================

-- 1. Fundo Padrão de Reserva de Emergência (20%)
INSERT INTO public.emergency_funds (id, name, description, default_percentage, current_balance, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Reserva de Emergência',
  'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais, manutenções emergenciais e reparos na infraestrutura das chácaras.',
  20.00,
  0.00,
  'ATIVO'
) ON CONFLICT (id) DO UPDATE SET default_percentage = 20.00;

-- 2. Tipos de Eventos Operacionais Padrão
INSERT INTO public.operational_event_types (id, code, name, color, icon, priority, is_system)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'reserva', 'Reserva Confirmada', '#10B981', 'CalendarCheck', 1, true),
  ('00000000-0000-0000-0001-000000000002', 'pre_reserva', 'Pré-Reserva', '#F59E0B', 'Clock', 2, true),
  ('00000000-0000-0000-0001-000000000003', 'bloqueio', 'Bloqueio / Manutenção', '#EF4444', 'ShieldAlert', 3, true),
  ('00000000-0000-0000-0001-000000000004', 'check_in', 'Check-in de Hóspedes', '#06B6D4', 'LogIn', 4, true),
  ('00000000-0000-0000-0001-000000000005', 'check_out', 'Check-out de Hóspedes', '#6366F1', 'LogOut', 5, true),
  ('00000000-0000-0000-0001-000000000006', 'limpeza', 'Limpeza & Faxina Geral', '#8B5CF6', 'Sparkles', 6, true),
  ('00000000-0000-0000-0001-000000000007', 'piscina', 'Tratamento de Piscina', '#0EA5E9', 'Droplets', 7, true),
  ('00000000-0000-0000-0001-000000000008', 'jardinagem', 'Jardinagem & Área Externa', '#22C55E', 'Trees', 8, true),
  ('00000000-0000-0000-0001-000000000009', 'manutencao', 'Manutenção Elétrica/Hidráulica', '#EC4899', 'Wrench', 9, true)
ON CONFLICT (code) DO NOTHING;

-- 3. Funções da Equipe (Crew Roles) Padrão
INSERT INTO public.crew_roles (id, nome, cor, icone, descricao, ordem_exibicao)
VALUES
  ('00000000-0000-0000-0002-000000000001', 'Caseiro(a) / Anfitrião', '#10B981', 'Home', 'Responsável pelo check-in, suporte local e vistoria da propriedade', 1),
  ('00000000-0000-0000-0002-000000000002', 'Faxineira(o) / Limpeza', '#06B6D4', 'Sparkles', 'Higienização, arrumação de quartos, troca de roupa de cama e banho', 2),
  ('00000000-0000-0000-0002-000000000003', 'Piscineiro(a)', '#0EA5E9', 'Droplets', 'Tratamento químico, aspiração e limpeza periódica da piscina', 3),
  ('00000000-0000-0000-0002-000000000004', 'Jardineiro(a)', '#22C55E', 'Trees', 'Corte de grama, poda de árvores e manutenção do jardim', 4),
  ('00000000-0000-0000-0002-000000000005', 'Técnico(a) de Manutenção', '#EF4444', 'Wrench', 'Reparos elétricos, hidráulica, bombas de piscina e consertos urgentes', 5)
ON CONFLICT (id) DO NOTHING;

-- 4. Grupos de Pendências Padrão
INSERT INTO public.pendencias_grupos (id, nome, cor, ordem_exibicao)
VALUES
  ('00000000-0000-0000-0003-000000000001', 'Limpeza', '#06B6D4', 1),
  ('00000000-0000-0000-0003-000000000002', 'Reservas', '#10B981', 2),
  ('00000000-0000-0000-0003-000000000003', 'Financeiro', '#F59E0B', 3),
  ('00000000-0000-0000-0003-000000000004', 'Piscina', '#0EA5E9', 4),
  ('00000000-0000-0000-0003-000000000005', 'Manutenção', '#EF4444', 5),
  ('00000000-0000-0000-0003-000000000006', 'Documentação', '#8B5CF6', 6),
  ('00000000-0000-0000-0003-000000000007', 'Marketing', '#EC4899', 7),
  ('00000000-0000-0000-0003-000000000008', 'Outros', '#6B7280', 8)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- FIM DO SCRIPT DE MIGRAÇÃO SUPABASE
-- ==============================================================================
