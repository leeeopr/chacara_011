'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  id: number | string;
  title: string;
  description: string;
  table: string;
}

export default function DeleteModal({ isOpen, onClose, onSuccess, id, title, description, table }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir: ' + error.message);
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
                  <Trash2 size={20} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-wider">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                <p className="text-white/60 text-sm font-medium leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 px-6 rounded-2xl border border-white/10 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-[10px]"
                >
                  {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
