'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Building2, 
  Repeat, 
  Tag, 
  UserCheck, 
  Copy, 
  Check, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  ArrowUpRight,
  TrendingDown,
  RotateCcw,
  Sparkles,
  Download,
  DollarSign,
  Zap,
  Sliders,
  TrendingUp,
  Users,
  LayoutDashboard,
  Receipt
} from 'lucide-react';
import { 
  AccountPayable, 
  AccountPayableStatus, 
  AccountPayableType, 
  AccountsPayableFilters, 
  AccountsPayableSummary, 
  ACCOUNT_PAYABLE_CATEGORIES,
  PeriodPreset,
  OperationalRevenueItem,
  getAccountEffectiveValue,
  hasAccountRealValue,
  formatBRL
} from '@/lib/accountsPayableTypes';
import { 
  getAccountsPayable, 
  getAccountsPayableSummary, 
  deleteAccountPayable, 
  reopenAccountPayable, 
  cancelAccountPayable 
} from '@/services/accountsPayableService';
import { getChacaras } from '@/services/chacarasService';
import { getCrewMembers } from '@/services/crewService';
import { getGlobalFinancialData } from '@/services/financialService';
import { Chacara, CrewMember } from '@/lib/chacaraTypes';

// Subcomponents
import CentralOverviewBanner from './CentralOverviewBanner';
import AttentionCenter from './AttentionCenter';
import QuickActionsBar from './QuickActionsBar';
import UrgencyAccountsSection from './UrgencyAccountsSection';
import MonthlyRevenuesSection from './MonthlyRevenuesSection';
import RecurringBillsSection from './RecurringBillsSection';
import ServiceProvidersSection from './ServiceProvidersSection';
import ProviderBillingRulesTab from './ProviderBillingRulesTab';

// Modals
import AccountPayableFormModal from './AccountPayableFormModal';
import AccountPayableDetailModal from './AccountPayableDetailModal';
import MarkAsPaidModal from './MarkAsPaidModal';
import ServicesAuditSyncModal from './ServicesAuditSyncModal';
import ConfirmActionModal from '../ConfirmActionModal';

type MainTab = 'CENTRAL' | 'ACCOUNTS' | 'RECURRING' | 'PROVIDERS' | 'REVENUES' | 'RULES';

export default function AccountsPayableManagement() {
  const [activeTab, setActiveTab] = useState<MainTab>('CENTRAL');
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [revenueItems, setRevenueItems] = useState<OperationalRevenueItem[]>([]);
  const [receitaRecebida, setReceitaRecebida] = useState<number>(0);
  const [receitaPrevista, setReceitaPrevista] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Period state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Chacara Filter State
  const [chacaraFilter, setChacaraFilter] = useState<string>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formDefaultType, setFormDefaultType] = useState<AccountPayableType>('AVULSA');
  const [formDefaultProviderNome, setFormDefaultProviderNome] = useState<string | undefined>(undefined);
  const [formDefaultProviderPix, setFormDefaultProviderPix] = useState<string | undefined>(undefined);
  const [formDefaultProviderRole, setFormDefaultProviderRole] = useState<string | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);

  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [payingAccount, setPayingAccount] = useState<AccountPayable | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountPayable | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Confirmation dialogs
  const [accountToDelete, setAccountToDelete] = useState<AccountPayable | null>(null);
  const [accountToCancel, setAccountToCancel] = useState<AccountPayable | null>(null);
  const [accountToReopen, setAccountToReopen] = useState<AccountPayable | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Calculate Start and End Date for current period filter
  const { startDate, endDate, periodLabel } = useMemo(() => {
    let start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    let end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

    if (periodPreset === 'LAST_MONTH') {
      start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
      end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
    } else if (periodPreset === 'NEXT_MONTH') {
      start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
      end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0);
    } else if (periodPreset === 'CUSTOM') {
      const s = customStartDate || new Date().toISOString().split('T')[0];
      const e = customEndDate || new Date().toISOString().split('T')[0];
      return {
        startDate: s,
        endDate: e,
        periodLabel: `${new Date(s + 'T00:00:00').toLocaleDateString('pt-BR')} - ${new Date(e + 'T00:00:00').toLocaleDateString('pt-BR')}`
      };
    }

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    const monthName = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return {
      startDate: sStr,
      endDate: eStr,
      periodLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    };
  }, [periodPreset, referenceDate, customStartDate, customEndDate]);

  // Stepper for Month Navigation
  const handleQuickNavigateMonth = (offset: number) => {
    setReferenceDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return next;
    });
    if (periodPreset !== 'THIS_MONTH' && periodPreset !== 'CUSTOM') {
      setPeriodPreset('THIS_MONTH');
    }
  };

  // Load all necessary real data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accList, chacs, crewList] = await Promise.all([
        getAccountsPayable(),
        getChacaras(),
        getCrewMembers({ activeOnly: true })
      ]);

      setAccounts(accList);
      setChacaras(chacs);
      setCrewMembers(crewList);

      // Load Real Financial Revenues from financialService
      try {
        const financialData = await getGlobalFinancialData({
          startDate: startDate,
          endDate: endDate,
          chacaraId: chacaraFilter !== 'ALL' && chacaraFilter !== 'GENERAL' ? chacaraFilter : undefined
        });

        setReceitaRecebida(financialData.receitaRecebida || 0);
        setReceitaPrevista(financialData.receitaPrevista || 0);

        // Map itemsList to OperationalRevenueItem
        const revItems: OperationalRevenueItem[] = (financialData.itemsList || []).map(item => {
          const res = item.reservation as any;
          const guestName = res.client?.full_name || res.client_name || res.guest_name || 'Hóspede Direto';
          const title = res.code || res.chacara?.name || 'Hospedagem';

          return {
            id: res.id,
            reservation_id: res.id,
            guest_name: guestName,
            descricao: `Reserva ${title}`,
            valor_total: item.summary.total_contracted + item.summary.total_expenses,
            valor_recebido: item.summary.total_received,
            valor_pendente: Math.max(0, item.summary.net_balance),
            data_referencia: res.checkin_date,
            data_checkout: res.checkout_date,
            chacara_id: res.chacara_id,
            chacara_nome: res.chacara?.name || 'Chácara Vinculada',
            origem: res.origin || 'Direto',
            status: item.summary.financial_status || 'EM_ABERTO',
            payments_count: item.summary.payments.length
          };
        });

        setRevenueItems(revItems);
      } catch (finErr) {
        console.warn('[AccountsPayableManagement] Aviso ao buscar receitas globais:', finErr);
      }

    } catch (e) {
      console.error('[AccountsPayableManagement] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, chacaraFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter accounts according to Chácara & Period
  const periodFilteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // Chácara filter
      if (chacaraFilter !== 'ALL') {
        if (chacaraFilter === 'GENERAL' && acc.chacara_id) return false;
        if (chacaraFilter !== 'GENERAL' && acc.chacara_id !== chacaraFilter) return false;
      }

      // Date period filter
      // Include if due date is within period OR if paid within period OR if overdue and still pending
      const due = acc.data_vencimento;
      const paidDate = acc.data_pagamento;

      const isDueInPeriod = due && due >= startDate && due <= endDate;
      const isPaidInPeriod = paidDate && paidDate >= startDate && paidDate <= endDate;
      const isOverduePending = (acc.status === 'PENDENTE' || acc.status === 'VENCIDA') && due && due < endDate;

      return isDueInPeriod || isPaidInPeriod || isOverduePending || acc.tipo === 'RECORRENTE';
    });
  }, [accounts, chacaraFilter, startDate, endDate]);

  // Computed Financial Metrics for Banner
  const metrics = useMemo(() => {
    let totalPago = 0;
    let totalPendente = 0;
    let totalVencido = 0;
    let totalPrestadoresPrevisto = 0;
    let totalPrestadoresPago = 0;

    let countPagas = 0;
    let countPendentes = 0;
    let countVencidas = 0;
    let countPrestadores = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    for (const acc of periodFilteredAccounts) {
      const val = getAccountEffectiveValue(acc);
      const isProvider = !!(acc.prestador_id || acc.prestador_nome || acc.origem_tipo === 'PRESTACAO_SERVICO' || acc.categoria.startsWith('EQUIPE_'));

      if (isProvider) {
        countPrestadores++;
        totalPrestadoresPrevisto += val;
      }

      if (acc.status === 'PAGA') {
        countPagas++;
        const paidVal = val;
        totalPago += paidVal;
        if (isProvider) {
          totalPrestadoresPago += paidVal;
        }
      } else if (acc.status !== 'CANCELADA') {
        countPendentes++;
        totalPendente += val;

        if (acc.status === 'VENCIDA' || (acc.data_vencimento && acc.data_vencimento < todayStr)) {
          countVencidas++;
          totalVencido += val;
        }
      }
    }

    return {
      totalPago,
      totalPendente,
      totalVencido,
      totalPrestadoresPrevisto,
      totalPrestadoresPago,
      countPagas,
      countPendentes,
      countVencidas,
      countPrestadores
    };
  }, [periodFilteredAccounts]);

  // Attention Center Data (Urgent accounts)
  const { overdueAccounts, dueSoonAccounts, upcomingProviderAccounts, pendingRecurringAccounts } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(`${todayStr}T00:00:00`);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const overdue: AccountPayable[] = [];
    const dueSoon: AccountPayable[] = [];
    const upcomingProviders: AccountPayable[] = [];
    const pendingRecurring: AccountPayable[] = [];

    for (const acc of periodFilteredAccounts) {
      if (acc.status === 'PAGA' || acc.status === 'CANCELADA') continue;

      const isOverdue = acc.status === 'VENCIDA' || (acc.data_vencimento && acc.data_vencimento < todayStr);
      const isDueNext7 = acc.data_vencimento && acc.data_vencimento >= todayStr && acc.data_vencimento <= in7DaysStr;
      const isProvider = !!(acc.prestador_id || acc.prestador_nome || acc.origem_tipo === 'PRESTACAO_SERVICO' || acc.categoria.startsWith('EQUIPE_'));

      if (isOverdue) {
        overdue.push(acc);
      } else if (isDueNext7) {
        dueSoon.push(acc);
      }

      if (isProvider && (isOverdue || isDueNext7)) {
        upcomingProviders.push(acc);
      }

      if (acc.tipo === 'RECORRENTE') {
        pendingRecurring.push(acc);
      }
    }

    return {
      overdueAccounts: overdue,
      dueSoonAccounts: dueSoon,
      upcomingProviderAccounts: upcomingProviders,
      pendingRecurringAccounts: pendingRecurring
    };
  }, [periodFilteredAccounts]);

  // Provider Accounts list
  const providerAccounts = useMemo(() => {
    return periodFilteredAccounts.filter(acc => 
      !!(acc.prestador_id || acc.prestador_nome || acc.origem_tipo === 'PRESTACAO_SERVICO' || acc.categoria.startsWith('EQUIPE_'))
    );
  }, [periodFilteredAccounts]);

  // Recurring Accounts list
  const recurringAccounts = useMemo(() => {
    return accounts.filter(acc => acc.tipo === 'RECORRENTE');
  }, [accounts]);

  // Action handlers
  const handleOpenNewAccount = (type: AccountPayableType = 'AVULSA') => {
    setEditingAccount(null);
    setFormDefaultType(type);
    setFormDefaultProviderNome(undefined);
    setFormDefaultProviderPix(undefined);
    setFormDefaultProviderRole(undefined);
    setIsFormModalOpen(true);
  };

  const handleOpenNewForProvider = (name: string, pix?: string, role?: string) => {
    setEditingAccount(null);
    setFormDefaultType('AVULSA');
    setFormDefaultProviderNome(name);
    setFormDefaultProviderPix(pix);
    setFormDefaultProviderRole(role);
    setIsFormModalOpen(true);
  };

  const handleEdit = (acc: AccountPayable) => {
    setEditingAccount(acc);
    setIsFormModalOpen(true);
  };

  const handleOpenMarkPaid = (acc: AccountPayable) => {
    setPayingAccount(acc);
    setIsPaidModalOpen(true);
  };

  const handleViewDetail = (acc: AccountPayable) => {
    setDetailAccount(acc);
    setIsDetailModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      setActionLoading(true);
      await deleteAccountPayable(accountToDelete.id);
      setAccountToDelete(null);
      await loadData();
    } catch (e) {
      console.error('Erro ao excluir conta:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!accountToReopen) return;
    try {
      setActionLoading(true);
      await reopenAccountPayable(accountToReopen.id);
      setAccountToReopen(null);
      await loadData();
    } catch (e) {
      console.error('Erro ao reabrir conta:', e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-[#0A0F2C] to-[#0A0F2C] p-6 rounded-2xl border border-purple-500/20 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.25)] shrink-0">
            <Wallet size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Central Financeira Operacional
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              Controle de receitas, despesas fixas, pagamentos de equipe, diárias e fornecedores
            </p>
          </div>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenNewAccount('AVULSA')}
            className="px-4 py-2.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] font-black text-sm hover:bg-[#FFD600]/90 transition-all shadow-[0_0_20px_rgba(255,214,0,0.25)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            <span>+ Nova Conta a Pagar</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('CENTRAL')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'CENTRAL'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <LayoutDashboard size={16} />
          <span>Central Geral</span>
        </button>

        <button
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'ACCOUNTS'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Receipt size={16} />
          <span>O que Pagar ({metrics.countPendentes})</span>
        </button>

        <button
          onClick={() => setActiveTab('RECURRING')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'RECURRING'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Repeat size={16} />
          <span>Contas Recorrentes ({recurringAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PROVIDERS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'PROVIDERS'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users size={16} />
          <span>Prestadores de Serviço</span>
        </button>

        <button
          onClick={() => setActiveTab('REVENUES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'REVENUES'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <TrendingUp size={16} className="text-emerald-400" />
          <span>Receitas do Mês</span>
        </button>

        <button
          onClick={() => setActiveTab('RULES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'RULES'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Sliders size={16} className="text-cyan-400" />
          <span>Regras de Cobrança</span>
        </button>
      </div>

      {/* Global Period & Financial Overview KPI Banner */}
      {activeTab !== 'RULES' && (
        <CentralOverviewBanner
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          periodLabel={periodLabel}
          chacaraFilter={chacaraFilter}
          setChacaraFilter={setChacaraFilter}
          chacaras={chacaras}
          receitaRecebida={receitaRecebida}
          receitaPrevista={receitaPrevista}
          totalPago={metrics.totalPago}
          totalPendente={metrics.totalPendente}
          totalVencido={metrics.totalVencido}
          totalPrestadoresPrevisto={metrics.totalPrestadoresPrevisto}
          totalPrestadoresPago={metrics.totalPrestadoresPago}
          countPagas={metrics.countPagas}
          countPendentes={metrics.countPendentes}
          countVencidas={metrics.countVencidas}
          countPrestadores={metrics.countPrestadores}
          onQuickNavigateMonth={handleQuickNavigateMonth}
        />
      )}

      {/* TAB 1: CENTRAL GERAL (Executive Dashboard View) */}
      {activeTab === 'CENTRAL' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Attention Center */}
          <AttentionCenter
            overdueAccounts={overdueAccounts}
            dueSoonAccounts={dueSoonAccounts}
            upcomingProviderAccounts={upcomingProviderAccounts}
            pendingRecurringAccounts={pendingRecurringAccounts}
            onPayAccount={handleOpenMarkPaid}
            onViewAccount={handleViewDetail}
            onSwitchTab={(t) => setActiveTab(t as MainTab)}
          />

          {/* Quick Actions Bar */}
          <QuickActionsBar
            onOpenNewAccount={() => handleOpenNewAccount('AVULSA')}
            onOpenNewRecurring={() => handleOpenNewAccount('RECORRENTE')}
            onOpenQuickPay={() => {
              if (overdueAccounts[0]) handleOpenMarkPaid(overdueAccounts[0]);
              else if (dueSoonAccounts[0]) handleOpenMarkPaid(dueSoonAccounts[0]);
              else if (periodFilteredAccounts[0]) handleOpenMarkPaid(periodFilteredAccounts[0]);
            }}
            onViewRevenues={() => setActiveTab('REVENUES')}
            onViewProviders={() => setActiveTab('PROVIDERS')}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
            onRefresh={loadData}
            loading={loading}
          />

          {/* O que preciso pagar (Urgency Sections) */}
          <UrgencyAccountsSection
            accounts={periodFilteredAccounts}
            onOpenNewAccount={() => handleOpenNewAccount('AVULSA')}
            onPayAccount={handleOpenMarkPaid}
            onEditAccount={handleEdit}
            onDeleteAccount={(acc) => setAccountToDelete(acc)}
            onCancelAccount={(acc) => setAccountToCancel(acc)}
            onReopenAccount={(acc) => setAccountToReopen(acc)}
            onViewAccountDetail={handleViewDetail}
          />

          {/* Section: Receitas deste Mês */}
          <MonthlyRevenuesSection
            revenues={revenueItems}
            totalRecebido={receitaRecebida}
            totalPrevisto={receitaPrevista}
            periodLabel={periodLabel}
            loading={loading}
            onRefresh={loadData}
          />

          {/* Section: Prestadores de Serviço */}
          <ServiceProvidersSection
            providerAccounts={providerAccounts}
            crewMembers={crewMembers}
            onPayAccount={handleOpenMarkPaid}
            onOpenNewAccountForProvider={handleOpenNewForProvider}
            onManageBillingRules={() => setActiveTab('RULES')}
            onViewAccountDetail={handleViewDetail}
          />

          {/* Section: Contas Recorrentes da Casa */}
          <RecurringBillsSection
            recurringAccounts={recurringAccounts}
            onOpenNewRecurring={() => handleOpenNewAccount('RECORRENTE')}
            onEditAccount={handleEdit}
            onPayAccount={handleOpenMarkPaid}
            onDeleteAccount={(acc) => setAccountToDelete(acc)}
          />
        </div>
      )}

      {/* TAB 2: O QUE PAGAR & TODAS AS CONTAS */}
      {activeTab === 'ACCOUNTS' && (
        <div className="animate-fadeIn">
          <UrgencyAccountsSection
            accounts={periodFilteredAccounts}
            onOpenNewAccount={() => handleOpenNewAccount('AVULSA')}
            onPayAccount={handleOpenMarkPaid}
            onEditAccount={handleEdit}
            onDeleteAccount={(acc) => setAccountToDelete(acc)}
            onCancelAccount={(acc) => setAccountToCancel(acc)}
            onReopenAccount={(acc) => setAccountToReopen(acc)}
            onViewAccountDetail={handleViewDetail}
          />
        </div>
      )}

      {/* TAB 3: CONTAS RECORRENTES */}
      {activeTab === 'RECURRING' && (
        <div className="animate-fadeIn">
          <RecurringBillsSection
            recurringAccounts={recurringAccounts}
            onOpenNewRecurring={() => handleOpenNewAccount('RECORRENTE')}
            onEditAccount={handleEdit}
            onPayAccount={handleOpenMarkPaid}
            onDeleteAccount={(acc) => setAccountToDelete(acc)}
          />
        </div>
      )}

      {/* TAB 4: PRESTADORES DE SERVIÇO */}
      {activeTab === 'PROVIDERS' && (
        <div className="animate-fadeIn">
          <ServiceProvidersSection
            providerAccounts={providerAccounts}
            crewMembers={crewMembers}
            onPayAccount={handleOpenMarkPaid}
            onOpenNewAccountForProvider={handleOpenNewForProvider}
            onManageBillingRules={() => setActiveTab('RULES')}
            onViewAccountDetail={handleViewDetail}
          />
        </div>
      )}

      {/* TAB 5: RECEITAS DO MÊS */}
      {activeTab === 'REVENUES' && (
        <div className="animate-fadeIn">
          <MonthlyRevenuesSection
            revenues={revenueItems}
            totalRecebido={receitaRecebida}
            totalPrevisto={receitaPrevista}
            periodLabel={periodLabel}
            loading={loading}
            onRefresh={loadData}
          />
        </div>
      )}

      {/* TAB 6: REGRAS DE COBRANÇA AUTOMÁTICA */}
      {activeTab === 'RULES' && (
        <div className="animate-fadeIn">
          <ProviderBillingRulesTab />
        </div>
      )}

      {/* MODALS */}
      {/* 1. Form Modal (New / Edit) */}
      <AccountPayableFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={() => {
          setIsFormModalOpen(false);
          setEditingAccount(null);
          loadData();
        }}
        accountToEdit={editingAccount}
        defaultType={formDefaultType}
        defaultPrestadorNome={formDefaultProviderNome}
        defaultPrestadorPix={formDefaultProviderPix}
        defaultPrestadorRole={formDefaultProviderRole}
        defaultChacaraId={chacaraFilter !== 'ALL' && chacaraFilter !== 'GENERAL' ? chacaraFilter : undefined}
      />

      {/* 2. Mark As Paid Modal */}
      <MarkAsPaidModal
        isOpen={isPaidModalOpen}
        account={payingAccount}
        onClose={() => {
          setIsPaidModalOpen(false);
          setPayingAccount(null);
        }}
        onSuccess={() => {
          setIsPaidModalOpen(false);
          setPayingAccount(null);
          loadData();
        }}
      />

      {/* 3. Detail View Modal */}
      <AccountPayableDetailModal
        isOpen={isDetailModalOpen}
        account={detailAccount}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailAccount(null);
        }}
        onPay={(acc) => {
          setIsDetailModalOpen(false);
          handleOpenMarkPaid(acc);
        }}
        onEdit={(acc) => {
          setIsDetailModalOpen(false);
          handleEdit(acc);
        }}
        onUpdate={() => {
          setIsDetailModalOpen(false);
          loadData();
        }}
        onDelete={() => {
          setIsDetailModalOpen(false);
          loadData();
        }}
      />

      {/* 4. Services Audit & Sync Modal */}
      <ServicesAuditSyncModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onAccountsCreated={loadData}
      />

      {/* 5. Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={!!accountToDelete}
        title="Excluir Conta a Pagar"
        message={`Tem certeza de que deseja excluir permanentemente "${accountToDelete?.descricao}" no valor de ${Number(accountToDelete?.valor_previsto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Permanentemente"
        cancelText="Cancelar"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setAccountToDelete(null)}
      />

      {/* 6. Reopen Confirmation Modal */}
      <ConfirmActionModal
        isOpen={!!accountToReopen}
        title="Reabrir Conta a Pagar"
        message={`Deseja estornar a baixa e reabrir a conta "${accountToReopen?.descricao}"? O status voltará para PENDENTE e o valor pago será desfeito.`}
        confirmText="Sim, Reabrir Conta"
        cancelText="Voltar"
        variant="info"
        loading={actionLoading}
        onConfirm={handleConfirmReopen}
        onClose={() => setAccountToReopen(null)}
      />
    </div>
  );
}
