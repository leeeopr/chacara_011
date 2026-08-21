'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Filter, Tag, CheckSquare, Clock, AlertTriangle, CheckCircle2,
  ListTodo, User, LayoutGrid, LayoutList, RotateCcw, ChevronRight, MessageSquare,
  AlertCircle, ShieldAlert, Sparkles, Send, Inbox, ArrowRightLeft, Flame, Calendar,
  Hourglass, Ban, Building2, Eye, RefreshCw
} from 'lucide-react';
import {
  Pendencia,
  PendenciaGrupo,
  PendenciaFilters,
  PendenciaStatus,
  PendenciaPrioridade,
  UserProfileOption
} from '@/lib/pendenciasTypes';
import {
  getPendencias,
  getPendenciaGrupos,
  getUserProfilesForAutocomplete
} from '@/services/pendenciasService';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculatePendenciaPriority,
  sortPendenciasByPriority,
  categorizePendencias,
  computePendenciasStats
} from '@/lib/priorityEngine';
import PendenciaPriorityCard from './PendenciaPriorityCard';
import PendenciaFormModal from './PendenciaFormModal';
import PendenciaGroupManagerModal from './PendenciaGroupManagerModal';
import PendenciaDetailDrawerModal from './PendenciaDetailDrawerModal';
import PurchasesManagement from './PurchasesManagement';
import { ShoppingBag } from 'lucide-react';

type ContextualTab = 'fazerAgora' | 'hoje' | 'estaSemana' | 'aguardandoResposta' | 'bloqueadas' | 'concluidas' | 'todas';

export default function PendenciasManagement() {
  const { user, profile } = useAuth();
  const currentUserId = user?.id || 'usr-atual';

  // Main Section: 'tarefas' | 'compras'
  const [mainSection, setMainSection] = useState<'tarefas' | 'compras'>('tarefas');

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [groups, setGroups] = useState<PendenciaGrupo[]>([]);
  const [loading, setLoading] = useState(true);

  // Contextual Active Tab
  const [activeContextTab, setActiveContextTab] = useState<ContextualTab>('fazerAgora');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

  // Filters
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickChip, setQuickChip] = useState<'soMinhas' | 'coanfitria' | 'urgentes' | 'atrasadas' | 'semPrazo' | 'todos'>('todos');
  const [userOptions, setUserOptions] = useState<UserProfileOption[]>([]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedPendenciaId, setSelectedPendenciaId] = useState<string | null>(null);

  useEffect(() => {
    getUserProfilesForAutocomplete('').then(res => {
      setUserOptions(res);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedGroup, selectedResponsible, selectedPriority, selectedStatus, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const grps = await getPendenciaGrupos();
      setGroups(grps);

      const filters: PendenciaFilters = {
        grupo_id: selectedGroup || undefined,
        responsavel_id: selectedResponsible || undefined,
        prioridade: selectedPriority || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
        visaoTab: 'todas'
      };

      const data = await getPendencias(filters, currentUserId);
      setPendencias(data);
    } catch (err) {
      console.warn('Erro ao carregar dados de pendências:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute Categories & Priority Scores via Priority Engine
  const categorized = useMemo(() => {
    return categorizePendencias(pendencias, currentUserId);
  }, [pendencias, currentUserId]);

  const stats = useMemo(() => {
    return computePendenciasStats(pendencias, currentUserId);
  }, [pendencias, currentUserId]);

  // Filter items by selected Contextual Tab & Quick Chips
  const displayedItems = useMemo(() => {
    let baseList: (Pendencia & { priorityInfo: ReturnType<typeof calculatePendenciaPriority> })[] = [];

    switch (activeContextTab) {
      case 'fazerAgora':
        baseList = categorized.fazerAgora;
        break;
      case 'hoje':
        baseList = categorized.hoje;
        break;
      case 'estaSemana':
        baseList = categorized.estaSemana;
        break;
      case 'aguardandoResposta':
        baseList = categorized.aguardandoResposta;
        break;
      case 'bloqueadas':
        baseList = categorized.bloqueadas;
        break;
      case 'concluidas':
        baseList = categorized.concluidas;
        break;
      case 'todas':
      default:
        baseList = categorized.sortedAll;
        break;
    }

    // Apply Quick Chip Filter
    if (quickChip === 'soMinhas') {
      baseList = baseList.filter(p => p.responsavel_atual === currentUserId);
    } else if (quickChip === 'coanfitria') {
      baseList = baseList.filter(p => p.responsavel_atual !== currentUserId && p.responsavel_atual_nome?.toLowerCase().includes('coanfitriã'));
    } else if (quickChip === 'urgentes') {
      baseList = baseList.filter(p => p.prioridade === 'Urgente');
    } else if (quickChip === 'atrasadas') {
      baseList = baseList.filter(p => p.priorityInfo.isOverdue);
    } else if (quickChip === 'semPrazo') {
      baseList = baseList.filter(p => !p.prazo);
    }

    return baseList;
  }, [activeContextTab, categorized, quickChip, currentUserId]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto">
      {/* Top Module Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0A0F2C] border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setMainSection('tarefas')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            mainSection === 'tarefas'
              ? 'bg-[#FFD600] text-[#0A0F2C] shadow-[0_0_20px_rgba(255,214,0,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckSquare size={16} />
          TAREFAS & CHECKLISTS
        </button>

        <button
          onClick={() => setMainSection('compras')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            mainSection === 'compras'
              ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag size={16} />
          COMPRAS DA CHÁCARA
        </button>
      </div>

      {mainSection === 'compras' ? (
        <PurchasesManagement
          onOpenTaskDetail={(taskId) => {
            setMainSection('tarefas');
            setSelectedPendenciaId(taskId);
          }}
        />
      ) : (
        <>
          {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0A0F2C] via-[#12193E] to-[#0A0F2C] p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#FFD600] text-[#0A0F2C] rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.3)] shrink-0 font-black">
            <CheckSquare size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Módulo Inteligente de Pendências
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] font-black uppercase tracking-wider border border-[#FFD600]/30">
                Prioridade Dinâmica
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Centro operacional de tarefas, devoluções e atribuição dinâmica por contexto
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData()}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all"
            title="Atualizar lista em tempo real"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#FFD600]' : 'text-white/70'} />
          </button>

          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <Tag size={16} className="text-[#FFD600]" />
            Gerenciar Grupos
          </button>

          <button
            onClick={() => setIsFormModalOpen(true)}
            className="px-5 py-3 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,214,0,0.25)] active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            Nova Pendência
          </button>
        </div>
      </div>

      {/* KPI Stats Top Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50">
            <span className="text-[10px] font-black uppercase tracking-wider">Ativas no Momento</span>
            <Inbox size={16} className="text-[#FFD600]" />
          </div>
          <p className="text-2xl font-black text-white">{stats.ativasCount}</p>
          <p className="text-[10px] text-white/40">{stats.atribuidasAMim} atribuídas a você</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Atrasadas / Críticas</span>
            <AlertTriangle size={16} />
          </div>
          <p className="text-2xl font-black text-rose-400">{stats.atrasadas}</p>
          <p className="text-[10px] text-white/40">Exigem ação imediata</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[#FFD600]">
            <span className="text-[10px] font-black uppercase tracking-wider">Vencem Hoje</span>
            <Clock size={16} />
          </div>
          <p className="text-2xl font-black text-[#FFD600]">{stats.vencemHoje}</p>
          <p className="text-[10px] text-white/40">Prazo até às 23:59</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Devolvidas / Tramitando</span>
            <RotateCcw size={16} />
          </div>
          <p className="text-2xl font-black text-sky-400">{stats.devolvidas}</p>
          <p className="text-[10px] text-white/40">Aguardando revisão ou resposta</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Taxa de Conclusão</span>
            <CheckCircle2 size={16} />
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats.completionRate}%</p>
          <p className="text-[10px] text-white/40">{stats.concluidasEstaSemana} concluídas esta semana</p>
        </div>
      </div>

      {/* CONTEXTUAL TABS (ETAPA 4) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setActiveContextTab('fazerAgora')}
          className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
            activeContextTab === 'fazerAgora'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)] scale-105'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Flame size={16} className={activeContextTab === 'fazerAgora' ? 'text-[#0A0F2C]' : 'text-rose-400'} />
          <span>🔥 Fazer Agora ({categorized.fazerAgora.length})</span>
        </button>

        <button
          onClick={() => setActiveContextTab('hoje')}
          className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
            activeContextTab === 'hoje'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)] scale-105'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Clock size={16} className={activeContextTab === 'hoje' ? 'text-[#0A0F2C]' : 'text-[#FFD600]'} />
          <span>⏰ Hoje ({categorized.hoje.length})</span>
        </button>

        <button
          onClick={() => setActiveContextTab('estaSemana')}
          className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
            activeContextTab === 'estaSemana'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)] scale-105'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Calendar size={16} className={activeContextTab === 'estaSemana' ? 'text-[#0A0F2C]' : 'text-emerald-400'} />
          <span>📅 Esta Semana ({categorized.estaSemana.length})</span>
        </button>

        <button
          onClick={() => setActiveContextTab('aguardandoResposta')}
          className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
            activeContextTab === 'aguardandoResposta'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)] scale-105'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Hourglass size={16} className={activeContextTab === 'aguardandoResposta' ? 'text-[#0A0F2C]' : 'text-sky-400'} />
          <span>⌛ Aguardando Resposta ({categorized.aguardandoResposta.length})</span>
        </button>

        <button
          onClick={() => setActiveContextTab('bloqueadas')}
          className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
            activeContextTab === 'bloqueadas'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)] scale-105'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Ban size={16} className={activeContextTab === 'bloqueadas' ? 'text-[#0A0F2C]' : 'text-amber-400'} />
          <span>🚧 Bloqueadas / Devolvidas ({categorized.bloqueadas.length})</span>
        </button>

        <button
          onClick={() => setActiveContextTab('concluidas')}
          className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
            activeContextTab === 'concluidas'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)] scale-105'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <CheckCircle2 size={16} className={activeContextTab === 'concluidas' ? 'text-[#0A0F2C]' : 'text-emerald-400'} />
          <span>✅ Concluídas ({categorized.concluidas.length})</span>
        </button>

        <button
          onClick={() => setActiveContextTab('todas')}
          className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
            activeContextTab === 'todas'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)] scale-105'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <ListTodo size={16} className="text-white/60" />
          <span>📋 Todas ({categorized.sortedAll.length})</span>
        </button>
      </div>

      {/* SMART QUICK FILTERS & CONTROLS (ETAPA 9) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
        {/* Quick Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mr-1">Filtro Rápido:</span>

          <button
            onClick={() => setQuickChip(quickChip === 'soMinhas' ? 'todos' : 'soMinhas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              quickChip === 'soMinhas'
                ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md font-black'
                : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
            }`}
          >
            Só Minhas
          </button>

          <button
            onClick={() => setQuickChip(quickChip === 'coanfitria' ? 'todos' : 'coanfitria')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              quickChip === 'coanfitria'
                ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md font-black'
                : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
            }`}
          >
            Coanfitriã
          </button>

          <button
            onClick={() => setQuickChip(quickChip === 'urgentes' ? 'todos' : 'urgentes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              quickChip === 'urgentes'
                ? 'bg-rose-500 text-white shadow-md font-black'
                : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
            }`}
          >
            Urgentes
          </button>

          <button
            onClick={() => setQuickChip(quickChip === 'atrasadas' ? 'todos' : 'atrasadas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              quickChip === 'atrasadas'
                ? 'bg-amber-500 text-[#0A0F2C] shadow-md font-black'
                : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
            }`}
          >
            Atrasadas
          </button>

          <button
            onClick={() => setQuickChip(quickChip === 'semPrazo' ? 'todos' : 'semPrazo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              quickChip === 'semPrazo'
                ? 'bg-sky-500 text-white shadow-md font-black'
                : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
            }`}
          >
            Sem Prazo
          </button>
        </div>

        {/* Dropdowns and Search */}
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFD600]"
          >
            <option value="" className="bg-[#0A0F2C]">Grupo: Todos</option>
            {groups.map(g => (
              <option key={g.id} value={g.id} className="bg-[#0A0F2C]">{g.nome}</option>
            ))}
          </select>

          {/* Responsible Filter (Supabase Auth Users) */}
          <select
            value={selectedResponsible}
            onChange={(e) => setSelectedResponsible(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFD600]"
          >
            <option value="" className="bg-[#0A0F2C]">Responsável: Todos</option>
            {userOptions.map(u => (
              <option key={u.id} value={u.id} className="bg-[#0A0F2C]">
                {u.full_name} {u.email ? `(${u.email})` : ''}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFD600]"
          >
            <option value="" className="bg-[#0A0F2C]">Prioridade: Todas</option>
            <option value="Urgente" className="bg-[#0A0F2C]">Urgente</option>
            <option value="Alta" className="bg-[#0A0F2C]">Alta</option>
            <option value="Média" className="bg-[#0A0F2C]">Média</option>
            <option value="Baixa" className="bg-[#0A0F2C]">Baixa</option>
          </select>

          {/* Search input */}
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pendência..."
              className="w-full pl-8 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-bold outline-none focus:border-[#FFD600] placeholder-white/20"
            />
          </div>

          {/* Layout Toggle */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'grid' ? 'bg-[#FFD600] text-[#0A0F2C]' : 'text-white/40 hover:text-white'
              }`}
              title="Visualização em Grid"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'table' ? 'bg-[#FFD600] text-[#0A0F2C]' : 'text-white/40 hover:text-white'
              }`}
              title="Visualização em Lista"
            >
              <LayoutList size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CARDS / LIST DISPLAY */}
      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-white/40 flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#FFD600]" />
          <span>Calculando scores de prioridade e atualizando dados...</span>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white/5 border border-white/10 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-[#FFD600]">
            <CheckSquare size={24} />
          </div>
          <h3 className="text-base font-black text-white">Nenhuma pendência nesta categoria</h3>
          <p className="text-xs text-white/50 max-w-md mx-auto">
            Tudo limpo! Não há itens correspondentes aos filtros selecionados nesta aba de contexto.
          </p>
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="px-5 py-2.5 bg-[#FFD600] text-[#0A0F2C] font-black text-xs uppercase rounded-xl inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Criar Nova Pendência
          </button>
        </div>
      ) : layoutMode === 'grid' ? (
        /* GRID VIEW USING REUSABLE PRIORITY CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedItems.map((item) => (
            <PendenciaPriorityCard
              key={item.id}
              pendencia={item}
              currentUserId={currentUserId}
              onOpenDetail={(id) => setSelectedPendenciaId(id)}
              onReloadNeeded={loadData}
            />
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 custom-scrollbar">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-black/40 text-[10px] font-black uppercase text-white/50 border-b border-white/10">
              <tr>
                <th className="p-4">Prioridade & Status</th>
                <th className="p-4">Título / Descrição</th>
                <th className="p-4">Grupo / Imóvel</th>
                <th className="p-4">Solicitante ➔ Responsável</th>
                <th className="p-4">Prazo</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayedItems.map((item) => {
                const info = item.priorityInfo;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedPendenciaId(item.id)}
                    className="hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <td className="p-4 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}>
                          {info.label}
                        </span>
                        <span className="text-[10px] text-white/40 font-bold">
                          ({info.score} pts)
                        </span>
                      </div>
                    </td>

                    <td className="p-4 max-w-xs">
                      <p className="font-bold text-white hover:text-[#FFD600] truncate">{item.titulo}</p>
                      {item.descricao && <p className="text-[11px] text-white/50 truncate">{item.descricao}</p>}
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        {item.grupo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border inline-block" style={{ backgroundColor: `${item.grupo.cor}20`, borderColor: item.grupo.cor, color: item.grupo.cor }}>
                            {item.grupo.nome}
                          </span>
                        )}
                        {item.chacara_nome && <p className="text-[10px] text-white/60">🏡 {item.chacara_nome}</p>}
                      </div>
                    </td>

                    <td className="p-4 text-white/80">
                      <div className="text-[11px]">
                        <span className="text-white/40">{item.criado_por_nome || 'Sistema'}</span> ➔ <strong className="text-[#FFD600]">{item.responsavel_atual_nome || 'Ninguém'}</strong>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`font-bold ${info.isOverdue ? 'text-rose-400 font-extrabold' : 'text-white'}`}>
                        {item.prazo ? `${item.prazo} ${item.prazo_hora || ''}` : 'Sem prazo'}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPendenciaId(item.id);
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white font-bold text-[11px] rounded-lg transition-all"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <PendenciaFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={loadData}
      />

      <PendenciaGroupManagerModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupsUpdated={loadData}
      />

      <PendenciaDetailDrawerModal
        pendenciaId={selectedPendenciaId}
        isOpen={Boolean(selectedPendenciaId)}
        onClose={() => setSelectedPendenciaId(null)}
        onUpdated={loadData}
      />
        </>
      )}
    </div>
  );
}
