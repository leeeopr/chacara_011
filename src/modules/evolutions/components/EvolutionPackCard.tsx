/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Lock, Unlock, ChevronDown, Terminal, Target } from 'lucide-react';
import { Evolution, EvolutionPack } from '../types';
import { calculatePackCapacity } from '../utils/calculations';
import { PACK_STATUS_STYLING } from '../constants';
import EvolutionCard from './EvolutionCard';

interface EvolutionPackCardProps {
  pack: EvolutionPack;
  evolutions: Evolution[];
  onEditEvolution: (evo: Evolution) => void;
  canEdit: boolean;
}

export default function EvolutionPackCard({ pack, evolutions, onEditEvolution, canEdit }: EvolutionPackCardProps) {
  const isPackOpen = pack.status === 'OPEN';
  const [isExpanded, setIsExpanded] = useState(isPackOpen);

  // Auto-expand if the pack changes from closed to open
  useEffect(() => {
    if (isPackOpen) {
      setIsExpanded(true);
    }
  }, [isPackOpen]);

  // Compute stats in runtime
  const stats = useMemo(() => {
    return calculatePackCapacity(pack, evolutions);
  }, [pack, evolutions]);

  const packStyle = PACK_STATUS_STYLING[pack.status] || PACK_STATUS_STYLING['CLOSED'];
  const progressPercent = stats.completion_percentage;
  const isFull = stats.consumed_weight >= pack.max_weight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass glass-reflection rounded-[30px] border overflow-hidden transition-all duration-300 ${
        isPackOpen 
          ? 'border-[#FF6F00]/25 ring-1 ring-[#FF6F00]/10 shadow-[0_15px_35px_rgba(255,111,0,0.04)]' 
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      {/* Clickable Header for Accordion */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-6 md:p-8 bg-white/[0.015] border-b border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
            isPackOpen 
              ? 'bg-[#FF6F00] border-[#FF6F00]/30 text-white shadow-[0_5px_15px_rgba(255,111,0,0.25)]' 
              : 'bg-white/5 border-white/10 text-white/40'
          }`}>
            <Box size={20} />
          </div>
          <div>
            <h4 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
              Pack #{pack.number}
              <span className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border ${packStyle.bg} ${packStyle.color}`}>
                {pack.status}
              </span>
            </h4>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-0.5">
              {isPackOpen ? 'Capacidade em Consumo' : `Finalizado em ${new Date(pack.completed_at || pack.created_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {/* Telemetry and Controls */}
        <div className="flex items-center justify-between md:justify-end gap-6">
          <div className="text-left md:text-right">
            <span className="text-xl font-black text-white font-mono">
              {stats.consumed_weight}<span className="text-white/20">/{pack.max_weight}</span>
            </span>
            <p className="text-[7.5px] font-black text-white/25 uppercase tracking-widest mt-0.5">Carga Acumulada</p>
          </div>

          <div className="flex items-center gap-3">
            {isPackOpen ? (
              <Unlock size={14} className="text-emerald-500 shrink-0" />
            ) : (
              <Lock size={14} className="text-white/20 shrink-0" />
            )}
            
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white"
            >
              <ChevronDown size={14} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Accordion content with Framer Motion */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden bg-white/[0.003]"
          >
            {/* Quick Internal Progress Subelement */}
            <div className="px-6 md:px-8 py-4 bg-white/[0.01] border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-2.5">
              <div className="h-2 w-full md:w-64 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 shrink-0">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full bg-gradient-to-r ${
                    isFull ? 'from-rose-500 to-rose-400' : 'from-[#FF6F00] to-orange-400'
                  }`}
                />
              </div>
              <div className="w-full md:w-auto flex justify-between md:justify-end gap-4 text-[8px] font-black uppercase tracking-widest text-white/30">
                <span>Capacidade: {progressPercent}%</span>
                <span>{isFull ? 'LIMITE EXCEDIDO' : `${pack.max_weight - stats.consumed_weight} PTS RESTANTES`}</span>
              </div>
            </div>

            {/* Evolutions Child Grid */}
            <div className="p-6 md:p-8 space-y-3">
              {evolutions.length === 0 ? (
                <div className="py-12 border border-dashed border-white/5 rounded-2xl text-center space-y-2">
                  <Terminal size={26} className="mx-auto text-white/5" />
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Aguardando injeção técnica de evoluções</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evolutions.map((evo) => (
                    <EvolutionCard
                      key={evo.id}
                      evolution={evo}
                      onEditClick={onEditEvolution}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
