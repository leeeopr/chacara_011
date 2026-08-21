'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2, Info } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Voltar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose
}: ConfirmationModalProps) {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 size={24} className="text-red-400" />,
          iconBg: 'bg-red-500/20 border-red-500/30',
          confirmBtn: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20',
          borderColor: 'border-red-500/30'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} className="text-amber-400" />,
          iconBg: 'bg-amber-500/20 border-amber-500/30',
          confirmBtn: 'bg-amber-500 hover:bg-amber-400 text-[#0A0F2C] font-black shadow-amber-500/20',
          borderColor: 'border-amber-500/30'
        };
      case 'info':
      default:
        return {
          icon: <Info size={24} className="text-[#FFD600]" />,
          iconBg: 'bg-[#FFD600]/20 border-[#FFD600]/30',
          confirmBtn: 'bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black shadow-[#FFD600]/20',
          borderColor: 'border-white/10'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div 
        className={`relative w-full max-w-md bg-[#0A0F2C] border ${styles.borderColor} rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleIn my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${styles.iconBg} shrink-0`}>
              {styles.icon}
            </div>
            <h3 className="text-lg font-black text-white">{title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-xs text-white/80 leading-relaxed font-normal">
          {description}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wide rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn}`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            <span>{isLoading ? 'Aguarde...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
