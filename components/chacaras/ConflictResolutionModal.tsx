'use client';

import React from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle2, Ban, EyeOff, Info } from 'lucide-react';
import { OperationalConflict } from '@/lib/chacaraTypes';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: OperationalConflict[];
  onClose: () => void;
  onIgnoreConflict: (conflictId: string) => void;
}

export default function ConflictResolutionModal({
  isOpen,
  conflicts,
  onClose,
  onIgnoreConflict
}: ConflictResolutionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A0F2C] border border-amber-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Conflitos de Operação Detectados</h3>
              <p className="text-xs text-amber-300/80">
                {conflicts.length} {conflicts.length === 1 ? 'conflito identificado' : 'conflitos identificados'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conflict List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {conflicts.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-white">Nenhum conflito ativo!</p>
              <p className="text-xs text-white/50">Toda a operação está organizada sem sobreposições de agenda.</p>
            </div>
          ) : (
            conflicts.map(c => (
              <div
                key={c.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  c.severity === 'CRITICO'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        c.severity === 'CRITICO'
                          ? 'bg-red-500 text-white'
                          : 'bg-amber-500 text-[#0A0F2C]'
                      }`}
                    >
                      {c.severity}
                    </span>
                    <span className="text-xs font-bold text-white">{c.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-white/50">{c.date}</span>
                </div>

                <p className="text-xs text-white/80 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                  {c.description}
                </p>

                <div className="flex justify-end items-center gap-2 pt-1">
                  <button
                    onClick={() => onIgnoreConflict(c.id)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <EyeOff size={14} />
                    <span>Ignorar Conflito</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#FFD600] text-[#0A0F2C] text-xs font-black rounded-xl hover:bg-[#FFE500]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
