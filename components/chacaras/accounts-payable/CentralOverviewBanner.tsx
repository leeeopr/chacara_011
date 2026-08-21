'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Calendar, 
  Building2, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Chacara } from '@/lib/chacaraTypes';
import { PeriodPreset } from '@/lib/accountsPayableTypes';

interface CentralOverviewBannerProps {
  periodPreset: PeriodPreset;
  setPeriodPreset: (preset: PeriodPreset) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  periodLabel: string;
  chacaraFilter: string;
  setChacaraFilter: (id: string) => void;
  chacaras: Chacara[];
  
  // Real Financial Metrics
  receitaRecebida: number;
  receitaPrevista: number;
  totalPago: number;
  totalPendente: number;
  totalVencido: number;
  totalPrestadoresPrevisto: number;
  totalPrestadoresPago: number;
  
  // Quantities
  countPagas: number;
  countPendentes: number;
  countVencidas: number;
  countPrestadores: number;
  
  onQuickNavigateMonth: (offset: number) => void;
}

export default function CentralOverviewBanner({
  periodPreset,
  setPeriodPreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  periodLabel,
  chacaraFilter,
  setChacaraFilter,
  chacaras,
  receitaRecebida,
  receitaPrevista,
  totalPago,
  totalPendente,
  totalVencido,
  totalPrestadoresPrevisto,
  totalPrestadoresPago,
  countPagas,
  countPendentes,
  countVencidas,
  countPrestadores,
  onQuickNavigateMonth
}: CentralOverviewBannerProps) {
  const saldoOperacional = receitaRecebida - totalPago;
  const isSaldoPositivo = saldoOperacional >= 0;

  const formatBRL = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar: Period & Chácara Selector */}
      <div className="bg-gradient-to-r from-[#0E1538] via-[#0A0F2C] to-[#0E1538] border border-white/10 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Period Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setPeriodPreset('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'THIS_MONTH'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriodPreset('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'LAST_MONTH'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Mês Anterior
            </button>
            <button
              onClick={() => setPeriodPreset('NEXT_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'NEXT_MONTH'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Próximo Mês
            </button>
            <button
              onClick={() => setPeriodPreset('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'CUSTOM'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Personalizado
            </button>
          </div>

          {/* Month Step Stepper */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
            <button
              onClick={() => onQuickNavigateMonth(-1)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-white px-2 uppercase tracking-wide">
              {periodLabel}
            </span>
            <button
              onClick={() => onQuickNavigateMonth(1)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Custom Date Pickers */}
          {periodPreset === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 p-1.5 rounded-xl animate-fadeIn">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
              />
              <span className="text-white/40 text-xs">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
          )}
        </div>

        {/* Right: Chácara Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 w-full sm:w-auto">
            <Building2 size={16} className="text-purple-400 shrink-0" />
            <span className="text-xs text-white/50 hidden sm:inline">Chácara:</span>
            <select
              value={chacaraFilter}
              onChange={(e) => setChacaraFilter(e.target.value)}
              aria-label="Filtrar por Chácara"
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-[#0A0F2C] text-white">Todas as Chácaras</option>
              {chacaras.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0A0F2C] text-white">
                  {c.name}
                </option>
              ))}
              <option value="GENERAL" className="bg-[#0A0F2C] text-white">Geral / Compartilhadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6 Key Operational KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Receitas do Mês */}
        <div className="bg-[#0E1538]/90 border border-emerald-500/25 p-4 rounded-2xl relative overflow-hidden shadow-lg group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingUp size={14} />
              Receitas do Mês
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white tracking-tight">
            {formatBRL(receitaRecebida)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
            <span>Efetivo recebido</span>
            <span className="text-emerald-400 font-semibold">{formatBRL(receitaPrevista)} prev.</span>
          </div>
        </div>

        {/* 2. Contas Pagas */}
        <div className="bg-[#0E1538]/90 border border-blue-500/25 p-4 rounded-2xl relative overflow-hidden shadow-lg group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Contas Pagas
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-black">
              {countPagas}
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white tracking-tight">
            {formatBRL(totalPago)}
          </div>
          <div className="mt-1 text-[10px] text-white/50">
            Total liquidado no período
          </div>
        </div>

        {/* 3. Contas Pendentes */}
        <div className="bg-[#0E1538]/90 border border-amber-500/25 p-4 rounded-2xl relative overflow-hidden shadow-lg group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock size={14} />
              A Pagar (Pendente)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black">
              {countPendentes}
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-300 tracking-tight">
            {formatBRL(totalPendente)}
          </div>
          <div className="mt-1 text-[10px] text-white/50">
            Ainda previsto para quitar
          </div>
        </div>

        {/* 4. Contas Vencidas */}
        <div className={`p-4 rounded-2xl relative overflow-hidden shadow-lg transition-all ${
          totalVencido > 0 
            ? 'bg-rose-950/40 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
            : 'bg-[#0E1538]/90 border border-white/10'
        }`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              totalVencido > 0 ? 'text-rose-400' : 'text-white/60'
            }`}>
              <AlertTriangle size={14} />
              Contas Vencidas
            </span>
            {countVencidas > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                {countVencidas}
              </span>
            )}
          </div>
          <div className={`text-lg sm:text-xl font-black tracking-tight ${
            totalVencido > 0 ? 'text-rose-300' : 'text-white/40'
          }`}>
            {formatBRL(totalVencido)}
          </div>
          <div className="mt-1 text-[10px] text-white/50">
            {countVencidas > 0 ? 'Atrasadas que precisam de atenção' : 'Nenhuma conta atrasada'}
          </div>
        </div>

        {/* 5. Pagamentos a Prestadores */}
        <div className="bg-[#0E1538]/90 border border-purple-500/25 p-4 rounded-2xl relative overflow-hidden shadow-lg group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Users size={14} />
              Prestadores
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-black">
              {countPrestadores}
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white tracking-tight">
            {formatBRL(totalPrestadoresPrevisto)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
            <span>Pago: {formatBRL(totalPrestadoresPago)}</span>
          </div>
        </div>

        {/* 6. Saldo Operacional Líquido */}
        <div className={`p-4 rounded-2xl relative overflow-hidden shadow-lg border ${
          isSaldoPositivo 
            ? 'bg-gradient-to-br from-emerald-950/40 to-[#0A0F2C] border-emerald-500/30' 
            : 'bg-gradient-to-br from-rose-950/40 to-[#0A0F2C] border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              {isSaldoPositivo ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
              Saldo Operacional
            </span>
          </div>
          <div className={`text-lg sm:text-xl font-black tracking-tight ${
            isSaldoPositivo ? 'text-emerald-300' : 'text-rose-300'
          }`}>
            {formatBRL(saldoOperacional)}
          </div>
          <div className="mt-1 text-[10px] text-white/50">
            Receitas - Saídas pagas
          </div>
        </div>
      </div>
    </div>
  );
}
