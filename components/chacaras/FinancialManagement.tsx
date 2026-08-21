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
  Shield
} from 'lucide-react';
import { Chacara, Client, Reservation } from '@/lib/chacaraTypes';
import { getGlobalFinancialData, GlobalFinancialMetrics } from '@/services/financialService';
import { getChacaras } from '@/services/chacarasService';
import { getClients } from '@/services/clientsService';
import ReservationDetailModal from './ReservationDetailModal';
import EmergencyFundManagement from './EmergencyFundManagement';

const FINANCIAL_STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  EM_ABERTO: { label: 'Em Aberto', bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400' },
  PARCIALMENTE_PAGO: { label: 'Parcialmente Pago', bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400' },
  PAGO: { label: 'Quitado / Pago', bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400' },
  VENCIDO: { label: 'Vencido', bg: 'bg-rose-500/20 border-rose-500/30', text: 'text-rose-400' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400' },
  REEMBOLSADO: { label: 'Reembolsado', bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-300' }
};

export default function FinancialManagement() {
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'EMERGENCY_FUND'>('OVERVIEW');
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

  // Selected reservation for modal view
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadFinancialReport();
  }, [startDate, endDate, selectedChacara, selectedClient, selectedStatus, selectedMethod]);

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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#0A0F2C] border border-white/10 rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] text-[10px] font-black uppercase tracking-widest border border-[#FFD600]/30">
              Fase 4 • Gestão Financeira
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Módulo Financeiro Geral
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Rastreabilidade completa, lançamentos de recebimentos, cauções, despesas extras e conciliação de receitas.
          </p>
        </div>

        <button
          onClick={loadFinancialReport}
          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 flex items-center gap-2 transition-all self-start md:self-auto"
        >
          <Clock size={16} className="text-[#FFD600]" />
          <span>Atualizar Relatório</span>
        </button>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveSubTab('OVERVIEW')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeSubTab === 'OVERVIEW'
              ? 'bg-[#FFD600] text-[#0A0F2C] shadow-lg shadow-[#FFD600]/10'
              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <DollarSign size={15} />
          <span>Visão Geral das Reservas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('EMERGENCY_FUND')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeSubTab === 'EMERGENCY_FUND'
              ? 'bg-amber-400 text-[#0A0F2C] shadow-lg shadow-amber-400/20'
              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <Shield size={15} />
          <span>Reserva de Emergência & Manutenções</span>
          <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-black">20%</span>
        </button>
      </div>

      {activeSubTab === 'EMERGENCY_FUND' ? (
        <EmergencyFundManagement />
      ) : (
        <>
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
      </>
      )}

      {/* Reservation Detail & Financial Modal */}
      <ReservationDetailModal
        reservation={selectedReservation}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={loadFinancialReport}
      />
    </div>
  );
}
