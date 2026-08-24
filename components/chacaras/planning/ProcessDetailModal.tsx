'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Calculator, 
  DollarSign, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  TreePine, 
  User, 
  Edit3, 
  RefreshCw, 
  TrendingDown, 
  ArrowRight,
  Info,
  Layers,
  ArrowDownRight,
  FileSpreadsheet
} from 'lucide-react';
import { 
  PlanningProcess, 
  ProcessViabilityResult,
  PROCESS_TYPE_META,
  PROCESS_STATUS_META
} from '@/lib/planningProcessTypes';
import { formatCurrency } from '@/lib/utils';
import { simulateProcessViability } from '@/services/financialProjectionService';
import { updatePlanningProcess } from '@/services/planningProcessService';

interface ProcessDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: PlanningProcess | null;
  onEdit: (process: PlanningProcess) => void;
  onUpdated: () => void;
}

export default function ProcessDetailModal({
  isOpen,
  onClose,
  process,
  onEdit,
  onUpdated
}: ProcessDetailModalProps) {
  const [recalculating, setRecalculating] = useState(false);
  const [localViability, setLocalViability] = useState<ProcessViabilityResult | null>(null);

  if (!isOpen || !process) return null;

  const typeMeta = PROCESS_TYPE_META[process.process_type] || PROCESS_TYPE_META.OUTRO;
  const viability: ProcessViabilityResult | null = localViability || process.latest_viability_analysis || null;
  const verdict = viability?.verdict || 'DADOS_INSUFICIENTES';

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await simulateProcessViability({
        title: process.title,
        processType: process.process_type,
        estimatedCost: process.estimated_cost,
        disbursements: process.disbursements || [],
        safetyBuffer: process.safety_buffer_amount || 5000,
        chacara_id: process.chacara_id || undefined
      });

      setLocalViability(res);
      await updatePlanningProcess(process.id, {
        latest_viability_analysis: res
      });
      onUpdated();
    } catch (err) {
      console.error('Erro ao reanalisar viabilidade:', err);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div 
      id={`process-detail-modal-overlay-${process.id}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id={`process-detail-modal-container-${process.id}`}
        className="relative w-full max-w-5xl my-auto rounded-3xl bg-[#0F172A] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00E5FF]/20 to-[#3B82F6]/20 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {process.title}
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.badgeBg} ${typeMeta.textClass} ${typeMeta.borderClass}`}>
                  {typeMeta.label}
                </span>
              </div>
              <p className="text-xs text-white/60">
                {process.chacara?.name || 'Geral (Todas as Unidades)'} • Cadastrado em {new Date(process.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id={`btn-recalc-${process.id}`}
              onClick={handleRecalculate}
              disabled={recalculating}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Reexecutar simulação com dados atualizados de caixa"
            >
              <RefreshCw size={14} className={recalculating ? 'animate-spin text-[#00E5FF]' : ''} />
              <span>{recalculating ? 'Reanalisando...' : 'Reanalisar Agora'}</span>
            </button>

            <button
              id={`btn-close-detail-${process.id}`}
              onClick={onClose}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Parecer Executivo / Semáforo de Viabilidade */}
          <div className={`p-5 rounded-3xl border transition-all ${
            verdict === 'VIAVEL' 
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : verdict === 'VIAVEL_COM_ATENCAO'
              ? 'bg-amber-500/10 border-amber-500/30'
              : verdict === 'NAO_VIAVEL'
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-slate-800 border-white/10'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                {verdict === 'VIAVEL' && <CheckCircle2 size={32} className="text-emerald-400 shrink-0" />}
                {verdict === 'VIAVEL_COM_ATENCAO' && <AlertTriangle size={32} className="text-amber-400 shrink-0" />}
                {verdict === 'NAO_VIAVEL' && <XCircle size={32} className="text-rose-400 shrink-0" />}
                {verdict === 'DADOS_INSUFICIENTES' && <HelpCircle size={32} className="text-slate-400 shrink-0" />}

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">
                    Parecer de Viabilidade Financeira
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {viability?.verdictTitle || 'Aguardando Análise'}
                  </h3>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                  Colchão Mínimo de Segurança
                </span>
                <span className="text-base font-black text-[#00E5FF] font-mono">
                  {formatCurrency(process.safety_buffer_amount || 5000)}
                </span>
              </div>
            </div>

            {/* Justificativa Textual */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                {viability?.justificationText}
              </p>

              {viability?.bulletPoints && viability.bulletPoints.length > 0 && (
                <ul className="space-y-1.5 pt-2">
                  {viability.bulletPoints.map((pt, i) => (
                    <li key={i} className="text-xs text-white/75 flex items-start gap-2">
                      <span className="text-[#00E5FF] font-bold shrink-0">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}

              {viability?.recommendations && viability.recommendations.length > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                    Recomendações do Sistema:
                  </span>
                  <ul className="space-y-1">
                    {viability.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-amber-200/90 flex items-start gap-1.5">
                        <span className="text-amber-400">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 2. Grid de Indicadores de Caixa e Ponto Crítico */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                Custo do Processo
              </span>
              <div className="text-base font-black text-white font-mono">
                {formatCurrency(process.estimated_cost)}
              </div>
              <span className="text-[10px] text-white/40 block">
                {process.payment_method === 'A_VISTA' ? 'À vista' : `${process.disbursements?.length || 1}x parcelas`}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                Caixa Operacional Livre
              </span>
              <div className="text-base font-black text-white font-mono">
                {formatCurrency(viability?.caixaOperacionalLivreHoje || 0)}
              </div>
              <span className="text-[10px] text-white/40 block">Disponível hoje</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                Reserva de Emergência
              </span>
              <div className="text-base font-black text-amber-400 font-mono">
                {formatCurrency(viability?.reservaEmergenciaAtual || 0)}
              </div>
              <span className="text-[10px] text-amber-400/60 block">Blindado para imprevistos</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/15 space-y-1">
              <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider block">
                Menor Saldo COM Processo
              </span>
              <div className={`text-base font-black font-mono ${
                (viability?.lowestCashPointSimulated.amount || 0) < 0 
                  ? 'text-rose-400' 
                  : (viability?.lowestCashPointSimulated.amount || 0) < (process.safety_buffer_amount || 5000)
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {formatCurrency(viability?.lowestCashPointSimulated.amount || 0)}
              </div>
              <span className="text-[10px] text-white/50 block">
                Ponto Crítico em {viability?.lowestCashPointSimulated.date.split('-').reverse().join('/')}
              </span>
            </div>
          </div>

          {/* 3. Cronograma de Desembolsos Cadastrados */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h4 className="text-xs font-black text-[#00E5FF] uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} />
              Cronograma de Desembolsos Planejados
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(process.disbursements || []).map((d, index) => (
                <div key={index} className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white/70">Parcela {d.installment_number}</span>
                    <span className="font-mono text-white/40 text-[11px]">
                      {d.due_date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <div className="text-sm font-black text-white font-mono">
                    {formatCurrency(d.amount)}
                  </div>
                  {d.notes && <p className="text-[10px] text-white/40 truncate">{d.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Linha do Tempo Comparativa Dia a Dia */}
          {viability?.timelineComparison && viability.timelineComparison.length > 0 && (
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-[#00E5FF]" />
                  Simulação Comparativa Dia a Dia (Horizonte de {viability.horizonDays} Dias)
                </h4>
                <span className="text-[10px] text-white/40">Dias com movimentações ou marcos</span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white/50 text-[10px] uppercase font-bold border-b border-white/10">
                    <tr>
                      <th className="p-2.5">Data / Marco</th>
                      <th className="p-2.5 text-right">Entradas Líq.</th>
                      <th className="p-2.5 text-right">Saídas Base</th>
                      <th className="p-2.5 text-right">Desembolso Processo</th>
                      <th className="p-2.5 text-right">Saldo Sem Processo</th>
                      <th className="p-2.5 text-right">Saldo COM Processo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {viability.timelineComparison.map((pt, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-white/5 transition-colors ${
                          pt.isLowestPointSimulated ? 'bg-rose-500/10 font-bold' : ''
                        }`}
                      >
                        <td className="p-2.5 text-white flex items-center gap-1.5 font-sans">
                          <span>{pt.label}</span>
                          {pt.isLowestPointSimulated && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                              Menor Saldo
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right text-emerald-400">
                          {pt.entradasDoDia > 0 ? `+${formatCurrency(pt.entradasDoDia)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right text-rose-400">
                          {pt.saidasDoDia > 0 ? `-${formatCurrency(pt.saidasDoDia)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right text-[#00E5FF] font-bold">
                          {pt.desembolsoProcesso > 0 ? `-${formatCurrency(pt.desembolsoProcesso)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right text-white/70">
                          {formatCurrency(pt.saldoBase)}
                        </td>
                        <td className={`p-2.5 text-right font-bold ${
                          pt.saldoSimulado < 0 
                            ? 'text-rose-400' 
                            : pt.saldoSimulado < (process.safety_buffer_amount || 5000)
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                          {formatCurrency(pt.saldoSimulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
          <button
            id={`btn-edit-from-detail-${process.id}`}
            onClick={() => {
              onClose();
              onEdit(process);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 transition-all flex items-center gap-2"
          >
            <Edit3 size={15} />
            <span>Editar Parâmetros / Simular E Se</span>
          </button>

          <button
            id={`btn-close-bottom-${process.id}`}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
