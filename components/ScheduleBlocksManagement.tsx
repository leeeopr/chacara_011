'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ScheduleBlock, UserProfile } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Plus, Search, Calendar, UserRound, AlertTriangle, Trash2, Edit2, ShieldAlert, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ScheduleBlockModal from '../components/ScheduleBlockModal';
import { format, parseISO } from 'date-fns';

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ScheduleBlocksManagement() {
  const { profile } = useAuth();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFono, setSelectedFono] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'single_day' | 'continuous_period' | 'weekly_recurring' | 'weekly_within_period'>('all');

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load blockers & professionals
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch professionals
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('role', ['FONO', 'DONA'])
          .order('full_name');
        
        if (active && profs) {
          setProfessionals(profs as UserProfile[]);
        }

        // Fetch schedule blocks
        let query = supabase
          .from('schedule_blocks')
          .select(`
            *,
            profiles:fono_id(full_name)
          `);

        if (profile?.role === 'FONO') {
          query = query.eq('fono_id', profile.id);
        }

        const { data: bData, error } = await query;
        if (error) throw error;

        if (active && bData) {
          setBlocks(bData as any);
        }
      } catch (err) {
        console.error('Erro ao buscar bloqueios no painel administrativo:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [refreshKey, profile?.id, profile?.role]);

  const handleEditBlock = (block: ScheduleBlock) => {
    setSelectedBlock(block);
    setIsModalOpen(true);
  };

  const handleNewBlock = () => {
    setSelectedBlock(undefined);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteBlock = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este bloqueio?')) return;
    try {
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      handleSuccess();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // Helper formatting for dates safely
  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  // Filters & Search calculations
  const filteredBlocks = blocks.filter(item => {
    const profName = item.profiles?.full_name || '';
    const reasonText = item.reason || '';
    
    // Search match
    const matchesSearch = 
      profName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reasonText.toLowerCase().includes(searchTerm.toLowerCase());

    // Professional filter match
    const matchesFono = selectedFono ? item.fono_id === selectedFono : true;

    // Mode filter match
    const mode = item.block_mode || 'single_day';
    const matchesMode = filterMode === 'all' ? true : mode === filterMode;

    return matchesSearch && matchesFono && matchesMode;
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass rounded-2xl border border-white/5 bg-white/[0.01]">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-400" />
            Bloqueios de Horário Avançados
          </h3>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">
            Gerencie múltiplos modos de bloqueio (pontuais, recorrentes ou por período contínuo) na agenda da clínica.
          </p>
        </div>
        
        <button
          onClick={handleNewBlock}
          className="bg-rose-500 hover:bg-rose-600 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-rose-500/10 transition-all active:scale-[0.98] flex items-center gap-2 text-xs uppercase tracking-widest leading-none shrink-0"
        >
          <Plus size={16} />
          <span>Criar Bloqueio</span>
        </button>
      </div>

      {/* Filters Form */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass rounded-2xl border border-white/5 bg-black/20">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            placeholder="Buscar por profissional ou motivo..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Fono */}
        {profile?.role !== 'FONO' ? (
          <select
            value={selectedFono}
            onChange={(e) => setSelectedFono(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:ring-2 focus:ring-rose-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="" className="bg-[#0A0F2C]">Todos os Profissionais</option>
            {professionals.map(p => (
              <option key={p.id} value={p.id} className="bg-[#0A0F2C]">{p.full_name}</option>
            ))}
          </select>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white/40 flex items-center justify-center select-none">
            Seus Bloqueios
          </div>
        )}

        {/* Filter Recurrency */}
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as any)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:ring-2 focus:ring-rose-500/50 outline-none appearance-none cursor-pointer"
        >
          <option value="all" className="bg-[#0A0F2C]">Todos os Modos</option>
          <option value="single_day" className="bg-[#0A0F2C]">Apenas Pontuais</option>
          <option value="continuous_period" className="bg-[#0A0F2C]">Modo 1: Contínuos</option>
          <option value="weekly_recurring" className="bg-[#0A0F2C]">Modo 2: Recorrência Semanal</option>
          <option value="weekly_within_period" className="bg-[#0A0F2C]">Modo 3: Recorrência por Período</option>
        </select>
      </div>

      {/* Main Listing Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-400"></div>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.01] rounded-[32px] border border-dashed border-white/10 flex flex-col items-center justify-center p-6">
          <AlertTriangle size={36} className="text-white/20 mb-3" />
          <p className="text-xs font-black uppercase tracking-widest text-white/40">Nenhum bloqueio de horário encontrado</p>
          <p className="text-xs text-white/20 mt-1">Defina novos bloqueios para precaver conflitos de agendamento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredBlocks.map((item, index) => {
              const mode = item.block_mode || 'single_day';
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                  className="p-5 glass glass-reflection rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col justify-between gap-4 group hover:border-rose-500/30 transition-all shadow-md relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-[#FFD600]">
                        <UserRound size={12} />
                        {item.profiles?.full_name || 'Profissional Clínico'}
                      </span>
                      <h4 className="text-sm font-black text-white leading-snug mt-1 uppercase tracking-tight">
                        {item.reason || 'Bloqueio de Agenda'}
                      </h4>
                    </div>

                    {/* Mode-specific Badge */}
                    {mode === 'single_day' && (
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest text-blue-400">
                        Pontual
                      </span>
                    )}
                    {mode === 'continuous_period' && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                        Modo 1: Contínuo
                      </span>
                    )}
                    {mode === 'weekly_recurring' && (
                      <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest text-amber-400">
                        Modo 2: Semanal Fixo
                      </span>
                    )}
                    {mode === 'weekly_within_period' && (
                      <span className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-[8px] font-black uppercase tracking-widest text-rose-400">
                        Modo 3: Semanal por Período
                      </span>
                    )}
                  </div>

                  {/* Summary of days or dates configured */}
                  <div className="text-white/40 text-[10px] py-2 px-3 bg-white/[0.01] rounded-xl border border-white/5 space-y-1 font-semibold uppercase tracking-wider">
                    {mode === 'single_day' && (
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-blue-400" />
                        <span>Data única: {formatDateSafe(item.start_date || item.block_date)}</span>
                      </div>
                    )}
                    {mode === 'continuous_period' && (
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-emerald-400" />
                        <span>Intervalo: {formatDateSafe(item.start_date)} até {formatDateSafe(item.end_date)}</span>
                      </div>
                    )}
                    {mode === 'weekly_recurring' && (
                      <div className="flex items-center gap-2">
                        <Layers size={12} className="text-amber-400" />
                        <span>Dias: {item.weekdays?.map(w => WEEKDAYS_SHORT[w]).join(', ') || 'Nenhum'}</span>
                      </div>
                    )}
                    {mode === 'weekly_within_period' && (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-rose-400" />
                          <span>Período: {formatDateSafe(item.start_date)} até {formatDateSafe(item.end_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers size={12} className="text-rose-400" />
                          <span>Dias ativos: {item.weekdays?.map(w => WEEKDAYS_SHORT[w]).join(', ') || 'Nenhum'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/5">
                    <div className="flex flex-wrap items-center gap-4 text-white/60">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <Clock size={14} className="text-rose-400" />
                        <span>{item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditBlock(item)}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-white/50 hover:text-white transition-all shadow"
                        title="Editar bloqueio"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(item.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/10 hover:border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-all shadow"
                        title="Excluir bloqueio"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Block Form Modal */}
      <ScheduleBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        block={selectedBlock}
      />
    </div>
  );
}
