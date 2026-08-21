'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Box, CheckCircle2, Clock, Terminal, ChevronRight, Zap, Target } from 'lucide-react';
import { Evolution, EvolutionPack } from '@/lib/types';

interface EvolutionPackCardProps {
  pack: EvolutionPack;
  evolutions: Evolution[];
  onEditEvolution?: (evo: Evolution) => void;
  canEdit?: boolean;
}

export default function EvolutionPackCard({ pack, evolutions, onEditEvolution, canEdit }: EvolutionPackCardProps) {
  const currentWeight = useMemo(() => 
    evolutions.reduce((sum, evo) => sum + (evo.weight || 0), 0)
  , [evolutions]);

  const progressPercent = Math.min(100, Math.round((currentWeight / pack.max_weight) * 100));
  const isFull = currentWeight >= pack.max_weight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass glass-reflection rounded-[40px] border border-white/5 overflow-hidden transition-all duration-500 hover:border-white/10 ${
        pack.status === 'OPEN' ? 'ring-1 ring-[#FF6F00]/20' : ''
      }`}
    >
      {/* Pack Header */}
      <div className="p-8 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border ${
              pack.status === 'OPEN' 
                ? 'bg-[#FF6F00] border-[#FF6F00]/30 text-white' 
                : 'bg-white/5 border-white/10 text-white/40'
            }`}>
              <Box size={24} />
            </div>
            <div>
              <h4 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                Pack #{pack.number}
                {pack.status === 'OPEN' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] text-emerald-500 font-black">OPEN</span>
                )}
              </h4>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {pack.status === 'OPEN' ? 'Capacidade Tecnológica Atual' : `Concluído em ${new Date(pack.completed_at || '').toLocaleDateString()}`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white">{currentWeight}<span className="text-white/20">/{pack.max_weight}</span></span>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Peso Total</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${
                isFull ? 'from-rose-500 to-rose-400' : 'from-[#FF6F00] to-orange-400'
              } shadow-[0_0_15px_rgba(255,111,0,0.3)]`}
            />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/40">
            <span>Utilization: {progressPercent}%</span>
            <span>{isFull ? 'CAPACITY REACHED' : `${pack.max_weight - currentWeight} UNITS REMAINING`}</span>
          </div>
        </div>
      </div>

      {/* Evolutions List */}
      <div className="p-8 space-y-4">
        {evolutions.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Terminal size={32} className="mx-auto text-white/5" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Inicie a expansão para este pack</p>
          </div>
        ) : (
          <div className="space-y-3">
            {evolutions.map((evo) => (
              <div
                key={evo.id}
                onClick={() => canEdit && onEditEvolution?.(evo)}
                className={`group flex items-center justify-between p-5 rounded-2xl border bg-white/[0.02] border-white/5 transition-all hover:bg-white/[0.05] ${
                  canEdit ? 'cursor-pointer hover:border-white/10' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    evo.status === 'CONCLUÍDA' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                      : evo.status === 'EM DESENVOLVIMENTO'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                        : 'bg-white/5 border-white/10 text-white/20'
                  }`}>
                    {evo.status === 'CONCLUÍDA' ? <CheckCircle2 size={18} /> : <Zap size={18} />}
                  </div>
                  <div className="max-w-[200px] md:max-w-md">
                    <h5 className="text-sm font-black text-white uppercase tracking-wider truncate group-hover:text-[#FFD600] transition-colors">{evo.title}</h5>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[8px] font-black text-[#FFD600] uppercase tracking-widest">{evo.category || 'GERAL'}</span>
                      <span className="text-[10px] text-white/20">•</span>
                      <span className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                        <Target size={8} /> {evo.weight} pts
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/10 group-hover:text-white/40 transition-all group-hover:translate-x-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
