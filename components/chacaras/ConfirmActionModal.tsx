'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Info } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmActionModal({
  isOpen,
  title = 'Confirmar Ação',
  message,
  confirmText = 'Confirmar Exclusão',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  errorMessage = null,
  onConfirm,
  onClose
}: ConfirmActionModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0A0F2C]/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#12183B] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative text-white"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDanger ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                isWarning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {isDanger ? <Trash2 size={18} /> : isWarning ? <AlertTriangle size={18} /> : <Info size={18} />}
              </div>
              <h3 className="text-base font-bold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-white/80 leading-relaxed">
              {message}
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white/[0.03] border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/30'
                  : isWarning
                  ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-900/30'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30'
              }`}
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              <span>{loading ? 'Processando...' : confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
