'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Clock, 
  User, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  AlertCircle, 
  Tag, 
  Play, 
  CheckCircle,
  Sparkles,
  Check,
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAgendaEngine } from '@/hooks/useAgendaEngine';
import { agendaBlocksService } from '@/services/agendaBlocksService';
import { AgendaBlock, AgendaBlockTask } from '@/lib/types';

// Standard weekdays mapped
const WEEKDAYS = [
  { id: 1, name: 'Segunda', fullName: 'Segunda-feira' },
  { id: 2, name: 'Terça', fullName: 'Terça-feira' },
  { id: 3, name: 'Quarta', fullName: 'Quarta-feira' },
  { id: 4, name: 'Quinta', fullName: 'Quinta-feira' },
  { id: 5, name: 'Sexta', fullName: 'Sexta-feira' },
  { id: 6, name: 'Sábado', fullName: 'Sábado' },
  { id: 0, name: 'Domingo', fullName: 'Domingo' },
];

const PRESET_COLORS = [
  { name: 'Azul Celeste', value: '#3B82F6' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Âmbar', value: '#F59E0B' },
  { name: 'Rosa Vibrante', value: '#EC4899' },
  { name: 'Roxo Místico', value: '#8B5CF6' },
  { name: 'Vermelho Coral', value: '#EF4444' },
  { name: 'Ciano', value: '#06B6D4' },
];

export default function WeeklyRecurringAgenda() {
  const { profile } = useAuth();
  
  // Real-time engine for side-panel dashboard and current status tracking
  const {
    todayBlocks,
    currentBlock,
    nextBlock,
    nextTask,
    pendingTasksCount,
    loading: engineLoading,
    refresh: refreshEngine,
  } = useAgendaEngine();

  // Component state
  const [allBlocks, setAllBlocks] = useState<AgendaBlock[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedBlock, setSelectedBlock] = useState<AgendaBlock | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AgendaBlock | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProfileId, setFormProfileId] = useState('');
  const [formWeekday, setFormWeekday] = useState<number>(1);
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formCategory, setFormCategory] = useState('');
  const [formColor, setFormColor] = useState('#3B82F6');
  const [formIsActive, setFormIsActive] = useState(true);
  
  // Checklist task states inside detail modal
  const [taskTitle, setTaskTitle] = useState('');
  const [modalTasks, setModalTasks] = useState<AgendaBlockTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);

  // Clock state for sidebar
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Tick the clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all blocks and professionals
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [blocksData, profilesRes] = await Promise.all([
        agendaBlocksService.getBlocks(),
        supabase.from('profiles').select('id, full_name, role').order('full_name')
      ]);
      
      setAllBlocks(blocksData);
      if (profilesRes.data) {
        setProfessionals(profilesRes.data as any[]);
      }
    } catch (err) {
      console.error('Error loading agenda blocks dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh both local layout list and operational engine
  const handleFullRefresh = async () => {
    await Promise.all([loadData(), refreshEngine()]);
  };

  // Open creation form
  const handleOpenCreateForm = (weekdayId?: number) => {
    setEditingBlock(null);
    setFormTitle('');
    setFormDescription('');
    setFormProfileId(profile?.id || '');
    setFormWeekday(weekdayId !== undefined ? weekdayId : 1);
    setFormStartTime('08:00');
    setFormEndTime('10:00');
    setFormCategory('');
    setFormColor('#3B82F6');
    setFormIsActive(true);
    setIsFormModalOpen(true);
  };

  // Open edit form
  const handleOpenEditForm = (block: AgendaBlock, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent detail modal from opening
    setEditingBlock(block);
    setFormTitle(block.title);
    setFormDescription(block.description || '');
    setFormProfileId(block.profile_id);
    setFormWeekday(block.weekday);
    setFormStartTime(block.start_time.substring(0, 5));
    setFormEndTime(block.end_time.substring(0, 5));
    setFormCategory(block.category || '');
    setFormColor(block.color || '#3B82F6');
    setFormIsActive(block.is_active);
    setIsFormModalOpen(true);
  };

  // Save Block (Insert or Update)
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formProfileId) return;

    try {
      const blockPayload: Partial<AgendaBlock> = {
        title: formTitle,
        description: formDescription.trim() || null,
        profile_id: formProfileId,
        weekday: formWeekday,
        start_time: formStartTime + ':00', // Ensure database TIME compatibility
        end_time: formEndTime + ':00',
        category: formCategory.trim() || null,
        color: formColor,
        is_active: formIsActive
      };

      if (editingBlock) {
        await agendaBlocksService.updateBlock(editingBlock.id, blockPayload);
      } else {
        await agendaBlocksService.createBlock(blockPayload);
      }

      setIsFormModalOpen(false);
      await handleFullRefresh();
    } catch (err) {
      console.error('Error saving block:', err);
    }
  };

  // Delete Block
  const handleDeleteBlock = async (blockId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este bloco recorrente? Todas as suas pendências serão excluídas permanentemente.')) {
      return;
    }

    try {
      await agendaBlocksService.deleteBlock(blockId);
      setIsFormModalOpen(false);
      setIsBlockModalOpen(false);
      await handleFullRefresh();
    } catch (err) {
      console.error('Error deleting block:', err);
    }
  };

  // Open Detailed Block Modal
  const handleOpenDetailModal = async (block: AgendaBlock) => {
    setSelectedBlock(block);
    setIsBlockModalOpen(true);
    await loadBlockTasks(block.id);
  };

  // Fetch block tasks
  const loadBlockTasks = async (blockId: string) => {
    try {
      setTaskLoading(true);
      const tasks = await agendaBlocksService.getTasks(blockId);
      setModalTasks(tasks);
    } catch (err) {
      console.error('Error loading block tasks:', err);
    } finally {
      setTaskLoading(false);
    }
  };

  // Add Task inside block modal
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlock || !taskTitle.trim()) return;

    try {
      const position = modalTasks.length > 0 
        ? Math.max(...modalTasks.map(t => t.position)) + 1 
        : 0;

      await agendaBlocksService.createTask({
        block_id: selectedBlock.id,
        title: taskTitle.trim(),
        completed: false,
        position
      });

      setTaskTitle('');
      await loadBlockTasks(selectedBlock.id);
      await refreshEngine();
    } catch (err) {
      console.error('Error creating block task:', err);
    }
  };

  // Toggle Task Status (Completed / Open)
  const handleToggleTask = async (task: AgendaBlockTask) => {
    try {
      await agendaBlocksService.updateTask(task.id, {
        completed: !task.completed
      });
      if (selectedBlock) {
        await loadBlockTasks(selectedBlock.id);
      }
      await refreshEngine();
    } catch (err) {
      console.error('Error switching task completed:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await agendaBlocksService.deleteTask(taskId);
      if (selectedBlock) {
        await loadBlockTasks(selectedBlock.id);
      }
      await refreshEngine();
    } catch (err) {
      console.error('Error removing task:', err);
    }
  };

  // Get active block progress percentage
  const getBlockProgress = (block: AgendaBlock | null) => {
    if (!block) return 0;
    // For general engine tasks
    const tasks = block.agenda_block_tasks || [];
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden pb-4">
      {/* ========================================================= */}
      {/* LEFT SECTION: 7-DAY WEEKLY CALENDAR GRID                  */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#070b24]/40 border border-white/5 rounded-3xl p-6 overflow-hidden">
        <div className="flex items-center justify-between shrink-0 mb-6 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="text-[#FFD600]" size={20} />
              Agenda Semanal Recorrente
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Visualize, organize e gerencie a estrutura dos seus blocos semanais e pendências.
            </p>
          </div>
          <button
            onClick={() => handleOpenCreateForm()}
            className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-5 rounded-xl shadow-lg shadow-[#FFD600]/10 transition-all active:scale-[0.98] flex items-center gap-2 text-xs uppercase tracking-wider"
          >
            <Plus size={16} />
            <span>Adicionar Bloco</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD600]" />
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar min-h-0">
            <div className="grid grid-cols-7 gap-3 min-w-[1100px] h-full pb-2">
              {WEEKDAYS.map((day) => {
                const dayBlocksList = allBlocks
                  .filter(b => b.weekday === day.id)
                  .sort((a, b) => {
                    const aMin = a.start_time.split(':').reduce((acc, v) => acc * 60 + parseInt(v), 0);
                    const bMin = b.start_time.split(':').reduce((acc, v) => acc * 60 + parseInt(v), 0);
                    return aMin - bMin;
                  });

                // Check if this column is today
                const isTodayColumn = new Date().getDay() === day.id;

                return (
                  <div 
                    key={day.id} 
                    className={`flex flex-col h-full rounded-2xl p-3 border transition-all ${
                      isTodayColumn 
                        ? 'bg-white/[0.04] border-[#FFD600]/25 shadow-[inset_0_0_20px_rgba(255,214,0,0.03)]' 
                        : 'bg-white/[0.01] border-white/5'
                    }`}
                  >
                    {/* Day Column Header */}
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <div>
                        <span className={`text-xs font-black uppercase tracking-wider ${
                          isTodayColumn ? 'text-[#FFD600]' : 'text-white/60'
                        }`}>
                          {day.name}
                        </span>
                        {isTodayColumn && (
                          <span className="ml-1 text-[8px] bg-[#FFD600]/10 text-[#FFD600] px-1.5 py-0.5 rounded-full font-bold">
                            Hoje
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleOpenCreateForm(day.id)}
                        className="text-white/40 hover:text-[#FFD600] p-1 rounded-md transition-colors"
                        title={`Adicionar bloco na ${day.name}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Blocks container */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar min-h-0">
                      {dayBlocksList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl p-4 text-center">
                          <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">
                            Vazio
                          </p>
                        </div>
                      ) : (
                        dayBlocksList.map((block) => {
                          const isCurrentlyActive = currentBlock?.id === block.id;
                          const tasks = block.agenda_block_tasks || [];
                          const pendingTasks = tasks.filter(t => !t.completed);
                          const professionalName = block.profiles?.full_name || 'Profissional';
                          
                          return (
                            <div
                              key={block.id}
                              onClick={() => handleOpenDetailModal(block)}
                              style={{ borderLeftColor: block.color || '#3B82F6' }}
                              className={`group cursor-pointer text-left relative p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all border-l-4 shadow-sm hover:shadow-md hover:scale-[1.01] ${
                                isCurrentlyActive ? 'ring-1 ring-[#FFD600]/30 bg-white/[0.04]' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1.5">
                                <span className="text-[10px] font-mono font-bold text-white/50 flex items-center gap-1">
                                  <Clock size={10} style={{ color: block.color || '#3B82F6' }} />
                                  {block.start_time.substring(0, 5)} - {block.end_time.substring(0, 5)}
                                </span>
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => handleOpenEditForm(block, e)}
                                    className="p-1 text-white/40 hover:text-white rounded hover:bg-white/5"
                                    title="Editar Bloco"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBlock(block.id);
                                    }}
                                    className="p-1 text-white/40 hover:text-red-400 rounded hover:bg-white/5"
                                    title="Excluir Bloco"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>

                              <h4 className="text-xs font-black text-white truncate leading-snug tracking-tight">
                                {block.title}
                              </h4>

                              {block.description && (
                                <p className="text-[10px] text-white/30 truncate mt-0.5 max-w-full">
                                  {block.description}
                                </p>
                              )}

                              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 border-t border-white/5 pt-2">
                                <span className="text-[9px] text-white/40 uppercase tracking-wider font-bold max-w-[70px] truncate flex items-center gap-0.5">
                                  <User size={8} />
                                  {professionalName.split(' ')[0]}
                                </span>

                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                  pendingTasks.length > 0 
                                    ? 'bg-amber-500/10 text-amber-400' 
                                    : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {tasks.length === 0 
                                    ? 'Sem pendências' 
                                    : pendingTasks.length > 0 
                                      ? `${pendingTasks.length} pendentes` 
                                      : 'Concluído'
                                  }
                                </span>
                              </div>

                              {isCurrentlyActive && (
                                <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-[#FFD600] animate-pulse" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* RIGHT SECTION: OPERATIONAL SIDE PANEL                      */}
      {/* ========================================================= */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto lg:overflow-hidden min-h-0 custom-scrollbar pr-1">
        {/* Real-time Clock Card */}
        <div className="bg-[#070b24]/40 border border-white/5 rounded-3xl p-5 flex flex-col justify-center items-center text-center relative shrink-0">
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] uppercase tracking-widest font-black text-emerald-400">Em tempo real</span>
          </div>
          <span className="text-4xl font-black tracking-tight text-white font-mono">
            {currentTimeStr || '00:00'}
          </span>
          <span className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black mt-1.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Operational Dashboard Panel */}
        <div className="flex-1 bg-[#070b24]/40 border border-white/5 rounded-3xl p-5 flex flex-col overflow-hidden min-h-0">
          <h3 className="text-xs font-black text-white/80 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
            <Sparkles className="text-[#FFD600]" size={14} />
            Monitor do Dia
          </h3>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar min-h-0">
            {/* 1. ACTIVE BLOCK CARD */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <span className="text-[8px] font-black text-[#FFD600] uppercase tracking-widest block mb-2">
                Bloco Ativo Agora
              </span>
              {currentBlock ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black text-white leading-tight">
                      {currentBlock.title}
                    </h4>
                    <span 
                      className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase shrink-0"
                      style={{ backgroundColor: `${currentBlock.color}20`, color: currentBlock.color || '#3B82F6' }}
                    >
                      {currentBlock.category || 'Geral'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-white/40">
                    <Clock size={11} />
                    {currentBlock.start_time.substring(0, 5)} - {currentBlock.end_time.substring(0, 5)}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white/50 mb-1.5">
                      <span>Progresso do Bloco</span>
                      <span>{getBlockProgress(currentBlock)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${getBlockProgress(currentBlock)}%`,
                          backgroundColor: currentBlock.color || '#3B82F6'
                        }}
                      />
                    </div>
                    {pendingTasksCount > 0 ? (
                      <div className="mt-2 text-[9px] text-amber-400 font-bold flex items-center gap-1">
                        <AlertCircle size={10} />
                        {pendingTasksCount} {pendingTasksCount === 1 ? 'pendência restante' : 'pendências restantes'}
                      </div>
                    ) : (
                      <div className="mt-2 text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle size={10} />
                        Tudo concluído!
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-2 flex items-center gap-2 text-white/30 text-xs">
                  <Play size={12} className="rotate-90" />
                  <span>Nenhum bloco ativo</span>
                </div>
              )}
            </div>

            {/* 2. NEXT ACTION (PENDING TASK) CARD */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-2">
                Próxima Ação
              </span>
              {nextTask ? (
                <div>
                  <h4 className="text-xs font-black text-white hover:text-[#FFD600] transition-colors leading-relaxed">
                    {nextTask.title}
                  </h4>
                  <div className="flex items-center gap-1 mt-1.5 text-[9px] font-bold text-white/40 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Bloco: {currentBlock?.title}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2 flex items-center gap-2 text-white/30 text-xs font-medium">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Todas as pendências concluídas.</span>
                </div>
              )}
            </div>

            {/* 3. NEXT BLOCK */
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-2">
                Próximo Bloco do Dia
              </span>
              {nextBlock ? (
                <>
                  <h4 className="text-xs font-black text-white leading-tight">
                    {nextBlock.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-white/40">
                    <span className="flex items-center gap-1 text-[10px] font-mono">
                      <Clock size={11} style={{ color: nextBlock.color || '#8B5CF6' }} />
                      {nextBlock.start_time.substring(0, 5)} - {nextBlock.end_time.substring(0, 5)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[9px] font-bold uppercase" style={{ color: nextBlock.color || '#8B5CF6' }}>
                      {nextBlock.category || 'Geral'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-2 flex items-center gap-2 text-white/30 text-xs">
                  <ChevronRight size={12} />
                  <span>Nenhum bloco restante hoje.</span>
                </div>
              )}
            </div>}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FORM MODAL: BLOCK ADD / EDIT                              */}
      {/* ========================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d133a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                {editingBlock ? <Edit2 className="text-[#FFD600]" size={18} /> : <Plus className="text-[#FFD600]" size={18} />}
                {editingBlock ? 'Editar Bloco Recorrente' : 'Novo Bloco Recorrente'}
              </h3>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveBlock} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {/* Professional Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                  Profissional Autor de Origem
                </label>
                <select
                  required
                  value={formProfileId}
                  onChange={(e) => setFormProfileId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600]"
                >
                  <option value="" disabled className="bg-[#0d133a] text-white">Selecione o profissional</option>
                  {professionals.map((prof) => (
                    <option key={prof.id} value={prof.id} className="bg-[#0d133a] text-white">
                      {prof.full_name} ({prof.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                  Título do Bloco
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Financeiro quinzenal, Estudo Biologia, etc."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600] placeholder-white/20"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                  Descrição (Opcional)
                </label>
                <textarea
                  placeholder="Descreva detalhes ou objetivos deste bloco..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600] placeholder-white/20 h-20 resize-none"
                />
              </div>

              {/* Grid 2 Columns: Weekday, Color */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                    Dia da Semana
                  </label>
                  <select
                    value={formWeekday}
                    onChange={(e) => setFormWeekday(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600]"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.id} value={day.id} className="bg-[#0d133a] text-white">
                        {day.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                    Categoria (Ex: Financeiro, Clínica, etc.)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Clínica, Pessoal"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600] placeholder-white/20"
                  />
                </div>
              </div>

              {/* GridTime: Start and End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                    Horário Inicial
                  </label>
                  <input
                    required
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                    Horário Final
                  </label>
                  <input
                    required
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600]"
                  />
                </div>
              </div>

              {/* Color Preset Palette */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/50 block">
                  Cor de Destaque
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setFormColor(col.value)}
                      style={{ backgroundColor: col.value }}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-105 relative ${
                        formColor === col.value ? 'border-white scale-105 shadow-md' : 'border-transparent'
                      }`}
                      title={col.name}
                    >
                      {formColor === col.value && (
                        <Check size={12} className="text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-7 h-7 bg-transparent border-none cursor-pointer p-0 shrink-0"
                    title="Cor Personalizada"
                  />
                </div>
              </div>

              {/* Is Active Status checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#FFD600] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="formIsActive" className="text-xs text-white/70 select-none cursor-pointer font-bold">
                  Bloco Ativo na Grade
                </label>
              </div>

              {/* Actions Footer inside modal scroll area */}
              <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/5">
                {editingBlock ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(editingBlock.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 px-5 rounded-xl border border-red-500/20 text-xs uppercase tracking-wider flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-5 rounded-xl border border-white/5 text-xs uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-3 px-6 rounded-xl shadow-lg shadow-[#FFD600]/10 transition-all text-xs uppercase tracking-wider"
                  >
                    {editingBlock ? 'Salvar Alterações' : 'Criar Bloco'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DETAIL MODAL: DETAIL & PENDING TASK CHECKLIST              */}
      {/* ========================================================= */}
      {isBlockModalOpen && selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d133a] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header detail */}
            <div 
              style={{ borderTopColor: selectedBlock.color || '#3B82F6' }}
              className="p-6 border-b border-white/5 flex items-start justify-between bg-white/[0.01] border-t-8"
            >
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                  DETALHE DO BLOCO RECORRENTE
                </span>
                <h3 className="text-xl font-black text-white hover:text-[#FFD600] transition-colors leading-tight">
                  {selectedBlock.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Clock size={12} style={{ color: selectedBlock.color || '#3B82F6' }} />
                    {WEEKDAYS.find(d => d.id === selectedBlock.weekday)?.fullName} - {selectedBlock.start_time.substring(0, 5)} até {selectedBlock.end_time.substring(0, 5)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/15" />
                  <span className="flex items-center gap-1 uppercase text-[10px] tracking-wider font-bold">
                    <User size={12} />
                    {selectedBlock.profiles?.full_name || 'Profissional'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    setIsBlockModalOpen(false);
                    handleOpenEditForm(selectedBlock, e);
                  }}
                  className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  title="Editar Bloco"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setIsBlockModalOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Description & Task Checklist */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0 custom-scrollbar">
              {/* Description if exits */}
              {selectedBlock.description && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs text-white/70 line-clamp-4 leading-relaxed">
                  {selectedBlock.description}
                </div>
              )}

              {/* Checklist Tasks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-black text-white/80 uppercase tracking-widest flex items-center gap-2">
                    <ListTodo className="text-[#FFD600]" size={14} />
                    Lista de Pendências
                  </h4>
                  <span className="text-[10px] font-bold text-white/30 uppercase">
                    {modalTasks.length} {modalTasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                </div>

                {/* Form to add task */}
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    required
                    type="text"
                    placeholder="Adicionar nova pendência para este bloco..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFD600] placeholder-white/20"
                  />
                  <button
                    type="submit"
                    className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] p-3 rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                    title="Adicionar tarefa"
                  >
                    <Plus size={18} />
                  </button>
                </form>

                {/* Task List */}
                {taskLoading ? (
                  <div className="py-8 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFD600]" />
                  </div>
                ) : modalTasks.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                    <p className="text-xs text-white/30 uppercase tracking-wider font-bold">
                      Nenhuma tarefa cadastrada.
                    </p>
                    <p className="text-[10px] text-white/20 mt-1">
                      Adicione uma pendência acima para manter este bloco organizado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {modalTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                          task.completed 
                            ? 'bg-white/[0.01] border-white/5 opacity-50' 
                            : 'bg-white/[0.03] border-white/5 hover:border-white/10 bg-gradient-to-r hover:from-white/[0.04]'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          onClick={() => handleToggleTask(task)}
                        >
                          <button type="button" className="shrink-0 text-white/40 hover:text-[#FFD600]">
                            {task.completed ? (
                              <CheckCircle2 className="text-emerald-500" size={18} />
                            ) : (
                              <Circle size={18} />
                            )}
                          </button>
                          
                          <span className={`text-xs text-white leading-snug truncate ${task.completed ? 'line-through text-white/30' : ''}`}>
                            {task.title}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-white/20 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                          title="Remover pendência"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 flex justify-end bg-white/[0.005]">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-6 rounded-xl border border-white/5 text-xs uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
