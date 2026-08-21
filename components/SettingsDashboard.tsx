'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Layers, Users, TrendingUp, ShieldCheck, Cog, Clock } from 'lucide-react';
import SettingsCard from './SettingsCard';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsDashboardProps {
  onSelect: (panel: string) => void;
}

export default function SettingsDashboard({ onSelect }: SettingsDashboardProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'DONA' || profile?.role === 'admin' || profile?.role === 'SECRETARIA';

  const cards = [
    {
      id: 'reminders',
      title: 'Lembretes',
      description: 'Configure modelos de mensagens automáticas e templates de confirmação para WhatsApp.',
      icon: MessageSquare,
      color: '#FFD600',
      permission: true // Everyone can view, but save is restricted (handled in panel)
    },
    {
      id: 'appointment-types',
      title: 'Tipos de Consulta',
      description: 'Defina durações, cores e tipos de agendamentos disponíveis na sua clínica.',
      icon: Layers,
      color: '#3b82f6',
      permission: true
    },
    {
      id: 'professionals',
      title: 'Profissionais',
      description: 'Gerencie a equipe de fonoaudiólogos e profissionais da clínica.',
      icon: Users,
      color: '#10b981',
      permission: isAdmin
    },
    {
      id: 'schedule-blocks',
      title: 'Bloqueios de Horário',
      description: 'Gerencie bloqueios de agenda pontuais ou recorrentes por profissional fonoaudiólogo.',
      icon: Clock,
      color: '#fb7185',
      permission: true
    },
    {
      id: 'evolutions',
      title: 'Evoluções',
      description: 'Gerencie o roadmap strategic, packs de expansão e pesos tecnológicos do sistema.',
      icon: TrendingUp,
      color: '#8b5cf6',
      permission: isAdmin
    },
    {
      id: 'permissions',
      title: 'Permissões',
      description: 'Controle o acesso de cada papel (Fono, Secretaria, Dona) às funcionalidades do sistema.',
      icon: ShieldCheck,
      color: '#f43f5e',
      permission: isAdmin
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <SettingsCard
            {...card}
            onClick={() => onSelect(card.id)}
          />
        </motion.div>
      ))}
      
      {/* Footer info/stats could go here if needed */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="col-span-full mt-8 p-8 rounded-[32px] border border-white/5 bg-white/[0.02] flex items-center gap-6"
      >
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#FFD600]">
          <Cog size={24} />
        </div>
        <div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Status do Sistema</p>
          <p className="text-sm font-bold text-white leading-relaxed">
            Todas as configurações são aplicadas em tempo real para todos os usuários da clínica. 
            Algumas alterações podem exigir permissões administrativas.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
