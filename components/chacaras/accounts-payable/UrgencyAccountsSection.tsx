'use client';

import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Search, 
  Filter, 
  Building2, 
  UserCheck, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Repeat, 
  ArrowUpRight, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Eye,
  RotateCcw
} from 'lucide-react';
import { 
  AccountPayable, 
  AccountPayableStatus, 
  AccountPayableType, 
  ACCOUNT_PAYABLE_CATEGORIES,
  getAccountEffectiveValue,
  hasAccountRealValue,
  formatBRL
} from '@/lib/accountsPayableTypes';

interface UrgencyAccountsSectionProps {
  accounts: AccountPayable[];
  onOpenNewAccount: () => void;
  onPayAccount: (account: AccountPayable) => void;
  onEditAccount: (account: AccountPayable) => void;
  onDeleteAccount: (account: AccountPayable) => void;
  onCancelAccount: (account: AccountPayable) => void;
  onReopenAccount: (account: AccountPayable) => void;
  onViewAccountDetail: (account: AccountPayable) => void;
}

export default function UrgencyAccountsSection({
  accounts,
  onOpenNewAccount,
  onPayAccount,
  onEditAccount,
  onDeleteAccount,
  onCancelAccount,
  onReopenAccount,
  onViewAccountDetail
}: UrgencyAccountsSectionProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<AccountPayableType | 'ALL'>('ALL');
  const [showPaidSection, setShowPaidSection] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatBRL = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCopyPix = (id: string, pix: string) => {
    navigator.clipboard.writeText(pix);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter accounts according to search, category, type
  const filtered = useMemo(() => {
    return accounts.filter(acc => {
      if (selectedCategory !== 'ALL' && acc.categoria !== selectedCategory) return false;
      if (selectedType !== 'ALL' && acc.tipo !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const d = (acc.descricao || '').toLowerCase();
        const o = (acc.observacao || '').toLowerCase();
        const p = (acc.prestador_nome || '').toLowerCase();
        const c = (acc.chacara_nome || '').toLowerCase();
        if (!d.includes(q) && !o.includes(q) && !p.includes(q) && !c.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [accounts, selectedCategory, selectedType, search]);

  // Group accounts by urgency
  const { overdue, dueSoon, upcoming, paid, cancelled } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(`${todayStr}T00:00:00`);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const overdueList: AccountPayable[] = [];
    const dueSoonList: AccountPayable[] = [];
    const upcomingList: AccountPayable[] = [];
    const paidList: AccountPayable[] = [];
    const cancelledList: AccountPayable[] = [];

    for (const acc of filtered) {
      if (acc.status === 'PAGA') {
        paidList.push(acc);
      } else if (acc.status === 'CANCELADA') {
        cancelledList.push(acc);
      } else if (acc.status === 'VENCIDA' || (acc.data_vencimento && acc.data_vencimento < todayStr)) {
        overdueList.push(acc);
      } else if (acc.data_vencimento && acc.data_vencimento <= in7DaysStr) {
        dueSoonList.push(acc);
      } else {
        upcomingList.push(acc);
      }
    }

    // Sort overdue by date ascending (oldest first)
    overdueList.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    // Sort due soon by date ascending
    dueSoonList.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    // Sort upcoming by date ascending
    upcomingList.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    // Sort paid by payment date or due date descending (most recent first)
    paidList.sort((a, b) => (b.data_pagamento || b.data_vencimento).localeCompare(a.data_pagamento || a.data_vencimento));

    return {
      overdue: overdueList,
      dueSoon: dueSoonList,
      upcoming: upcomingList,
      paid: paidList,
      cancelled: cancelledList
    };
  }, [filtered]);

  const getCategoryLabel = (cat: string) => {
    const found = ACCOUNT_PAYABLE_CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const renderAccountCard = (acc: AccountPayable, urgencyVariant: 'overdue' | 'dueSoon' | 'upcoming' | 'paid') => {
    const isPaid = acc.status === 'PAGA';
    const isOverdue = urgencyVariant === 'overdue';
    const isDueSoon = urgencyVariant === 'dueSoon';

    const cardBorderColor = 
      isOverdue ? 'border-rose-500/40 bg-rose-950/20 hover:border-rose-500/70' :
      isDueSoon ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/70' :
      isPaid ? 'border-emerald-500/30 bg-[#0E1538]/70 hover:border-emerald-500/50' :
      'border-white/10 bg-[#0E1538]/90 hover:border-purple-500/40';

    return (
      <div 
        key={acc.id}
        className={`p-4 rounded-2xl border transition-all shadow-md flex flex-col justify-between gap-3 ${cardBorderColor}`}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80">
                {getCategoryLabel(acc.categoria).split(' ')[0]} {acc.categoria}
              </span>

              {acc.tipo === 'RECORRENTE' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Repeat size={10} />
                  <span>Recorrente</span>
                </span>
              )}

              {acc.origem_tipo === 'PRESTACAO_SERVICO' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ⚡ Serviço Operacional
                </span>
              )}
            </div>

            <h4 
              onClick={() => onViewAccountDetail(acc)}
              className="text-sm font-bold text-white tracking-tight hover:text-purple-300 transition-colors cursor-pointer line-clamp-2"
              title={acc.descricao}
            >
              {acc.descricao}
            </h4>

            <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 size={13} className="text-purple-400" />
                <span>{acc.chacara_nome || 'Geral / Compartilhada'}</span>
              </span>

              {acc.prestador_nome && (
                <span className="flex items-center gap-1 text-purple-300">
                  <UserCheck size={13} />
                  <span>{acc.prestador_nome}</span>
                </span>
              )}
            </div>
          </div>

          {/* Value & Due Date */}
          <div className="text-right shrink-0">
            {(() => {
              const effectiveValue = getAccountEffectiveValue(acc);
              const hasReal = hasAccountRealValue(acc);
              const pVal = Number(acc.valor_previsto || 0);

              return (
                <div>
                  <div className="text-base sm:text-lg font-black text-white font-mono flex items-center justify-end gap-1.5">
                    <span>{formatBRL(effectiveValue)}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-tight ${
                      hasReal 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-white/10 text-white/60'
                    }`}>
                      {hasReal ? 'Real' : 'Previsto'}
                    </span>
                  </div>
                  {hasReal && Math.abs(effectiveValue - pVal) > 0.01 && (
                    <div className="text-[10px] text-white/40 font-mono">
                      Prev: {formatBRL(pVal)}
                    </div>
                  )}
                </div>
              );
            })()}
            
            <div className="flex items-center justify-end gap-1 text-xs font-semibold mt-0.5">
              {isOverdue && (
                <span className="text-rose-400 flex items-center gap-1 font-bold">
                  <AlertTriangle size={12} />
                  Venceu {new Date(acc.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
              {isDueSoon && (
                <span className="text-amber-400 flex items-center gap-1 font-bold">
                  <Clock size={12} />
                  Vence {new Date(acc.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
              {!isOverdue && !isDueSoon && !isPaid && (
                <span className="text-white/60 flex items-center gap-1">
                  <Calendar size={12} />
                  {acc.data_vencimento ? new Date(acc.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data n/d'}
                </span>
              )}
              {isPaid && (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 size={12} />
                  Pago {acc.data_pagamento ? new Date(acc.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sim'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* PIX Key and Action Buttons Bar */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 flex-wrap">
          {/* Quick PIX Copy */}
          {acc.prestador_pix ? (
            <button
              onClick={() => handleCopyPix(acc.id, acc.prestador_pix!)}
              className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar Chave PIX"
            >
              {copiedId === acc.id ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-300 font-bold">PIX Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>PIX: {acc.prestador_pix.length > 18 ? acc.prestador_pix.slice(0, 15) + '...' : acc.prestador_pix}</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] text-white/40 italic">
              {acc.observacao ? (acc.observacao.length > 25 ? acc.observacao.slice(0, 22) + '...' : acc.observacao) : 'Sem PIX informado'}
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            {!isPaid && acc.status !== 'CANCELADA' && (
              <button
                onClick={() => onPayAccount(acc)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer active:scale-95"
              >
                <CheckCircle2 size={14} />
                <span>Dar Baixa</span>
              </button>
            )}

            {isPaid && (
              <button
                onClick={() => onReopenAccount(acc)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Reabrir Conta"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Reabrir</span>
              </button>
            )}

            <button
              onClick={() => onViewAccountDetail(acc)}
              className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Ver Detalhes"
            >
              <Eye size={15} />
            </button>

            <button
              onClick={() => onEditAccount(acc)}
              className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Editar Conta"
            >
              <Edit3 size={15} />
            </button>

            <button
              onClick={() => onDeleteAccount(acc)}
              className="p-1.5 text-white/40 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Excluir Conta"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E1538]/90 border border-white/10 p-4 rounded-2xl shadow-lg">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            O que preciso pagar
          </h3>
          <p className="text-xs text-white/60">
            Contas organizadas por nível de urgência e prazo de vencimento
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
            <input
              type="text"
              placeholder="Buscar conta, prestador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filtrar por Categoria"
            className="bg-black/40 border border-white/10 text-xs font-semibold text-white px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="ALL">Todas as Categorias</option>
            {ACCOUNT_PAYABLE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            aria-label="Filtrar por Tipo de Conta"
            className="bg-black/40 border border-white/10 text-xs font-semibold text-white px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="ALL">Avulsas & Recorrentes</option>
            <option value="AVULSA">Somente Avulsas</option>
            <option value="RECORRENTE">Somente Recorrentes</option>
          </select>
        </div>
      </div>

      {/* Urgency Section 1: 🔴 VENCIDAS */}
      {overdue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-rose-500/30 pb-2">
            <h4 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>🔴 Vencidas ({overdue.length})</span>
            </h4>
            <span className="text-xs font-black text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
              Total: {formatBRL(overdue.reduce((s, a) => s + getAccountEffectiveValue(a), 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdue.map(acc => renderAccountCard(acc, 'overdue'))}
          </div>
        </div>
      )}

      {/* Urgency Section 2: 🟡 VENCENDO EM BREVE */}
      {dueSoon.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 pb-2">
            <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <span>🟡 Vencendo nos Próximos 7 Dias ({dueSoon.length})</span>
            </h4>
            <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Total: {formatBRL(dueSoon.reduce((s, a) => s + getAccountEffectiveValue(a), 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueSoon.map(acc => renderAccountCard(acc, 'dueSoon'))}
          </div>
        </div>
      )}

      {/* Urgency Section 3: ⚪ PRÓXIMAS CONTAS */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <h4 className="text-sm font-black text-white/80 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-purple-400" />
              <span>⚪ Próximos Vencimentos ({upcoming.length})</span>
            </h4>
            <span className="text-xs font-black text-white/70 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
              Total: {formatBRL(upcoming.reduce((s, a) => s + getAccountEffectiveValue(a), 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map(acc => renderAccountCard(acc, 'upcoming'))}
          </div>
        </div>
      )}

      {/* Empty State when no pending bills exist */}
      {overdue.length === 0 && dueSoon.length === 0 && upcoming.length === 0 && (
        <div className="p-8 text-center bg-[#0E1538]/60 border border-white/10 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="text-base font-bold text-white">Nenhuma conta pendente para este período</h4>
          <p className="text-xs text-white/60 max-w-md mx-auto">
            Todas as despesas previstas para os filtros selecionados estão quitadas ou não existem lançamentos pendentes.
          </p>
          <button
            onClick={onOpenNewAccount}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            + Cadastrar Nova Conta
          </button>
        </div>
      )}

      {/* Urgency Section 4: 🟢 CONTAS PAGAS NO PERÍODO (Collapsible) */}
      {paid.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <button
            onClick={() => setShowPaidSection(!showPaidSection)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🟢 Contas Já Pagas no Período ({paid.length})</span>
                </h4>
                <p className="text-xs text-white/50">
                  Total liquidado: {formatBRL(paid.reduce((s, a) => s + getAccountEffectiveValue(a), 0))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-white/60">
              <span>{showPaidSection ? 'Ocultar' : 'Visualizar'}</span>
              {showPaidSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showPaidSection && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fadeIn">
              {paid.map(acc => renderAccountCard(acc, 'paid'))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
