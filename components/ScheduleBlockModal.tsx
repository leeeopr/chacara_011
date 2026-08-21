'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, UserRound, HelpCircle, Save, Trash2, RefreshCw, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserProfile, ScheduleBlock } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduleBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  block?: ScheduleBlock; // For editing
}

const WEEKDAYS_OPTIONS = [
  { value: 0, label: 'Dom', fullname: 'Domingo' },
  { value: 1, label: 'Seg', fullname: 'Segunda-feira' },
  { value: 2, label: 'Ter', fullname: 'Terça-feira' },
  { value: 3, label: 'Qua', fullname: 'Quarta-feira' },
  { value: 4, label: 'Qui', fullname: 'Quinta-feira' },
  { value: 5, label: 'Sex', fullname: 'Sexta-feira' },
  { value: 6, label: 'Sáb', fullname: 'Sábado' },
];

export default function ScheduleBlockModal({ isOpen, onClose, onSuccess, block }: ScheduleBlockModalProps) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Form State
  const [formData, setFormData] = useState({
    fono_id: block?.fono_id || (profile?.role === 'FONO' ? profile.id : ''),
    block_mode: block?.block_mode || 'single_day',
    start_date: block?.start_date || block?.block_date || '',
    end_date: block?.end_date || '',
    weekdays: block?.weekdays || [1, 2, 3, 4, 5], // Padrão dias úteis
    start_time: block?.start_time || '',
    end_time: block?.end_time || '',
    reason: block?.reason || '',
  });

  // Load Professionals
  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['FONO', 'DONA']);
        if (data) {
          setProfessionals(data as UserProfile[]);
        }
        if (error) console.error('Erro ao buscar profissionais:', error);
      } catch (err) {
        console.error('Erro ao buscar profissionais no modal de bloqueios:', err);
      }
    };

    if (isOpen) {
      fetchProfessionals();
    }
  }, [isOpen]);

  const getInitialState = () => ({
    fono_id: block?.fono_id || (profile?.role === 'FONO' ? profile.id : ''),
    block_mode: block?.block_mode || 'single_day',
    start_date: block?.start_date || block?.block_date || '',
    end_date: block?.end_date || '',
    weekdays: block?.weekdays || [1, 2, 3, 4, 5],
    start_time: block?.start_time || '',
    end_time: block?.end_time || '',
    reason: block?.reason || '',
  });

  // Reset form when modal opens or edits a different block
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setFormData(getInitialState());
      setLoading(false);
    }
  }

  const isAdmin = profile?.role === 'DONA' || profile?.role === 'admin' || profile?.role === 'SECRETARIA';
  const isOwner = block ? block.fono_id === profile?.id : true;
  const canEdit = isAdmin || isOwner;

  const handleWeekdayToggle = (dayValue: number) => {
    if (!canEdit) return;
    setFormData(prev => {
      const alreadySelected = prev.weekdays.includes(dayValue);
      const updatedWeekdays = alreadySelected
        ? prev.weekdays.filter(d => d !== dayValue)
        : [...prev.weekdays, dayValue].sort((a, b) => a - b);
      return { ...prev, weekdays: updatedWeekdays };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fono_id) {
      alert('Por favor, selecione um profissional.');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      alert('Por favor, defina o horário de início e fim do bloqueio.');
      return;
    }

    // Convert times to minutes for sanity check
    const timeToMinutes = (time: string) => {
      const parts = time.split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    };

    const startMin = timeToMinutes(formData.start_time);
    const endMin = timeToMinutes(formData.end_time);

    if (startMin >= endMin) {
      alert('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    // Dynamic validations per mode
    if (formData.block_mode === 'single_day') {
      if (!formData.start_date) {
        alert('Por favor, preencha a data do bloqueio pontual.');
        return;
      }
    } else if (formData.block_mode === 'continuous_period') {
      if (!formData.start_date || !formData.end_date) {
        alert('Por favor, preencha as datas de início e fim do período.');
        return;
      }
      if (formData.start_date > formData.end_date) {
        alert('A data de término do período deve ser posterior à data de início.');
        return;
      }
    } else if (formData.block_mode === 'weekly_recurring') {
      if (formData.weekdays.length === 0) {
        alert('Por favor, selecione ao menos um dia da semana para recorrência.');
        return;
      }
    } else if (formData.block_mode === 'weekly_within_period') {
      if (!formData.start_date || !formData.end_date) {
        alert('Por favor, selecione as datas de início e fim do período.');
        return;
      }
      if (formData.start_date > formData.end_date) {
        alert('A data de término do período deve ser posterior à data de início.');
        return;
      }
      if (formData.weekdays.length === 0) {
        alert('Por favor, selecione ao menos um dia da semana para a recorrência.');
        return;
      }
    }

    setLoading(true);
    try {
      // Build clean payload
      const payload: any = {
        fono_id: formData.fono_id,
        block_mode: formData.block_mode,
        start_time: formData.start_time,
        end_time: formData.end_time,
        reason: formData.reason || 'Bloqueio de Agenda',
      };

      // Set mode-specific fields
      if (formData.block_mode === 'single_day') {
        payload.start_date = formData.start_date;
        payload.end_date = null;
        payload.weekdays = null;
        // Legacy column compatibility
        payload.block_date = formData.start_date;
        payload.is_recurring = false;
      } else if (formData.block_mode === 'continuous_period') {
        payload.start_date = formData.start_date;
        payload.end_date = formData.end_date;
        payload.weekdays = null;
        // Legacy compatibility
        payload.block_date = formData.start_date;
        payload.is_recurring = false;
      } else if (formData.block_mode === 'weekly_recurring') {
        payload.start_date = null;
        payload.end_date = null;
        payload.weekdays = formData.weekdays;
        // Legacy compatibility
        payload.block_date = '1970-01-01';
        payload.is_recurring = true;
      } else if (formData.block_mode === 'weekly_within_period') {
        payload.start_date = formData.start_date;
        payload.end_date = formData.end_date;
        payload.weekdays = formData.weekdays;
        // Legacy compatibility
        payload.block_date = formData.start_date;
        payload.is_recurring = true;
      }

      let error;
      if (block) {
        const { error: updateError } = await supabase
          .from('schedule_blocks')
          .update(payload)
          .eq('id', block.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('schedule_blocks')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro detalhado ao salvar bloqueio:', JSON.stringify(err, null, 2), err);
      const errMsg = err.message || err.details || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      alert('Erro ao salvar bloqueio de horário: ' + errMsg + '\n\nCertifique-se de executar o script SQL "/migration_schedule_blocks_v2.sql" no editor SQL do seu Supabase para criar as novas colunas!');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!block?.id) return;
    if (!window.confirm('Tem certeza que deseja remover este bloqueio de horário?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('id', block.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir bloqueio:', err);
      alert('Erro ao excluir bloqueio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl relative"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <Clock size={20} className="text-rose-400" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {block ? 'Editar Bloqueio' : 'Bloquear Horário'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar-thin">
              {!canEdit && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold uppercase tracking-widest">
                  <X size={16} />
                  Sem permissão de gerenciamento sobre este profissional.
                </div>
              )}

              {/* Professional Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <UserRound size={14} className="text-rose-400" /> Profissional *
                </label>
                <select
                  disabled={!canEdit || profile?.role === 'FONO'}
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all font-bold appearance-none cursor-pointer disabled:opacity-50"
                  value={formData.fono_id}
                  onChange={(e) => setFormData({ ...formData, fono_id: e.target.value })}
                >
                  <option value="" className="bg-[#0A0F2C]">Selecione um profissional</option>
                  {professionals.map((prof) => (
                    <option key={prof.id} value={prof.id} className="bg-[#0A0F2C]">
                      {prof.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Bloqueio (Block Mode Selection) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers size={14} className="text-rose-400" /> Tipo de Bloqueio / Modo *
                </label>
                <select
                  disabled={!canEdit}
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all font-bold appearance-none cursor-pointer disabled:opacity-50"
                  value={formData.block_mode}
                  onChange={(e) => setFormData({ ...formData, block_mode: e.target.value as any })}
                >
                  <option value="single_day" className="bg-[#0A0F2C]">Bloqueio Pontual (Uma única data)</option>
                  <option value="continuous_period" className="bg-[#0A0F2C]">Modo 1: Período Contínuo (Todos os dias)</option>
                  <option value="weekly_recurring" className="bg-[#0A0F2C]">Modo 2: Recorrência Semanal Indefinida</option>
                  <option value="weekly_within_period" className="bg-[#0A0F2C]">Modo 3: Recorrência Semanal por Período</option>
                </select>
              </div>

              {/* Conditional Visual Fields based on selected block_mode */}

              {/* Single Day Date */}
              {formData.block_mode === 'single_day' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar size={14} className="text-rose-400" /> Data do Bloqueio *
                  </label>
                  <input
                    required
                    type="date"
                    disabled={!canEdit}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all font-bold [color-scheme:dark] disabled:opacity-50"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
              )}

              {/* Continuous or Weekly Period Range */}
              {(formData.block_mode === 'continuous_period' || formData.block_mode === 'weekly_within_period') && (
                <div className="grid grid-cols-2 gap-4 p-4 border border-white/5 rounded-2xl bg-white/[0.02]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Calendar size={13} className="text-rose-400" /> Data Início *
                    </label>
                    <input
                      required
                      type="date"
                      disabled={!canEdit}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:ring-2 focus:ring-rose-500/50 outline-none font-bold [color-scheme:dark] disabled:opacity-50"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Calendar size={13} className="text-rose-400" /> Data Fim *
                    </label>
                    <input
                      required
                      type="date"
                      disabled={!canEdit}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:ring-2 focus:ring-rose-500/50 outline-none font-bold [color-scheme:dark] disabled:opacity-50"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Weekly recurrences selector */}
              {(formData.block_mode === 'weekly_recurring' || formData.block_mode === 'weekly_within_period') && (
                <div className="space-y-2 p-4 border border-white/5 rounded-2xl bg-white/[0.02]">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">
                    Dias da Semana da Recorrência *
                  </label>
                  <div className="flex flex-wrap gap-2 justify-between">
                    {WEEKDAYS_OPTIONS.map((day) => {
                      const isSelected = formData.weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleWeekdayToggle(day.value)}
                          className={`flex-1 min-w-[40px] h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-all ${
                            isSelected
                              ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                              : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                          title={day.fullname}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-white/35 block mt-2 font-semibold">
                    Selecionados:{' '}
                    {formData.weekdays.length === 0
                      ? 'Nenhum'
                      : formData.weekdays.map(d => WEEKDAYS_OPTIONS.find(o => o.value === d)?.fullname).join(', ')}
                  </span>
                </div>
              )}

              {/* Time Interval */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock size={14} className="text-rose-400" /> Início *
                  </label>
                  <input
                    required
                    type="time"
                    disabled={!canEdit}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all font-bold [color-scheme:dark] disabled:opacity-50"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock size={14} className="text-rose-400" /> Término *
                  </label>
                  <input
                    required
                    type="time"
                    disabled={!canEdit}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all font-bold [color-scheme:dark] disabled:opacity-50"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Block Reason / Title */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <HelpCircle size={14} className="text-rose-400" /> Motivo / Observação
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="Ex: Particular, Almoço, Reunião de Equipe"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all font-bold disabled:opacity-50"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-4">
                {block && canEdit && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-black py-4 px-6 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span>Excluir</span>
                  </button>
                )}
                {canEdit && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-rose-500 hover:bg-rose-600 text-white font-black py-4 px-6 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.2)] hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>{loading ? 'Processando...' : 'Salvar Bloqueio'}</span>
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
