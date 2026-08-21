'use client';

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: string;
  permission?: boolean;
}

export default function SettingsCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  color = '#FFD600',
  permission = true 
}: SettingsCardProps) {
  if (!permission) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass glass-reflection p-8 rounded-[32px] border border-white/5 text-left group relative overflow-hidden flex flex-col h-full transition-all hover:border-white/10"
    >
      {/* Background Glow */}
      <div 
        className="absolute -right-4 -top-4 w-24 h-24 blur-[60px] opacity-20 transition-all group-hover:opacity-40"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between mb-8 relative z-10">
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all group-hover:scale-110"
          style={{ 
            backgroundColor: `${color}10`, 
            borderColor: `${color}20`,
            color: color
          }}
        >
          <Icon size={28} />
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white group-hover:bg-white/10 transition-all">
          <ChevronRight size={18} />
        </div>
      </div>

      <div className="relative z-10 space-y-2 mt-auto">
        <h3 className="text-lg font-black text-white uppercase tracking-wider group-hover:text-[#FFD600] transition-colors line-clamp-1">
          {title}
        </h3>
        <p className="text-xs font-medium text-white/40 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      {/* Interactive indicator bar */}
      <div 
        className="absolute left-8 bottom-0 h-1 w-0 group-hover:w-12 transition-all duration-500 rounded-full"
        style={{ backgroundColor: color }}
      />
    </motion.button>
  );
}
