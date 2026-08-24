'use client';

import React from 'react';
import { 
  TreePine, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye, 
  Sliders, 
  ArrowRight, 
  ShieldAlert,
  Clock,
  User,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  PlanningProcess, 
  PROCESS_TYPE_META, 
  PROCESS_STATUS_META 
} from '@/lib/planningProcessTypes';
import { formatCurrency } from '@/lib/utils';

interface ProcessCardProps {
  process: PlanningProcess;
  onViewDetails: (process: PlanningProcess) => void;
  onEdit: (process: PlanningProcess) => void;
  onDelete: (processId: string) => void;
}

export default function ProcessCard({
  process,
  onViewDetails,
  onEdit,
  onDelete
}: ProcessCardProps) {
  const typeMeta = PROCESS_TYPE_META[process.process_type] || PROCESS_TYPE_META.OUTRO;
  const statusMeta = PROCESS_STATUS_META[process.status] || PROCESS_STATUS_META.EM_ANALISE;
  const viability = process.latest_viability_analysis;
  const verdict = viability?.verdict || 'DADOS_INSUFICIENTES';

  const disbursementsCount = process.disbursements?.length || 1;

  return (
    <div 
      id={`process-card-${process.id}`}
      className="group relative rounded-3xl bg-[#0F172A] border border-white/10 hover:border-white/20 p-5 space-y-4 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 flex flex-col justify-between"
    >
      <div className="space-y-3.5">
        {/* Card Header: Type Badge & Status / Traffic Light */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${typeMeta.badgeBg} ${typeMeta.textClass} ${typeMeta.borderClass}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeMeta.color }} />
            {typeMeta.label}
          </span>

          {/* Traffic Light Viability Badge */}
          <div className="flex items-center gap-1.5">
            {verdict === 'VIAVEL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 size={12} className="text-emerald-400" />
                Viável
              </span>
            )}
            {verdict === 'VIAVEL_COM_ATENCAO' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertTriangle size={12} className="text-amber-400" />
                Atenção
              </span>
            )}
            {verdict === 'NAO_VIAVEL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <XCircle size={12} className="text-rose-400" />
                Não Viável
              </span>
            )}
            {verdict === 'DADOS_INSUFICIENTES' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-400 border border-slate-500/30">
                <HelpCircle size={12} />
                Em Análise
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-white group-hover:text-[#00E5FF] transition-colors line-clamp-1">
            {process.title}
          </h3>
          {process.description ? (
            <p className="text-xs text-white/60 line-clamp-2 mt-1 leading-relaxed">
              {process.description}
            </p>
          ) : (
            <p className="text-xs text-white/30 italic mt-1">Sem descrição complementar</p>
          )}
        </div>

        {/* Property & Schedule Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/60 pt-1">
          <div className="flex items-center gap-1.5">
            <TreePine size={14} className="text-[#00E5FF]" />
            <span className="truncate max-w-[140px] font-medium text-white/80">
              {process.chacara?.name || 'Geral (Todas as Unidades)'}
            </span>
          </div>

          {process.responsible_name && (
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-white/40" />
              <span className="truncate max-w-[120px]">{process.responsible_name}</span>
            </div>
          )}
        </div>

        {/* Financial Breakdown Box */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Custo Estimado
            </span>
            <div className="text-right">
              <div className="text-base font-black text-white font-mono">
                {formatCurrency(process.estimated_cost)}
              </div>
              <span className="text-[10px] text-white/50 block">
                {process.payment_method === 'A_VISTA'
                  ? 'À vista'
                  : process.payment_method === 'PARCELADO'
                  ? `${disbursementsCount}x parcelas`
                  : 'Futuro único'}
              </span>
            </div>
          </div>

          {/* Lowest Cash Point indicator */}
          {viability && viability.lowestCashPointSimulated && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/50 text-[11px]">Menor Saldo Previsto:</span>
              <span className={`font-mono font-bold ${
                viability.lowestCashPointSimulated.amount < 0 
                  ? 'text-rose-400' 
                  : viability.lowestCashPointSimulated.amount < (process.safety_buffer_amount || 5000)
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {formatCurrency(viability.lowestCashPointSimulated.amount)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            id={`btn-edit-process-${process.id}`}
            onClick={() => onEdit(process)}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
            title="Editar / Simular E Se"
          >
            <Edit3 size={15} />
          </button>
          <button
            id={`btn-delete-process-${process.id}`}
            onClick={() => {
              if (confirm(`Deseja remover o processo "${process.title}"?`)) {
                onDelete(process.id);
              }
            }}
            className="p-2 rounded-xl text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            title="Excluir Processo"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <button
          id={`btn-details-process-${process.id}`}
          onClick={() => onViewDetails(process)}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 transition-all flex items-center gap-1.5"
        >
          <span>Ver Análise</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
