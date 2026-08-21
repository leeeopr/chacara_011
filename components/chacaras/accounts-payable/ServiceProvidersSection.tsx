'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Sliders, 
  Search, 
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { 
  AccountPayable, 
  getAccountEffectiveValue, 
  hasAccountRealValue, 
  formatBRL 
} from '@/lib/accountsPayableTypes';
import { CrewMember } from '@/lib/chacaraTypes';

interface ServiceProvidersSectionProps {
  providerAccounts: AccountPayable[];
  crewMembers: CrewMember[];
  onPayAccount: (account: AccountPayable) => void;
  onOpenNewAccountForProvider: (providerName: string, pix?: string, role?: string) => void;
  onManageBillingRules: () => void;
  onViewAccountDetail: (account: AccountPayable) => void;
}

interface ProviderSummaryGroup {
  name: string;
  role?: string;
  pix?: string;
  accounts: AccountPayable[];
  totalPrevisto: number;
  totalPago: number;
  totalPendente: number;
  nextAccount?: AccountPayable;
}

export default function ServiceProvidersSection({
  providerAccounts,
  crewMembers,
  onPayAccount,
  onOpenNewAccountForProvider,
  onManageBillingRules,
  onViewAccountDetail
}: ServiceProvidersSectionProps) {
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyPix = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Group accounts by provider name
  const providerGroups = useMemo(() => {
    const map = new Map<string, ProviderSummaryGroup>();

    // First populate from registered crew members
    for (const crew of crewMembers) {
      const crewName = crew.nome || crew.name || crew.full_name || 'Prestador Sem Nome';
      map.set(crewName, {
        name: crewName,
        role: crew.role || crew.funcao || crew.funcao_principal || 'Prestador de Serviço',
        pix: crew.pix_key || crew.chave_pix || undefined,
        accounts: [],
        totalPrevisto: 0,
        totalPago: 0,
        totalPendente: 0
      });
    }

    // Now populate from accounts
    for (const acc of providerAccounts) {
      const name = acc.prestador_nome || 'Prestador Avulso';
      if (!map.has(name)) {
        map.set(name, {
          name,
          role: acc.prestador_role || 'Prestador de Serviço',
          pix: acc.prestador_pix || undefined,
          accounts: [],
          totalPrevisto: 0,
          totalPago: 0,
          totalPendente: 0
        });
      }

      const group = map.get(name)!;
      group.accounts.push(acc);
      const effectiveVal = getAccountEffectiveValue(acc);
      group.totalPrevisto += effectiveVal;

      if (acc.status === 'PAGA') {
        group.totalPago += effectiveVal;
      } else if (acc.status !== 'CANCELADA') {
        group.totalPendente += effectiveVal;
      }

      if (acc.prestador_pix && !group.pix) {
        group.pix = acc.prestador_pix;
      }
      if (acc.prestador_role && (!group.role || group.role === 'Prestador de Serviço')) {
        group.role = acc.prestador_role;
      }
    }

    // Sort accounts in each group and find next pending account
    const result: ProviderSummaryGroup[] = [];
    for (const group of map.values()) {
      group.accounts.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
      group.nextAccount = group.accounts.find(a => a.status === 'PENDENTE' || a.status === 'VENCIDA');
      // Only include if has accounts or is registered crew
      if (group.accounts.length > 0 || group.name) {
        result.push(group);
      }
    }

    return result.sort((a, b) => b.totalPendente - a.totalPendente || b.accounts.length - a.accounts.length);
  }, [providerAccounts, crewMembers]);

  const filtered = providerGroups.filter(g => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return g.name.toLowerCase().includes(q) || (g.role || '').toLowerCase().includes(q) || (g.pix || '').toLowerCase().includes(q);
  });

  const totalGeralPrestadoresPrevisto = providerGroups.reduce((s, g) => s + g.totalPrevisto, 0);
  const totalGeralPrestadoresPago = providerGroups.reduce((s, g) => s + g.totalPago, 0);

  return (
    <div className="space-y-4 bg-[#0E1538]/90 border border-white/10 p-5 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Prestadores de Serviço & Equipe</span>
              <Sparkles size={16} className="text-purple-400" />
            </h3>
            <p className="text-xs text-white/60">
              Acompanhamento de pagamentos a diaristas, faxineiras, piscineiros, caseiros e jardineiros
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-purple-950/40 border border-purple-500/30 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">
              Total Previsto no Período
            </span>
            <span className="text-base sm:text-lg font-black text-white">
              {formatBRL(totalGeralPrestadoresPrevisto)}
            </span>
          </div>

          <button
            onClick={onManageBillingRules}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sliders size={15} />
            <span>Regras Automáticas</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
          <input
            type="text"
            placeholder="Buscar prestador por nome, função ou PIX..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
          />
        </div>

        <span className="text-xs font-semibold text-white/50">
          {filtered.length} {filtered.length === 1 ? 'prestador' : 'prestadores'}
        </span>
      </div>

      {/* Grid of Provider Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(group => {
            const hasPending = group.totalPendente > 0;

            return (
              <div
                key={group.name}
                className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-purple-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3.5 shadow-md"
              >
                {/* Header: Name, Role & PIX */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <UserCheck size={16} className="text-purple-400" />
                        <span>{group.name}</span>
                      </h4>
                      <p className="text-xs text-white/60">
                        {group.role || 'Prestador de Serviço'}
                      </p>
                    </div>

                    {group.pix && (
                      <button
                        onClick={() => handleCopyPix(group.pix!)}
                        className="px-2 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copiar Chave PIX"
                      >
                        {copiedKey === group.pix ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-300 font-bold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>PIX</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Financial summary for this provider */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-white/40 block">Pendente</span>
                      <span className={`font-black ${hasPending ? 'text-amber-300' : 'text-white/40'}`}>
                        {formatBRL(group.totalPendente)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-white/40 block">Já Pago</span>
                      <span className="font-bold text-emerald-400">
                        {formatBRL(group.totalPago)}
                      </span>
                    </div>
                  </div>

                  {/* Next Payment info */}
                  {group.nextAccount ? (
                    <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                          <Clock size={12} /> Próximo Pagamento:
                        </span>
                        <span className="font-black text-white">
                          {formatBRL(group.nextAccount.valor_previsto)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span>{group.nextAccount.descricao}</span>
                        <span>{group.nextAccount.data_vencimento ? new Date(group.nextAccount.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 text-center">
                      Nenhum pagamento pendente no momento
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => onOpenNewAccountForProvider(group.name, group.pix, group.role)}
                    className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Lançar Diária</span>
                  </button>

                  {group.nextAccount && (
                    <button
                      onClick={() => onPayAccount(group.nextAccount!)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 size={13} />
                      <span>Dar Baixa</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl space-y-2">
          <Users size={28} className="text-white/20 mx-auto" />
          <h4 className="text-sm font-bold text-white">Nenhum prestador encontrado</h4>
          <p className="text-xs text-white/50">
            Cadastre novos membros de equipe ou configure regras automáticas de cobrança.
          </p>
        </div>
      )}
    </div>
  );
}
