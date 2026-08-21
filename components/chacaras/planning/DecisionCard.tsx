'use client';

import React from 'react';
import { 
  Calendar, 
  DollarSign, 
  TreePine, 
  Clock, 
  CheckCircle2, 
  CalendarClock, 
  XCircle, 
  ShoppingCart, 
  Wrench, 
  Hammer, 
  TrendingUp, 
  Workflow, 
  HelpCircle,
  ChevronRight,
  Sparkles,
  Layers,
  AlertCircle
} from 'lucide-react';
import { 
  PlanningDecision, 
  DECISION_TYPE_META, 
  DECISION_STATUS_META, 
  DECISION_PRIORITY_META,
  DECISION_CLASSIFICATION_META,
  DecisionType,
  DecisionStatus
} from '@/lib/planningTypes';
import { formatCurrency } from '@/lib/utils';

interface DecisionCardProps {
  decision: PlanningDecision;
  onClick: () => void;
}

export default function DecisionCard({ decision, onClick }: DecisionCardProps) {
  const typeMeta = DECISION_TYPE_META[decision.decision_type] || DECISION_TYPE_META.OUTRO;
  const statusMeta = DECISION_STATUS_META[decision.status] || DECISION_STATUS_META.EM_ANALISE;
  const priorityMeta = DECISION_PRIORITY_META[decision.priority] || DECISION_PRIORITY_META.MEDIA;
  const classificationMeta = DECISION_CLASSIFICATION_META[decision.classification] || DECISION_CLASSIFICATION_META.OPERACIONAL;

  const isProject = decision.classification === 'PROJETO_INVESTIMENTO';

  const renderTypeIcon = (type: DecisionType) => {
    switch (type) {
      case 'COMPRA':
        return <ShoppingCart size={13} className={typeMeta.textClass} />;
      case 'MANUTENCAO':
        return <Wrench size={13} className={typeMeta.textClass} />;
      case 'REFORMA':
        return <Hammer size={13} className={typeMeta.textClass} />;
      case 'INVESTIMENTO':
        return <TrendingUp size={13} className={typeMeta.textClass} />;
      case 'OPERACIONAL':
        return <Workflow size={13} className={typeMeta.textClass} />;
      default:
        return <HelpCircle size={13} className={typeMeta.textClass} />;
    }
  };

  const renderStatusIcon = (status: DecisionStatus) => {
    switch (status) {
      case 'EM_ANALISE':
        return <Clock size={12} className="text-amber-400" />;
      case 'APROVADA':
        return <CheckCircle2 size={12} className="text-emerald-400" />;
      case 'ADIADA':
        return <CalendarClock size={12} className="text-indigo-400" />;
      case 'REJEITADA':
        return <XCircle size={12} className="text-rose-400" />;
      default:
        return <Clock size={12} className="text-amber-400" />;
    }
  };

  const formattedTargetDate = decision.target_date 
    ? new Date(decision.target_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const formattedReviewDate = decision.postponed_until
    ? new Date(decision.postponed_until + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div 
      onClick={onClick}
      className={`group relative rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] flex flex-col justify-between border ${
        isProject
          ? 'bg-[#0E1B42]/90 hover:bg-[#132454] border-emerald-500/25 hover:border-emerald-400/50'
          : 'bg-[#0D153A]/85 hover:bg-[#121B48] border-white/10 hover:border-[#FFD600]/40'
      }`}
    >
      {/* Top badges: Classification, Type & Status */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Classification & Type badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Classification badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${classificationMeta.badgeBg}`}>
              {isProject ? <Sparkles size={11} className="text-emerald-400" /> : <Workflow size={11} className="text-cyan-400" />}
              {classificationMeta.shortLabel}
            </span>

            {/* Type badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeMeta.bgClass} ${typeMeta.textClass} ${typeMeta.borderClass}`}>
              {renderTypeIcon(decision.decision_type)}
              {typeMeta.label}
            </span>
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold shrink-0 ${statusMeta.badgeBg}`}>
            {renderStatusIcon(decision.status)}
            {statusMeta.label}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-white group-hover:text-[#FFD600] transition-colors leading-snug line-clamp-2 mb-1.5">
          {decision.title}
        </h3>

        {decision.description && (
          <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">
            {decision.description}
          </p>
        )}

        {/* Adiada / Rejeitada Notice Pills */}
        {decision.status === 'ADIADA' && (decision.postpone_reason || decision.postponed_until) && (
          <div className="mb-3 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
            <div className="flex items-center gap-1 font-semibold">
              <CalendarClock size={12} className="shrink-0 text-indigo-400" />
              <span>Adiada {formattedReviewDate ? `• Revisão: ${formattedReviewDate}` : ''}</span>
            </div>
            {decision.postpone_reason && (
              <p className="text-indigo-200/70 text-[10px] mt-0.5 line-clamp-1 italic">
                &ldquo;{decision.postpone_reason}&rdquo;
              </p>
            )}
          </div>
        )}

        {decision.status === 'REJEITADA' && decision.rejection_reason && (
          <div className="mb-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
            <div className="flex items-center gap-1 font-semibold">
              <XCircle size={12} className="shrink-0 text-rose-400" />
              <span>Motivo da rejeição:</span>
            </div>
            <p className="text-rose-200/70 text-[10px] mt-0.5 line-clamp-1 italic">
              &ldquo;{decision.rejection_reason}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Footer Info: Chácara, Cost & Target Date */}
      <div className="pt-3.5 mt-2 border-t border-white/10 flex flex-col gap-2">
        {/* Chácara related & Target Date */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-white/70 truncate">
            <TreePine size={13} className="text-[#FFD600] shrink-0" />
            <span className="truncate font-medium">
              {decision.chacara?.name || 'Todas as Chácaras / Geral'}
            </span>
          </div>

          {decision.target_date && (
            <div className="flex items-center gap-1 text-white/50 text-[11px] shrink-0 ml-2">
              <Calendar size={12} />
              <span>{formattedTargetDate}</span>
            </div>
          )}
        </div>

        {/* Cost & Action hint */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[10px] text-white/40 uppercase font-semibold block">Custo Estimado</span>
            <span className={`text-sm font-black ${decision.estimated_cost > 0 ? (isProject ? 'text-emerald-300' : 'text-white') : 'text-white/40'}`}>
              {decision.estimated_cost > 0 ? formatCurrency(decision.estimated_cost) : 'A definir'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-[#FFD600]/80 group-hover:text-[#FFD600] group-hover:translate-x-0.5 transition-all">
            <span>Ver Detalhes</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
