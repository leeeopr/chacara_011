'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ShieldX, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  loading: boolean;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, loading }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F2C]/90 backdrop-blur-3xl">
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md glass glass-reflection rounded-[40px] border border-rose-500/20 overflow-hidden shadow-[0_25px_60px_rgba(244,63,94,0.15)] z-10"
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
              <ShieldX size={24} />
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" /> Ação Irreversível
            </h4>
            <p className="text-sm text-white/60 leading-relaxed">
              Você está prestes a remover permanentemente a evolução estratégica: <strong className="text-white">“{title}”</strong>.
            </p>
            <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">
              Esta ação removerá permanentemente o consumo de peso deste pack e não poderá ser desfeita.
            </p>
          </div>

          <div className="border-t border-white/5 mt-8 pt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              Recuar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3.5 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Remover Registro'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
