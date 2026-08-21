'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, 
  Plus, 
  Search, 
  Filter, 
  TreePine, 
  Clock, 
  CheckCircle2, 
  CalendarClock, 
  XCircle, 
  DollarSign, 
  Lightbulb, 
  Sparkles, 
  RefreshCw,
  TrendingUp,
  LayoutGrid,
  Layers,
  Workflow,
  HelpCircle,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  PlanningDecision, 
  DecisionClassification,
  DecisionStatus, 
  DecisionType, 
  DECISION_TYPE_META, 
  DECISION_STATUS_META,
  DECISION_CLASSIFICATION_META
} from '@/lib/planningTypes';
import { Chacara } from '@/lib/chacaraTypes';
import { formatCurrency } from '@/lib/utils';
import { getChacaras } from '@/services/chacarasService';
import { getPlanningDecisions } from '@/services/planningService';
import DecisionCard from './DecisionCard';
import DecisionFormModal from './DecisionFormModal';
import DecisionDetailModal from './DecisionDetailModal';
import FinancialProjectionOverview from './FinancialProjectionOverview';

export default function PlanningManagement() {
  const [decisions, setDecisions] = useState<PlanningDecision[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View Mode: 'PROJECAO_FINANCEIRA' vs 'QUADRO_DECISOES'
  const [mainViewMode, setMainViewMode] = useState<'PROJECAO_FINANCEIRA' | 'QUADRO_DECISOES'>('PROJECAO_FINANCEIRA');

  // Tab & Filters
  const [selectedClassificationTab, setSelectedClassificationTab] = useState<DecisionClassification | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DecisionStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<DecisionType | 'ALL'>('ALL');
  const [selectedChacaraId, setSelectedChacaraId] = useState<string>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<PlanningDecision | null>(null);
  const [decisionToEdit, setDecisionToEdit] = useState<PlanningDecision | null>(null);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const [decisionsList, chacarasList] = await Promise.all([
        getPlanningDecisions(),
        getChacaras()
      ]);
      setDecisions(decisionsList);
      setChacaras(chacarasList.filter(c => !c.is_deleted));
    } catch (err) {
      console.error('Erro ao carregar dados do planejamento:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered decisions list
  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      // Classification Tab Filter
      if (selectedClassificationTab !== 'ALL' && d.classification !== selectedClassificationTab) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesDesc = d.description?.toLowerCase().includes(q);
        const matchesChacara = d.chacara?.name.toLowerCase().includes(q);
        const matchesPostpone = d.postpone_reason?.toLowerCase().includes(q);
        const matchesRejection = d.rejection_reason?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesChacara && !matchesPostpone && !matchesRejection) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && d.status !== selectedStatus) {
        return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && d.decision_type !== selectedType) {
        return false;
      }

      // Chácara filter
      if (selectedChacaraId !== 'ALL') {
        if (selectedChacaraId === 'GENERAL' && d.chacara_id) return false;
        if (selectedChacaraId !== 'GENERAL' && d.chacara_id !== selectedChacaraId) return false;
      }

      return true;
    });
  }, [decisions, selectedClassificationTab, searchTerm, selectedStatus, selectedType, selectedChacaraId]);

  // Executive Summary KPI calculations
  const stats = useMemo(() => {
    const total = decisions.length;
    const operacionais = decisions.filter(d => d.classification === 'OPERACIONAL').length;
    const projetos = decisions.filter(d => d.classification === 'PROJETO_INVESTIMENTO').length;
    
    const emAnalise = decisions.filter(d => d.status === 'EM_ANALISE').length;
    const aprovadas = decisions.filter(d => d.status === 'APROVADA').length;
    const adiadas = decisions.filter(d => d.status === 'ADIADA').length;
    const rejeitadas = decisions.filter(d => d.status === 'REJEITADA').length;
    
    const totalCostEstimated = decisions.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);
    const approvedCost = decisions.filter(d => d.status === 'APROVADA').reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);

    return {
      total,
      operacionais,
      projetos,
      emAnalise,
      aprovadas,
      adiadas,
      rejeitadas,
      totalCostEstimated,
      approvedCost
    };
  }, [decisions]);

  const handleOpenCreate = () => {
    setDecisionToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleSelectDecision = (decision: PlanningDecision) => {
    setSelectedDecision(decision);
    setIsDetailModalOpen(true);
  };

  const handleEditDecision = (decision: PlanningDecision) => {
    setIsDetailModalOpen(false);
    setDecisionToEdit(decision);
    setIsFormModalOpen(true);
  };

  const handleFormSuccess = (savedDecision: PlanningDecision) => {
    loadData(true);
    if (selectedDecision?.id === savedDecision.id) {
      setSelectedDecision(savedDecision);
    }
  };

  const handleStatusChanged = (updated: PlanningDecision) => {
    setDecisions(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDecision(updated);
  };

  const handleDeleted = () => {
    loadData(true);
    setSelectedDecision(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Module Header */}
      <div className="bg-[#0D153A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD600]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] text-xs font-bold uppercase tracking-wider">
              <Compass size={14} />
              <span>Planejamento & Gestão de Decisões</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Decisões Operacionais & Projetos
            </h1>
            
            <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
              Estruture o ciclo de vida de deliberações das chácaras: desde <strong className="text-cyan-300">Decisões Operacionais</strong> do dia a dia (colchões, prestadores, insumos) até <strong className="text-emerald-300">Projetos & Investimentos</strong> de grande porte (piscinas, energia solar, reformas).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin text-[#FFD600]' : ''} />
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#FFD600] hover:bg-[#ffe033] text-[#0A0F2C] font-black text-sm shadow-[0_0_20px_rgba(255,214,0,0.3)] hover:shadow-[0_0_25px_rgba(255,214,0,0.5)] transition-all duration-200"
            >
              <Plus size={18} />
              <span>Nova Decisão</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-white/10">
          
          {/* Card: Total de Decisões & Divisão */}
          <div className="bg-[#0A0F2C]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Decisões Totais</span>
              <Layers size={16} className="text-white/40" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{stats.total}</span>
                <span className="text-xs text-white/40">registradas</span>
              </div>
              <div className="text-[11px] text-white/50 mt-1 flex items-center gap-2">
                <span className="text-cyan-400 font-semibold">{stats.operacionais} Oper.</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{stats.projetos} Proj.</span>
              </div>
            </div>
          </div>

          {/* Card: Em Análise */}
          <div className="bg-[#0A0F2C]/80 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider">Em Análise</span>
              <Clock size={16} className="text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-300">{stats.emAnalise}</span>
                <span className="text-xs text-white/40">em avaliação</span>
              </div>
              <span className="text-[11px] text-white/40 block mt-1">
                Aguardando deliberação
              </span>
            </div>
          </div>

          {/* Card: Aprovadas */}
          <div className="bg-[#0A0F2C]/80 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider">Aprovadas</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-300">{stats.aprovadas}</span>
                <span className="text-xs text-white/40">autorizadas</span>
              </div>
              <span className="text-[11px] text-emerald-300/60 block mt-1">
                {stats.adiadas} adiadas • {stats.rejeitadas} rejeitadas
              </span>
            </div>
          </div>

          {/* Card: Custo Total Estimado */}
          <div className="bg-[#0A0F2C]/80 border border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-wider">Volume Financeiro</span>
              <DollarSign size={16} className="text-cyan-400" />
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-white truncate block">
                {formatCurrency(stats.totalCostEstimated)}
              </span>
              <span className="text-[11px] text-white/40 mt-1 block">
                Aprovado: {formatCurrency(stats.approvedCost)}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Main View Mode Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0D153A] border border-white/10 rounded-2xl">
        <button
          onClick={() => setMainViewMode('PROJECAO_FINANCEIRA')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
            mainViewMode === 'PROJECAO_FINANCEIRA'
              ? 'bg-gradient-to-r from-[#FFD600] to-[#ffe033] text-[#0A0F2C] shadow-lg shadow-[#FFD600]/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles size={16} />
          <span>Visão Financeira Projetada (Fluxo Real)</span>
        </button>

        <button
          onClick={() => setMainViewMode('QUADRO_DECISOES')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
            mainViewMode === 'QUADRO_DECISOES'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Workflow size={16} />
          <span>Quadro de Decisões & Projetos ({stats.total})</span>
        </button>
      </div>

      {/* RENDER VIEW: PROJEÇÃO FINANCEIRA */}
      {mainViewMode === 'PROJECAO_FINANCEIRA' && (
        <FinancialProjectionOverview
          chacaras={chacaras}
          selectedChacaraId={selectedChacaraId}
          onRefreshNeeded={() => loadData(true)}
        />
      )}

      {/* RENDER VIEW: QUADRO DE DECISÕES */}
      {mainViewMode === 'QUADRO_DECISOES' && (
        <div className="space-y-6">
          {/* Classification Switcher Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-[#0D153A] border border-white/10 rounded-2xl">
            {/* Tab: Todas */}
            <button
              onClick={() => setSelectedClassificationTab('ALL')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                selectedClassificationTab === 'ALL'
                  ? 'bg-white/15 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={15} />
              <span>Todas as Decisões</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedClassificationTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}>
                {stats.total}
              </span>
            </button>

            {/* Tab: Decisões Operacionais */}
            <button
              onClick={() => setSelectedClassificationTab('OPERACIONAL')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                selectedClassificationTab === 'OPERACIONAL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                  : 'text-white/60 hover:text-cyan-300 hover:bg-white/5'
              }`}
            >
              <Workflow size={15} className="text-cyan-400" />
              <span>Decisões Operacionais</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedClassificationTab === 'OPERACIONAL' ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/5 text-white/50'}`}>
                {stats.operacionais}
              </span>
            </button>

            {/* Tab: Projetos & Investimentos */}
            <button
              onClick={() => setSelectedClassificationTab('PROJETO_INVESTIMENTO')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                selectedClassificationTab === 'PROJETO_INVESTIMENTO'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                  : 'text-white/60 hover:text-emerald-300 hover:bg-white/5'
              }`}
            >
              <Sparkles size={15} className="text-emerald-400" />
              <span>Projetos / Investimentos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedClassificationTab === 'PROJETO_INVESTIMENTO' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/5 text-white/50'}`}>
                {stats.projetos}
              </span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#0D153A] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              
              {/* Text Search */}
              <div className="sm:col-span-5 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar por título, descrição, chácara ou motivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0A0F2C] border border-white/10 focus:border-[#FFD600] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full bg-[#0A0F2C] border border-white/10 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                >
                  <option value="ALL">Todos os Status</option>
                  {(Object.keys(DECISION_STATUS_META) as DecisionStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {DECISION_STATUS_META[st].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chácara Filter */}
              <div className="sm:col-span-2">
                <select
                  value={selectedChacaraId}
                  onChange={(e) => setSelectedChacaraId(e.target.value)}
                  className="w-full bg-[#0A0F2C] border border-white/10 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                >
                  <option value="ALL">Todas Chácaras</option>
                  <option value="GENERAL">Gerais (Sem Chácara)</option>
                  {chacaras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="sm:col-span-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full bg-[#0A0F2C] border border-white/10 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                >
                  <option value="ALL">Todos os Tipos</option>
                  {(Object.keys(DECISION_TYPE_META) as DecisionType[]).map((tp) => (
                    <option key={tp} value={tp}>
                      {DECISION_TYPE_META[tp].label}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Active Filters Quick Chips */}
            {(selectedClassificationTab !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL' || selectedChacaraId !== 'ALL' || searchTerm.trim()) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
                <span className="text-white/40">Filtros ativos:</span>
                {selectedClassificationTab !== 'ALL' && (
                  <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold ${DECISION_CLASSIFICATION_META[selectedClassificationTab]?.badgeBg}`}>
                    Classificação: {DECISION_CLASSIFICATION_META[selectedClassificationTab]?.shortLabel}
                    <button onClick={() => setSelectedClassificationTab('ALL')} className="hover:text-rose-400 ml-1">×</button>
                  </span>
                )}
                {searchTerm.trim() && (
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded-md flex items-center gap-1">
                    Busca: &ldquo;{searchTerm}&rdquo;
                    <button onClick={() => setSearchTerm('')} className="hover:text-rose-400 ml-1">×</button>
                  </span>
                )}
                {selectedStatus !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md flex items-center gap-1">
                    Status: {DECISION_STATUS_META[selectedStatus]?.label}
                    <button onClick={() => setSelectedStatus('ALL')} className="hover:text-rose-400 ml-1">×</button>
                  </span>
                )}
                {selectedType !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md flex items-center gap-1">
                    Tipo: {DECISION_TYPE_META[selectedType]?.label}
                    <button onClick={() => setSelectedType('ALL')} className="hover:text-rose-400 ml-1">×</button>
                  </span>
                )}
                {selectedChacaraId !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-[#FFD600]/20 text-[#FFD600] rounded-md flex items-center gap-1">
                    Chácara: {selectedChacaraId === 'GENERAL' ? 'Gerais' : chacaras.find(c => c.id === selectedChacaraId)?.name}
                    <button onClick={() => setSelectedChacaraId('ALL')} className="hover:text-rose-400 ml-1">×</button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedClassificationTab('ALL');
                    setSearchTerm('');
                    setSelectedStatus('ALL');
                    setSelectedType('ALL');
                    setSelectedChacaraId('ALL');
                  }}
                  className="text-[11px] text-white/50 hover:text-white underline ml-auto"
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>

          {/* Decisions List Grid */}
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <RefreshCw size={28} className="animate-spin text-[#FFD600] mb-3" />
              <p className="text-sm font-semibold text-white/70">Carregando decisões de planejamento...</p>
            </div>
          ) : filteredDecisions.length === 0 ? (
            <div className="bg-[#0D153A]/60 border border-white/10 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,214,0,0.15)]">
                <Lightbulb size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  {decisions.length === 0 ? 'Nenhuma Decisão Cadastrada' : 'Nenhuma Decisão Encontrada'}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  {decisions.length === 0
                    ? 'Cadastre a primeira deliberação operacional ou projeto/investimento para iniciar o acompanhamento de decisões.'
                    : 'Nenhuma decisão corresponde aos filtros selecionados.'}
                </p>
              </div>

              <div className="pt-2">
                {decisions.length === 0 ? (
                  <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FFD600] text-[#0A0F2C] font-black text-xs shadow-lg shadow-[#FFD600]/20 hover:bg-[#ffe033] transition-all"
                  >
                    <Plus size={16} />
                    <span>Criar Primeira Decisão</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedClassificationTab('ALL');
                      setSearchTerm('');
                      setSelectedStatus('ALL');
                      setSelectedType('ALL');
                      setSelectedChacaraId('ALL');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDecisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  onClick={() => handleSelectDecision(decision)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <DecisionFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setDecisionToEdit(null);
        }}
        onSuccess={handleFormSuccess}
        decisionToEdit={decisionToEdit}
        defaultClassification={selectedClassificationTab !== 'ALL' ? selectedClassificationTab : 'OPERACIONAL'}
      />

      <DecisionDetailModal
        decision={selectedDecision}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDecision(null);
        }}
        onEdit={handleEditDecision}
        onDeleted={handleDeleted}
        onStatusChanged={handleStatusChanged}
      />

    </div>
  );
}
