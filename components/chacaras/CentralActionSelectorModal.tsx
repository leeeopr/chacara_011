'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CalendarCheck, 
  HardHat, 
  Ban, 
  Sparkles, 
  ChevronRight, 
  TreePine, 
  Users,
  UserPlus,
  Briefcase,
  Tag,
  CreditCard,
  TrendingDown,
  CheckSquare,
  FolderPlus,
  Plus,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { TabType } from './ChacarasSidebar';
import { getActionsForModule, ActionItem, ActionTriggerId } from '@/lib/actionRegistry';
import { useAuth } from '@/contexts/AuthContext';

interface CentralActionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onActionTrigger: (triggerId: ActionTriggerId) => void;
}

const TAB_TITLES: Record<TabType, string> = {
  dashboard: 'Dashboard General',
  chacaras: 'Chácaras & Propriedades',
  reservas: 'Central de Reservas',
  calendario: 'Calendário de Ocupação',
  clientes: 'Cadastro de Clientes',
  equipe: 'Gestão de Equipe (Crew)',
  pendencias: 'Módulo de Pendências',
  planejamento: 'Planejamento & Decisões',
  contas_a_pagar: 'Contas a Pagar & Recorrências',
  financeiro: 'Módulo Financeiro',
  impostos: 'Gestão Fiscal & Carnê-Leão',
  configuracoes: 'Configurações do Sistema'
};

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  CalendarCheck,
  HardHat,
  AlertTriangle,
  UserPlus,
  TreePine,
  Ban,
  Briefcase,
  Users,
  Tag,
  CreditCard,
  TrendingDown,
  CheckSquare,
  FolderPlus,
  Sparkles,
  Wallet
};

export default function CentralActionSelectorModal({
  isOpen,
  onClose,
  activeTab,
  onActionTrigger
}: CentralActionSelectorModalProps) {
  const { profile } = useAuth();

  if (!isOpen) return null;

  // Load contextual actions for the active screen
  const actions = getActionsForModule(activeTab, profile?.role);
  const currentTabLabel = TAB_TITLES[activeTab] || 'Módulo Atual';

  const handleSelectAction = (triggerId: ActionTriggerId) => {
    onClose();
    setTimeout(() => {
      onActionTrigger(triggerId);
    }, 100);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-[#0A0F2C] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#FFD600]/10 border border-[#FFD600]/30 rounded-2xl text-[#FFD600]">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">Menu de Ações Rápidas</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] text-[10px] font-black uppercase tracking-wider">
                    Contextual
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  Ações recomendadas para: <strong className="text-white font-bold">{currentTabLabel}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              title="Fechar"
            >
              <X size={22} />
            </button>
          </div>

          {/* Cards Options */}
          <div className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[75vh] custom-scrollbar">
            {actions.map((action) => {
              const IconComponent = ICON_MAP[action.iconName] || Plus;

              return (
                <button
                  key={action.id}
                  onClick={() => handleSelectAction(action.id)}
                  className="w-full text-left p-4 rounded-2xl bg-[#0A0F2C] hover:bg-[#12193E] border border-white/15 hover:border-[#FFD600]/60 transition-all duration-200 group flex items-center gap-4 active:scale-[0.98] cursor-pointer shadow-lg"
                >
                  <div className={`p-3 rounded-2xl ${action.colorScheme.bg} ${action.colorScheme.text} border ${action.colorScheme.border} group-hover:scale-110 transition-transform shrink-0 ${action.colorScheme.glow}`}>
                    <IconComponent size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm sm:text-base font-black text-white group-hover:text-[#FFD600] transition-colors truncate">
                        {action.label}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-extrabold uppercase tracking-wider shrink-0 border border-white/10">
                        {action.category}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed truncate">
                      {action.description}
                    </p>
                  </div>

                  <ChevronRight size={20} className="text-white/30 group-hover:text-[#FFD600] group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              );
            })}

            {actions.length === 0 && (
              <div className="p-8 text-center text-white/50 text-xs">
                Nenhuma ação contextual disponível para o seu perfil nesta tela.
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-white/50 shrink-0">
            <span>✨ Exibindo {actions.length} {actions.length === 1 ? 'ação' : 'ações'} ativas para esta tela.</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

