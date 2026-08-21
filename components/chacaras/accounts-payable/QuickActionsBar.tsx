'use client';

import React from 'react';
import { 
  Plus, 
  Repeat, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Zap, 
  RefreshCw,
  Sliders,
  Wallet
} from 'lucide-react';

interface QuickActionsBarProps {
  onOpenNewAccount: () => void;
  onOpenNewRecurring: () => void;
  onOpenQuickPay: () => void;
  onViewRevenues: () => void;
  onViewProviders: () => void;
  onOpenAuditModal: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function QuickActionsBar({
  onOpenNewAccount,
  onOpenNewRecurring,
  onOpenQuickPay,
  onViewRevenues,
  onViewProviders,
  onOpenAuditModal,
  onRefresh,
  loading
}: QuickActionsBarProps) {
  return (
    <div className="bg-[#0E1538]/90 border border-white/10 p-3.5 sm:p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3">
      {/* Primary Actions Group */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onOpenNewAccount}
          className="px-4 py-2.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] font-black text-xs sm:text-sm hover:bg-[#FFD600]/90 transition-all shadow-[0_0_20px_rgba(255,214,0,0.25)] flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          <span>+ Nova Conta</span>
        </button>

        <button
          onClick={onOpenNewRecurring}
          className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Repeat size={16} />
          <span>+ Conta Recorrente</span>
        </button>

        <button
          onClick={onOpenQuickPay}
          className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <CheckCircle2 size={16} />
          <span>Dar Baixa / Pagar</span>
        </button>
      </div>

      {/* Navigation & Management Shortcuts */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onViewRevenues}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <TrendingUp size={14} className="text-emerald-400" />
          <span>Ver Receitas</span>
        </button>

        <button
          onClick={onViewProviders}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Users size={14} className="text-purple-400" />
          <span>Ver Prestadores</span>
        </button>

        <button
          onClick={onOpenAuditModal}
          className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Auditar serviços operacionais e sincronizar contas"
        >
          <Zap size={14} />
          <span className="hidden md:inline">Auditar Serviços</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
          title="Recarregar Dados"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-purple-400' : ''} />
        </button>
      </div>
    </div>
  );
}
