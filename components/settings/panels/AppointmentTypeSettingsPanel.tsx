'use client';

import React from 'react';
import AppointmentTypeList from '@/components/AppointmentTypeList';
import { motion } from 'motion/react';
import { Layers, Info } from 'lucide-react';

export default function AppointmentTypeSettingsPanel() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass glass-reflection p-8 rounded-[40px] border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
          <Layers size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Tipos de Consulta</h3>
          <p className="text-white/40 font-bold text-sm mt-1 tracking-tight">
            Gerencie os tipos de atendimento, durações e identidade visual da agenda.
          </p>
        </div>
      </div>

      <AppointmentTypeList />

      <div className="glass p-8 rounded-[32px] border border-white/5 flex items-start gap-4 bg-white/[0.02]">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
          <Info size={18} className="text-white/40" />
        </div>
        <div className="space-y-2">
          <h4 className="font-black text-white uppercase tracking-widest text-xs">Dica de Gestão</h4>
          <p className="text-sm text-white/40 font-medium leading-relaxed">
            Arquivar um tipo impede que ele seja selecionado em novos agendamentos, 
            mas mantém as informações visuais em consultas passadas para integridade histórica.
          </p>
        </div>
      </div>
    </div>
  );
}
