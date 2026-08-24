'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Tag, 
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { OperationalRevenueItem } from '@/lib/accountsPayableTypes';

interface MonthlyRevenuesSectionProps {
  revenues: OperationalRevenueItem[];
  totalRecebido: number;
  totalPrevisto: number;
  periodLabel: string;
  loading: boolean;
  onRefresh?: () => void;
}

export default function MonthlyRevenuesSection({
  revenues,
  totalRecebido,
  totalPrevisto,
  periodLabel,
  loading,
  onRefresh
}: MonthlyRevenuesSectionProps) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatBRL = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const filtered = revenues.filter(rev => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const g = (rev.guest_name || '').toLowerCase();
    const d = (rev.descricao || '').toLowerCase();
    const c = (rev.chacara_nome || '').toLowerCase();
    const o = (rev.origem || '').toLowerCase();
    return g.includes(q) || d.includes(q) || c.includes(q) || o.includes(q);
  });

  const getStatusBadge = (status: string, recebido: number, total: number) => {
    if (status === 'PAGO' || recebido >= total && total > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 size={11} />
          Totalmente Recebido
        </span>
      );
    }
    if (status === 'PARCIALMENTE_PAGO' || recebido > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <Clock size={11} />
          Parcialmente Pago
        </span>
      );
    }
    if (status === 'CANCELADO' || status === 'REEMBOLSADO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
        <Clock size={11} />
        Aguardando Pagamento
      </span>
    );
  };

  return (
    <div className="space-y-4 bg-[#0E1538]/90 border border-white/10 p-5 rounded-2xl shadow-xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Receitas deste Mês ({periodLabel})</span>
              <Sparkles size={16} className="text-emerald-400" />
            </h3>
            <p className="text-xs text-white/60">
              Registros reais de entradas financeiras e pagamentos de hóspedes vinculados ao período
            </p>
          </div>
        </div>

        {/* Totals Summary Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-950/40 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">
              Total Efetivamente Recebido
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-300">
              {formatBRL(totalRecebido)}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-white/50 block">
              Total Contratado / Previsto
            </span>
            <span className="text-base sm:text-lg font-black text-white/80">
              {formatBRL(totalPrevisto)}
            </span>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
          <input
            type="text"
            placeholder="Buscar por hóspede, chácara, origem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
          />
        </div>

        <span className="text-xs font-semibold text-white/50">
          {filtered.length} {filtered.length === 1 ? 'registro de receita' : 'registros de receita'}
        </span>
      </div>

      {/* Revenue Items List */}
      {filtered.length > 0 ? (
        <div className="space-y-2.5">
          {filtered.map(rev => {
            const isExpanded = expandedId === rev.id;

            return (
              <div
                key={rev.id}
                className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 rounded-2xl p-4 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <User size={15} className="text-purple-400" />
                        {rev.guest_name || 'Hóspede Direto'}
                      </span>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {rev.origem || 'Direto'}
                      </span>

                      {getStatusBadge(rev.status, rev.valor_recebido, rev.valor_total)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 size={13} className="text-purple-400" />
                        {rev.chacara_nome || 'Chácara Vinculada'}
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-emerald-400" />
                        Check-in: {rev.data_referencia ? new Date(rev.data_referencia + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data n/d'}
                      </span>

                      {rev.data_checkout && (
                        <span className="text-white/40">
                          até {new Date(rev.data_checkout + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right values & toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-black text-emerald-400">
                        {formatBRL(rev.valor_recebido)}
                      </div>
                      {rev.valor_total > rev.valor_recebido && (
                        <div className="text-[11px] text-amber-300 font-semibold">
                          Pendente: {formatBRL(rev.valor_total - rev.valor_recebido)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rev.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                      title={isExpanded ? 'Recolher detalhes' : 'Ver detalhes da receita'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl text-xs space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-white/80 pb-2 border-b border-white/5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/40 block">Valor Total Contratado</span>
                        <span className="font-bold text-white">{formatBRL(rev.valor_total)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/40 block">Valor Recebido no Mês</span>
                        <span className="font-bold text-emerald-400">{formatBRL(rev.valor_recebido)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/40 block">Saldo em Aberto</span>
                        <span className="font-bold text-amber-300">{formatBRL(Math.max(0, rev.valor_total - (rev.valor_total_recebido || rev.valor_recebido)))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/40 block">Recebimentos no Período</span>
                        <span className="font-bold text-purple-300">{rev.payments_count} lançamento(s)</span>
                      </div>
                    </div>

                    {/* Itemized Payment Details */}
                    {rev.payments_detail && rev.payments_detail.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-black text-white/40 tracking-wider block">
                          Detalhamento das Parcelas / Recebimentos ({rev.payments_detail.length})
                        </span>
                        <div className="space-y-1">
                          {rev.payments_detail.map((pay, idx) => (
                            <div
                              key={pay.id || idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                                  {idx + 1}
                                </span>
                                <span className="text-white/70">
                                  {pay.payment_date ? new Date(pay.payment_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data não informada'}
                                </span>
                                {pay.payment_method && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                                    {pay.payment_method}
                                  </span>
                                )}
                                {pay.notes && (
                                  <span className="text-white/40 italic">
                                    ({pay.notes})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-black text-emerald-400">
                                  {formatBRL(pay.amount)}
                                </span>
                                {pay.receipt_url && (
                                  <a
                                    href={pay.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-emerald-300 hover:text-emerald-200 transition-colors inline-flex items-center gap-1 text-[10px]"
                                    title="Ver comprovante anexado"
                                  >
                                    <ExternalLink size={11} />
                                    <span>Comprovante</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl space-y-2">
          <TrendingUp size={28} className="text-white/20 mx-auto" />
          <h4 className="text-sm font-bold text-white">Nenhum registro de receita para o período filtrado</h4>
          <p className="text-xs text-white/50">
            As receitas reais de reservas e diárias contratadas aparecerão automaticamente aqui.
          </p>
        </div>
      )}
    </div>
  );
}
