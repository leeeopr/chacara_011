'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Search,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Tag,
  Building,
  Info,
  Scale,
  Wallet,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  BarChart3,
  ReceiptText,
  Hammer,
  ShoppingBag,
  Users,
  Compass
} from 'lucide-react';
import { 
  FinancialProjectionSummary, 
  HorizonBreakdown, 
  ProjectionHorizon, 
  FinancialProjectionItem 
} from '@/lib/financialProjectionTypes';
import { getFinancialProjection } from '@/services/financialProjectionService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Chacara } from '@/lib/chacaraTypes';

interface Props {
  chacaras: Chacara[];
  selectedChacaraId?: string;
  onRefreshNeeded?: () => void;
}

export default function FinancialProjectionOverview({
  chacaras,
  selectedChacaraId = 'ALL',
  onRefreshNeeded
}: Props) {
  const [projection, setProjection] = useState<FinancialProjectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState<ProjectionHorizon>('30_DIAS');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpandedBreakdown, setIsExpandedBreakdown] = useState(true);

  const loadProjection = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getFinancialProjection({ chacara_id: selectedChacaraId });
      setProjection(data);
    } catch (err) {
      console.error('[FinancialProjectionOverview] Erro ao carregar projeção:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjection();
  }, [selectedChacaraId]);

  const activeHorizonData: HorizonBreakdown | null = useMemo(() => {
    if (!projection) return null;
    switch (selectedHorizon) {
      case 'HOJE': return projection.hoje;
      case '30_DIAS': return projection.proxima30d;
      case '31_60_DIAS': return projection.proxima31a60d;
      case '61_90_DIAS': return projection.proxima61a90d;
      default: return projection.proxima30d;
    }
  }, [projection, selectedHorizon]);

  // Contagem de itens por categoria no horizonte ativo
  const categoryCounts = useMemo(() => {
    if (!activeHorizonData) return { ALL: 0, RECEITAS: 0, CONTAS: 0, COMPRAS: 0, MANUTENCOES: 0, EQUIPE: 0, DECISOES: 0 };
    const counts = { ALL: 0, RECEITAS: 0, CONTAS: 0, COMPRAS: 0, MANUTENCOES: 0, EQUIPE: 0, DECISOES: 0 };
    activeHorizonData.items.forEach(item => {
      counts.ALL++;
      if (item.category === 'ENTRADA') counts.RECEITAS++;
      else if (item.type === 'DESPESA_CONTA_PAGAR' || item.type === 'DESPESA_CONTA_RECORRENTE') counts.CONTAS++;
      else if (item.type === 'DESPESA_COMPRA_PENDENTE') counts.COMPRAS++;
      else if (item.type === 'DESPESA_MANUTENCAO_PREVISTA') counts.MANUTENCOES++;
      else if (item.type === 'DESPESA_EQUIPE_PREVISTA') counts.EQUIPE++;
      else if (item.type === 'DESPESA_DECISAO_APROVADA') counts.DECISOES++;
    });
    return counts;
  }, [activeHorizonData]);

  // Filtragem dos itens auditáveis do horizonte selecionado
  const filteredItems = useMemo(() => {
    if (!activeHorizonData) return [];
    return activeHorizonData.items.filter(item => {
      if (filterCategory !== 'ALL') {
        if (filterCategory === 'RECEITAS' && item.category !== 'ENTRADA') return false;
        if (filterCategory === 'CONTAS' && item.type !== 'DESPESA_CONTA_PAGAR' && item.type !== 'DESPESA_CONTA_RECORRENTE') return false;
        if (filterCategory === 'COMPRAS' && item.type !== 'DESPESA_COMPRA_PENDENTE') return false;
        if (filterCategory === 'MANUTENCOES' && item.type !== 'DESPESA_MANUTENCAO_PREVISTA') return false;
        if (filterCategory === 'EQUIPE' && item.type !== 'DESPESA_EQUIPE_PREVISTA') return false;
        if (filterCategory === 'DECISOES' && item.type !== 'DESPESA_DECISAO_APROVADA') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchChacara = (item.chacaraName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchChacara) return false;
      }

      return true;
    });
  }, [activeHorizonData, filterCategory, searchQuery]);

  // Somatório dos itens filtrados
  const filteredTotalAmount = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (item.category === 'ENTRADA') return acc + item.amount;
      if (item.category === 'SAIDA') return acc - item.amount;
      return acc;
    }, 0);
  }, [filteredItems]);

  if (loading && !projection) {
    return (
      <div className="bg-[#0A102D] border border-white/10 rounded-3xl p-10 text-center space-y-4 shadow-xl">
        <RefreshCw size={32} className="animate-spin text-[#FFD600] mx-auto" />
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white">Carregando Projeção Financeira Real</h4>
          <p className="text-xs text-white/60">Auditando saldo em conta, reserva blindada, cauções, contas a pagar e compromissos futuros...</p>
        </div>
      </div>
    );
  }

  if (!projection) return null;

  return (
    <div className="space-y-8">
      
      {/* ========================================================================= */}
      {/* SEÇÃO 1: CABEÇALHO CONCEITUAL & EQUAÇÃO DE SEGREGAÇÃO DO CAIXA REAL       */}
      {/* ========================================================================= */}
      <div className="bg-[#0A102D] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD600]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Topo do Card com Título e Ação de Atualização */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD600]/15 border border-[#FFD600]/30 text-[#FFD600] text-xs font-black tracking-wider uppercase">
              <Sparkles size={14} />
              <span>Motor Financeiro de Projeção & Liquidez Real</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex flex-wrap items-center gap-2.5">
              <span>Dinheiro em Conta</span>
              <span className="text-[#FFD600] font-mono text-xl sm:text-2xl">≠</span>
              <span className="text-emerald-400">Dinheiro Realmente Disponível</span>
            </h2>

            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              O saldo total bancário não significa caixa livre. O sistema aplica segregação contábil automática: isola a <strong className="text-emerald-300">Reserva de Emergência (blindada)</strong>, desconta <strong className="text-amber-300">Cauções de Hóspedes</strong> sob custódia e audita <strong className="text-cyan-300">Contas a Pagar, Compras, Manutenções e Diárias</strong> antes de projetar a real disponibilidade futura.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                loadProjection(true);
                if (onRefreshNeeded) onRefreshNeeded();
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/15 text-xs font-bold transition-all shadow-md active:scale-95"
              title="Recalcular fluxo de caixa com dados mais recentes"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-[#FFD600]' : 'text-[#FFD600]'} />
              <span>{refreshing ? 'Auditando...' : 'Recalcular Projeção'}</span>
            </button>
          </div>
        </div>

        {/* Subtítulo da Equação */}
        <div className="mt-6 mb-3 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
            <Scale size={14} className="text-[#FFD600]" />
            <span>Demonstrativo da Liquidez Imediata (Hoje)</span>
          </span>
          <span className="text-[11px] text-white/40 font-medium">
            Filtro ativo: <strong className="text-white">{projection.chacaraFilterName || 'Todas as Chácaras'}</strong>
          </span>
        </div>

        {/* Grade de 5 Cards Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* Card 1: Caixa Operacional Atual */}
          <div className="bg-gradient-to-br from-[#FFD600]/20 via-[#0F1738] to-[#0F1738] border-2 border-[#FFD600] rounded-2xl p-4.5 flex flex-col justify-between shadow-[0_0_30px_rgba(255,214,0,0.15)] relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#FFD600] uppercase tracking-wider flex items-center gap-1.5">
                <Wallet size={14} />
                <span>Caixa Operacional Atual</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FFD600] text-[#0A0F2C] text-[10px] font-black uppercase">
                Hoje
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-white tracking-tight block">
                {formatCurrency(projection.caixaOperacionalLivreHoje)}
              </span>
              <span className="text-[11px] text-[#FFD600]/80 font-semibold mt-1 block">
                Bruto ({formatCurrency(projection.caixaBrutoEmConta)}) - Reserva - Cauções
              </span>
            </div>
          </div>

          {/* Card 2: Reserva de Emergência */}
          <div className="bg-[#0F1738] border border-emerald-500/30 rounded-2xl p-4.5 flex flex-col justify-between relative group hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>Reserva de Emergência</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Lock size={13} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-emerald-300 tracking-tight block">
                {formatCurrency(projection.reservaEmergenciaAtual)}
              </span>
              <span className="text-[11px] text-emerald-400/60 mt-1 block">
                Saldo protegido & blindado
              </span>
            </div>
          </div>

          {/* Card 3: Entradas Previstas (30 Dias) */}
          <div className="bg-[#0F1738] border border-cyan-500/30 rounded-2xl p-4.5 flex flex-col justify-between relative group hover:border-cyan-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} />
                <span>Entradas Previstas (30d)</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <ArrowUpRight size={14} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-cyan-300 tracking-tight block">
                +{formatCurrency(projection.proxima30d.entradasPrevistas)}
              </span>
              <span className="text-[11px] text-cyan-400/60 mt-1 block">
                Líquido Operacional: {formatCurrency(projection.proxima30d.entradasOperacionaisLiquidas)}
              </span>
            </div>
          </div>

          {/* Card 4: Saídas Previstas (30 Dias) */}
          <div className="bg-[#0F1738] border border-rose-500/30 rounded-2xl p-4.5 flex flex-col justify-between relative group hover:border-rose-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown size={14} />
                <span>Saídas Previstas (30d)</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <ArrowDownRight size={14} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-rose-300 tracking-tight block">
                -{formatCurrency(projection.proxima30d.saidasPrevistas)}
              </span>
              <span className="text-[11px] text-rose-400/60 mt-1 block">
                Contas, compras e equipe
              </span>
            </div>
          </div>

          {/* Card 5: Saldo Projetado em 30 Dias */}
          <div className="bg-[#0F1738] border border-indigo-500/30 rounded-2xl p-4.5 flex flex-col justify-between relative group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>Saldo Projetado (30d)</span>
              </span>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                projection.proxima30d.statusSaude === 'CONFORTAVEL' ? 'bg-emerald-500/20 text-emerald-300' :
                projection.proxima30d.statusSaude === 'ATENCAO' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {projection.proxima30d.statusSaude}
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-2xl font-black tracking-tight block ${
                projection.proxima30d.saldoFinalProjetado >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(projection.proxima30d.saldoFinalProjetado)}
              </span>
              <span className="text-[11px] text-white/50 mt-1 block">
                Com Reserva: {formatCurrency(projection.proxima30d.saldoTotalComReserva)}
              </span>
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================================= */}
      {/* SEÇÃO 2: TABELA PROGRESSIVA POR PERÍODOS (HOJE, 30D, 31-60D, 61-90D)       */}
      {/* ========================================================================= */}
      <div className="bg-[#0A102D] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 size={20} className="text-[#FFD600]" />
              <span>Quadro Comparativo de Fluxo de Caixa Progressivo</span>
            </h3>
            <p className="text-xs text-white/60 mt-1">
              O cálculo é cumulativo progressivo: cada período inicia com o saldo final projetado do período anterior.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="text-white/40">Horizonte Selecionado:</span>
            <span className="px-3 py-1 rounded-xl bg-[#FFD600]/15 border border-[#FFD600]/30 text-[#FFD600] font-black uppercase text-[11px]">
              {selectedHorizon.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Tabela Estruturada */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-white/50">
                <th className="py-3.5 px-4">Período</th>
                <th className="py-3.5 px-4 text-right">Saldo Inicial</th>
                <th className="py-3.5 px-4 text-right text-cyan-400">Entradas Previstas</th>
                <th className="py-3.5 px-4 text-right text-rose-400">Saídas Previstas</th>
                <th className="py-3.5 px-4 text-right">Fluxo Líquido</th>
                <th className="py-3.5 px-4 text-right text-emerald-400">Saldo Projetado</th>
                <th className="py-3.5 px-4 text-center">Status / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {projection.periodos.map((p, idx) => {
                const isSelected = selectedHorizon === p.horizon;
                const isToday = p.horizon === 'HOJE';

                return (
                  <tr 
                    key={p.horizon}
                    onClick={() => setSelectedHorizon(p.horizon)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-[#141E4F]/80 border-l-4 border-l-[#FFD600]' 
                        : 'hover:bg-[#0F1738]'
                    }`}
                  >
                    {/* Período */}
                    <td className="py-4 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isToday ? 'bg-[#FFD600]' :
                          p.statusSaude === 'CONFORTAVEL' ? 'bg-emerald-400' :
                          p.statusSaude === 'ATENCAO' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        <span>{p.horizonLabel}</span>
                      </div>
                      <span className="text-[10px] text-white/40 block mt-0.5 ml-4.5">
                        {isToday ? 'Disponibilidade imediata' : `${formatDate(p.startDate)} até ${formatDate(p.endDate)}`}
                      </span>
                    </td>

                    {/* Saldo Inicial */}
                    <td className="py-4 px-4 text-right font-semibold text-white/80">
                      {formatCurrency(p.saldoInicial)}
                    </td>

                    {/* Entradas */}
                    <td className="py-4 px-4 text-right font-bold text-cyan-300">
                      {isToday ? '—' : `+${formatCurrency(p.entradasPrevistas)}`}
                      {!isToday && p.alocacaoReservaPeriodo > 0 && (
                        <span className="text-[10px] text-emerald-400/80 block font-normal">
                          (80% oper: {formatCurrency(p.entradasOperacionaisLiquidas)})
                        </span>
                      )}
                    </td>

                    {/* Saídas */}
                    <td className="py-4 px-4 text-right font-bold text-rose-400">
                      {isToday ? '—' : `-${formatCurrency(p.saidasPrevistas)}`}
                      {p.itensSemValorDefinidoCount > 0 && (
                        <span className="text-[10px] text-amber-400/80 block font-normal">
                          (+{p.itensSemValorDefinidoCount} a definir)
                        </span>
                      )}
                    </td>

                    {/* Fluxo Líquido */}
                    <td className="py-4 px-4 text-right font-bold">
                      {isToday ? '—' : (
                        <span className={p.fluxoLiquidoPeriodo >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {p.fluxoLiquidoPeriodo >= 0 ? '+' : ''}{formatCurrency(p.fluxoLiquidoPeriodo)}
                        </span>
                      )}
                    </td>

                    {/* Saldo Projetado */}
                    <td className="py-4 px-4 text-right font-black text-sm">
                      <span className={p.saldoFinalProjetado >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatCurrency(p.saldoFinalProjetado)}
                      </span>
                      <span className="text-[10px] text-white/40 block font-normal">
                        Reserva: {formatCurrency(p.reservaAcumulada)}
                      </span>
                    </td>

                    {/* Ação */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHorizon(p.horizon);
                        }}
                        className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all ${
                          isSelected
                            ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        {isSelected ? 'Inspecionando' : 'Ver Detalhes'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* SEÇÃO 3: DETALHAMENTO & BALANÇO DO HORIZONTE SELECIONADO                  */}
      {/* ========================================================================= */}
      {activeHorizonData && (
        <div className="bg-[#0A102D] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-7 shadow-2xl">
          
          {/* Header do Horizonte Ativo com Indicadores de Cobertura e Risco */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white/60">
                <span>Painel de Auditoria:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#FFD600]/20 text-[#FFD600] font-black uppercase">
                  {activeHorizonData.horizonLabel}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Composição do Fluxo & Rastreabilidade de Lançamentos
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Badge Índice de Cobertura */}
              <div className="bg-[#0F1738] border border-white/10 rounded-2xl px-4 py-2 text-right">
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider block">
                  Índice de Cobertura
                </span>
                <span className={`text-base font-black ${
                  activeHorizonData.indiceCobertura >= 1.5 
                    ? 'text-emerald-400' 
                    : activeHorizonData.indiceCobertura >= 1.0 
                    ? 'text-amber-400' 
                    : 'text-rose-400'
                }`}>
                  {(activeHorizonData.indiceCobertura * 100).toFixed(0)}%
                </span>
              </div>

              {/* Status de Saúde Geral */}
              <div className={`px-4 py-2.5 rounded-2xl border text-xs font-black flex items-center gap-2 ${
                activeHorizonData.statusSaude === 'CONFORTAVEL'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : activeHorizonData.statusSaude === 'ATENCAO'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}>
                {activeHorizonData.statusSaude === 'CONFORTAVEL' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>Saúde: {activeHorizonData.statusSaude}</span>
              </div>
            </div>
          </div>

          {/* Alertas Preventivos do Horizonte */}
          {activeHorizonData.alertas.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Alertas e Diagnósticos de Risco</span>
              </div>
              <div className="space-y-2">
                {activeHorizonData.alertas.map((alerta, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#0F1738] border border-amber-500/20 flex items-start gap-3 text-xs text-white/80">
                    <Info size={16} className="text-[#FFD600] shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">{alerta}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 Blocos de Demonstração Financeira (Entradas, Despesas, Balanço) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Bloco 1: Recursos & Entradas */}
            <div className="bg-[#0F1738] border border-cyan-500/20 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={15} />
                    <span>Recursos & Entradas</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-black">
                    Disponível
                  </span>
                </div>

                <div className="space-y-3 text-xs mt-4">
                  <div className="flex justify-between items-center text-white/70">
                    <span>Saldo Inicial do Período:</span>
                    <span className="font-bold text-white">{formatCurrency(activeHorizonData.saldoInicial)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-white/70">
                    <span>(+) Receitas Previstas (Bruto):</span>
                    <span className="font-bold text-cyan-300">+{formatCurrency(activeHorizonData.entradasPrevistas)}</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-400/90">
                    <span className="flex items-center gap-1">
                      <Lock size={12} />
                      <span>(-) Provisão Reserva (20%):</span>
                    </span>
                    <span className="font-bold">-{formatCurrency(activeHorizonData.alocacaoReservaPeriodo)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center font-black text-xs text-white">
                <span>Recurso Líquido Operacional:</span>
                <span className="text-cyan-300 text-sm">
                  {formatCurrency(activeHorizonData.saldoInicial + activeHorizonData.entradasOperacionaisLiquidas)}
                </span>
              </div>
            </div>

            {/* Bloco 2: Compromissos Futuros Detalhados */}
            <div className="bg-[#0F1738] border border-rose-500/20 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown size={15} />
                    <span>Compromissos & Saídas</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 text-[10px] font-black">
                    Previstos
                  </span>
                </div>

                <div className="space-y-2.5 text-xs mt-4">
                  <div className="flex justify-between items-center text-white/70">
                    <span className="flex items-center gap-1"><ReceiptText size={12} className="text-white/40" /> Contas a Pagar / Recorrentes:</span>
                    <span className="font-bold text-white">{formatCurrency(activeHorizonData.saidasContasPagar)}</span>
                  </div>

                  <div className="flex justify-between items-center text-white/70">
                    <span className="flex items-center gap-1"><ShoppingBag size={12} className="text-white/40" /> Compras Pendentes:</span>
                    <span className="font-bold text-white">{formatCurrency(activeHorizonData.saidasCompras)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-white/70">
                    <span className="flex items-center gap-1"><Hammer size={12} className="text-white/40" /> Manutenções em Aberto:</span>
                    <span className="font-bold text-white">{formatCurrency(activeHorizonData.saidasManutencoes)}</span>
                  </div>

                  <div className="flex justify-between items-center text-white/70">
                    <span className="flex items-center gap-1"><Users size={12} className="text-white/40" /> Diárias de Equipe / Faxinas:</span>
                    <span className="font-bold text-white">{formatCurrency(activeHorizonData.saidasEquipe)}</span>
                  </div>

                  <div className="flex justify-between items-center text-white/70">
                    <span className="flex items-center gap-1"><Compass size={12} className="text-white/40" /> Decisões Aprovadas:</span>
                    <span className="font-bold text-white">{formatCurrency(activeHorizonData.saidasDecisoes)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center font-black text-xs text-rose-400">
                <span>Total de Compromissos:</span>
                <span className="text-sm">-{formatCurrency(activeHorizonData.saidasPrevistas)}</span>
              </div>
            </div>

            {/* Bloco 3: Balanço Final & Patrimônio Total */}
            <div className="bg-gradient-to-b from-[#141E4F] to-[#0F1738] border-2 border-[#FFD600]/40 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-[0_0_25px_rgba(255,214,0,0.1)]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-black text-[#FFD600] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={15} />
                    <span>Resultado do Período</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FFD600]/20 text-[#FFD600] text-[10px] font-black">
                    Projeção
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <span className="text-[11px] text-white/60 font-medium">Saldo Operacional Final Projetado:</span>
                  <span className={`text-2xl font-black tracking-tight block ${
                    activeHorizonData.saldoFinalProjetado >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatCurrency(activeHorizonData.saldoFinalProjetado)}
                  </span>
                </div>
              </div>

              <div className="pt-3.5 border-t border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center text-white/70">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <ShieldCheck size={13} />
                    <span>Reserva Protegida Acumulada:</span>
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {formatCurrency(activeHorizonData.reservaAcumulada)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-white/80 font-semibold pt-1 border-t border-white/5">
                  <span>Patrimônio Total em Caixa:</span>
                  <span className="text-white font-black text-sm">
                    {formatCurrency(activeHorizonData.saldoTotalComReserva)}
                  </span>
                </div>
              </div>
            </div>

          </div>


          {/* ========================================================================= */}
          {/* SEÇÃO 4: EXTRATO AUDITÁVEL DE COMPROMISSOS COM FILTROS AVANÇADOS          */}
          {/* ========================================================================= */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            
            {/* Barra de Controle: Título + Botão Expandir/Recolher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-[#FFD600]" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Lançamentos Auditáveis ({activeHorizonData.horizonLabel})
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-bold">
                  {filteredItems.length} registros
                </span>
                <button
                  onClick={() => setIsExpandedBreakdown(!isExpandedBreakdown)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all ml-1"
                  title={isExpandedBreakdown ? "Recolher lista" : "Expandir lista"}
                >
                  {isExpandedBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Badges/Tabs de Filtro Rápido com Contagem Individual */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: 'Todos', count: categoryCounts.ALL },
                  { key: 'RECEITAS', label: 'Receitas', count: categoryCounts.RECEITAS },
                  { key: 'CONTAS', label: 'Contas a Pagar', count: categoryCounts.CONTAS },
                  { key: 'COMPRAS', label: 'Compras', count: categoryCounts.COMPRAS },
                  { key: 'MANUTENCOES', label: 'Manutenções', count: categoryCounts.MANUTENCOES },
                  { key: 'EQUIPE', label: 'Equipe', count: categoryCounts.EQUIPE },
                  { key: 'DECISOES', label: 'Decisões', count: categoryCounts.DECISOES }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterCategory(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      filterCategory === tab.key
                        ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                        : 'bg-[#0F1738] text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      filterCategory === tab.key ? 'bg-black/20 text-[#0A0F2C]' : 'bg-white/10 text-white/60'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Barra de Busca + Resumo de Lançamentos Filtrados */}
            {isExpandedBreakdown && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Buscar por descrição, código, fornecedor, prestador ou chácara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0F1738] border border-white/10 focus:border-[#FFD600] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-bold"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="px-3.5 py-2 rounded-xl bg-[#0F1738] border border-white/10 text-xs flex items-center justify-between sm:justify-start gap-3 shrink-0">
                  <span className="text-white/50">Total Filtrado:</span>
                  <span className={`font-black ${filteredTotalAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {filteredTotalAmount >= 0 ? '+' : ''}{formatCurrency(filteredTotalAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Lista Auditável de Registros */}
            {isExpandedBreakdown && (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredItems.length === 0 ? (
                  <div className="p-10 text-center bg-[#0F1738]/60 rounded-2xl border border-white/5 text-xs text-white/50 space-y-1">
                    <p className="font-semibold text-white/70">Nenhum compromisso ou lançamento encontrado para este filtro.</p>
                    <p className="text-white/40">Tente selecionar outro período ou limpar os termos de busca.</p>
                  </div>
                ) : (
                  filteredItems.map(item => {
                    const isEntry = item.category === 'ENTRADA';
                    const isReserva = item.category === 'RESERVA_PROTEGIDA';
                    const isCaucao = item.category === 'PASSIVO_CAUCAO';
                    const isInitial = item.category === 'SALDO_INICIAL';

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-[#0F1738] border border-white/5 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs group"
                      >
                        {/* Detalhes do Lançamento */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Badge do Módulo de Origem */}
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              item.sourceModule === 'RESERVAS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                              item.sourceModule === 'CONTAS_PAGAR' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              item.sourceModule === 'COMPRAS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              item.sourceModule === 'MANUTENCOES' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              item.sourceModule === 'EQUIPE' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                              item.sourceModule === 'EMERGENCIA' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              'bg-white/10 text-white/70 border border-white/15'
                            }`}>
                              {item.sourceModule === 'CONTAS_PAGAR' ? 'Contas a Pagar' : item.sourceModule}
                            </span>

                            {/* Badge da Chácara Vinculada */}
                            {item.chacaraName && (
                              <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/70 text-[10px] font-semibold flex items-center gap-1 border border-white/10">
                                <Building size={11} className="text-white/40" />
                                {item.chacaraName}
                              </span>
                            )}

                            {/* Tag de Deduplicação Contábil */}
                            {item.isDeduplicated && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                                Deduplicado
                              </span>
                            )}

                            {/* Tag de Valor Indefinido */}
                            {item.hasUndefinedPrice && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black">
                                Valor a Definir
                              </span>
                            )}

                            {/* Data de Vencimento / Execução */}
                            <span className="text-white/50 text-[11px] flex items-center gap-1">
                              <Calendar size={12} className="text-white/40" />
                              Data: {formatDate(item.dueDate)}
                            </span>
                          </div>

                          {/* Título do Lançamento */}
                          <div className="font-black text-white text-sm tracking-tight group-hover:text-[#FFD600] transition-colors">
                            {item.title}
                          </div>

                          {/* Descrição Complementar */}
                          {item.description && (
                            <div className="text-[11px] text-white/60 leading-relaxed max-w-2xl">
                              {item.description}
                            </div>
                          )}
                        </div>

                        {/* Valor e Status */}
                        <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                          <span className={`text-base font-black tracking-tight ${
                            isEntry ? 'text-cyan-300' :
                            isReserva ? 'text-emerald-300' :
                            isCaucao ? 'text-amber-300' :
                            isInitial ? 'text-white' :
                            item.hasUndefinedPrice ? 'text-white/40' :
                            'text-rose-400'
                          }`}>
                            {item.hasUndefinedPrice ? 'R$ 0,00' : (isEntry ? '+' : (isReserva || isCaucao || isInitial ? '' : '-')) + formatCurrency(item.amount)}
                          </span>
                          <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold block mt-0.5">
                            Status: <strong className="text-white/80">{item.status}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
