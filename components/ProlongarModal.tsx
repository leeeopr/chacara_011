'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, AlignLeft, CornerDownRight, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Appointment } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProlongarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: Appointment | null;
}

export default function ProlongarModal({ isOpen, onClose, onSuccess, appointment }: ProlongarModalProps) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-populate fields from the original appointment when opened
  useEffect(() => {
    if (isOpen && appointment) {
      // Suggest tomorrow or keep empty for date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      
      // Default to same times as the original appointment
      setStartTime(appointment.start_time || '');
      
      // Calculate end time or use original if available
      if (appointment.end_time) {
        setEndTime(appointment.end_time);
      } else {
        // Fallback to start_time + 30m if not present
        if (appointment.start_time) {
          const [h, m] = appointment.start_time.split(':').map(Number);
          const total = h * 60 + m + 30;
          const endH = Math.floor(total / 60) % 24;
          const endM = total % 60;
          setEndTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
        } else {
          setEndTime('');
        }
      }
      setNotes('');
    }
  }, [isOpen, appointment]);

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      alert('Por favor, preencha a data, horário inicial e horário final.');
      return;
    }

    setLoading(true);

    try {
      // Rule 9: "Toda a cadeia deve apontar para a consulta original"
      const parentAppointmentId = appointment.parent_appointment_id || appointment.id;

      const payload = {
        patient_id: appointment.patient_id || null,
        patient_name: appointment.patient_name,
        whatsapp: appointment.whatsapp || '',
        birth_date: appointment.birth_date || (appointment as any).patients?.birth_date || null,
        fono_id: appointment.fono_id || null,
        appointment_date: date,
        start_time: startTime,
        end_time: endTime,
        appointment_type_id: appointment.appointment_type_id || null,
        status: 'PENDENTE', // Starts as pending like other appointments
        treatment_enabled: false, // Continuation appointments don't count as standard sessions or consume packages
        billing_company_id: appointment.billing_company_id || null,
        agreed_price: 0, // Continuation appointments are free of charge (value = 0)
        discount_value: 0,
        price_source: 'MANUAL_OVERRIDE', // Lock price at 0 so auto-billing doesn't override it
        parent_appointment_id: parentAppointmentId,
        is_continuation: true,
        continuation_notes: notes || null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('appointments')
        .insert([payload]);

      if (error) throw error;

      // Successfully created continuation
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao prolongar consulta:', err);
      alert('Erro ao criar continuação de consulta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format original date for display
  const originalDateFormatted = appointment.appointment_date
    ? format(parseISO(appointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-sky-500/5 shrink-0">
              <div className="flex items-center gap-3 text-sky-400">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                  <CornerDownRight size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider leading-none">Prolongar Consulta</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mt-1">Continuidade de Atendimento</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
              {/* Original Appointment Card */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block">
                  Consulta Original
                </label>
                <div className="text-white font-bold text-base leading-snug">
                  {appointment.patient_name}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-sky-400" />
                    {originalDateFormatted}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-sky-400" />
                    {appointment.start_time}
                  </span>
                </div>
              </div>

              {/* Informational Note */}
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/15 flex gap-3 text-xs text-sky-300 font-semibold leading-relaxed">
                <HelpCircle size={18} className="shrink-0 mt-0.5" />
                <span>
                  O prolongamento cria um novo horário de atendimento vinculado à consulta original. 
                  <strong className="text-white block mt-1">Nenhuma nova cobrança ou produção financeira será gerada para este novo horário.</strong>
                </span>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                {/* Date Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar size={14} className="text-sky-400" /> Data da Continuação
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all font-bold text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Time Inputs Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Clock size={14} className="text-sky-400" /> Horário Inicial
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all font-bold text-sm"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Clock size={14} className="text-sky-400" /> Horário Final
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all font-bold text-sm"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <AlignLeft size={14} className="text-sky-400" /> Observações (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Dar continuidade ao teste de via aérea, paciente fadigou..."
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all resize-none font-bold text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 px-6 rounded-2xl border border-white/10 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-sky-900/20 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-[10px]"
                >
                  {loading ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
