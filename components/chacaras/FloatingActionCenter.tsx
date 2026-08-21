'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  X,
  CalendarCheck,
  UserPlus,
  TreePine,
  Ban,
  Briefcase,
  HardHat,
  Tag,
  CreditCard,
  TrendingDown,
  Sparkles,
  ChevronRight,
  CheckSquare,
  FolderPlus,
  Users,
  Wallet
} from 'lucide-react';
import { TabType } from './ChacarasSidebar';
import { getActionsForModule, ActionItem, ActionTriggerId } from '@/lib/actionRegistry';
import { useAuth } from '@/contexts/AuthContext';

interface FloatingActionCenterProps {
  activeTab: TabType;
  onActionTrigger: (triggerId: ActionTriggerId) => void;
}

// Map string icon names to Lucide icon components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  CalendarCheck,
  UserPlus,
  TreePine,
  Ban,
  Briefcase,
  HardHat,
  Tag,
  CreditCard,
  TrendingDown,
  Sparkles,
  CheckSquare,
  FolderPlus,
  Users,
  Wallet
};

export default function FloatingActionCenter({
  activeTab,
  onActionTrigger
}: FloatingActionCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  // Load active actions dynamically for the active module and user role
  const actions = getActionsForModule(activeTab, profile?.role);

  // Close speed dial when active tab changes
  useEffect(() => {
    setIsOpen(false);
  }, [activeTab]);

  // Click outside listener to close speed dial automatically
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectAction = (triggerId: ActionTriggerId) => {
    setIsOpen(false);
    // Small delay to allow menu animation to close smoothly
    setTimeout(() => {
      onActionTrigger(triggerId);
    }, 120);
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-4 sm:right-8 z-50 flex flex-col items-end pointer-events-none pb-safe"
    >
      {/* Backdrop overlay when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto z-40"
          />
        )}
      </AnimatePresence>

      {/* Speed Dial Menu Floating Stack */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="pointer-events-auto z-50 mb-4 flex flex-col gap-2.5 items-end max-w-sm w-[calc(100vw-2rem)] sm:w-80"
          >
            {/* Header Badge */}
            <div className="px-3 py-1.5 rounded-full bg-[#0A0F2C]/90 border border-white/15 text-white/70 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-xl backdrop-blur-md self-end mb-1">
              <Sparkles size={12} className="text-[#FFD600] animate-pulse" />
              <span>Centro de Ações • {actions.length} {actions.length === 1 ? 'Ação' : 'Ações'}</span>
            </div>

            {/* List of Dynamic Actions */}
            <div className="w-full space-y-2 max-h-[65vh] overflow-y-auto custom-scrollbar p-1">
              {actions.map((action, idx) => {
                const IconComponent = ICON_MAP[action.iconName] || Plus;

                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                    onClick={() => handleSelectAction(action.id)}
                    className="w-full text-left group p-3 rounded-2xl bg-[#0A0F2C]/95 hover:bg-[#12193E] border border-white/15 hover:border-[#FFD600]/40 shadow-2xl backdrop-blur-xl transition-all duration-200 flex items-center gap-3.5 active:scale-[0.98]"
                  >
                    {/* Action Icon Pill */}
                    <div className={`p-2.5 rounded-xl ${action.colorScheme.bg} ${action.colorScheme.text} ${action.colorScheme.border} border transition-transform group-hover:scale-110 group-hover:rotate-3 shrink-0 shadow-lg ${action.colorScheme.glow}`}>
                      <IconComponent size={20} />
                    </div>

                    {/* Action Text Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-white group-hover:text-[#FFD600] transition-colors truncate">
                          {action.label}
                        </span>
                        {action.badge && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/30 shrink-0">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors truncate">
                        {action.description}
                      </p>
                    </div>

                    <ChevronRight size={16} className="text-white/30 group-hover:text-[#FFD600] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir Centro de Ações"
        title={isOpen ? "Fechar Ações" : "Abrir Centro de Ações (Atalhos Rápido)"}
        className={`pointer-events-auto z-50 p-4 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center gap-2.5 border backdrop-blur-xl ${
          isOpen
            ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400/50 shadow-rose-500/30'
            : 'bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] border-amber-300/60 shadow-[#FFD600]/25'
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center justify-center"
        >
          <Plus size={24} className="stroke-[3]" />
        </motion.div>

        <span className="text-xs font-black uppercase tracking-wider hidden sm:inline-block pr-1">
          {isOpen ? 'Fechar' : 'Ações'}
        </span>
      </motion.button>
    </div>
  );
}
