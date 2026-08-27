'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  DollarSign,
  TrendingDown,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  Sparkles,
  TreePine,
  Image as ImageIcon,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  XCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import {
  HousePurchase,
  PurchaseStatus,
  PurchasePriority,
  PurchaseCategory,
  PurchaseStats,
  PurchaseImage
} from '@/lib/purchasesTypes';
import {
  PurchaseViabilityVerdict,
  PurchaseViabilityAnalysis,
  PurchaseViabilityGlobalSummary
} from '@/lib/purchaseViabilityTypes';
import {
  getHousePurchases,
  deleteHousePurchase,
  markPurchaseAsBought,
  computePurchasesStats
} from '@/services/purchasesService';
import { calculatePurchasesViability, getMaintenancePercentConfig } from '@/services/purchaseViabilityService';
import { getChacaras } from '@/services/chacarasService';
import { Chacara } from '@/lib/chacaraTypes';
import { formatCurrency } from '@/lib/utils';
import PurchaseFormModal from './PurchaseFormModal';
import PurchaseImageLightbox from './PurchaseImageLightbox';
import PurchaseViabilityOverviewHeader from './PurchaseViabilityOverviewHeader';
import PurchaseViabilityDetailModal from './PurchaseViabilityDetailModal';

interface PurchasesManagementProps {
  onOpenTaskDetail?: (taskId: string) => void;
}

type PurchaseTab = 'canBuyNow' | 'blocked' | 'urgent' | 'allPending' | 'completed';

const PRIORITY_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  INFRAESTRUTURA: { label: 'INFRAESTRUTURA', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  ESTRUTURA: { label: 'ESTRUTURA', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  SUPERESTRUTURA: { label: 'SUPERESTRUTURA', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/40' },
  URGENTE: { label: 'URGENTE', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  ALTA: { label: 'ALTA', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  NORMAL: { label: 'NORMAL', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  BAIXA: { label: 'BAIXA', bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/40' }
};

const STATUS_BADGES: Record<PurchaseStatus, { label: string; bg: string; text: string }> = {
  A_COMPRAR: { label: 'A COMPRAR', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
  EM_COTACAO: { label: 'EM COTAÇÃO', bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400' },
  AGUARDANDO_DEPENDENCIA: { label: 'AGUARDANDO DEPENDÊNCIA', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-300' },
  COMPRADO: { label: 'COMPRADO', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  CANCELADO: { label: 'CANCELADO', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' }
};

export default function PurchasesManagement({ onOpenTaskDetail }: PurchasesManagementProps) {
  const [purchases, setPurchases] = useState<HousePurchase[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [loading, setLoading] = useState(true);

  // Viability State
  const [viabilitySummary, setViabilitySummary] = useState<PurchaseViabilityGlobalSummary | null>(null);
  const [viabilityLoading, setViabilityLoading] = useState(false);
  const [selectedViabilityFilter, setSelectedViabilityFilter] = useState<string>('');
  const [purchaseForAnalysis, setPurchaseForAnalysis] = useState<HousePurchase | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [configuredPercent, setConfiguredPercent] = useState<number>(20);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<PurchaseTab>('canBuyNow');
  const [selectedChacara, setSelectedChacara] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<HousePurchase | null>(null);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPurchaseId, setLightboxPurchaseId] = useState<string | undefined>(undefined);
  const [lightboxImages, setLightboxImages] = useState<PurchaseImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxTitle, setLightboxTitle] = useState('');

  // Confirm Mark as Bought Modal
  const [itemToMarkBought, setItemToMarkBought] = useState<HousePurchase | null>(null);
  const [paidPriceInput, setPaidPriceInput] = useState<number>(0);
  const [syncFinancialInput, setSyncFinancialInput] = useState<boolean>(true);
  const [savingBought, setSavingBought] = useState(false);

  useEffect(() => {
    setConfiguredPercent(getMainMaintenancePercent());
  }, []);

  const getMainMaintenancePercent = () => {
    return getMaintenancePercentConfig();
  };

  useEffect(() => {
    loadData();

    const handlePurchasesUpdated = () => {
      loadData();
    };

    const handleViabilityConfigUpdated = (e: any) => {
      if (e.detail?.percent !== undefined) {
        setConfiguredPercent(e.detail.percent);
      }
      loadData();
    };

    window.addEventListener('purchases-updated', handlePurchasesUpdated);
    window.addEventListener('pendencias-updated', handlePurchasesUpdated);
    window.addEventListener('viability-config-updated', handleViabilityConfigUpdated);

    return () => {
      window.removeEventListener('purchases-updated', handlePurchasesUpdated);
      window.removeEventListener('pendencias-updated', handlePurchasesUpdated);
      window.removeEventListener('viability-config-updated', handleViabilityConfigUpdated);
    };
  }, [activeTab, selectedChacara, selectedPriority, selectedCategory, searchQuery, configuredPercent]);

  const loadData = async () => {
    setLoading(true);
    setViabilityLoading(true);
    try {
      const [chList, purList] = await Promise.all([
        getChacaras(),
        getHousePurchases({
          chacara_id: selectedChacara || undefined,
          priority: (selectedPriority as PurchasePriority) || undefined,
          category: (selectedCategory as any) || undefined,
          search: searchQuery || undefined,
          viewTab: activeTab
        })
      ]);

      setChacaras(chList);
      setPurchases(purList);

      // Calcular Viabilidade Financeira em tempo real com base no Saldo Real e Mínimo Circulável
      try {
        const viab = await calculatePurchasesViability(purList, {
          chacaraId: selectedChacara || undefined,
          percentualManutencao: configuredPercent
        });
        setViabilitySummary(viab);
      } catch (err) {
        console.warn('Erro ao calcular viabilidade de compras:', err);
      }
    } catch (e) {
      console.warn('Erro ao carregar compras:', e);
    } finally {
      setLoading(false);
      setViabilityLoading(false);
    }
  };

  const stats: PurchaseStats = useMemo(() => {
    return computePurchasesStats(purchases);
  }, [purchases]);

  // Priority-ranked Action List: "O que preciso comprar agora?"
  const actionList = useMemo(() => {
    const active = purchases.filter(p => p.status !== 'COMPRADO' && p.status !== 'CANCELADO' && p.status !== 'AGUARDANDO_DEPENDENCIA');
    const order: Record<string, number> = {
      INFRAESTRUTURA: 1,
      URGENTE: 1.5,
      ESTRUTURA: 2,
      ALTA: 2.5,
      SUPERESTRUTURA: 3,
      NORMAL: 3.5,
      BAIXA: 4
    };
    return active.sort((a, b) => (order[a.priority] || 99) - (order[b.priority] || 99)).slice(0, 5);
  }, [purchases]);

  // Filtragem combinada considerando filtro de viabilidade do Motor
  const displayedPurchases = useMemo(() => {
    if (!selectedViabilityFilter || !viabilitySummary) {
      return purchases;
    }

    return purchases.filter(item => {
      const analysis = viabilitySummary.analysesByPurchaseId[item.id];
      if (!analysis) return true;

      if (selectedViabilityFilter === 'VIAVEL') {
        return analysis.verdict === 'VIAVEL';
      }
      if (selectedViabilityFilter === 'NAO_VIAVEL') {
        return analysis.verdict === 'NAO_VIAVEL';
      }
      if (selectedViabilityFilter === 'OUTROS') {
        return analysis.verdict === 'AGUARDANDO_DEPENDENCIA' || analysis.verdict === 'DADOS_INSUFICIENTES';
      }
      return true;
    });
  }, [purchases, selectedViabilityFilter, viabilitySummary]);

  const handleOpenNew = () => {
    setPurchaseToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: HousePurchase) => {
    setPurchaseToEdit(p);
    setIsFormModalOpen(true);
  };

  const handleOpenAnalysis = (p: HousePurchase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPurchaseForAnalysis(p);
    setIsAnalysisModalOpen(true);
  };

  const handleOpenPhotoGallery = (p: HousePurchase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const imgs = p.images && p.images.length > 0 
      ? p.images 
      : p.primary_image_url 
      ? [{ id: '1', purchase_id: p.id, public_url: p.primary_image_url, file_name: p.product_name, is_primary: true }]
      : [];
    
    setLightboxPurchaseId(p.id);
    setLightboxImages(imgs);
    setLightboxIndex(0);
    setLightboxTitle(p.product_name);
    setLightboxOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir a compra "${name}"?`)) {
      return;
    }
    try {
      await deleteHousePurchase(id);
      await loadData();
    } catch (e) {
      alert('Erro ao excluir compra');
    }
  };

  const handleInitiateMarkBought = (p: HousePurchase) => {
    setItemToMarkBought(p);
    // Preenche com o valor real se já existir, senão com o valor estimado total
    const initialPrice = p.paid_price && p.paid_price > 0 
      ? p.paid_price 
      : (p.estimated_price * (p.quantity || 1));
    setPaidPriceInput(initialPrice);
    setSyncFinancialInput(true);
  };

  const handleConfirmMarkBought = async () => {
    if (!itemToMarkBought) return;
    setSavingBought(true);
    try {
      await markPurchaseAsBought(itemToMarkBought.id, {
        paid_price: Number(paidPriceInput) || 0,
        sync_to_financial: syncFinancialInput
      });
      setItemToMarkBought(null);
      await loadData();
    } catch (e: any) {
      alert('Erro ao registrar compra: ' + (e?.message || ''));
    } finally {
      setSavingBought(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-400/10 text-amber-400 font-bold">
              <ShoppingBag size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Gestão de Compras da Casa
            </h1>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Controle de itens necessários para as chácaras com viabilização financeira pelo Mínimo Circulável.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-3 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-xl transition-all cursor-pointer"
            title="Atualizar compras e recalcular viabilidade"
          >
            <RotateCcw size={16} className={loading ? 'animate-spin text-amber-400' : 'text-white/70'} />
          </button>

          <button
            onClick={handleOpenNew}
            className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-400/20 active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            Nova Compra
          </button>
        </div>
      </div>

      {/* Top Viability Header */}
      <PurchaseViabilityOverviewHeader
        summary={viabilitySummary}
        loading={viabilityLoading}
        selectedViabilityFilter={selectedViabilityFilter}
        onSelectViabilityFilter={setSelectedViabilityFilter}
        onPercentChange={(newPct) => {
          setConfiguredPercent(newPct);
          loadData();
        }}
      />

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase">Liberadas p/ Compra</p>
            <p className="text-2xl font-black text-white mt-1">{stats.canBuyNowCount}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Sem travas ativas</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase">Aguardando Dependência</p>
            <p className="text-2xl font-black text-purple-300 mt-1">{stats.blockedCount}</p>
            <p className="text-[10px] text-purple-400 mt-0.5">Bloqueadas até etapa anterior</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Lock size={22} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase">Infraestrutura / Urgentes</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{stats.urgentCount}</p>
            <p className="text-[10px] text-rose-400/80 mt-0.5">Mais importantes (Prioridade 1)</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase">Total Estimado Pendente</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{formatCurrency(stats.totalEstimatedPending)}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{stats.totalPendingCount} itens pendentes</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Priority Action Deck: O que comprar agora */}
      {actionList.length > 0 && activeTab === 'canBuyNow' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900 border border-amber-400/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Prioridade Máxima — Comprar Primeiro
              </h3>
            </div>
            <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-400/10">
              Ranking Inteligente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {actionList.map((item, idx) => {
              const prio = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.NORMAL;
              const itemViab = viabilitySummary?.analysesByPurchaseId[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenAnalysis(item)}
                  className="p-3 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-amber-400/50 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${prio.text}`}>
                          {prio.label}
                        </span>
                        <span>•</span>
                        <span>{item.chacara_nome || 'Geral'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs font-black text-white block">
                      {formatCurrency(item.paid_price && item.paid_price > 0 ? item.paid_price : (item.estimated_price * (item.quantity || 1)))}
                    </span>
                    {itemViab && (
                      <span className={`text-[10px] font-bold ${itemViab.verdict === 'VIAVEL' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {itemViab.verdict === 'VIAVEL' ? '🟢 Viável' : '🔴 Não Viável'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveTab('canBuyNow'); setSelectedViabilityFilter(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'canBuyNow'
              ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckCircle2 size={15} />
          Liberadas para Compra
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            activeTab === 'canBuyNow' ? 'bg-zinc-950 text-amber-400' : 'bg-white/10 text-white'
          }`}>
            {stats.canBuyNowCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('blocked'); setSelectedViabilityFilter(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'blocked'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lock size={15} />
          Aguardando Dependência
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            activeTab === 'blocked' ? 'bg-zinc-950 text-purple-300' : 'bg-white/10 text-white'
          }`}>
            {stats.blockedCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('urgent'); setSelectedViabilityFilter(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'urgent'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={15} />
          Infraestrutura / Urgentes
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            activeTab === 'urgent' ? 'bg-zinc-950 text-rose-300' : 'bg-white/10 text-white'
          }`}>
            {stats.urgentCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('allPending'); setSelectedViabilityFilter(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'allPending'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Todas Pendentes
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-white">
            {stats.totalPendingCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('completed'); setSelectedViabilityFilter(''); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Já Compradas
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            activeTab === 'completed' ? 'bg-zinc-950 text-emerald-300' : 'bg-white/10 text-white'
          }`}>
            {stats.completedCount}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por produto, local ou link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        {/* Chácara Filter */}
        <select
          value={selectedChacara}
          onChange={(e) => setSelectedChacara(e.target.value)}
          className="px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
        >
          <option value="">Todas as Chácaras</option>
          {chacaras.map(ch => (
            <option key={ch.id} value={ch.id}>{ch.name}</option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
        >
          <option value="">Todas as Prioridades</option>
          <option value="INFRAESTRUTURA">Infraestrutura (Prio 1)</option>
          <option value="ESTRUTURA">Estrutura (Prio 2)</option>
          <option value="SUPERESTRUTURA">Superestrutura (Prio 3)</option>
          <option value="URGENTE">Urgente</option>
          <option value="ALTA">Alta</option>
          <option value="NORMAL">Normal</option>
          <option value="BAIXA">Baixa</option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
        >
          <option value="">Todas as Categorias</option>
          <option value="Eletrodomésticos">Eletrodomésticos</option>
          <option value="Cama, Mesa e Banho">Cama, Mesa e Banho</option>
          <option value="Piscina e Lazer">Piscina e Lazer</option>
          <option value="Utensílios de Cozinha">Utensílios de Cozinha</option>
          <option value="Ferramentas e Manutenção">Ferramentas e Manutenção</option>
          <option value="Decoração e Iluminação">Decoração e Iluminação</option>
          <option value="Móveis">Móveis</option>
          <option value="Segurança">Segurança</option>
          <option value="Eletrônicos">Eletrônicos</option>
          <option value="Outros">Outros</option>
        </select>
      </div>

      {/* Purchases Grid / List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/50">Carregando itens de compra e auditando viabilidade financeira...</p>
        </div>
      ) : displayedPurchases.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900 border border-white/10 rounded-3xl space-y-3">
          <ShoppingBag size={36} className="mx-auto text-white/20" />
          <h3 className="text-sm font-bold text-white">Nenhum item encontrado</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {selectedViabilityFilter
              ? 'Nenhuma compra se enquadra no filtro de viabilidade selecionado.'
              : 'Não há produtos cadastrados nesta categoria ou filtro.'}
          </p>
          {selectedViabilityFilter ? (
            <button
              onClick={() => setSelectedViabilityFilter('')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              Limpar Filtro de Viabilidade
            </button>
          ) : (
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={16} />
              Cadastrar Compra
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedPurchases.map(item => {
            const prio = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.NORMAL;
            const st = STATUS_BADGES[item.status] || STATUS_BADGES.A_COMPRAR;
            const isBlocked = item.status === 'AGUARDANDO_DEPENDENCIA';
            const primaryPhoto = item.primary_image_url || (item.images && item.images[0]?.public_url);
            const photoCount = item.images_count || (item.images ? item.images.length : (primaryPhoto ? 1 : 0));
            const viab = viabilitySummary?.analysesByPurchaseId[item.id];

            return (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-4 group ${
                  isBlocked
                    ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/60'
                    : item.status === 'COMPRADO'
                    ? 'bg-zinc-950/50 border-white/5 opacity-80 hover:opacity-100 hover:border-white/20'
                    : viab?.verdict === 'NAO_VIAVEL'
                    ? 'bg-zinc-900 border-rose-500/30 hover:border-rose-500/60'
                    : viab?.verdict === 'VIAVEL'
                    ? 'bg-zinc-900 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-zinc-900 border-white/10 hover:border-amber-400/50'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Top: Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${prio.bg} ${prio.text} ${prio.border}`}>
                        {prio.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>

                    <span className="text-[10px] text-white/40 font-mono">
                      Qtd: <strong className="text-white">{item.quantity} {item.unit}</strong>
                    </span>
                  </div>

                  {/* 1. PHOTO COVER OR ATTACH CTA */}
                  {primaryPhoto ? (
                    <div
                      onClick={(e) => handleOpenPhotoGallery(item, e)}
                      className="relative h-44 w-full rounded-2xl overflow-hidden bg-black/40 border border-white/10 group/cover cursor-pointer"
                      title="Clique para ver fotos e orçamentos anexados"
                    >
                      <img
                        src={primaryPhoto}
                        alt={item.product_name}
                        className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/80 border border-white/10">
                            {item.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <ImageIcon size={11} />
                            {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
                          </span>
                        </div>

                        <span className="text-[10px] text-white/70 bg-black/50 backdrop-blur-sm self-start px-2 py-0.5 rounded-md flex items-center gap-1 group-hover/cover:text-white">
                          <Camera size={11} />
                          Abrir Galeria
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div
                        onClick={(e) => handleOpenPhotoGallery(item, e)}
                        className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-amber-400/5 hover:border-amber-400/40 flex items-center justify-between text-white/40 hover:text-amber-300 transition-all cursor-pointer group/addphoto"
                        title="Sem foto cadastrada. Clique para adicionar foto ao item."
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-lg bg-white/5 group-hover/addphoto:bg-amber-400/20 group-hover/addphoto:text-amber-400 transition-colors">
                            <Camera size={13} />
                          </div>
                          <span className="text-[11px] font-medium">Sem foto cadastrada</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-400/80 group-hover/addphoto:text-amber-300 group-hover/addphoto:underline flex items-center gap-1">
                          + Adicionar foto
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. ITEM NAME & INFO */}
                  <div>
                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-amber-400 transition-colors">
                      {item.product_name}
                    </h3>
                    {!primaryPhoto && (
                      <div className="flex items-center gap-2 text-[11px] text-white/50 mt-1 flex-wrap">
                        <span>{item.quantity} {item.unit}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. VIABILITY MOTOR BADGE & DIAGNOSIS BANNER */}
                  {item.status !== 'COMPRADO' && viab && (
                    <div
                      onClick={(e) => handleOpenAnalysis(item, e)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 group/viabcard ${
                        viab.verdict === 'VIAVEL'
                          ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15'
                          : viab.verdict === 'NAO_VIAVEL'
                          ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15'
                          : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15'
                      }`}
                      title="Clique para ver o demonstrativo da viabilidade"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {viab.verdict === 'VIAVEL' && (
                            <span className="flex items-center gap-1 text-[11px] font-black text-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              🟢 Viável
                            </span>
                          )}
                          {viab.verdict === 'NAO_VIAVEL' && (
                            <span className="flex items-center gap-1 text-[11px] font-black text-rose-300">
                              <span className="w-2 h-2 rounded-full bg-rose-400" />
                              🔴 Não Viável
                            </span>
                          )}
                          {viab.verdict === 'AGUARDANDO_DEPENDENCIA' && (
                            <span className="flex items-center gap-1 text-[11px] font-black text-purple-300">
                              <Lock size={12} />
                              ⚪ Aguardando Dependência
                            </span>
                          )}
                          {viab.verdict === 'DADOS_INSUFICIENTES' && (
                            <span className="flex items-center gap-1 text-[11px] font-black text-white/60">
                              ⚪ Preço Não Informado
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-amber-300 font-bold group-hover/viabcard:underline flex items-center gap-0.5">
                          Demonstrativo <ArrowRight size={10} />
                        </span>
                      </div>

                      {/* Required phrase */}
                      <p className="text-[11px] font-medium text-white/90 leading-tight">
                        “{viab.fraseExplicativa}”
                      </p>

                      {viab.verdict !== 'AGUARDANDO_DEPENDENCIA' && viab.verdict !== 'DADOS_INSUFICIENTES' && (
                        <div className="flex items-center justify-between text-[10px] text-white/70 pt-2 border-t border-white/5">
                          <span>Saldo Real Atual: <strong className="text-emerald-400">{formatCurrency(viab.saldoRealAtual)}</strong></span>
                          <span>Saldo pós-compra: <strong className={viab.saldoAposCompra >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
                            {formatCurrency(viab.saldoAposCompra)}
                          </strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-white/60 line-clamp-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                      {item.description}
                    </p>
                  )}

                  {/* DEPENDENCY BANNER */}
                  {isBlocked && (
                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Lock size={14} className="text-purple-400" />
                        Aguardando Compra Anterior:
                      </div>
                      <p className="text-[11px] font-semibold text-white/80">
                        "{item.depends_on_purchase_name || 'Item Dependente'}"
                      </p>
                    </div>
                  )}

                  {/* Metadata Tags */}
                  <div className="space-y-1.5 text-[11px] text-white/50 pt-1 border-t border-white/5">
                    {item.chacara_nome && (
                      <div className="flex items-center gap-1.5">
                        <TreePine size={13} className="text-emerald-400 shrink-0" />
                        <span className="truncate">Chácara: <strong className="text-white">{item.chacara_nome}</strong></span>
                      </div>
                    )}

                    {item.suggested_store && (
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag size={13} className="text-amber-400 shrink-0" />
                        <span className="truncate">Loja: <strong className="text-white">{item.suggested_store}</strong></span>
                      </div>
                    )}

                    {item.store_url && (
                      <a
                        href={item.store_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 pt-0.5 truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} className="shrink-0" />
                        <span className="truncate">Ver anúncio / link do produto</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Financial Values & Actions */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 font-semibold block uppercase">
                        {item.status === 'COMPRADO' ? 'Valor Pago' : item.paid_price && item.paid_price > 0 ? 'Preço Real' : 'Preço Estimado'}
                      </span>
                      <p className="text-lg font-black text-white">
                        {formatCurrency(item.paid_price && item.paid_price > 0 ? item.paid_price : (item.estimated_price * (item.quantity || 1)))}
                      </p>
                    </div>

                    {item.status !== 'COMPRADO' && (
                      <div className="text-right">
                        <span className="text-[10px] text-white/40 block">Unitário Est.</span>
                        <span className="text-xs font-semibold text-white/70">
                          {formatCurrency(item.estimated_price)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between gap-2">
                    {item.status !== 'COMPRADO' ? (
                      <button
                        onClick={() => handleInitiateMarkBought(item)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-emerald-500/30 cursor-pointer"
                        title="Registrar item como comprado"
                      >
                        <Check size={14} />
                        Comprei
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        Compra Concluída
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {item.status !== 'COMPRADO' && (
                        <button
                          onClick={(e) => handleOpenAnalysis(item, e)}
                          className="p-2 rounded-xl bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-zinc-950 font-bold text-xs flex items-center transition-colors cursor-pointer"
                          title="Ver Demonstrativo de Viabilidade desta compra"
                        >
                          <Sparkles size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPhotoGallery(item, e);
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="Fotos & Orçamentos"
                      >
                        <Camera size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="Editar Compra"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.product_name)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Excluir Compra"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <PurchaseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={loadData}
        onSaved={loadData}
        purchaseToEdit={purchaseToEdit}
      />

      {/* Photo Lightbox / Multi-image Gallery */}
      <PurchaseImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        title={lightboxTitle}
        purchaseId={lightboxPurchaseId}
        onImagesUpdated={() => {
          loadData();
        }}
      />

      {/* Confirm Mark as Bought Modal with Financial Sync */}
      {itemToMarkBought && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Confirmar Compra Realizada</h3>
                <p className="text-xs text-white/50 truncate max-w-xs">{itemToMarkBought.product_name}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/70 font-semibold mb-1">
                  Valor Total Efetivamente Pago (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidPriceInput || ''}
                  onChange={(e) => setPaidPriceInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                  placeholder="0.00"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Valor estimado original: {formatCurrency(itemToMarkBought.estimated_price * (itemToMarkBought.quantity || 1))}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncFinancialInput}
                    onChange={(e) => setSyncFinancialInput(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-bold text-white text-xs">
                    Lançar automaticamente em Contas a Pagar
                  </span>
                </label>
                <p className="text-[11px] text-white/50 pl-6">
                  Cria uma despesa liquidada (PAGO) na chácara correspondente vinculada a esta compra da casa.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setItemToMarkBought(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
                disabled={savingBought}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkBought}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
                disabled={savingBought}
              >
                {savingBought ? 'Salvando...' : 'Confirmar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Viability Diagnosis Modal */}
      <PurchaseViabilityDetailModal
        isOpen={isAnalysisModalOpen}
        onClose={() => {
          setIsAnalysisModalOpen(false);
          setPurchaseForAnalysis(null);
        }}
        purchase={purchaseForAnalysis}
        analysis={purchaseForAnalysis && viabilitySummary ? viabilitySummary.analysesByPurchaseId[purchaseForAnalysis.id] || null : null}
        onMarkAsBought={(purchaseId) => {
          setIsAnalysisModalOpen(false);
          const item = purchases.find(p => p.id === purchaseId);
          if (item) {
            handleInitiateMarkBought(item);
          }
        }}
      />
    </div>
  );
}
