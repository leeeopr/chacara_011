'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  TreePine, 
  Sparkles, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  RefreshCw, 
  Layers, 
  Sliders, 
  DollarSign, 
  TrendingDown,
  Info,
  Calendar,
  Building
} from 'lucide-react';
import { 
  PlanningProcess, 
  PlanningProcessType, 
  PlanningProcessStatus,
  ProcessViabilityVerdict,
  PROCESS_TYPE_META,
  PROCESS_STATUS_META
} from '@/lib/planningProcessTypes';
import { Chacara } from '@/lib/chacaraTypes';
import { formatCurrency } from '@/lib/utils';
import { getPlanningProcesses, deletePlanningProcess } from '@/services/planningProcessService';
import ProcessCard from './ProcessCard';
import ProcessViabilityModal from './ProcessViabilityModal';
import ProcessDetailModal from './ProcessDetailModal';

interface PlanningProcessesViewProps {
  chacaras: Chacara[];
  selectedChacaraFilter?: string;
}

export default function PlanningProcessesView({
  chacaras,
  selectedChacaraFilter = 'ALL'
}: PlanningProcessesViewProps) {
  const [processes, setProcesses] = useState<PlanningProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<PlanningProcessType | 'ALL'>('ALL');
  const [selectedVerdict, setSelectedVerdict] = useState<ProcessViabilityVerdict | 'ALL'>('ALL');
  const [localChacaraId, setLocalChacaraId] = useState<string>(selectedChacaraFilter);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [processToEdit, setProcessToEdit] = useState<PlanningProcess | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<PlanningProcess | null>(null);

  const loadProcesses = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getPlanningProcesses();
      setProcesses(data);
    } catch (err) {
      console.error('Erro ao carregar processos de planejamento:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  // Update filter when prop changes
  useEffect(() => {
    if (selectedChacaraFilter) {
      setLocalChacaraId(selectedChacaraFilter);
    }
  }, [selectedChacaraFilter]);

  // Filtered list
  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesResp = p.responsible_name?.toLowerCase().includes(q);
        const matchesChacara = p.chacara?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesResp && !matchesChacara) return false;
      }

      // Type
      if (selectedType !== 'ALL' && p.process_type !== selectedType) {
        return false;
      }

      // Chácara
      if (localChacaraId !== 'ALL') {
        if (localChacaraId === 'GENERAL' && p.chacara_id) return false;
        if (localChacaraId !== 'GENERAL' && p.chacara_id !== localChacaraId) return false;
      }

      // Verdict
      if (selectedVerdict !== 'ALL') {
        const verdict = p.latest_viability_analysis?.verdict || 'DADOS_INSUFICIENTES';
        if (verdict !== selectedVerdict) return false;
      }

      return true;
    });
  }, [processes, searchTerm, selectedType, localChacaraId, selectedVerdict]);

  // KPI Stats
  const stats = useMemo(() => {
    const total = processes.length;
    const totalCost = processes.reduce((sum, p) => sum + (p.estimated_cost || 0), 0);
    
    let viaveis = 0;
    let atencao = 0;
    let naoViaveis = 0;

    processes.forEach(p => {
      const v = p.latest_viability_analysis?.verdict;
      if (v === 'VIAVEL') viaveis++;
      else if (v === 'VIAVEL_COM_ATENCAO') atencao++;
      else if (v === 'NAO_VIAVEL') naoViaveis++;
    });

    return {
      total,
      totalCost,
      viaveis,
      atencao,
      naoViaveis
    };
  }, [processes]);

  const handleDelete = async (id: string) => {
    try {
      await deletePlanningProcess(id);
      loadProcesses();
    } catch (err) {
      console.error('Erro ao excluir processo:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Executive Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-[#0F172A] border border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Total de Processos
            </span>
            <Calculator size={16} className="text-[#00E5FF]" />
          </div>
          <div className="text-xl font-black text-white">{stats.total}</div>
          <span className="text-[10px] text-white/40 block">
            Custo total: {formatCurrency(stats.totalCost)}
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-[#0F172A] border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              100% Viáveis
            </span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-300">{stats.viaveis}</div>
          <span className="text-[10px] text-emerald-400/60 block">Caixa seguro com folga</span>
        </div>

        <div className="p-4 rounded-3xl bg-[#0F172A] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Viáveis com Atenção
            </span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300">{stats.atencao}</div>
          <span className="text-[10px] text-amber-400/60 block">Abaixo do colchão / parcelar</span>
        </div>

        <div className="p-4 rounded-3xl bg-[#0F172A] border border-rose-500/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              Não Viáveis Agora
            </span>
            <XCircle size={16} className="text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-300">{stats.naoViaveis}</div>
          <span className="text-[10px] text-rose-400/60 block">Causaria saldo negativo</span>
        </div>
      </div>

      {/* 2. Controls & Search Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0F172A] border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-white/40" />
            <input
              id="input-search-processes"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar processo por título, chácara, responsável ou escopo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#00E5FF] transition-all"
            />
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-processes"
              onClick={() => loadProcesses(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all disabled:opacity-50"
              title="Atualizar lista"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-[#00E5FF]' : ''} />
            </button>

            <button
              id="btn-new-process"
              onClick={() => {
                setProcessToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#00E5FF] to-[#3B82F6] text-slate-950 hover:brightness-110 shadow-lg shadow-[#00E5FF]/15 transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Novo Processo</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
          {/* Filter Chácara */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <TreePine size={14} className="text-[#00E5FF]" />
            <select
              id="select-filter-chacara"
              value={localChacaraId}
              onChange={(e) => setLocalChacaraId(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todas as Propriedades</option>
              <option value="GENERAL" className="bg-slate-900 text-white">Geral (Sem chácara fixa)</option>
              {chacaras.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Type */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Layers size={14} className="text-white/50" />
            <select
              id="select-filter-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todos os Tipos</option>
              <option value="MANUTENCAO" className="bg-slate-900 text-white">Manutenção / Infra</option>
              <option value="COMPRA" className="bg-slate-900 text-white">Compra / Suprimentos</option>
              <option value="MELHORIA_INVESTIMENTO" className="bg-slate-900 text-white">Melhoria / Investimento</option>
              <option value="OUTRO" className="bg-slate-900 text-white">Outro</option>
            </select>
          </div>

          {/* Filter Verdict */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Sparkles size={14} className="text-[#00E5FF]" />
            <select
              id="select-filter-verdict"
              value={selectedVerdict}
              onChange={(e) => setSelectedVerdict(e.target.value as any)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todos os Pareceres</option>
              <option value="VIAVEL" className="bg-slate-900 text-emerald-300">🟢 100% Viável</option>
              <option value="VIAVEL_COM_ATENCAO" className="bg-slate-900 text-amber-300">🟡 Viável com Atenção</option>
              <option value="NAO_VIAVEL" className="bg-slate-900 text-rose-300">🔴 Não Viável</option>
            </select>
          </div>

          {(searchTerm || selectedType !== 'ALL' || localChacaraId !== 'ALL' || selectedVerdict !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('ALL');
                setLocalChacaraId('ALL');
                setSelectedVerdict('ALL');
              }}
              className="text-[11px] text-[#00E5FF] hover:underline ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 3. Processes Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw size={24} className="animate-spin mx-auto text-[#00E5FF]" />
          <p className="text-xs text-white/50">Carregando processos e projeções...</p>
        </div>
      ) : filteredProcesses.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-3xl bg-[#0F172A] border border-white/10 p-8">
          <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
            <Calculator size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">Nenhum processo encontrado</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Cadastre um processo (ex: Manutenção do motor da piscina) para descobrir na hora se a chácara possui fôlego financeiro para realizá-lo agora.
            </p>
          </div>
          <button
            onClick={() => {
              setProcessToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#00E5FF] to-[#3B82F6] text-slate-950 hover:brightness-110 shadow-lg shadow-[#00E5FF]/20 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Cadastrar Primeiro Processo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProcesses.map(process => (
            <ProcessCard
              key={process.id}
              process={process}
              onViewDetails={(p) => {
                setSelectedProcess(p);
                setIsDetailModalOpen(true);
              }}
              onEdit={(p) => {
                setProcessToEdit(p);
                setIsFormModalOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ProcessViabilityModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setProcessToEdit(null);
        }}
        onSaved={loadProcesses}
        processToEdit={processToEdit}
        chacaras={chacaras}
      />

      <ProcessDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProcess(null);
        }}
        process={selectedProcess}
        onEdit={(p) => {
          setProcessToEdit(p);
          setIsFormModalOpen(true);
        }}
        onUpdated={loadProcesses}
      />
    </div>
  );
}
