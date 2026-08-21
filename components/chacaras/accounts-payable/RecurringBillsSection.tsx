'use client';

import React, { useState } from 'react';
import { 
  Repeat, 
  Plus, 
  Zap, 
  Droplet, 
  Wifi, 
  Flame, 
  ShieldCheck, 
  Landmark, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  AccountPayable, 
  ACCOUNT_PAYABLE_CATEGORIES,
  getAccountEffectiveValue,
  hasAccountRealValue,
  formatBRL
} from '@/lib/accountsPayableTypes';

interface RecurringBillsSectionProps {
  recurringAccounts: AccountPayable[];
  onOpenNewRecurring: () => void;
  onEditAccount: (account: AccountPayable) => void;
  onPayAccount: (account: AccountPayable) => void;
  onDeleteAccount: (account: AccountPayable) => void;
}

export default function RecurringBillsSection({
  recurringAccounts,
  onOpenNewRecurring,
  onEditAccount,
  onPayAccount,
  onDeleteAccount
}: RecurringBillsSectionProps) {
  const [search, setSearch] = useState('');

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'ENERGIA':
        return <Zap size={18} className="text-amber-400" />;
      case 'AGUA':
        return <Droplet size={18} className="text-blue-400" />;
      case 'INTERNET':
        return <Wifi size={18} className="text-cyan-400" />;
      case 'GAS':
        return <Flame size={18} className="text-orange-400" />;
      case 'SEGURO':
        return <ShieldCheck size={18} className="text-emerald-400" />;
      case 'IMPOSTO':
        return <Landmark size={18} className="text-purple-400" />;
      default:
        return <Repeat size={18} className="text-purple-400" />;
    }
  };

  const filtered = recurringAccounts.filter(acc => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const d = (acc.descricao || '').toLowerCase();
    const c = (acc.chacara_nome || '').toLowerCase();
    const cat = (acc.categoria || '').toLowerCase();
    return d.includes(q) || c.includes(q) || cat.includes(q);
  });

  const totalRecorrenteMensal = recurringAccounts.reduce((s, a) => s + getAccountEffectiveValue(a), 0);

  return (
    <div className="space-y-4 bg-[#0E1538]/90 border border-white/10 p-5 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
            <Repeat size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Contas Recorrentes da Casa</span>
              <Sparkles size={16} className="text-purple-400" />
            </h3>
            <p className="text-xs text-white/60">
              Despesas fixas contínuas (energia, água, internet, gás, seguros e impostos)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-purple-950/40 border border-purple-500/30 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">
              Total Fixo Estimado
            </span>
            <span className="text-base sm:text-lg font-black text-white">
              {formatBRL(totalRecorrenteMensal)}
            </span>
          </div>

          <button
            onClick={onOpenNewRecurring}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>+ Adicionar Conta Recorrente</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
          <input
            type="text"
            placeholder="Buscar despesa recorrente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
          />
        </div>

        <span className="text-xs font-semibold text-white/50">
          {filtered.length} {filtered.length === 1 ? 'conta recorrente configurada' : 'contas recorrentes configuradas'}
        </span>
      </div>

      {/* Grid of Recurring Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(acc => {
            const isPaid = acc.status === 'PAGA';
            const isOverdue = acc.status === 'VENCIDA';

            return (
              <div
                key={acc.id}
                className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-purple-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 shadow-md group"
              >
                <div className="space-y-2">
                  {/* Category icon and title */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                        {getCategoryIcon(acc.categoria)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors line-clamp-1">
                          {acc.descricao}
                        </h4>
                        <p className="text-xs text-white/60 flex items-center gap-1">
                          <Building2 size={12} className="text-purple-400" />
                          <span>{acc.chacara_nome || 'Geral / Compartilhada'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {(() => {
                        const effective = getAccountEffectiveValue(acc);
                        const hasReal = hasAccountRealValue(acc);
                        const pVal = Number(acc.valor_previsto || 0);

                        return (
                          <div>
                            <div className="text-sm sm:text-base font-black text-white font-mono flex items-center justify-end gap-1">
                              <span>{formatBRL(effective)}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                hasReal 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                  : 'bg-white/10 text-white/50'
                              }`}>
                                {hasReal ? 'Real' : 'Previsto'}
                              </span>
                            </div>
                            {hasReal && Math.abs(effective - pVal) > 0.01 && (
                              <div className="text-[10px] text-white/40 font-mono">
                                Base: {formatBRL(pVal)}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Flow breakdown: Conta -> Chácara -> Valor -> Recorrência -> Próximo vencimento -> Status */}
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-white/70">
                      <span className="text-[11px] text-white/40">Frequência:</span>
                      <span className="font-semibold text-purple-300">
                        {acc.recorrencia_frequencia || 'MENSAL'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-white/70">
                      <span className="text-[11px] text-white/40">Vencimento:</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Calendar size={12} className="text-purple-400" />
                        {acc.recorrencia_dia_vencimento ? `Todo dia ${acc.recorrencia_dia_vencimento}` : (acc.data_vencimento ? new Date(acc.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Mensal')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-white/70">
                      <span className="text-[11px] text-white/40">Status no Mês:</span>
                      {isPaid ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Pago
                        </span>
                      ) : isOverdue ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle size={11} /> Vencida
                        </span>
                      ) : (
                        <span className="text-amber-300 font-bold flex items-center gap-1">
                          <Clock size={11} /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditAccount(acc)}
                      className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      title="Editar Configuração Recorrente"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteAccount(acc)}
                      className="p-1.5 text-white/40 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir Recorrência"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!isPaid && (
                    <button
                      onClick={() => onPayAccount(acc)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 size={13} />
                      <span>Dar Baixa no Mês</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
          <Repeat size={28} className="text-white/20 mx-auto" />
          <h4 className="text-sm font-bold text-white">Nenhuma conta recorrente cadastrada</h4>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            Cadastre contas fixas como energia, água, internet e gás para acompanhar o custo operacional fixo de cada chácara.
          </p>
          <button
            onClick={onOpenNewRecurring}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            + Cadastrar Conta Recorrente
          </button>
        </div>
      )}
    </div>
  );
}
