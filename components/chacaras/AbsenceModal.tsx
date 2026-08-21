'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, MessageSquare, RotateCcw } from 'lucide-react';
import { OperationalEvent } from '@/lib/chacaraTypes';
import { updateOperationalEventStatus } from '@/services/operationalCalendarService';

interface AbsenceModalProps {
  isOpen: boolean;
  event: OperationalEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_REASONS = [
  'Atestado Médico / Doença',
  'Falta sem aviso prévio (No Show)',
  'Problema de Transporte / Veículo',
  'Condições Climáticas Adversas',
  'Conflito de Horário / Imprevisto Pessoal',
  'Outro Motivo'
];

export default function AbsenceModal({
  isOpen,
  event,
  onClose,
  onSuccess
}: AbsenceModalProps) {
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateOperationalEventStatus(event.id, 'FALTOU', {
        absence_reason: reason,
        absence_notes: notes,
        rescheduled_to_date: rescheduleDate || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar falta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A0F2C] border border-red-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-red-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Registrar Falta / Ausência</h3>
              <p className="text-xs text-red-300/80">{event.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
              Motivo da Falta
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
            >
              {COMMON_REASONS.map(r => (
                <option key={r} value={r} className="bg-[#0A0F2C] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
              Observações / Detalhes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descreva o ocorrido ou justificativa informada pelo funcionário..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600]">
              <RotateCcw size={15} />
              <span>Reagendar Serviço (Opcional)</span>
            </div>
            <p className="text-[11px] text-white/50">
              Se desejar, informe uma nova data para criar um evento reagendado automaticamente.
            </p>
            <input
              type="date"
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#FFD600]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl shadow-lg transition-all"
            >
              {loading ? 'Salvando...' : 'Confirmar Falta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
