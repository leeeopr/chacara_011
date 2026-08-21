'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Wrench,
  RotateCcw,
  Sliders,
  Filter,
  Download,
  Calendar,
  Building,
  CheckCircle,
  X,
  FileText,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import {
  EmergencyFundSummary,
  EmergencyFundTransaction,
  EmergencyTransactionType
} from '@/lib/emergencyFundTypes';
import {
  getEmergencyFundSummary,
  recordEmergencyFundExpense,
  recordManualEmergencyContribution,
  updateEmergencyFundPercentage
} from '@/services/emergencyFundService';
import { getChacaras } from '@/services/chacarasService';
import { Chacara } from '@/lib/chacaraTypes';

const TRANSACTION_BADGES: Record<EmergencyTransactionType, { label: string; bg: string; text: string; icon: any }> = {
  APORTE_AUTOMATICO: { label: 'Aporte Automático (20%)', bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400', icon: ArrowUpRight },
  APORTE_MANUAL: { label: 'Aporte Extraordinário', bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400', icon: Plus },
  RETIRADA_DESPESA: { label: 'Reparo Emergencial', bg: 'bg-rose-500/20 border-rose-500/30', text: 'text-rose-400', icon: Wrench },
  ESTORNO_REEMBOLSO: { label: 'Estorno por Reembolso', bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-300', icon: RotateCcw },
  AJUSTE_MANUAL: { label: 'Ajuste Manual', bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-400', icon: Sliders }
};

const EXPENSE_CATEGORIES = [
  'INFRAESTRUTURA_GERAL',
  'MANUTENCAO_HIDRAULICA',
  'MANUTENCAO_ELETRICA',
  'BOMBA_E_PISCINA',
  'TELHADO_E_ESTRUTURA',
  'REPARO_DANOS_HOSPEDE',
  'JARDINAGEM_URGENTE',
  'SEGURANCA_E_PORTAO',
  'OUTROS_EMERGENCIAIS'
];

export default function EmergencyFundManagement() {
  const [summary, setSummary] = useState<EmergencyFundSummary | null>(null);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedChacara, setSelectedChacara] = useState<string>('TODAS');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    chacara_id: '',
    category: 'BOMBA_E_PISCINA',
    description: '',
    notes: '',
    performed_by: ''
  });

  const [contributionForm, setContributionForm] = useState({
    amount: '',
    chacara_id: '',
    description: '',
    notes: '',
    performed_by: ''
  });

  const [settingsPercentage, setSettingsPercentage] = useState('20');
  const [savingAction, setSavingAction] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, chData] = await Promise.all([
        getEmergencyFundSummary({
          chacara_id: selectedChacara !== 'TODAS' ? selectedChacara : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }),
        getChacaras()
      ]);
      setSummary(sumData);
      setChacaras(chData);
      if (sumData?.configured_percentage) {
        setSettingsPercentage(sumData.configured_percentage.toString());
      }
    } catch (e) {
      console.error('[EmergencyFundManagement] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedChacara, startDate, endDate]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      showFeedback('error', 'Informe um valor válido maior que zero.');
      return;
    }
    if (!expenseForm.description.trim()) {
      showFeedback('error', 'Informe a descrição do reparo emergencial.');
      return;
    }

    setSavingAction(true);
    try {
      await recordEmergencyFundExpense({
        amount: Number(expenseForm.amount),
        chacara_id: expenseForm.chacara_id || undefined,
        category: expenseForm.category,
        description: expenseForm.description,
        notes: expenseForm.notes || undefined,
        performed_by: expenseForm.performed_by || undefined
      });

      showFeedback('success', 'Despesa emergencial registrada com sucesso.');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        amount: '',
        chacara_id: '',
        category: 'BOMBA_E_PISCINA',
        description: '',
        notes: '',
        performed_by: ''
      });
      await loadData();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Falha ao registrar despesa.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionForm.amount || Number(contributionForm.amount) <= 0) {
      showFeedback('error', 'Informe um valor válido maior que zero.');
      return;
    }
    if (!contributionForm.description.trim()) {
      showFeedback('error', 'Informe o motivo do aporte extraordinário.');
      return;
    }

    setSavingAction(true);
    try {
      await recordManualEmergencyContribution({
        amount: Number(contributionForm.amount),
        chacara_id: contributionForm.chacara_id || undefined,
        description: contributionForm.description,
        notes: contributionForm.notes || undefined,
        performed_by: contributionForm.performed_by || undefined
      });

      showFeedback('success', 'Aporte extraordinário creditado na reserva.');
      setIsContributionModalOpen(false);
      setContributionForm({
        amount: '',
        chacara_id: '',
        description: '',
        notes: '',
        performed_by: ''
      });
      await loadData();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Falha ao registrar aporte.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(settingsPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showFeedback('error', 'O percentual deve estar entre 0% e 100%.');
      return;
    }

    setSavingAction(true);
    try {
      await updateEmergencyFundPercentage(pct);
      showFeedback('success', `Percentual de retenção automática atualizado para ${pct}%.`);
      setIsSettingsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erro ao atualizar percentual.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleExportCSV = () => {
    if (!summary || !summary.all_transactions.length) {
      showFeedback('error', 'Nenhuma movimentação para exportar.');
      return;
    }

    const headers = ['Data', 'Tipo', 'Chácara', 'Descrição', 'Valor Bruto (R$)', 'Aporte/Retirada (R$)', 'Saldo Após (R$)', 'Responsável', 'Observações'];
    const rows = summary.all_transactions.map(t => [
      new Date(t.created_at).toLocaleString('pt-BR'),
      TRANSACTION_BADGES[t.transaction_type]?.label || t.transaction_type,
      t.chacara_name || 'Geral',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.gross_amount ? t.gross_amount.toFixed(2) : '',
      t.amount.toFixed(2),
      t.balance_after.toFixed(2),
      `"${(t.performed_by || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `extrato_reserva_emergencia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered transactions for the ledger
  const filteredTransactions = (summary?.all_transactions || []).filter(tx => {
    if (selectedType !== 'TODOS' && tx.transaction_type !== selectedType) {
      return false;
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchDesc = (tx.description || '').toLowerCase().includes(term);
      const matchChac = (tx.chacara_name || '').toLowerCase().includes(term);
      const matchCode = (tx.reservation_code || '').toLowerCase().includes(term);
      const matchResp = (tx.performed_by || '').toLowerCase().includes(term);
      if (!matchDesc && !matchChac && !matchCode && !matchResp) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-black border transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-[#0A0F2C] via-[#10194A] to-[#0A0F2C] border border-amber-500/30 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
              <Shield size={13} className="text-amber-400" />
              Especulação Ideal Acumulada • {summary?.configured_percentage || 20}% das Reservas
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
              <Sparkles size={12} />
              Cálculo Automático Ativo
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Reserva de Emergência & Fundo Preventivo
          </h1>
          <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
            Mecanismo que projeta e calcula automaticamente o valor ideal acumulado de <strong>{summary?.configured_percentage || 20}% sobre o volume total de reservas feitas</strong>, retendo os recursos de cada pagamento para custear despesas inesperadas, manutenções emergenciais e reposições patrimoniais.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-black text-xs rounded-2xl flex items-center gap-2 transition-all shadow-md"
          >
            <Wrench size={15} />
            <span>Lançar Reparo / Despesa</span>
          </button>

          <button
            onClick={() => setIsContributionModalOpen(true)}
            className="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-black text-xs rounded-2xl flex items-center gap-2 transition-all shadow-md"
          >
            <Plus size={15} />
            <span>Aporte Extra</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-4 py-2.5 bg-[#FFD600]/20 hover:bg-[#FFD600]/30 text-[#FFD600] border border-[#FFD600]/40 font-black text-xs rounded-2xl flex items-center gap-2 transition-all shadow-md"
            title="Configurar Percentual de Especulação"
          >
            <Sliders size={15} />
            <span>Ajustar % ({summary?.configured_percentage || 20}%)</span>
          </button>
        </div>
      </div>

      {/* Ideal Speculation Intelligence Card */}
      <div className="p-6 bg-gradient-to-br from-[#0F172A] via-[#0A0F2C] to-[#1E1B4B] border-2 border-amber-500/40 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-400">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide">
                  Especulação Automática & Meta Ideal Acumulada
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                  {summary?.configured_percentage || 20}% das Reservas
                </span>
              </div>
              <p className="text-xs text-white/50">
                Fórmula: [Volume Bruto de Reservas Feitas] × [{summary?.configured_percentage || 20}%] = Meta Ideal Especulada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-white/40 block">Índice de Cobertura da Meta</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                {summary?.speculated_coverage_percentage || 0}%
              </span>
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
            >
              <Sliders size={13} className="text-[#FFD600]" />
              <span>Alterar Regra</span>
            </button>
          </div>
        </div>

        {/* Speculation Metrics Formula Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-white/50 block">1. Volume em Reservas Feitas</span>
            <p className="text-xl font-black text-white font-mono">
              R$ {summary?.total_reservations_gross_volume?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
            <span className="text-[10px] text-white/40">{summary?.total_reservations_count || 0} reserva(s) registradas</span>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1 relative">
            <span className="text-[10px] font-black uppercase text-amber-300 block flex items-center justify-between">
              <span>2. Meta Ideal Especulada ({summary?.configured_percentage || 20}%)</span>
              <Shield size={13} className="text-amber-400" />
            </span>
            <p className="text-2xl font-black text-amber-300 font-mono">
              R$ {summary?.ideal_speculated_accumulated?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
            <span className="text-[10px] text-amber-200/60">Valor ideal a acumular no fundo</span>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-emerald-400 block">3. Saldo Real em Caixa</span>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              R$ {summary?.current_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
            <span className="text-[10px] text-emerald-300/60">Líquido após reparos e estornos</span>
          </div>

          <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-white/50 block">4. A Integralizar (Pendente)</span>
            <p className="text-xl font-black text-white/80 font-mono">
              R$ {summary?.pending_speculated_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
            <span className="text-[10px] text-white/40">Conforme parcelas forem recebidas</span>
          </div>
        </div>

        {/* Coverage Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Progresso de Acumulação em Relação ao Ideal ({summary?.configured_percentage || 20}% das Reservas):
            </span>
            <span className="font-mono font-black text-amber-400">
              R$ {summary?.current_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'} / R$ {summary?.ideal_speculated_accumulated?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'} ({summary?.speculated_coverage_percentage || 0}%)
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(3, summary?.speculated_coverage_percentage || 0))}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Saldo Atual */}
        <div className="p-5 bg-gradient-to-br from-amber-950/40 to-[#0A0F2C] border border-amber-500/40 rounded-3xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Saldo Real em Caixa</span>
            <Shield size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">
            R$ {summary?.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <div className="flex items-center justify-between text-[10px] text-amber-300/70">
            <span>Disponível imediatamente</span>
            <span className="font-bold">{summary?.configured_percentage || 20}% retidos</span>
          </div>
        </div>

        {/* Meta Ideal Calculada */}
        <div className="p-5 bg-blue-950/30 border border-blue-500/30 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Meta Ideal Especulada</span>
            <Sparkles size={18} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-300 font-mono">
            R$ {summary?.ideal_speculated_accumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-blue-200/60 block">{summary?.configured_percentage || 20}% do valor total de reservas</span>
        </div>

        {/* Total Acumulado Real */}
        <div className="p-5 bg-emerald-950/30 border border-emerald-500/20 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Aportado</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 font-mono">
            R$ {summary?.total_accumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-emerald-300/60 block">Aportes automáticos e manuais</span>
        </div>

        {/* Total Utilizado em Reparos */}
        <div className="p-5 bg-rose-950/30 border border-rose-500/20 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Utilizado em Reparos</span>
            <Wrench size={18} className="text-rose-400" />
          </div>
          <p className="text-xl font-black text-rose-400 font-mono">
            R$ {summary?.total_used.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <span className="text-[10px] text-rose-300/60 block">Manutenções e consertos</span>
        </div>

        {/* Reservas Contribuintes */}
        <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-black uppercase tracking-wider">Reservas Feitas</span>
            <FileText size={18} className="text-[#FFD600]" />
          </div>
          <p className="text-xl font-black text-white font-mono">
            {summary?.total_reservations_count || 0}
          </p>
          <span className="text-[10px] text-white/40 block">{summary?.contributing_reservations_count || 0} já com aportes retidos</span>
        </div>
      </div>

      {/* Breakdown per Chácara Card with Ideal Speculation vs Real */}
      <div className="p-6 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-[#FFD600]" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Especulação & Balanço Individual por Imóvel / Chácara
            </h3>
          </div>
          <span className="text-xs text-white/40">
            {summary?.contributions_by_chacara.length || 0} imóvel(is) analisados • Base {summary?.configured_percentage || 20}%
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-white/40 text-xs flex items-center justify-center gap-2">
            <Clock className="animate-spin text-[#FFD600]" size={18} />
            <span>Calculando especulação e saldo individual das chácaras...</span>
          </div>
        ) : !summary?.contributions_by_chacara.length ? (
          <div className="py-8 text-center text-white/40 text-xs">
            Nenhum lançamento vinculado a imóveis no período selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.contributions_by_chacara.map(ch => {
              const coveragePct = ch.coverage_percentage || 0;
              return (
                <div
                  key={ch.chacara_id}
                  className="p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-2xl space-y-3.5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">{ch.chacara_name}</h4>
                      <span className="text-[10px] text-white/40">{ch.reservations_count} reserva(s) • {ch.transactions_count} mov.</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                      Saldo R$ {ch.net_contribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Volume vs Ideal vs Real Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl space-y-0.5">
                      <span className="text-[9px] text-white/50 block font-bold uppercase">Volume Reservas</span>
                      <span className="font-black text-white text-[11px] font-mono">
                        R$ {ch.reservations_gross_volume?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-0.5">
                      <span className="text-[9px] text-amber-400 block font-bold uppercase">Ideal ({summary?.configured_percentage || 20}%)</span>
                      <span className="font-black text-amber-300 text-[11px] font-mono">
                        R$ {ch.ideal_speculated_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-0.5">
                      <span className="text-[9px] text-emerald-400 block font-bold uppercase">Real Retido</span>
                      <span className="font-black text-emerald-400 text-[11px] font-mono">
                        R$ {ch.total_allocated?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </span>
                    </div>
                  </div>

                  {ch.total_used > 0 && (
                    <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 font-mono">
                      <span>Despesas em Reparos Emergenciais:</span>
                      <span className="font-black">- R$ {ch.total_used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {/* Progress of Ideal Coverage */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-white/40 font-mono">
                      <span>Aderência à Meta Ideal:</span>
                      <span className="text-amber-300 font-bold">{coveragePct}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(5, coveragePct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#FFD600]" />
            <h3 className="text-xs font-black uppercase text-[#FFD600] tracking-wider">
              Filtros do Extrato da Reserva
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-bold text-[11px] rounded-xl border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <Download size={13} className="text-[#FFD600]" />
              <span>Exportar CSV</span>
            </button>

            {(selectedChacara !== 'TODAS' || selectedType !== 'TODOS' || startDate || endDate || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedChacara('TODAS');
                  setSelectedType('TODOS');
                  setStartDate('');
                  setEndDate('');
                  setSearchTerm('');
                }}
                className="text-[11px] text-[#FFD600] hover:underline font-bold"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Term */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Buscar Descrição / Código</label>
            <input
              type="text"
              placeholder="Ex: Bomba, RES-001, Piscina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            />
          </div>

          {/* Chácara Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Filtrar por Imóvel</label>
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

          {/* Transaction Type */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Tipo de Operação</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="APORTE_AUTOMATICO">Aporte Automático (20%)</option>
              <option value="APORTE_MANUAL">Aporte Extraordinário</option>
              <option value="RETIRADA_DESPESA">Reparo / Despesa</option>
              <option value="ESTORNO_REEMBOLSO">Estorno por Reembolso</option>
              <option value="AJUSTE_MANUAL">Ajuste Manual</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">De (Data)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">Até (Data)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="p-5 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-[#FFD600]" /> Extrato Completo de Entradas e Saídas
          </h3>
          <span className="text-xs text-white/40">{filteredTransactions.length} registro(s)</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/40 text-xs flex flex-col items-center justify-center space-y-2">
            <Clock className="animate-spin text-[#FFD600]" size={24} />
            <span>Carregando extrato contábil...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-xs">
            Nenhuma movimentação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Operação</th>
                  <th className="py-3 px-3">Imóvel / Chácara</th>
                  <th className="py-3 px-3">Descrição & Categoria</th>
                  <th className="py-3 px-3 text-right">Base Bruta</th>
                  <th className="py-3 px-3 text-right">Movimentação</th>
                  <th className="py-3 px-3 text-right">Saldo Reserva</th>
                  <th className="py-3 px-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map(tx => {
                  const badge = TRANSACTION_BADGES[tx.transaction_type] || {
                    label: tx.transaction_type,
                    bg: 'bg-white/10',
                    text: 'text-white',
                    icon: Info
                  };
                  const Icon = badge.icon;
                  const isPositive = Number(tx.amount) > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono text-white/60 text-[11px]">
                        {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                          <Icon size={11} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {tx.chacara_name || 'Geral'}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <p className="font-medium text-white truncate" title={tx.description}>{tx.description}</p>
                        {tx.notes && <p className="text-[10px] text-white/40 truncate">{tx.notes}</p>}
                      </td>
                      <td className="py-3 px-3 text-right text-white/50 font-mono">
                        {tx.gross_amount ? `R$ ${tx.gross_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className={`py-3 px-3 text-right font-black font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-300 font-mono">
                        R$ {tx.balance_after.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-white/60 text-[11px]">
                        {tx.performed_by || 'Sistema'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Lançar Reparo / Despesa */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0F2C] border border-rose-500/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Wrench size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Lançar Reparo Emergencial com Recursos da Reserva
                </h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 text-white/40 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                  Valor do Reparo / Manutenção (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ex: 450.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-rose-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                    Imóvel / Chácara Beneficiada
                  </label>
                  <select
                    value={expenseForm.chacara_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, chacara_id: e.target.value })}
                    className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-rose-500"
                  >
                    <option value="">Geral / Sem Chácara Específica</option>
                    {chacaras.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                    Categoria da Manutenção
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-rose-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                  Descrição do Problema & Serviço Executado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troca de válvula da bomba da piscina e cano de sucção"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                    Responsável pelo Lançamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Gerente"
                    value={expenseForm.performed_by}
                    onChange={(e) => setExpenseForm({ ...expenseForm, performed_by: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                    Nº Nota Fiscal / Recibo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: NF-e 4920"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-300 flex items-center gap-2">
                <Info size={14} className="shrink-0" />
                <span>O valor será debitado do saldo da Reserva de Emergência imediatamente.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 text-white/60 hover:text-white font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg transition-all"
                >
                  {savingAction ? 'Registrando...' : 'Confirmar Retirada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aporte Extraordinário */}
      {isContributionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0F2C] border border-blue-500/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Plus size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Registrar Aporte Extraordinário na Reserva
                </h3>
              </div>
              <button
                onClick={() => setIsContributionModalOpen(false)}
                className="p-1 text-white/40 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordContribution} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                  Valor do Aporte (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ex: 1000.00"
                  value={contributionForm.amount}
                  onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                  Vincular a um Imóvel Específico (Opcional)
                </label>
                <select
                  value={contributionForm.chacara_id}
                  onChange={(e) => setContributionForm({ ...contributionForm, chacara_id: e.target.value })}
                  className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Fundo Geral da Empresa</option>
                  {chacaras.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                  Motivo / Origem do Recurso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aporte inicial dos sócios para capital de giro emergencial"
                  value={contributionForm.description}
                  onChange={(e) => setContributionForm({ ...contributionForm, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sócio Administrador"
                    value={contributionForm.performed_by}
                    onChange={(e) => setContributionForm({ ...contributionForm, performed_by: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                    Observações Adicionais
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Transferência TED efetuada"
                    value={contributionForm.notes}
                    onChange={(e) => setContributionForm({ ...contributionForm, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsContributionModalOpen(false)}
                  className="px-4 py-2.5 text-white/60 hover:text-white font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl shadow-lg transition-all"
                >
                  {savingAction ? 'Creditando...' : 'Confirmar Aporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configurações de Percentual */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0F2C] border border-[#FFD600]/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#FFD600]">
                <Sliders size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Regra de Retenção Automática
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 text-white/40 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                  Percentual de Especulação / Retenção das Reservas (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    required
                    value={settingsPercentage}
                    onChange={(e) => setSettingsPercentage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FFD600] font-black text-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-white/40">%</span>
                </div>
              </div>

              {/* Real-time simulation */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-white/80 text-[11px]">
                <div className="flex items-center justify-between text-[#FFD600] font-bold">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>Simulação em Tempo Real com este %:</span>
                  </div>
                  <span className="font-mono">{Number(settingsPercentage || 0)}%</span>
                </div>
                
                <div className="space-y-1 text-white/70">
                  <div className="flex justify-between">
                    <span>Volume Total em Reservas:</span>
                    <span className="font-mono text-white font-bold">R$ {summary?.total_reservations_gross_volume?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>Nova Meta Ideal Especulada:</span>
                    <span className="font-mono">R$ {Math.round(((summary?.total_reservations_gross_volume || 0) * (Number(settingsPercentage || 0) / 100)) * 100 / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Saldo Atual em Caixa:</span>
                    <span className="font-mono">R$ {summary?.current_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                  </div>
                </div>

                <p className="text-[10px] text-white/50 pt-1 border-t border-white/10">
                  A cada novo pagamento de reserva confirmado, o sistema alocará automaticamente {settingsPercentage || 20}% para a Reserva de Emergência.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2.5 text-white/60 hover:text-white font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-5 py-2.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black rounded-xl shadow-lg transition-all"
                >
                  {savingAction ? 'Salvando...' : 'Salvar e Recalcular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
