'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { billingsService } from '@/services/billingsService';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentId: number | string;
}

export default function CancelModal({ isOpen, onClose, onSuccess, appointmentId }: CancelModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'CANCELADO',
          cancel_reason: reason
        })
        .eq('id', appointmentId);

      if (error) throw error;

      try {
        await billingsService.syncBillingForAppointment(String(appointmentId));
      } catch (e) {
        console.error('Error syncing billing on cancel:', e);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao cancelar consulta:', error);
      alert('Erro ao cancelar consulta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-md overflow-hidden border border-white/10 shadow-2xl relative"
          >
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <AlertCircle size={20} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-wider">Cancelar</h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCancel} className="p-8 space-y-6">
              <p className="text-white/60 text-sm font-medium leading-relaxed">
                Tem certeza que deseja cancelar esta consulta? Esta ação pode ser revertida através do reagendamento.
              </p>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                  Motivo do Cancelamento (Opcional)
                </label>
                <textarea
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all min-h-[120px] resize-none font-bold"
                  placeholder="Ex: Paciente doente, imprevisto..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

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
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-[10px]"
                >
                  {loading ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
