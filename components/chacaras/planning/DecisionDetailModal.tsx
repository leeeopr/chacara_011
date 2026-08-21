'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lightbulb, 
  TreePine, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  CalendarClock, 
  XCircle, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  TrendingUp, 
  Workflow, 
  Layers, 
  ArrowRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
  History,
  RotateCcw,
  Receipt,
  Wrench,
  PiggyBank,
  User
} from 'lucide-react';
import { 
  PlanningDecision, 
  DecisionStatus, 
  DecisionType, 
  DecisionClassification,
  DecisionStatusHistory,
  DECISION_TYPE_META, 
  DECISION_STATUS_META, 
  DECISION_PRIORITY_META,
  DECISION_CLASSIFICATION_META
} from '@/lib/planningTypes';
import { formatCurrency } from '@/lib/utils';
import { 
  updateDecisionStatus, 
  deletePlanningDecision, 
  getDecisionStatusHistory 
} from '@/services/planningService';

interface DecisionDetailModalProps {
  decision: PlanningDecision | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (decision: PlanningDecision) => void;
  onDeleted: () => void;
  onStatusChanged: (updated: PlanningDecision) => void;
}

export default function DecisionDetailModal({
  decision,
  isOpen,
  onClose,
  onEdit,
  onDeleted,
  onStatusChanged
}: DecisionDetailModalProps) {
  const [history, setHistory] = useState<DecisionStatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Status transition dialog state
  const [actionTargetStatus, setActionTargetStatus] = useState<DecisionStatus | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionReviewDate, setActionReviewDate] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (decision?.id && isOpen) {
      setLoadingHistory(true);
      getDecisionStatusHistory(decision.id)
        .then(setHistory)
        .finally(() => setLoadingHistory(false));
      setActionTargetStatus(null);
      setActionReason('');
      setActionReviewDate('');
    }
  }, [decision?.id, isOpen]);

  if (!isOpen || !decision) return null;

  const typeMeta = DECISION_TYPE_META[decision.decision_type] || DECISION_TYPE_META.OUTRO;
  const statusMeta = DECISION_STATUS_META[decision.status] || DECISION_STATUS_META.EM_ANALISE;
  const priorityMeta = DECISION_PRIORITY_META[decision.priority] || DECISION_PRIORITY_META.MEDIA;
  const classificationMeta = DECISION_CLASSIFICATION_META[decision.classification] || DECISION_CLASSIFICATION_META.OPERACIONAL;
  const isProject = decision.classification === 'PROJETO_INVESTIMENTO';

  const formattedTargetDate = decision.target_date 
    ? new Date(decision.target_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Não especificada';

  const formattedPostponedUntil = decision.postponed_until
    ? new Date(decision.postponed_until + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const formattedCreatedAt = new Date(decision.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Handler for direct approval (or modal approval)
  const handleApprove = async () => {
    setStatusSubmitting(true);
    try {
      const updated = await updateDecisionStatus(decision.id, 'APROVADA', {
        reason: 'Decisão aprovada para execução',
        changedBy: 'Administrador'
      });
      onStatusChanged(updated);
      const h = await getDecisionStatusHistory(decision.id);
      setHistory(h);
      setActionTargetStatus(null);
    } catch (err) {
      console.error('Erro ao aprovar decisão:', err);
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Handler for opening the dialog for Adiar, Rejeitar, or Retomar
  const handleOpenActionModal = (status: DecisionStatus) => {
    setActionTargetStatus(status);
    setActionReason(
      status === 'ADIADA' 
        ? (decision.postpone_reason || '') 
        : status === 'REJEITADA' 
          ? (decision.rejection_reason || '') 
          : ''
    );
    setActionReviewDate(decision.postponed_until || '');
  };

  // Confirm complex status change
  const handleConfirmAction = async () => {
    if (!actionTargetStatus) return;
    setStatusSubmitting(true);
    try {
      const updated = await updateDecisionStatus(decision.id, actionTargetStatus, {
        reason: actionReason.trim() || undefined,
        postponed_until: actionTargetStatus === 'ADIADA' ? (actionReviewDate || null) : null,
        changedBy: 'Administrador'
      });
      onStatusChanged(updated);
      setActionTargetStatus(null);
      setActionReason('');
      setActionReviewDate('');
      const h = await getDecisionStatusHistory(decision.id);
      setHistory(h);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePlanningDecision(decision.id);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Erro ao deletar decisão:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getEventIcon = (event: DecisionStatusHistory) => {
    if (event.event_type === 'CRIACAO') return <Sparkles size={13} className="text-[#FFD600]" />;
    if (event.event_type === 'ALTERACAO_CUSTO') return <DollarSign size={13} className="text-cyan-400" />;
    if (event.event_type === 'APROVACAO' || event.new_status === 'APROVADA') return <CheckCircle2 size={13} className="text-emerald-400" />;
    if (event.event_type === 'ADIAMENTO' || event.new_status === 'ADIADA') return <CalendarClock size={13} className="text-indigo-400" />;
    if (event.event_type === 'REJEICAO' || event.new_status === 'REJEITADA') return <XCircle size={13} className="text-rose-400" />;
    if (event.event_type === 'RETOMADA_ANALISE' || event.new_status === 'EM_ANALISE') return <RotateCcw size={13} className="text-amber-400" />;
    return <Clock size={13} className="text-white/40" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0D153A] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-[#0A0F2C] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isProject 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              {isProject ? <TrendingUp size={22} /> : <Workflow size={22} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Classification */}
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${classificationMeta.badgeBg}`}>
                  {classificationMeta.label}
                </span>

                {/* Type */}
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${typeMeta.bgClass} ${typeMeta.textClass} ${typeMeta.borderClass}`}>
                  {typeMeta.label}
                </span>

                {/* Status */}
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${statusMeta.badgeBg}`}>
                  {statusMeta.label}
                </span>

                {decision.priority === 'ESTRATEGICA' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    Estratégica
                  </span>
                )}
              </div>

              <h2 className="text-xl font-black text-white mt-1 leading-snug">
                {decision.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(decision)}
              className="p-2 text-white/70 hover:text-[#FFD600] rounded-xl hover:bg-white/10 transition-colors"
              title="Editar Decisão"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-white/50 hover:text-rose-400 rounded-xl hover:bg-white/10 transition-colors"
              title="Excluir Decisão"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert */}
        {showDeleteConfirm && (
          <div className="p-4 bg-rose-500/15 border-b border-rose-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-rose-300 font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>Deseja realmente remover esta decisão do planejamento?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 text-xs text-white/70 hover:text-white font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {deleting ? 'Removendo...' : 'Sim, Remover'}
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0A0F2C]/70 p-4 rounded-2xl border border-white/5">
            <div>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Chácara</span>
              <div className="flex items-center gap-1.5 mt-1 text-white font-medium text-xs">
                <TreePine size={14} className="text-[#FFD600] shrink-0" />
                <span className="truncate">{decision.chacara?.name || 'Geral / Todas'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Custo Estimado</span>
              <span className={`text-sm font-black mt-1 block ${isProject ? 'text-emerald-300' : 'text-white'}`}>
                {decision.estimated_cost > 0 ? formatCurrency(decision.estimated_cost) : 'A definir'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Prazo Desejado</span>
              <div className="flex items-center gap-1.5 mt-1 text-white/80 font-medium text-xs">
                <Calendar size={13} className="text-white/40" />
                <span>{formattedTargetDate}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Prioridade</span>
              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded mt-1 ${priorityMeta.badgeClass}`}>
                {priorityMeta.label}
              </span>
            </div>
          </div>

          {/* Contextual Status Banners */}
          {decision.status === 'ADIADA' && (
            <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-indigo-300 font-bold text-xs">
                <span className="flex items-center gap-1.5">
                  <CalendarClock size={15} />
                  Decisão Adiada
                </span>
                {formattedPostponedUntil && (
                  <span className="bg-indigo-500/20 px-2.5 py-0.5 rounded-lg border border-indigo-500/30 text-[11px]">
                    Revisão prevista: <strong>{formattedPostponedUntil}</strong>
                  </span>
                )}
              </div>
              {decision.postpone_reason && (
                <p className="text-xs text-indigo-200/80 italic leading-relaxed pt-1">
                  &ldquo;{decision.postpone_reason}&rdquo;
                </p>
              )}
            </div>
          )}

          {decision.status === 'REJEITADA' && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
                <XCircle size={15} />
                Decisão Rejeitada
              </div>
              {decision.rejection_reason ? (
                <p className="text-xs text-rose-200/80 italic leading-relaxed pt-1">
                  &ldquo;{decision.rejection_reason}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-rose-200/60 leading-relaxed">
                  Decisão analisada e desconsiderada no momento.
                </p>
              )}
            </div>
          )}

          {decision.status === 'APROVADA' && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <CheckCircle2 size={16} />
                <span>Decisão Aprovada para Execução</span>
              </div>
              <span className="text-[11px] text-emerald-200/60 font-medium">
                Pronta para etapas de planejamento operacional
              </span>
            </div>
          )}

          {/* Contextual Action Bar Based on Current Status */}
          <div className="bg-[#121B48]/60 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                Ações do Fluxo da Decisão
              </h4>
              <span className="text-[11px] text-white/40">
                Status atual: <strong className="text-white">{statusMeta.label}</strong>
              </span>
            </div>

            {/* Action Buttons based on status */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* EM_ANALISE state actions */}
              {decision.status === 'EM_ANALISE' && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprovar</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal('ADIADA')}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CalendarClock size={14} />
                    <span>Adiar Decisão</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal('REJEITADA')}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={14} />
                    <span>Rejeitar</span>
                  </button>
                </>
              )}

              {/* APROVADA state actions */}
              {decision.status === 'APROVADA' && (
                <>
                  <button
                    onClick={() => handleOpenActionModal('EM_ANALISE')}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={14} />
                    <span>Retomar Análise</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal('ADIADA')}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CalendarClock size={14} />
                    <span>Adiar</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal('REJEITADA')}
                    disabled={statusSubmitting}
                    className="px-4 py-2.5 bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 border border-white/10 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Rejeitar
                  </button>
                </>
              )}

              {/* ADIADA state actions */}
              {decision.status === 'ADIADA' && (
                <>
                  <button
                    onClick={() => handleOpenActionModal('EM_ANALISE')}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-[#FFD600] text-[#0A0F2C] hover:bg-[#ffe033] rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#FFD600]/20"
                  >
                    <RotateCcw size={14} />
                    <span>Retomar Análise</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprovar</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal('REJEITADA')}
                    disabled={statusSubmitting}
                    className="px-4 py-2.5 bg-rose-600/60 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={14} />
                    <span>Rejeitar</span>
                  </button>
                </>
              )}

              {/* REJEITADA state actions */}
              {decision.status === 'REJEITADA' && (
                <>
                  <button
                    onClick={() => handleOpenActionModal('EM_ANALISE')}
                    disabled={statusSubmitting}
                    className="flex-1 min-w-[160px] px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={14} />
                    <span>Reavaliar / Retomar Análise</span>
                  </button>
                </>
              )}

              {/* Always allow edit */}
              <button
                onClick={() => onEdit(decision)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Edit3 size={14} />
                <span>Editar</span>
              </button>

            </div>

            {/* Interactive Popup Modal for Action Reason / Review Date */}
            {actionTargetStatus && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3 bg-[#0A0F2C] p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Confirmar transição para:
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${DECISION_STATUS_META[actionTargetStatus]?.badgeBg}`}>
                      {DECISION_STATUS_META[actionTargetStatus]?.label}
                    </span>
                  </div>

                  <button
                    onClick={() => setActionTargetStatus(null)}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                {/* Reason Input */}
                <div className="space-y-1">
                  <label className="text-[11px] text-white/70 font-semibold block">
                    {actionTargetStatus === 'ADIADA' ? 'Motivo do Adiamento (Opcional)' : actionTargetStatus === 'REJEITADA' ? 'Motivo da Rejeição (Opcional)' : 'Observação da Retomada (Opcional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      actionTargetStatus === 'ADIADA' 
                        ? "Ex: Aguardar fechamento da alta temporada / maior folga de caixa..." 
                        : actionTargetStatus === 'REJEITADA' 
                          ? "Ex: Custo elevado sem retorno compatível..." 
                          : "Ex: Novo orçamento obtido com desconto..."
                    }
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFD600]"
                  />
                </div>

                {/* Optional Review Date for ADIADA */}
                {actionTargetStatus === 'ADIADA' && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/70 font-semibold block">
                      Nova data prevista para reavaliação (Opcional)
                    </label>
                    <input
                      type="date"
                      value={actionReviewDate}
                      onChange={(e) => setActionReviewDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD600]"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setActionTargetStatus(null)}
                    className="px-3 py-1.5 text-xs text-white/60 hover:text-white font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={statusSubmitting}
                    className="px-4 py-1.5 bg-[#FFD600] text-[#0A0F2C] rounded-lg text-xs font-bold hover:bg-[#ffe033] transition-colors"
                  >
                    {statusSubmitting ? 'Salvando...' : 'Confirmar Alteração'}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Description & Context */}
          {decision.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                Descrição & Contexto
              </h4>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white/85 leading-relaxed whitespace-pre-wrap">
                {decision.description}
              </div>
            </div>
          )}

          {/* History of Decision Events */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <History size={14} className="text-white/40" />
                <span>Histórico da Decisão</span>
              </h4>
              <span className="text-[11px] text-white/40">
                {history.length} {history.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {loadingHistory ? (
              <div className="p-4 text-center text-xs text-white/40">Carregando histórico...</div>
            ) : history.length === 0 ? (
              <div className="p-4 bg-white/5 rounded-xl text-center text-xs text-white/40">
                Nenhum evento registrado no histórico até o momento.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 mt-0.5 shrink-0">
                        {getEventIcon(h)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {h.new_status ? (
                              <>
                                Status: <span className="text-[#FFD600]">{DECISION_STATUS_META[h.new_status]?.label || h.new_status}</span>
                                {h.previous_status && (
                                  <span className="text-white/40 font-normal ml-1">
                                    (de {DECISION_STATUS_META[h.previous_status]?.label || h.previous_status})
                                  </span>
                                )}
                              </>
                            ) : (
                              h.reason || 'Alteração realizada'
                            )}
                          </span>
                        </div>

                        {h.details && (
                          <p className="text-[11px] text-white/70 mt-0.5">
                            {h.details}
                          </p>
                        )}

                        {h.reason && h.new_status && (
                          <p className="text-[11px] text-white/60 italic mt-0.5">
                            &ldquo;{h.reason}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-white/40 shrink-0 text-right">
                      <span>{new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      {h.changed_by && <span className="block text-white/50">{h.changed_by}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="pt-3 text-[11px] text-white/40 flex items-center justify-between border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <User size={12} />
              Criado por {decision.created_by_name || 'Administrador'} em {formattedCreatedAt}
            </span>
            <span>ID: {decision.id}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
