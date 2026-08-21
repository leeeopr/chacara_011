'use client';

import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  CreditCard, 
  Users, 
  Repeat,
  DollarSign
} from 'lucide-react';
import { 
  AccountPayable, 
  getAccountEffectiveValue, 
  hasAccountRealValue, 
  formatBRL 
} from '@/lib/accountsPayableTypes';

interface AttentionCenterProps {
  overdueAccounts: AccountPayable[];
  dueSoonAccounts: AccountPayable[]; // next 7 days
  upcomingProviderAccounts: AccountPayable[];
  pendingRecurringAccounts: AccountPayable[];
  onPayAccount: (account: AccountPayable) => void;
  onViewAccount: (account: AccountPayable) => void;
  onSwitchTab?: (tab: string) => void;
}

export default function AttentionCenter({
  overdueAccounts,
  dueSoonAccounts,
  upcomingProviderAccounts,
  pendingRecurringAccounts,
  onPayAccount,
  onViewAccount,
  onSwitchTab
}: AttentionCenterProps) {
  const hasUrgentIssues = 
    overdueAccounts.length > 0 || 
    dueSoonAccounts.length > 0 || 
    upcomingProviderAccounts.length > 0;

  const totalOverdueAmount = overdueAccounts.reduce((acc, a) => acc + getAccountEffectiveValue(a), 0);
  const totalDueSoonAmount = dueSoonAccounts.reduce((acc, a) => acc + getAccountEffectiveValue(a), 0);

  if (!hasUrgentIssues) {
    return (
      <div className="bg-gradient-to-r from-emerald-950/30 via-[#0A0F2C] to-emerald-950/30 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-fadeIn">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2 justify-center sm:justify-start">
              <span>Tudo em Dia na Operação</span>
              <Sparkles size={16} className="text-emerald-400" />
            </h2>
            <p className="text-xs text-white/70">
              Nenhuma conta vencida ou prestador com pagamento atrasado neste período. Suas contas operacionais estão sob controle.
            </p>
          </div>
        </div>

        {pendingRecurringAccounts.length > 0 && onSwitchTab && (
          <button
            onClick={() => onSwitchTab('RECURRING')}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Repeat size={14} className="text-purple-400" />
            <span>Ver {pendingRecurringAccounts.length} Recorrências</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#140F2D] via-[#0A0F2C] to-[#140F2D] border border-amber-500/30 p-5 rounded-2xl shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-sm">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              Precisa da sua atenção agora
            </h2>
            <p className="text-xs text-white/60">
              Pendências prioritárias que requerem liquidação ou acompanhamento imediato
            </p>
          </div>
        </div>

        {/* Dynamic Attention Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {overdueAccounts.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              {overdueAccounts.length} {overdueAccounts.length === 1 ? 'conta vencida' : 'contas vencidas'} ({formatBRL(totalOverdueAmount)})
            </span>
          )}
          {dueSoonAccounts.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5">
              <Clock size={12} />
              {dueSoonAccounts.length} vencendo em 7 dias ({formatBRL(totalDueSoonAmount)})
            </span>
          )}
          {upcomingProviderAccounts.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5">
              <Users size={12} />
              {upcomingProviderAccounts.length} {upcomingProviderAccounts.length === 1 ? 'pagamento de equipe' : 'pagamentos de equipe'}
            </span>
          )}
        </div>
      </div>

      {/* Action Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Overdue Urgent Cards */}
        {overdueAccounts.slice(0, 3).map(acc => (
          <div 
            key={acc.id}
            className="bg-rose-950/30 border border-rose-500/40 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-md hover:border-rose-500/70 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/30 text-rose-200 border border-rose-500/40">
                  Vencida em {acc.data_vencimento ? new Date(acc.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data n/d'}
                </span>
                <span className="text-xs font-black text-rose-300 flex items-center gap-1 font-mono">
                  <span>{formatBRL(getAccountEffectiveValue(acc))}</span>
                  {hasAccountRealValue(acc) && (
                    <span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded uppercase">
                      Real
                    </span>
                  )}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white line-clamp-1">
                {acc.descricao}
              </h4>
              <p className="text-[11px] text-white/60 line-clamp-1">
                {acc.chacara_nome || 'Geral'} {acc.prestador_nome ? `• ${acc.prestador_nome}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-rose-500/20">
              <button
                onClick={() => onPayAccount(acc)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>Dar Baixa Agora</span>
              </button>
              <button
                onClick={() => onViewAccount(acc)}
                className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Ver
              </button>
            </div>
          </div>
        ))}

        {/* Due Soon Cards */}
        {dueSoonAccounts.slice(0, 3).map(acc => (
          <div 
            key={acc.id}
            className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-md hover:border-amber-500/60 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Vence {acc.data_vencimento ? new Date(acc.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Em breve'}
                </span>
                <span className="text-xs font-black text-amber-300 flex items-center gap-1 font-mono">
                  <span>{formatBRL(getAccountEffectiveValue(acc))}</span>
                  {hasAccountRealValue(acc) && (
                    <span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded uppercase">
                      Real
                    </span>
                  )}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white line-clamp-1">
                {acc.descricao}
              </h4>
              <p className="text-[11px] text-white/60 line-clamp-1">
                {acc.chacara_nome || 'Geral'} {acc.prestador_nome ? `• ${acc.prestador_nome}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
              <button
                onClick={() => onPayAccount(acc)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>Pagar</span>
              </button>
              <button
                onClick={() => onViewAccount(acc)}
                className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Ver
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
