'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  RotateCcw, 
  Calendar, 
  Filter, 
  Search, 
  TreePine, 
  Users, 
  CreditCard, 
  PieChart as PieIcon, 
  BarChart3, 
  Eye, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  ArrowUpRight,
  Percent,
  Shield,
  ShieldCheck,
  Wallet,
  Layers,
  Sparkles,
  Landmark
} from 'lucide-react';
import { Chacara, Client, Reservation } from '@/lib/chacaraTypes';
import { getGlobalFinancialData, GlobalFinancialMetrics } from '@/services/financialService';
import { getChacaras } from '@/services/chacarasService';
import { getClients } from '@/services/clientsService';
import { 
  getFinancialSettings, 
  saveFinancialSettings, 
  subscribeToFinancialSettingsUpdates 
} from '@/services/financialSettingsService';
import { 
  ChacaraFinancialSettings, 
  DEFAULT_FINANCIAL_SETTINGS, 
  validateFinancialPercent 
} from '@/lib/financialSettingsTypes';
import ReservationDetailModal from './ReservationDetailModal';
import OpenFinanceModal from '../OpenFinanceModal';
import { Sliders, Wrench, Check, X } from 'lucide-react';

const FINANCIAL_STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  EM_ABERTO: { label: 'Em Aberto', bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400' },
  PARCIALMENTE_PAGO: { label: 'Parcialmente Pago', bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400' },
  PAGO: { label: 'Quitado / Pago', bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400' },
  VENCIDO: { label: 'Vencido', bg: 'bg-rose-500/20 border-rose-500/30', text: 'text-rose-400' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400' },
  REEMBOLSADO: { label: 'Reembolsado', bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-300' }
};

export default function FinancialManagement() {
  const [data, setData] = useState<GlobalFinancialMetrics | null>(null);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedChacara, setSelectedChacara] = useState('TODAS');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');
  const [selectedMethod, setSelectedMethod] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  // Financial Settings State
  const [finSettings, setFinSettings] = useState<ChacaraFinancialSettings>(DEFAULT_FINANCIAL_SETTINGS);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editEmergPercent, setEditEmergPercent] = useState<number>(20);
  const [editMaintPercent, setEditMaintPercent] = useState<number>(15);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Selected reservation for modal view
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isOpenFinanceModalOpen, setIsOpenFinanceModalOpen] = useState(false);

  useEffect(() => {
    loadFilterOptions();
    loadFinancialSettingsData();

    const unsubscribe = subscribeToFinancialSettingsUpdates((updated) => {
      setFinSettings(updated);
      setEditEmergPercent(updated.emergency_reserve_percent);
      setEditMaintPercent(updated.maintenance_percent);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadFinancialReport();
    loadFinancialSettingsData();
  }, [startDate, endDate, selectedChacara, selectedClient, selectedStatus, selectedMethod]);

  const loadFinancialSettingsData = async () => {
    try {
      const current = await getFinancialSettings(selectedChacara === 'TODAS' ? null : selectedChacara);
      setFinSettings(current);
      setEditEmergPercent(current.emergency_reserve_percent);
      setEditMaintPercent(current.maintenance_percent);
    } catch (e) {
      console.warn('Erro ao carregar configurações financeiras:', e);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const validatedEmerg = validateFinancialPercent(editEmergPercent);
      const validatedMaint = validateFinancialPercent(editMaintPercent);

      const saved = await saveFinancialSettings({
        chacara_id: selectedChacara === 'TODAS' ? null : selectedChacara,
        emergency_reserve_percent: validatedEmerg,
        maintenance_percent: validatedMaint
      });

      setFinSettings(saved);
      setIsConfigModalOpen(false);
    } catch (e) {
      console.error('Erro ao salvar percentuais:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [chList, clList] = await Promise.all([
        getChacaras(),
        getClients()
      ]);
      setChacaras(chList);
      setClients(clList);
    } catch (e) {
      console.warn('Erro ao carregar filtros:', e);
    }
  };

  const loadFinancialReport = async () => {
    setLoading(true);
    try {
      const report = await getGlobalFinancialData({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        chacaraId: selectedChacara,
        clientId: selectedClient || undefined,
        financialStatus: selectedStatus,
        paymentMethod: selectedMethod
      });
      setData(report);
    } catch (err) {
      console.error('Erro ao carregar relatório financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (res: Reservation) => {
    setSelectedReservation(res);
    setIsDetailModalOpen(true);
  };

  const filteredItems = (data?.itemsList || []).filter(({ reservation, summary }) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const clientName = reservation.client?.full_name?.toLowerCase() || '';
    const code = reservation.code?.toLowerCase() || '';
    const chacaraName = reservation.chacara?.name?.toLowerCase() || '';
    return clientName.includes(term) || code.includes(term) || chacaraName.includes(term);
  });

  // Cálculos de Reserva de Emergência e Mínimo Circulável com base nos percentuais configurados
  const receitaRecebida = data?.receitaRecebida || 0;
  const receitaPendente = data?.receitaPendente || 0;
  const receitaPrevista = data?.receitaPrevista || 0; // Receita especulada total = recebido + pendente

  const emergPercentRatio = (finSettings.emergency_reserve_percent || 0) / 100;
  const maintPercentRatio = (finSettings.maintenance_percent || 0) / 100;

  // 1. Reserva de Emergência baseada na Receita Recebida (% configurado)
  const reservaEmergenciaRecebida = Math.round(receitaRecebida * emergPercentRatio * 100) / 100;

  // 2. Reserva de Emergência com base na Receita Especulada (% configurado)
  const reservaEmergenciaEspeculada = Math.round(receitaPrevista * emergPercentRatio * 100) / 100;
  const reservaEmergenciaPendente = Math.round(receitaPendente * emergPercentRatio * 100) / 100;
  const taxaIntegralizacao = reservaEmergenciaEspeculada > 0
    ? Math.min(100, Math.round((reservaEmergenciaRecebida / reservaEmergenciaEspeculada) * 100))
    : (reservaEmergenciaRecebida > 0 ? 100 : 0);

  // 3. Mínimo Circulável para Manutenção (% configurado)
  const minimoCirculavelRecebido = Math.round(receitaRecebida * maintPercentRatio * 100) / 100;

  // 4. Saldo Real Atual Disponível = Total Comprovado - Reserva de Emergência - Mínimo Circulável
  const saldoRealAtual = Math.max(0, Math.round((receitaRecebida - reservaEmergenciaRecebida - minimoCirculavelRecebido) * 100) / 100);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#0A0F2C] border border-white/10 rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] text-[10px] font-black uppercase tracking-widest border border-[#FFD600]/30">
              Fase 4 • Gestão Financeira
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
              Reserva: {finSettings.emergency_reserve_percent}% • Manutenção: {finSettings.maintenance_percent}%
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Módulo Financeiro Geral
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Rastreabilidade completa, lançamentos de recebimentos, cauções, provisões de reserva e conciliação de receitas.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-4 py-2.5 bg-[#FFD600]/10 hover:bg-[#FFD600]/20 text-[#FFD600] border border-[#FFD600]/30 font-black text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#FFD600]/5"
          >
            <Sliders size={16} />
            <span>Configurar Percentuais ({finSettings.emergency_reserve_percent}% / {finSettings.maintenance_percent}%)</span>
          </button>

          <button
            onClick={() => setIsOpenFinanceModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Landmark size={16} />
            <span>Conectar Banco (Pluggy Open Finance)</span>
          </button>

          <button
            onClick={() => { loadFinancialReport(); loadFinancialSettingsData(); }}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 flex items-center gap-2 transition-all"
          >
            <Clock size={16} className="text-[#FFD600]" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Receita Prevista */}
        <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-black uppercase tracking-wider">Receita Prevista</span>
            <DollarSign size={18} className="text-[#FFD600]" />
          </div>
          <p className="text-xl font-black text-white">
            R$ {data?.receitaPrevista.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-white/40 block">Total de diárias e taxas</span>
        </div>

        {/* Receita Recebida */}
        <div className="p-5 bg-emerald-950/30 border border-emerald-500/20 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Receita Recebida</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">
            R$ {data?.receitaRecebida.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-emerald-300/60 block">Pagamentos liquidados</span>
        </div>

        {/* Receita Pendente */}
        <div className="p-5 bg-amber-950/30 border border-amber-500/20 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Receita Pendente</span>
            <Clock size={18} className="text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">
            R$ {data?.receitaPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-amber-300/60 block">A receber nos check-ins</span>
        </div>

        {/* Cauções em Aberto */}
        <div className="p-5 bg-purple-950/30 border border-purple-500/20 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-purple-300">
            <span className="text-[10px] font-black uppercase tracking-wider">Cauções em Aberto</span>
            <ShieldAlert size={18} className="text-purple-300" />
          </div>
          <p className="text-xl font-black text-purple-300">
            R$ {data?.caucoesEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-purple-300/60 block">Cauções a devolver</span>
        </div>

        {/* Reembolsos */}
        <div className="p-5 bg-red-950/30 border border-red-500/20 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-red-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Reembolsos</span>
            <RotateCcw size={18} className="text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">
            R$ {data?.totalReembolsos.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-red-300/60 block">Valores estornados</span>
        </div>
      </div>

      {/* Cards de Reserva de Emergência e Mínimo Circulável (Configuráveis) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Reserva de Emergência (% configurado) */}
        <div className="p-5 bg-gradient-to-br from-[#0A0F2C] to-[#0d1642] border border-emerald-500/30 rounded-3xl space-y-3 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  Reserva de Emergência
                </span>
                <span className="text-xs font-bold text-white/70">
                  {finSettings.emergency_reserve_percent}% dos Pagamentos Recebidos
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{finSettings.emergency_reserve_percent}% Efetivo</span>
              <Sliders size={10} />
            </button>
          </div>

          <div className="pt-1">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              R$ {reservaEmergenciaRecebida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
              Valor de segurança retido sobre o total efetivamente creditado.
            </p>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-white/40">Base Recebida:</span>
            <span className="font-bold text-white">
              R$ {receitaRecebida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Mínimo Circulável para Manutenção (% configurado) */}
        <div className="p-5 bg-gradient-to-br from-[#0A0F2C] to-[#121638] border border-blue-500/30 rounded-3xl space-y-3 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Wrench size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                  Mínimo Circulável Manutenção
                </span>
                <span className="text-xs font-bold text-white/70">
                  {finSettings.maintenance_percent}% do Caixa Comprovado
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2.5 py-1 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{finSettings.maintenance_percent}% Fixo</span>
              <Sliders size={10} />
            </button>
          </div>

          <div className="pt-1">
            <div className="text-2xl font-black text-blue-400 tracking-tight">
              R$ {minimoCirculavelRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
              Fundo operacional de giro reservado exclusivamente para manutenções preventivas e corretivas.
            </p>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-white/40">Destinação:</span>
            <span className="font-bold text-blue-300">
              Operação & Manutenção
            </span>
          </div>
        </div>

        {/* Card 3: Saldo Real Atual Disponível */}
        <div className="p-5 bg-gradient-to-br from-[#0A0F2C] to-[#1a1705] border border-[#FFD600]/30 rounded-3xl space-y-3 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD600]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600]">
                <Wallet size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD600] block">
                  Saldo Real Atual Líquido
                </span>
                <span className="text-xs font-bold text-white/70">
                  Total − Reserva ({finSettings.emergency_reserve_percent}%) − Manut. ({finSettings.maintenance_percent}%)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#FFD600]/20 border border-[#FFD600]/30 text-[#FFD600] text-[10px] font-black uppercase tracking-wider">
              Disponível
            </span>
          </div>

          <div className="pt-1">
            <div className="text-2xl font-black text-[#FFD600] tracking-tight">
              R$ {saldoRealAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
              Margem livre utilizável para novas compras, benfeitorias e investimentos sem comprometer a operação.
            </p>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-white/40">Receita Prevista Total:</span>
            <span className="font-bold text-white/80">
              R$ {receitaPrevista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Indicators Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase block">Taxa de Ocupação</span>
            <p className="text-base font-black text-white mt-0.5">{data?.taxaOcupacao || 0}%</p>
          </div>
          <Percent size={20} className="text-[#FFD600]" />
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase block">Ticket Médio</span>
            <p className="text-base font-black text-white mt-0.5">
              R$ {data?.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
          </div>
          <DollarSign size={20} className="text-[#FFD600]" />
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase block">Valor Médio por Diária</span>
            <p className="text-base font-black text-white mt-0.5">
              R$ {data?.valorMedioDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
          </div>
          <BarChart3 size={20} className="text-[#FFD600]" />
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase block">Estadia Média</span>
            <p className="text-base font-black text-white mt-0.5">
              {data?.tempoMedioHospedagem.toFixed(1) || '0'} noites
            </p>
          </div>
          <Calendar size={20} className="text-[#FFD600]" />
        </div>
      </div>

      {/* Filter Section */}
      <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-xs font-black uppercase text-[#FFD600] tracking-wider flex items-center gap-2">
            <Filter size={16} /> Filtros de Pesquisa Financeira
          </h3>
          {(startDate || endDate || selectedChacara !== 'TODAS' || selectedStatus !== 'TODOS' || selectedMethod !== 'TODAS' || searchTerm) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedChacara('TODAS');
                setSelectedClient('');
                setSelectedStatus('TODOS');
                setSelectedMethod('TODAS');
                setSearchTerm('');
              }}
              className="text-[11px] text-[#FFD600] hover:underline font-bold"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Term */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Buscar Cliente / Código</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Ex: Carlos / RES-100..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white outline-none focus:border-[#FFD600]"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">De (Data Check-in)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Até (Data Check-in)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            />
          </div>

          {/* Chácara Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Chácara</label>
            <select
              value={selectedChacara}
              onChange={(e) => setSelectedChacara(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODAS">Todas as Chácaras</option>
              {chacaras.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Financial Status */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Status Financeiro</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="EM_ABERTO">Em Aberto</option>
              <option value="PARCIALMENTE_PAGO">Parcialmente Pago</option>
              <option value="PAGO">Pago / Quitado</option>
              <option value="VENCIDO">Vencido</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="REEMBOLSADO">Reembolsado</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Forma de Pagamento</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODAS">Todas as Formas</option>
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="TRANSFERENCIA">Transferência (TED)</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Receita por Chácara */}
        <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-4">
          <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2"><TreePine size={16} className="text-[#FFD600]" /> Receita Recebida por Chácara</span>
            <span className="text-[10px] text-white/40">{Object.keys(data?.receitaPorChacara || {}).length} chácara(s)</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(data?.receitaPorChacara || {}).length === 0 ? (
              <p className="text-xs text-white/40 py-4 text-center">Nenhum lançamento no período selecionado.</p>
            ) : (
              Object.entries(data?.receitaPorChacara || {}).map(([name, item]) => {
                const totalReceita = data?.receitaRecebida || 1;
                const pct = Math.round((item.total / (totalReceita || 1)) * 100);
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>{name} ({item.count} reservas)</span>
                      <span className="text-[#FFD600]">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FFD600] transition-all" style={{ width: `${Math.max(5, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Receita por Canal / Origem */}
        <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-4">
          <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2"><PieIcon size={16} className="text-emerald-400" /> Receita por Origem de Reserva</span>
            <span className="text-[10px] text-white/40">{Object.keys(data?.receitaPorOrigem || {}).length} canais</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(data?.receitaPorOrigem || {}).length === 0 ? (
              <p className="text-xs text-white/40 py-4 text-center">Nenhum lançamento no período selecionado.</p>
            ) : (
              Object.entries(data?.receitaPorOrigem || {}).map(([orig, item]) => {
                const totalReceita = data?.receitaRecebida || 1;
                const pct = Math.round((item.total / (totalReceita || 1)) * 100);
                return (
                  <div key={orig} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>{orig} ({item.count} reservas)</span>
                      <span className="text-emerald-400">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.max(5, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Reservation Financial Table */}
      <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
            <CreditCard size={16} className="text-[#FFD600]" /> Lançamentos de Cobranças & Reservas
          </h3>
          <span className="text-xs text-white/50">{filteredItems.length} resultado(s)</span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-white/50">
            <Clock className="animate-spin text-[#FFD600]" size={28} />
            <p className="text-xs font-bold">Consolidando lançamentos e cobranças...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-xs">
            Nenhuma reserva ou cobrança encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Chácara</th>
                  <th className="py-3 px-3">Check-in</th>
                  <th className="py-3 px-3">Valor Total</th>
                  <th className="py-3 px-3">Recebido</th>
                  <th className="py-3 px-3">Saldo</th>
                  <th className="py-3 px-3">Status Financeiro</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map(({ reservation: res, summary }) => {
                  const statusInfo = FINANCIAL_STATUS_BADGES[summary.financial_status] || {
                    label: summary.financial_status,
                    bg: 'bg-white/10',
                    text: 'text-white'
                  };

                  return (
                    <tr key={res.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-black text-[#FFD600]">{res.code}</td>
                      <td className="py-3 px-3 font-bold text-white">{res.client?.full_name || 'N/A'}</td>
                      <td className="py-3 px-3 text-white/70">{res.chacara?.name || 'N/A'}</td>
                      <td className="py-3 px-3 text-white/60">{res.checkin_date}</td>
                      <td className="py-3 px-3 font-black text-white">
                        R$ {(summary.total_contracted + summary.total_expenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-400">
                        R$ {summary.total_received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-black text-amber-400">
                        R$ {Math.max(0, summary.net_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenDetail(res)}
                          className="px-3 py-1.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-[11px] rounded-xl shadow-md transition-all inline-flex items-center gap-1"
                        >
                          <Eye size={14} />
                          <span>Gerenciar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reservation Detail & Financial Modal */}
      <ReservationDetailModal
        reservation={selectedReservation}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={loadFinancialReport}
      />

      {/* Open Finance (Pluggy Connect) Modal */}
      <OpenFinanceModal
        isOpen={isOpenFinanceModalOpen}
        onClose={() => setIsOpenFinanceModalOpen(false)}
        onSuccess={() => {
          loadFinancialReport();
        }}
      />

      {/* Financial Percentage Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0F2C] border border-[#FFD600]/30 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#FFD600]/10 border border-[#FFD600]/30 text-[#FFD600]">
                  <Sliders size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Configuração dos Percentuais Financeiros</h3>
                  <p className="text-xs text-white/50">
                    {selectedChacara === 'TODAS' ? 'Definição Central / Padrão da Chácara' : `Chácara: ${chacaras.find(c => c.id === selectedChacara)?.name || 'Selecionada'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <label className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center justify-between">
                  <span>1. % Reserva de Emergência</span>
                  <span className="text-emerald-300 font-bold">{editEmergPercent}%</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={editEmergPercent}
                    onChange={(e) => setEditEmergPercent(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-white/10 rounded-lg"
                  />
                  <div className="relative w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editEmergPercent}
                      onChange={(e) => setEditEmergPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-right text-emerald-400 font-black text-sm focus:outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-2 top-2 text-xs text-emerald-400/50 pointer-events-none font-bold">%</span>
                  </div>
                </div>
                <p className="text-[11px] text-white/40">
                  Parcela blindada do total comprovado retida para imprevistos e salvaguarda patrimonial. (Permite 0% para desativar).
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <label className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center justify-between">
                  <span>2. % Mínimo Circulável de Manutenção</span>
                  <span className="text-blue-300 font-bold">{editMaintPercent}%</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={editMaintPercent}
                    onChange={(e) => setEditMaintPercent(Number(e.target.value))}
                    className="flex-1 accent-blue-500 cursor-pointer h-2 bg-white/10 rounded-lg"
                  />
                  <div className="relative w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editMaintPercent}
                      onChange={(e) => setEditMaintPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                      className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-right text-blue-400 font-black text-sm focus:outline-none focus:border-blue-400"
                    />
                    <span className="absolute right-2 top-2 text-xs text-blue-400/50 pointer-events-none font-bold">%</span>
                  </div>
                </div>
                <p className="text-[11px] text-white/40">
                  Fundo operacional contínuo isolado para manutenções preventivas e corretivas da chácara.
                </p>
              </div>

              {/* Simulação instantânea */}
              <div className="p-4 rounded-2xl bg-[#0d1642] border border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                  Simulação Instantânea (Base R$ 20.000)
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white/5 rounded-xl">
                    <span className="text-emerald-400 text-[10px] block font-bold">Reserva ({editEmergPercent}%)</span>
                    <span className="font-black text-white">R$ {(20000 * (editEmergPercent / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl">
                    <span className="text-blue-400 text-[10px] block font-bold">Manut. ({editMaintPercent}%)</span>
                    <span className="font-black text-white">R$ {(20000 * (editMaintPercent / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl">
                    <span className="text-[#FFD600] text-[10px] block font-bold">Saldo Real Atual</span>
                    <span className="font-black text-emerald-400">R$ {Math.max(0, 20000 - (20000 * (editEmergPercent / 100)) - (20000 * (editMaintPercent / 100))).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white font-bold text-xs hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingSettings}
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSavingSettings ? (
                  <Clock size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                <span>Salvar Configurações</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
