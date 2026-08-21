'use client';

import React from 'react';
import ProfessionalList from '@/components/ProfessionalList';
import { motion } from 'motion/react';
import { Users, Info } from 'lucide-react';

export default function ProfessionalSettingsPanel() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass glass-reflection p-8 rounded-[40px] border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
          <Users size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Equipe Profissional</h3>
          <p className="text-white/40 font-bold text-sm mt-1 tracking-tight">
            Gerencie o cadastro de fonoaudiólogos e profissionais vinculados à clínica.
          </p>
        </div>
      </div>

      <ProfessionalList refreshKey={0} />
    </div>
  );
}
