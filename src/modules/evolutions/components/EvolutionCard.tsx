'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Target, Clipboard, FileCode, CheckCircle, Clock } from 'lucide-react';
import { Evolution } from '../types';
import { STATUS_STYLING } from '../constants';

interface EvolutionCardProps {
  evolution: Evolution;
  onEditClick: (evo: Evolution) => void;
  canEdit: boolean;
}

export default function EvolutionCard({ evolution, onEditClick, canEdit }: EvolutionCardProps) {
  const statusConfig = STATUS_STYLING[evolution.status] || STATUS_STYLING['BACKLOG'];

  // Safe markdown/text truncator
  const truncatedDescription = evolution.description 
    ? evolution.description.length > 70 
      ? evolution.description.substring(0, 70) + '...'
      : evolution.description
    : 'Nenhum detalhamento técnico associado.';

  return (
    <motion.div
      whileHover={canEdit ? { scale: 1.018, y: -2 } : {}}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => canEdit && onEditClick(evolution)}
      className={`group relative flex items-center justify-between p-5 rounded-2xl border bg-white/[0.015] ${statusConfig.border} transition-all duration-300 ${
        canEdit ? 'cursor-pointer hover:bg-white/[0.04] hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]' : 'cursor-default'
      }`}
    >
      {/* Light glow behind on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 rounded-2xl pointer-events-none" 
        style={{ backgroundColor: statusConfig.color }}
      />

      <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
        {/* Status Indicator circle with dynamic ring colored glows */}
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:rotate-12"
          style={{ 
            backgroundColor: `${statusConfig.color}10`, 
            borderColor: `${statusConfig.color}35`,
            color: statusConfig.color 
          }}
        >
          {evolution.status === 'CONCLUÍDA' ? (
            <CheckCircle size={15} />
          ) : evolution.status === 'EM DESENVOLVIMENTO' ? (
            <FileCode size={15} className="animate-pulse" />
          ) : (
            <Clock size={15} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-xs font-black text-white uppercase tracking-wider truncate group-hover:text-[#FFD600] transition-colors leading-normal max-w-[200px] sm:max-w-xs md:max-w-md">
              {evolution.title}
            </h4>
            <span 
              className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest border shrink-0`}
              style={{ 
                backgroundColor: `${statusConfig.color}08`, 
                borderColor: `${statusConfig.color}25`, 
                color: statusConfig.color 
              }}
            >
              {statusConfig.label}
            </span>
          </div>

          <p className="text-[10px] text-white/40 leading-normal font-medium truncate">
            {truncatedDescription}
          </p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[7.5px] font-black text-[#FF6F00] uppercase tracking-widest bg-[#FF6F00]/5 px-2 py-0.5 rounded border border-[#FF6F00]/10 shrink-0">
              {evolution.category || 'Geral'}
            </span>
            <span className="text-[8px] font-bold text-white/20">•</span>
            <span className="text-[7.5px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1 shrink-0">
              <Target size={9} /> {evolution.weight} pts
            </span>
            {evolution.implementation_notes && (
              <>
                <span className="text-[8px] font-bold text-white/20">•</span>
                <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
                  <Clipboard size={9} /> Notas
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <ChevronRight 
        size={14} 
        className="text-white/10 group-hover:text-white/40 group-hover:translate-x-1.5 transition-all shrink-0" 
      />
    </motion.div>
  );
}
