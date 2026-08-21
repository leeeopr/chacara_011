'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, LayoutGrid } from 'lucide-react';
import SettingsDashboard from './SettingsDashboard';
import ReminderSettingsPanel from './settings/panels/ReminderSettingsPanel';
import AppointmentTypeSettingsPanel from './settings/panels/AppointmentTypeSettingsPanel';
import ProfessionalSettingsPanel from './settings/panels/ProfessionalSettingsPanel';
import ScheduleBlocksManagement from './ScheduleBlocksManagement';
import EvolutionSystem from './EvolutionSystem';
import PermissionsPanel from './settings/panels/PermissionsPanel';

type SettingsPanel = 'dashboard' | 'reminders' | 'appointment-types' | 'professionals' | 'evolutions' | 'permissions' | 'schedule-blocks';

export default function SettingsTab() {
  const [activePanel, setActivePanel] = useState<SettingsPanel>('dashboard');

  const renderPanel = () => {
    switch (activePanel) {
      case 'reminders':
        return <ReminderSettingsPanel />;
      case 'appointment-types':
        return <AppointmentTypeSettingsPanel />;
      case 'professionals':
        return <ProfessionalSettingsPanel />;
      case 'schedule-blocks':
        return <ScheduleBlocksManagement />;
      case 'evolutions':
        return <EvolutionSystem />;
      case 'permissions':
        return <PermissionsPanel />;
      default:
        return <SettingsDashboard onSelect={(p) => setActivePanel(p as SettingsPanel)} />;
    }
  };

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'reminders': return 'Lembretes';
      case 'appointment-types': return 'Tipos de Consulta';
      case 'professionals': return 'Equipe Profissional';
      case 'schedule-blocks': return 'Bloqueios de Horário';
      case 'evolutions': return 'Evoluções';
      case 'permissions': return 'Permissões e Acessos';
      default: return 'Painel Administrativo';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Header with Breadcrumb-like navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {activePanel !== 'dashboard' ? (
              <motion.button
                key="back"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setActivePanel('dashboard')}
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <ChevronLeft size={24} />
              </motion.button>
            ) : (
              <motion.div
                key="dashboard-icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-12 h-12 rounded-2xl bg-[#FFD600]/10 border border-[#FFD600]/20 flex items-center justify-center text-[#FFD600]"
              >
                <LayoutGrid size={24} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Configurações</span>
              {activePanel !== 'dashboard' && (
                <>
                  <span className="text-white/10">/</span>
                  <span className="text-[10px] font-black text-[#FFD600] uppercase tracking-[0.3em]">Módulo</span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">{getPanelTitle()}</h1>
          </div>
        </div>

        {activePanel === 'dashboard' && (
          <div className="hidden md:flex items-center gap-4 p-2 glass rounded-2xl border border-white/5">
            <div className="px-4 py-2 text-[10px] font-black text-white/40 uppercase tracking-widest border-r border-white/5">
              Hub Modular v2.0
            </div>
            <div className="px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Sincronizado</span>
            </div>
          </div>
        )}
      </div>

      {/* Internal Routing with Animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePanel}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ 
            duration: 0.4, 
            ease: [0.22, 1, 0.36, 1] 
          }}
        >
          {renderPanel()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
