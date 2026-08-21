'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  RotateCcw, 
  Calendar, 
  Check, 
  ShieldAlert,
  Building2,
  Clock,
  User,
  ShieldCheck
} from 'lucide-react';
import { OperationalEvent } from '@/lib/chacaraTypes';

interface DeleteServiceConfirmModalProps {
  isOpen: boolean;
  event: OperationalEvent | null;
  onClose: () => void;
  onConfirm: (options: {
    scope: 'THIS_OCCURRENCE' | 'ALL_OCCURRENCES' | 'THIS_AND_FUTURE';
    disableAutomation: boolean;
    reason: string;
  }) => Promise<void>;
}

export default function DeleteServiceConfirmModal({
  isOpen,
  event,
  onClose,
  onConfirm
}: DeleteServiceConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States
  const [automationChoice, setAutomationChoice] = useState<'EXCLUIR_APENAS' | 'EXCLUIR_E_IMPEDIR'>('EXCLUIR_APENAS');
  const [recurrenceScope, setRecurrenceScope] = useState<'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES'>('THIS_OCCURRENCE');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAutomationChoice('EXCLUIR_APENAS');
      setRecurrenceScope('THIS_OCCURRENCE');
      setReason('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const isAutomatic = Boolean(
    event.metadata?.origin === 'AUTOMATICA' || 
    event.metadata?.type === 'LIMPEZA_PRE_CHECKIN' || 
    event.reservation_id
  );

  const isRecurring = Boolean(
    event.recurrence_rule_id || 
    event.id.startsWith('gen-')
  );

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm({
        scope: recurrenceScope,
        disableAutomation: isAutomatic && automationChoice === 'EXCLUIR_E_IMPEDIR',
        reason: reason.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir o agendamento de serviço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0A0F2C] border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/20 text-rose-400 p-2.5 rounded-2xl border border-rose-500/30">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Excluir Agendamento de Serviço</h3>
              <p className="text-xs text-white/50">Confirme a exclusão e ajuste os parâmetros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Service Summary Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {event.event_type_code?.toUpperCase() || 'SERVIÇO'}
              </span>
              <span className="text-xs font-mono text-white/60">
                ID: #{event.id.replace(/^op_/, '').slice(0, 8)}
              </span>
            </div>
            <h4 className="text-base font-bold text-white">{event.title}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/70 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-cyan-400" />
                <span>{event.start_date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-cyan-400" />
                <span>{event.start_time} - {event.end_time || '12:00'}</span>
              </div>
            </div>
          </div>

          {/* 1. AUTOMATIC SERVICE OPTIONS */}
          {isAutomatic && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <Sparkles size={16} />
                <span>Serviço Gerado Automaticamente por Reserva</span>
              </div>
              <p className="text-xs text-amber-200/80">
                O serviço foi criado automaticamente por uma reserva. Como deseja proceder?
              </p>

              <div className="space-y-2 pt-1">
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  automationChoice === 'EXCLUIR_APENAS'
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}>
                  <input
                    type="radio"
                    name="automationChoice"
                    checked={automationChoice === 'EXCLUIR_APENAS'}
                    onChange={() => setAutomationChoice('EXCLUIR_APENAS')}
                    className="mt-0.5 accent-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold block">Excluir apenas este agendamento</span>
                    <span className="text-[11px] text-white/50 block">
                      Remove o serviço atual. A automação pode recriá-lo se a reserva for alterada posteriormente.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  automationChoice === 'EXCLUIR_E_IMPEDIR'
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}>
                  <input
                    type="radio"
                    name="automationChoice"
                    checked={automationChoice === 'EXCLUIR_E_IMPEDIR'}
                    onChange={() => setAutomationChoice('EXCLUIR_E_IMPEDIR')}
                    className="mt-0.5 accent-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold block">Excluir e impedir que a automação o recrie para esta reserva</span>
                    <span className="text-[11px] text-white/50 block">
                      Remove o serviço e grava uma trava permanente na reserva para não recriar a limpeza automática.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* 2. RECURRING SERVICE OPTIONS */}
          {isRecurring && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                <RotateCcw size={16} />
                <span>Serviço Pertencente a Série Recorrente</span>
              </div>
              <p className="text-xs text-purple-200/80">
                Este serviço possui repetição configurada. Como deseja proceder com a exclusão?
              </p>

              <div className="space-y-2 pt-1">
                <label className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  recurrenceScope === 'THIS_OCCURRENCE'
                    ? 'bg-purple-500/20 border-purple-400 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}>
                  <input
                    type="radio"
                    name="recurrenceScope"
                    checked={recurrenceScope === 'THIS_OCCURRENCE'}
                    onChange={() => setRecurrenceScope('THIS_OCCURRENCE')}
                    className="accent-purple-400"
                  />
                  <span className="text-xs font-bold">Excluir apenas esta ocorrência</span>
                </label>

                <label className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  recurrenceScope === 'THIS_AND_FUTURE'
                    ? 'bg-purple-500/20 border-purple-400 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}>
                  <input
                    type="radio"
                    name="recurrenceScope"
                    checked={recurrenceScope === 'THIS_AND_FUTURE'}
                    onChange={() => setRecurrenceScope('THIS_AND_FUTURE')}
                    className="accent-purple-400"
                  />
                  <span className="text-xs font-bold">Excluir esta ocorrência e as futuras</span>
                </label>

                <label className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  recurrenceScope === 'ALL_OCCURRENCES'
                    ? 'bg-purple-500/20 border-purple-400 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}>
                  <input
                    type="radio"
                    name="recurrenceScope"
                    checked={recurrenceScope === 'ALL_OCCURRENCES'}
                    onChange={() => setRecurrenceScope('ALL_OCCURRENCES')}
                    className="accent-purple-400"
                  />
                  <span className="text-xs font-bold">Excluir toda a série recorrente</span>
                </label>
              </div>
            </div>
          )}

          {/* Standard Confirmation Text */}
          {!isAutomatic && !isRecurring && (
            <p className="text-sm font-medium text-white/80">
              Tem certeza que deseja excluir este agendamento de serviço?
            </p>
          )}

          {/* Reason Input for Audit Trail */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
              Motivo da exclusão (Audit trail)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Mudança de cronograma, solicitação do cliente..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-rose-400 transition-all"
            />
          </div>

          {/* Reservation Unidirectional Safety Notice */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-200 text-[11px] flex items-center gap-2">
            <ShieldCheck size={16} className="shrink-0 text-cyan-400" />
            <span>
              <strong>Garantia de Integridade:</strong> A exclusão deste serviço afetará apenas o cronograma de equipe. A reserva associada permanecerá intacta.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Excluindo...</span>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Excluir Serviço</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
