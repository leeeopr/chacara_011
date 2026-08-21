'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, CalendarClock, User, RefreshCw, AlertTriangle, 
  Trash2, Play, Pause, Power, CheckCircle, Info, FileClock, Tag, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRecurringSchedules } from '@/hooks/useRecurringSchedules';
import { calculateExpectedDates } from '@/lib/recurringService';
import { RecurringSchedule } from '@/lib/types';
import RecurringScheduleModal from './RecurringScheduleModal';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecurringSchedulesManagementProps {
  refreshKey?: number;
}

const DAYS_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function RecurringSchedulesManagement({ refreshKey = 0 }: RecurringSchedulesManagementProps) {
  const { 
    schedules, loading, error, fetchSchedules, suspendSchedule, 
    reactivateSchedule, endSchedule, deleteSchedule 
  } = useRecurringSchedules();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'ENDED'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringSchedule | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Custom Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'end';
    id: string;
    title: string;
    message: string;
    confirmLabel: string;
  }>({
    isOpen: false,
    type: 'delete',
    id: '',
    title: '',
    message: '',
    confirmLabel: '',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => {
        if (prev.message === message) {
          return { ...prev, show: false };
        }
        return prev;
      });
    }, 5000);
  };

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules, refreshKey]);

  // Action wrappers helper
  const handleEdit = (schedule: RecurringSchedule) => {
    setEditingSchedule(schedule);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingSchedule(undefined);
    setModalOpen(true);
  };

  const handleAction = async (id: string, action: 'suspend' | 'reactivate' | 'end' | 'delete') => {
    if (action === 'delete') {
      setConfirmModal({
        isOpen: true,
        type: 'delete',
        id,
        title: 'Excluir frequência',
        message: 'Tem certeza que deseja excluir permanentemente esta frequência?',
        confirmLabel: 'Excluir',
      });
      return;
    }

    if (action === 'end') {
      setConfirmModal({
        isOpen: true,
        type: 'end',
        id,
        title: 'Encerrar frequência',
        message: 'Essa frequência deixará de gerar consultas futuras. Deseja continuar?',
        confirmLabel: 'Encerrar',
      });
      return;
    }

    setActionLoading(id);
    try {
      if (action === 'suspend') {
        const res = await suspendSchedule(id);
        if (res.success) {
          showToast('Frequência suspensa com sucesso!', 'success');
        } else {
          showToast('Erro ao suspender a frequência: ' + (res.error || 'Erro inesperado'), 'error');
        }
      } else if (action === 'reactivate') {
        const res = await reactivateSchedule(id);
        if (res.success) {
          if (res.conflicts && res.conflicts.length > 0) {
            showToast(`Frequência reativada!\nConflitos detectados:\n${res.conflicts.slice(0, 2).join('\n')}`, 'warning');
          } else {
            showToast('Frequência reativada com sucesso!', 'success');
          }
        } else {
          showToast('Erro ao reativar a frequência: ' + (res.error || 'Erro inesperado'), 'error');
        }
      }
    } catch (e: any) {
      showToast('Erro ao realizar ação: ' + e.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Helper to format weekdays in natural Portuguese
  const formatWeekdaysPattern = (weekdays: number[]) => {
    if (!weekdays || weekdays.length === 0) return 'Indefinido';
    const sorted = [...weekdays].sort((a, b) => {
      // Sort weekdays starting from Monday=1...Sunday=0
      const orderA = a === 0 ? 7 : a;
      const orderB = b === 0 ? 7 : b;
      return orderA - orderB;
    });
    return sorted.map(d => DAYS_NAMES[d]).join(', ');
  };

  // Helper to compute next occurring slot starting from today
  const getNextOccurrenceDate = (sched: RecurringSchedule) => {
    try {
      const dates = calculateExpectedDates(
        {
          frequency_type: sched.frequency_type,
          interval_value: sched.interval_value,
          weekdays: sched.weekdays,
          starts_at: sched.starts_at,
          ends_at: sched.ends_at,
          effective_from: sched.effective_from,
          effective_until: sched.effective_until,
        },
        90
      );
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const nextDate = dates.find(d => d >= todayStr);
      
      if (!nextDate) return 'Sem datas futuras';
      
      const dateObj = parseISO(nextDate);
      return format(dateObj, "dd/MM/yyyy (EEEE)", { locale: ptBR });
    } catch (e) {
      return 'N/A';
    }
  };

  // Search & Status filters application
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      const pName = item.patients?.full_name || '';
      const profName = item.profiles?.full_name || '';
      
      const matchesSearch = 
        pName.toLowerCase().includes(search.toLowerCase()) ||
        profName.toLowerCase().includes(search.toLowerCase());
        
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [schedules, search, statusFilter]);

  return (
    <div className="w-full space-y-6">
      {/* Search Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 glass glass-reflection rounded-[24px]">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Buscar por paciente ou fonoaudiólogo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0A0F2C]/50 text-white rounded-xl py-2.5 pl-11 pr-4 border border-white/5 focus:border-[#FFD600] outline-none text-sm transition-all"
          />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'ACTIVE', 'SUSPENDED', 'ENDED'] as const).map((filter) => {
            const label = filter === 'ALL' ? 'Todos' : filter === 'ACTIVE' ? 'Ativos' : filter === 'SUSPENDED' ? 'Suspensos' : 'Encerrados';
            const active = statusFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                  active
                    ? 'bg-[#FFD600] border-[#FFD600] text-[#0A0F2C] shadow-md shadow-[#FFD600]/10'
                    : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}

          <button
            onClick={handleNew}
            className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2 px-5 rounded-xl flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-[#FFD600]/10 active:scale-[0.98] transition-all ml-auto md:ml-4"
          >
            <Plus size={16} />
            <span>Adicionar Frequência</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-60 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="text-[#FFD600] animate-spin" size={32} />
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Carregando frequências...</span>
        </div>
      ) : error ? (
        <div className="glass p-8 border border-red-500/15 rounded-3xl flex items-center gap-4 text-red-400">
          <AlertTriangle size={24} />
          <div>
            <h4 className="font-bold text-sm">Erro ao carregar dados</h4>
            <p className="text-xs opacity-80 mt-1">{error}</p>
          </div>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="glass p-16 text-center rounded-[32px] border border-white/5 space-y-4">
          <CalendarClock className="mx-auto text-white/20" size={48} />
          <div className="space-y-1">
            <h5 className="text-white font-bold text-base">Nenhum agendamento recorrente</h5>
            <p className="text-white/40 text-xs max-w-sm mx-auto">
              Crie frequências para gerar consultas automáticas nos próximos 90 dias de forma recorrente e consistente.
            </p>
          </div>
          <button
            onClick={handleNew}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Registrar Primeira Frequência
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchedules.map((item) => {
            const pName = item.patients?.full_name || 'Paciente Não Identificado';
            const profName = item.profiles?.full_name || 'Profissional Não Atribuído';
            const typeName = item.appointment_types?.name || 'Terapia Individual';
            const nextOccur = getNextOccurrenceDate(item);
            
            // Render specific recurrent labels
            const patternLabel = 
              item.frequency_type === 'WEEKLY'
                ? `Toda ${formatWeekdaysPattern(item.weekdays)}`
                : item.frequency_type === 'BIWEEKLY'
                ? `A cada 15 dias, ${formatWeekdaysPattern(item.weekdays)}`
                : `A cada ${item.interval_value} dias`;

            return (
              <div 
                key={item.id} 
                className={`glass glass-reflection rounded-[24px] border transition-all hover:scale-[1.01] flex flex-col justify-between overflow-hidden relative ${
                  item.status === 'SUSPENDED' 
                    ? 'border-orange-500/10 opacity-70 bg-orange-950/5' 
                    : item.status === 'ENDED'
                    ? 'border-red-500/10 opacity-55'
                    : 'border-white/5 bg-[#12183A]/30'
                }`}
              >
                {/* Upper container */}
                <div className="p-6 space-y-4 flex-1">
                  {/* Status & Version Header */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-white/50">
                      <FileClock size={12} className="text-[#FFD600]" />
                      <span>v{item.version}</span>
                    </span>

                    {/* Status badge */}
                    {item.status === 'ACTIVE' && (
                      <span className="h-2.5 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ativa
                      </span>
                    )}
                    {item.status === 'SUSPENDED' && (
                      <span className="h-2.5 px-2.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        Suspensa
                      </span>
                    )}
                    {item.status === 'ENDED' && (
                      <span className="h-2.5 px-2.5 rounded-full bg-red-400/15 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        Terminada
                      </span>
                    )}
                  </div>

                  {/* Patient Name */}
                  <div className="space-y-1">
                    <h4 className="text-lg font-extrabold text-white tracking-tight line-clamp-1">{pName}</h4>
                    
                    {/* Category or Type Badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center text-[10px] font-bold text-[#FFD600]/80">
                        <Tag size={10} className="mr-1" />
                        {typeName}
                      </span>
                      {item.patients?.category && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-white/5 text-white/40 rounded uppercase font-mono">
                          {item.patients.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mid attributes list */}
                  <div className="space-y-2.5 pt-1 text-xs text-white/60">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={14} className="text-[#FFD600]/80 shrink-0" />
                      <span className="font-semibold text-white/90">{patternLabel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User size={14} className="text-white/40 shrink-0" />
                      <span>Fonoaudiólogo: <strong className="text-white/85 font-medium">{profName}</strong></span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-black font-mono text-[#FFD600] text-sm bg-white/5 py-1 px-2.5 rounded-lg border border-white/5">
                        {item.start_time}
                      </span>
                      <span className="text-[11px] text-white/40">Duração: {item.duration} min</span>
                    </div>
                  </div>

                  {/* Next Occurrence Indicator */}
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-[9.5px] uppercase tracking-wider text-white/30 font-black block">Próxima Ocorrência</span>
                      <span className="text-xs text-white/90 font-bold block">{nextOccur}</span>
                    </div>

                    {item.treatment_enabled && (
                      <div className="p-3.5 rounded-xl bg-[#FFD600]/5 border border-[#FFD600]/10 space-y-2">
                        <div className="flex items-center justify-between text-[9.5px] uppercase tracking-wider font-black">
                          <span className="text-white/40">Progresso do Tratamento</span>
                          <span className="text-[#FFD600]">
                            {item.attended_sessions_count || 0} de {item.treatment_total_sessions || 0} sessões ({Math.round(((item.attended_sessions_count || 0) / (item.treatment_total_sessions || 1)) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#FFD600] h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(
                                100, 
                                ((item.attended_sessions_count || 0) / (item.treatment_total_sessions || 1)) * 100
                              )}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t border-white/5 bg-white/3 flex items-center justify-end gap-2 shrink-0">
                  {actionLoading === item.id ? (
                    <div className="flex items-center gap-2 text-white/40 text-xs py-1.5 px-3">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Carregando...</span>
                    </div>
                  ) : (
                    <>
                      {/* Delete */}
                      <button
                        onClick={() => handleAction(item.id, 'delete')}
                        className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-red-400/80 hover:text-red-400 transition-all ml-0"
                        title="Excluir Frequência"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="flex-1" />

                      {/* Edit */}
                      {item.status !== 'ENDED' && (
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white/80 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                          Editar
                        </button>
                      )}

                      {/* Controls based on Status */}
                      {item.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAction(item.id, 'suspend')}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/10 text-orange-400 hover:text-orange-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <Pause size={12} />
                          Suspender
                        </button>
                      )}

                      {item.status === 'SUSPENDED' && (
                        <button
                          onClick={() => handleAction(item.id, 'reactivate')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/10 text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <Play size={12} />
                          Reativar
                        </button>
                      )}

                      {item.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAction(item.id, 'end')}
                          className="px-3.5 py-1.5 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 text-red-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1"
                          title="Encerrar a partir de hoje"
                        >
                          <Power size={11} />
                          Encerrar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Repeating Modal */}
      <RecurringScheduleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchSchedules}
        schedule={editingSchedule}
      />

      {/* Visual Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0A0F2C]/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass glass-reflection rounded-[28px] w-full max-w-sm border border-white/10 shadow-2xl overflow-hidden p-6 text-center space-y-6"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center">
                <AlertTriangle size={24} className="animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed font-semibold">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 text-white/50 hover:text-white transition-all font-bold text-xs uppercase tracking-wider leading-none disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={async () => {
                    const id = confirmModal.id;
                    const action = confirmModal.type;
                    setActionLoading(id);
                    try {
                      if (action === 'delete') {
                        const res = await deleteSchedule(id);
                        if (res.success) {
                          showToast('Frequência excluída com sucesso!', 'success');
                          fetchSchedules();
                        } else {
                          showToast('Erro ao excluir: ' + (res.error || 'Erro desconhecido'), 'error');
                        }
                      } else if (action === 'end') {
                        const res = await endSchedule(id);
                        if (res.success) {
                          showToast('Frequência encerrada hoje com sucesso!', 'success');
                          fetchSchedules();
                        } else {
                          showToast('Erro ao encerrar: ' + (res.error || 'Erro desconhecido'), 'error');
                        }
                      }
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    } catch (err: any) {
                      showToast('Erro na operação: ' + err.message, 'error');
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider leading-none transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                    confirmModal.type === 'delete'
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/15'
                      : 'bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] shadow-lg shadow-[#FFD600]/10'
                  }`}
                >
                  {actionLoading !== null ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>{confirmModal.confirmLabel}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[150] flex items-center gap-3 p-4 rounded-2xl border shadow-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 backdrop-blur-lg border-emerald-500/20 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-red-950/90 backdrop-blur-lg border-red-500/20 text-red-300'
                : toast.type === 'warning'
                ? 'bg-orange-950/90 backdrop-blur-lg border-orange-500/20 text-orange-300'
                : 'bg-white/10 backdrop-blur-lg border-white/10 text-white'
            }`}
          >
            <div className="p-1 rounded-lg bg-black/10 shrink-0">
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <AlertTriangle size={18} />}
              {toast.type === 'warning' && <AlertTriangle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="text-white/40 hover:text-white transition-colors shrink-0 ml-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
