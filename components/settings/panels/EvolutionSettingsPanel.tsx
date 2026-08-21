'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Plus, Edit2, GripVertical, AlertCircle } from 'lucide-react';

// This is a placeholder for a real evolution template manager
export default function EvolutionSettingsPanel() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass glass-reflection p-8 rounded-[40px] border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-500">
          <TrendingUp size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Evolução Terapêutica</h3>
          <p className="text-white/40 font-bold text-sm mt-1 tracking-tight">
            Configure etapas e modelos para o acompanhamento dos pacientes.
          </p>
        </div>
      </div>

      <div className="glass p-12 rounded-[40px] border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/10">
          <TrendingUp size={40} />
        </div>
        <div className="space-y-2 max-w-md">
          <h4 className="text-xl font-black text-white uppercase tracking-wider">Módulo em Desenvolvimento</h4>
          <p className="text-white/40 font-medium text-sm leading-relaxed">
            O gerenciamento de templates de evolução e fluxos de trabalho personalizados está sendo preparado para o próximo ciclo de atualizações.
          </p>
        </div>
        
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-500 text-[10px] font-black uppercase tracking-widest">
          <AlertCircle size={16} />
          Funcionalidade Beta - Breve Disponível
        </div>
      </div>
    </div>
  );
}
