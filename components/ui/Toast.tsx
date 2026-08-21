'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'success',
  isOpen,
  onClose,
  duration = 3500
}: ToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-5 right-5 z-[200] flex items-center gap-3 px-4 py-3 bg-[#0A0F2C] border border-emerald-500/40 text-white rounded-2xl shadow-2xl animate-bounceIn min-w-[280px]">
      {type === 'success' && <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />}
      {type === 'error' && <AlertCircle size={20} className="text-red-400 shrink-0" />}
      <span className="text-xs font-bold flex-1">{message}</span>
      <button 
        onClick={onClose}
        className="p-1 text-white/40 hover:text-white rounded-lg transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
