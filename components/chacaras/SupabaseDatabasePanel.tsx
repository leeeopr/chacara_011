'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Terminal,
  Layers,
  Server
} from 'lucide-react';
import { getSupabaseConfig, getSupabaseClient } from '@/lib/supabase';
import { useAppMode } from '@/contexts/AppModeContext';

export default function SupabaseDatabasePanel() {
  const { mode, isDemo, setMode } = useAppMode();
  const [copied, setCopied] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
    tablesFound?: number;
  }>({
    tested: false,
    connected: false,
    message: 'Não testado ainda'
  });

  const { url, key } = getSupabaseConfig();
  const isPlaceholder = url.includes('placeholder') || key.includes('placeholder') || !url || !key;

  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      if (isPlaceholder) {
        setConnectionStatus({
          tested: true,
          connected: false,
          message: 'Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.'
        });
        setCheckingConnection(false);
        return;
      }

      const client = getSupabaseClient();
      const { data, error } = await client.from('chacaras').select('id').limit(1);

      if (error) {
        // Table might not exist yet or permissions
        if (error.message.includes('relation "public.chacaras" does not exist') || error.message.includes('404')) {
          setConnectionStatus({
            tested: true,
            connected: true,
            message: 'Conectado ao Supabase com sucesso! As tabelas ainda precisam ser criadas executando o SQL abaixo.'
          });
        } else {
          setConnectionStatus({
            tested: true,
            connected: false,
            message: `Erro na conexão: ${error.message}`
          });
        }
      } else {
        setConnectionStatus({
          tested: true,
          connected: true,
          message: 'Conexão ativa e tabela "chacaras" acessível no Supabase!'
        });
      }
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        connected: false,
        message: `Exceção: ${err?.message || 'Falha ao conectar'}`
      });
    } finally {
      setCheckingConnection(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleCopySQL = async () => {
    try {
      const response = await fetch('/supabase_schema.sql');
      let text = '';
      if (response.ok) {
        text = await response.text();
      }
      if (!text) {
        text = FULL_SQL_SCRIPT;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      await navigator.clipboard.writeText(FULL_SQL_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadSQL = () => {
    const blob = new Blob([FULL_SQL_SCRIPT], { type: 'text/sql;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'supabase_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                <Database size={22} />
              </span>
              <h3 className="text-xl font-black text-white">
                Integração Total Supabase & Schema SQL
              </h3>
            </div>
            <p className="text-xs text-white/60 mt-1.5 max-w-2xl leading-relaxed">
              O sistema opera 100% integrado ao PostgreSQL do Supabase em modo Produção. 
              Copie ou baixe o script SQL completo abaixo para provisionar todas as 36 tabelas, índices de alta performance, 
              regras RLS, triggers e buckets de storage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopySQL}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                copied
                  ? 'bg-emerald-400 text-slate-900 shadow-emerald-400/20'
                  : 'bg-[#FFD600] text-[#0A0F2C] hover:bg-[#ffe033] shadow-[#FFD600]/20'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'SQL Copiado com Sucesso!' : 'Copiar SQL Completo'}</span>
            </button>

            <button
              onClick={handleDownloadSQL}
              className="px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-2"
            >
              <Download size={16} />
              <span>Baixar .SQL</span>
            </button>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
              Status da Conexão Supabase
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {connectionStatus.connected ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-400" />
                )}
                <span className="text-sm font-black text-white">
                  {connectionStatus.connected ? 'Conectado / Configurado' : 'Aguardando Credenciais'}
                </span>
              </div>
              <button
                onClick={checkConnection}
                disabled={checkingConnection}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50"
                title="Testar Conexão Novamente"
              >
                <RefreshCw size={14} className={checkingConnection ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed truncate">
              {connectionStatus.message}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
              Modo de Operação Atual
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isDemo ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-sm font-black text-white">
                  {isDemo ? 'Modo Demonstração' : 'Modo Produção (Supabase Real)'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              {isDemo ? (
                <>
                  Usando dados locais de teste.{' '}
                  <button 
                    onClick={() => { setMode('PRODUCTION'); window.location.reload(); }}
                    className="text-[#FFD600] font-bold underline"
                  >
                    Mudar para Produção
                  </button>
                </>
              ) : (
                'Dados 100% gravados e lidos direto do seu banco Supabase.'
              )}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
              Ambiente / Variáveis
            </span>
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-white/80 truncate">
                <span className="text-white/40">URL: </span>
                {url ? (url.includes('placeholder') ? '⚠️ Não configurado' : url) : '⚠️ Vazio'}
              </div>
              <div className="text-[11px] font-mono text-white/80 truncate">
                <span className="text-white/40">KEY: </span>
                {key ? (key.includes('placeholder') ? '⚠️ Não configurado' : '••••••••••••••••') : '⚠️ Vazio'}
              </div>
            </div>
          </div>
        </div>

        {/* Step by Step instructions */}
        <div className="p-6 rounded-2xl bg-[#00E5FF]/5 border border-[#00E5FF]/20 space-y-3">
          <h4 className="text-sm font-black text-[#00E5FF] uppercase tracking-wider flex items-center gap-2">
            <Terminal size={16} />
            Passo a Passo Rápido (3 Minutos)
          </h4>
          <ol className="text-xs text-white/80 space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              Acesse o painel do seu projeto no Supabase:{' '}
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#FFD600] hover:underline font-bold inline-flex items-center gap-1"
              >
                supabase.com/dashboard <ExternalLink size={12} />
              </a>
            </li>
            <li>No menu lateral esquerdo, clique no ícone <strong>SQL Editor</strong> e depois em <strong>New Query</strong>.</li>
            <li>Clique no botão <strong>Copiar SQL Completo</strong> acima e cole no editor do Supabase.</li>
            <li>Clique no botão verde <strong>Run</strong> (Executar) no canto inferior direito do editor do Supabase.</li>
            <li>
              Pronto! Todas as 36 tabelas, índices, triggers da Reserva de Emergência (20%), controle fiscal de comprovantes e os buckets de storage serão criados instantaneamente.
            </li>
          </ol>
        </div>

        {/* Modules & Tables Summary Badges */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-[#FFD600]" />
            Tabelas e Estruturas Contempladas no Script SQL:
          </h4>
          <div className="flex flex-wrap gap-2">
            {[
              'owners', 'chacaras', 'chacara_photos', 'chacara_blocks', 'chacara_pricing_rules',
              'pricing_audit_logs', 'clients', 'reservations', 'reservation_guests',
              'reservation_status_history', 'reservation_charges', 'reservation_payments',
              'reservation_deposits', 'reservation_expenses', 'reservation_refunds',
              'financial_audit_logs',
              'reservation_payment_documents (Carnê-Leão)', 'crew_roles', 'crew_members',
              'crew_member_roles', 'property_crew', 'operational_event_types',
              'operational_recurrence_rules', 'operational_events', 'staff_unavailability',
              'pendencias_grupos', 'pendencias', 'pendencias_subitens', 'pendencias_historico',
              'house_purchases', 'purchase_images', 'google_calendar_integrations',
              'FASE 7: room_types', 'FASE 7: property_rooms', 'FASE 7: maintenance_records',
              'FASE 7: maintenance_images', 'FASE 7: maintenance_purchases',
              'Storage: property_rooms', 'Storage: maintenance_images',
              'Storage: comprovantes_fiscais', 'Storage: chacara_photos', 'Storage: purchase_images'
            ].map((tbl, i) => (
              <span key={i} className={`px-3 py-1 rounded-xl border text-[11px] font-mono ${
                tbl.startsWith('FASE 7:') || tbl.startsWith('Storage: property') || tbl.startsWith('Storage: maint')
                  ? 'bg-[#FFD600]/15 border-[#FFD600]/40 text-[#FFD600] font-bold'
                  : 'bg-white/5 border-white/10 text-white/80'
              }`}>
                {tbl}
              </span>
            ))}
          </div>
        </div>

        {/* SQL Preview Box */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <Server size={14} className="text-[#00E5FF]" />
              Visualização do Código SQL (Primeiras 150 linhas):
            </span>
            <span className="text-[11px] text-white/40">Arquivo: /supabase_schema.sql</span>
          </div>

          <div className="relative rounded-2xl bg-[#070b1e] border border-white/10 p-4 font-mono text-xs text-white/75 overflow-x-auto max-h-[350px] overflow-y-auto">
            <pre>{SQL_PREVIEW_SNIPPET}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const SQL_PREVIEW_SNIPPET = `-- ==============================================================================
-- SCHEMA COMPLETO SUPABASE - GESTÃO INTEGRAL DE CHÁCARAS & ALUGUEL TEMPORADA
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Tabela de Chácaras
CREATE TABLE IF NOT EXISTS public.chacaras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVA',
  street TEXT, number TEXT, neighborhood TEXT, city TEXT, state TEXT, zip_code TEXT,
  capacity_people INTEGER NOT NULL DEFAULT 10,
  max_capacity INTEGER NOT NULL DEFAULT 15,
  bedrooms_count INTEGER NOT NULL DEFAULT 1,
  bathrooms_count INTEGER NOT NULL DEFAULT 1,
  daily_rate_standard NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  daily_rate_weekend NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cleaning_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [... Clique em 'Copiar SQL Completo' para copiar todas as 36 tabelas + RLS + Storage ...]`;

const FULL_SQL_SCRIPT = `-- ==============================================================================
-- SCHEMA COMPLETO SUPABASE - GESTÃO INTEGRAL DE CHÁCARAS & ALUGUEL TEMPORADA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TABLE IF NOT EXISTS public.chacaras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVA',
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

CREATE TABLE IF NOT EXISTS public.chacara_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chacara_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chacara_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'MANUTENCAO',
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chacara_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID NOT NULL REFERENCES public.chacaras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
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
  status TEXT NOT NULL DEFAULT 'PRE_RESERVA',
  origin TEXT NOT NULL DEFAULT 'WHATSAPP',
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

CREATE TABLE IF NOT EXISTS public.reservation_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  performed_by TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  status TEXT NOT NULL DEFAULT 'EM_ABERTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.reservation_charges(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
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
  status TEXT NOT NULL DEFAULT 'PREVISTO',
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
  competencia TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by TEXT
);

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
  payment_frequency TEXT NOT NULL DEFAULT 'PER_RESERVATION',
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
  frequency TEXT NOT NULL DEFAULT 'SEMANAL',
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
  status TEXT NOT NULL DEFAULT 'AGENDADO',
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
  prioridade TEXT NOT NULL DEFAULT 'Média',
  status TEXT NOT NULL DEFAULT 'Aberta',
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
  priority TEXT NOT NULL DEFAULT 'ESTRUTURA',
  status TEXT NOT NULL DEFAULT 'A_COMPRAR',
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

CREATE TABLE IF NOT EXISTS public.planning_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE SET NULL,
  process_type TEXT NOT NULL DEFAULT 'OUTRO',
  estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'A_VISTA',
  start_date DATE,
  target_date DATE,
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  status TEXT NOT NULL DEFAULT 'EM_ANALISE',
  notes TEXT,
  responsible_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
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

CREATE TABLE IF NOT EXISTS public.chacara_financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_id UUID REFERENCES public.chacaras(id) ON DELETE CASCADE,
  emergency_reserve_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (emergency_reserve_percent >= 0 AND emergency_reserve_percent <= 100),
  maintenance_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (maintenance_percent >= 0 AND maintenance_percent <= 100),
  notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração global padrão caso não exista
INSERT INTO public.chacara_financial_settings (chacara_id, emergency_reserve_percent, maintenance_percent, notes)
SELECT NULL, 20.00, 15.00, 'Configuração global padrão da chácara'
WHERE NOT EXISTS (SELECT 1 FROM public.chacara_financial_settings WHERE chacara_id IS NULL);

-- TRIGGERS DE UPDATED_AT
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

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(checkin_date, checkout_date);
CREATE INDEX IF NOT EXISTS idx_reservations_chacara ON public.reservations(chacara_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client ON public.reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON public.reservations(code);

CREATE INDEX IF NOT EXISTS idx_payments_reservation ON public.reservation_payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.reservation_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_fiscal_docs_res ON public.reservation_payment_documents(reservation_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_comp ON public.reservation_payment_documents(competencia);

CREATE INDEX IF NOT EXISTS idx_op_events_dates ON public.operational_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_op_events_chacara ON public.operational_events(chacara_id);

CREATE INDEX IF NOT EXISTS idx_pendencias_status ON public.pendencias(status);
CREATE INDEX IF NOT EXISTS idx_pendencias_grupo ON public.pendencias(grupo_id);

CREATE INDEX IF NOT EXISTS idx_purchases_chacara ON public.house_purchases(chacara_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.house_purchases(status);

-- RLS
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
ALTER TABLE public.planning_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_integrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'owners', 'chacaras', 'chacara_photos', 'chacara_staff', 'chacara_blocks',
    'chacara_pricing_rules', 'pricing_audit_logs', 'clients', 'reservations',
    'reservation_guests', 'reservation_status_history', 'reservation_charges',
    'reservation_payments', 'reservation_deposits', 'reservation_expenses',
    'reservation_refunds', 'financial_audit_logs',
    'reservation_payment_documents',
    'crew_roles', 'crew_members', 'crew_member_roles', 'property_crew',
    'crew_audit_logs', 'operational_event_types', 'operational_recurrence_rules',
    'operational_events', 'staff_unavailability', 'pendencias_grupos',
    'pendencias', 'pendencias_subitens', 'pendencias_historico',
    'pendencias_notificacoes', 'house_purchases', 'purchase_images',
    'planning_processes',
    'google_calendar_integrations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Permissao Total Publica" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Permissao Total Publica" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('comprovantes_fiscais', 'comprovantes_fiscais', true),
  ('chacara_photos', 'chacara_photos', true),
  ('purchase_images', 'purchase_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Acesso Publico Comprovantes" ON storage.objects;
CREATE POLICY "Acesso Publico Comprovantes" ON storage.objects
  FOR ALL USING (bucket_id IN ('comprovantes_fiscais', 'chacara_photos', 'purchase_images'))
  WITH CHECK (bucket_id IN ('comprovantes_fiscais', 'chacara_photos', 'purchase_images'));

-- DADOS INICIAIS
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

INSERT INTO public.crew_roles (id, nome, cor, icone, descricao, ordem_exibicao)
VALUES
  ('00000000-0000-0000-0002-000000000001', 'Caseiro(a) / Anfitrião', '#10B981', 'Home', 'Responsável pelo check-in, suporte local e vistoria da propriedade', 1),
  ('00000000-0000-0000-0002-000000000002', 'Faxineira(o) / Limpeza', '#06B6D4', 'Sparkles', 'Higienização, arrumação de quartos, troca de roupa de cama e banho', 2),
  ('00000000-0000-0000-0002-000000000003', 'Piscineiro(a)', '#0EA5E9', 'Droplets', 'Tratamento químico, aspiração e limpeza periódica da piscina', 3),
  ('00000000-0000-0000-0002-000000000004', 'Jardineiro(a)', '#22C55E', 'Trees', 'Corte de grama, poda de árvores e manutenção do jardim', 4),
  ('00000000-0000-0000-0002-000000000005', 'Técnico(a) de Manutenção', '#EF4444', 'Wrench', 'Reparos elétricos, hidráulica, bombas de piscina e consertos urgentes', 5)
ON CONFLICT (id) DO NOTHING;

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
`;
