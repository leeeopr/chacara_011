'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Flame,
  ArrowRight,
  TreePine,
  User,
  Tag,
  Building2,
  Trash2,
  Edit,
  Check,
  X,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Link2,
  ListFilter,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Star,
  Globe
} from 'lucide-react';
import {
  HousePurchase,
  PurchasePriority,
  PurchaseStatus,
  PurchaseCategory,
  PurchaseFilters,
  PurchaseStats,
  PurchaseImage
} from '@/lib/purchasesTypes';
import {
  getHousePurchases,
  deleteHousePurchase,
  markPurchaseAsBought,
  computePurchasesStats
} from '@/services/purchasesService';
import { getChacaras } from '@/services/chacarasService';
import { Chacara } from '@/lib/chacaraTypes';
import PurchaseFormModal from './PurchaseFormModal';
import PurchaseImageLightbox from './PurchaseImageLightbox';

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
    loadData();

    const handlePurchasesUpdated = () => {
      loadData();
    };

    window.addEventListener('purchases-updated', handlePurchasesUpdated);
    window.addEventListener('pendencias-updated', handlePurchasesUpdated);

    return () => {
      window.removeEventListener('purchases-updated', handlePurchasesUpdated);
      window.removeEventListener('pendencias-updated', handlePurchasesUpdated);
    };
  }, [activeTab, selectedChacara, selectedPriority, selectedCategory, searchQuery]);

  const loadData = async () => {
    setLoading(true);
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
    } catch (e) {
      console.warn('Erro ao carregar compras:', e);
    } finally {
      setLoading(false);
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

  const handleOpenNew = () => {
    setPurchaseToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: HousePurchase) => {
    setPurchaseToEdit(p);
    setIsFormModalOpen(true);
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

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Deseja realmente remover esta compra?')) return;
    try {
      await deleteHousePurchase(id);
      loadData();
      window.dispatchEvent(new CustomEvent('purchases-updated'));
    } catch (e) {
      alert('Erro ao excluir item.');
    }
  };

  const handleInitiateMarkBought = (p: HousePurchase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItemToMarkBought(p);
    setPaidPriceInput(p.paid_price || p.estimated_price || 0);
    setSyncFinancialInput(true);
  };

  const handleConfirmMarkBought = async () => {
    if (!itemToMarkBought) return;
    setSavingBought(true);
    try {
      await markPurchaseAsBought(
        itemToMarkBought.id,
        paidPriceInput,
        syncFinancialInput,
        itemToMarkBought.chacara_id
      );
      setItemToMarkBought(null);
      loadData();
      window.dispatchEvent(new CustomEvent('purchases-updated'));
    } catch (e) {
      console.error('Erro ao marcar como comprado:', e);
      alert('Erro ao confirmar compra.');
    } finally {
      setSavingBought(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-white/10 p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20 font-black">
            <ShoppingBag size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Módulo de Compras das Chácaras
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider border border-amber-500/30">
                Fase 2
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Controle inteligente com prioridade, trava de dependências, galeria de fotos e fluxo financeiro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all cursor-pointer"
            title="Atualizar lista"
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
            <Flame size={22} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase">Previsão de Custo</p>
            <p className="text-xl font-black text-amber-400 mt-1">
              R$ {stats.pendingEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">Itens pendentes</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-zinc-900/60 p-2 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('canBuyNow')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'canBuyNow'
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Check size={14} />
            Liberados ({stats.canBuyNowCount})
          </button>

          <button
            onClick={() => setActiveTab('urgent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'urgent'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame size={14} />
            Urgentes ({stats.urgentCount})
          </button>

          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'blocked'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock size={14} />
            Bloqueados ({stats.blockedCount})
          </button>

          <button
            onClick={() => setActiveTab('allPending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'allPending'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Todos Pendentes
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Comprados ({stats.completedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-3 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por produto, loja..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <select
            value={selectedChacara}
            onChange={e => setSelectedChacara(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">Todas as Chácaras</option>
            {chacaras.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">Todas as Prioridades / Urgências</option>
            <option value="INFRAESTRUTURA">🔴 1. Infraestrutura (Mais importante)</option>
            <option value="ESTRUTURA">⚡ 2. Estrutura (Intermediário)</option>
            <option value="SUPERESTRUTURA">🔹 3. Superestrutura (Menos importante)</option>
            <option value="URGENTE">🔥 Urgente (Legado)</option>
            <option value="ALTA">⚡ Alta (Legado)</option>
            <option value="NORMAL">🔹 Normal (Legado)</option>
            <option value="BAIXA">💤 Baixa (Legado)</option>
          </select>
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">Todas as Categorias</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Limpeza">Limpeza</option>
            <option value="Cozinha">Cozinha</option>
            <option value="Banheiro">Banheiro</option>
            <option value="Jardim">Jardim</option>
            <option value="Piscina">Piscina</option>
            <option value="Eletrônicos">Eletrônicos</option>
            <option value="Mobiliário">Mobiliário</option>
            <option value="Segurança">Segurança</option>
            <option value="Consumíveis">Consumíveis</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>

      {/* Main Items Grid / List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/50">Carregando itens de compra do Supabase...</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900 border border-white/10 rounded-3xl space-y-3">
          <ShoppingBag size={36} className="mx-auto text-white/20" />
          <h3 className="text-sm font-bold text-white">Nenhum item encontrado</h3>
          <p className="text-xs text-white/50">
            Não há produtos cadastrados nesta categoria ou filtro.
          </p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} />
            Cadastrar Compra
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchases.map(item => {
            const prio = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.NORMAL;
            const st = STATUS_BADGES[item.status] || STATUS_BADGES.A_COMPRAR;
            const isBlocked = item.status === 'AGUARDANDO_DEPENDENCIA';
            const primaryPhoto = item.primary_image_url || (item.images?.find(i => i.is_primary)?.public_url) || (item.images?.[0]?.public_url) || null;
            const photoCount = item.images_count || (item.images ? item.images.length : (primaryPhoto ? 1 : 0));

            return (
              <div
                key={item.id}
                onClick={() => handleOpenEdit(item)}
                className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 cursor-pointer group hover:shadow-xl ${
                  isBlocked
                    ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/60'
                    : item.status === 'COMPRADO'
                    ? 'bg-zinc-950/50 border-white/5 opacity-80 hover:opacity-100 hover:border-white/20'
                    : 'bg-zinc-900 border-white/10 hover:border-amber-400/50'
                }`}
              >
                <div className="space-y-3">
                  {/* 1. PHOTO SECTION DIRECTLY ON CARD */}
                  {primaryPhoto ? (
                    <div
                      onClick={(e) => handleOpenPhotoGallery(item, e)}
                      className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 bg-black/40 group/photo cursor-pointer shadow-md shrink-0"
                      title="Clique para abrir galeria e gerenciar fotos deste item"
                    >
                      <img
                        src={primaryPhoto}
                        alt={item.product_name}
                        className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                      {/* Floating Top Badges & Price over Photo */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 z-10">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border backdrop-blur-md shadow-sm ${prio.bg} ${prio.text} ${prio.border}`}>
                            {prio.label}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </div>

                        <div className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-right shadow-sm">
                          {item.status === 'COMPRADO' ? (
                            <span className="text-xs font-black text-emerald-400">
                              R$ {(item.paid_price || item.estimated_price * item.quantity).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs font-black text-amber-400">
                              R$ {(item.estimated_price * item.quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Floating Bottom Photo Overlay Info */}
                      <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between z-10 text-white text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white/90 border border-white/10 font-semibold text-[10px]">
                          {item.quantity} {item.unit} • {item.category}
                        </span>
                        {photoCount > 1 ? (
                          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-amber-300 font-bold border border-amber-400/30 flex items-center gap-1 text-[10px]">
                            <Camera size={11} />
                            +{photoCount} fotos
                          </span>
                        ) : (
                          <span className="opacity-0 group-hover/photo:opacity-100 transition-opacity px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white/90 font-medium flex items-center gap-1 text-[10px]">
                            <Camera size={11} />
                            Ver fotos
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Top Badges & Price when no photo */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${prio.bg} ${prio.text} ${prio.border}`}>
                            {prio.label}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </div>

                        <div className="text-right">
                          {item.status === 'COMPRADO' ? (
                            <span className="text-xs font-black text-emerald-400">
                              R$ {(item.paid_price || item.estimated_price * item.quantity).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs font-black text-amber-400">
                              R$ {(item.estimated_price * item.quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Clean Neutral Photo Upload Trigger Banner */}
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

                    {item.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-400 shrink-0" />
                        <span>Prazo: <strong className="text-white">{new Date(item.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                      </div>
                    )}

                    {item.responsible_name && (
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-blue-400 shrink-0" />
                        <span className="truncate">Responsável: <strong className="text-white">{item.responsible_name}</strong></span>
                      </div>
                    )}

                    {item.task_titulo && (
                      <div className="flex items-center gap-1.5">
                        <Link2 size={13} className="text-amber-400 shrink-0" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            item.task_id && onOpenTaskDetail?.(item.task_id);
                          }}
                          className="hover:underline text-amber-300 font-semibold truncate"
                        >
                          Tarefa: {item.task_titulo}
                        </button>
                      </div>
                    )}

                    {item.supplier && (
                      <div className="flex items-center gap-1.5 text-white/40">
                        <Building2 size={13} className="shrink-0" />
                        <span className="truncate">Loja: {item.supplier}</span>
                      </div>
                    )}
                  </div>

                  {/* 3. PRODUCT LINK CLICKABLE BUTTON */}
                  {item.product_url && (
                    <div className="pt-2">
                      <a
                        href={item.product_url.startsWith('http') ? item.product_url : `https://${item.product_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 hover:text-blue-100 border border-blue-500/30 hover:border-blue-500/60 text-xs font-bold flex items-center justify-between transition-all group/prodlink shadow-sm active:scale-[0.99] cursor-pointer"
                        title={`Abrir link externo do produto: ${item.product_url}`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Globe size={14} className="text-blue-400 shrink-0" />
                          <span className="truncate">Ver Produto / Loja Online</span>
                        </div>
                        <ExternalLink size={13} className="text-blue-400 group-hover/prodlink:translate-x-0.5 group-hover/prodlink:-translate-y-0.5 transition-transform shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  {item.status !== 'COMPRADO' ? (
                    <button
                      onClick={(e) => handleInitiateMarkBought(item, e)}
                      disabled={isBlocked}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isBlocked
                          ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-95'
                      }`}
                    >
                      <Check size={15} />
                      {isBlocked ? 'Bloqueado' : 'Comprar / Baixar'}
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={15} /> Concluído
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(item);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-zinc-950 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Editar todos os dados"
                    >
                      <Edit size={13} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
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
        purchaseToEdit={purchaseToEdit}
        onSuccess={loadData}
      />

      {/* Photo Lightbox */}
      <PurchaseImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        purchaseId={lightboxPurchaseId}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        productName={lightboxTitle}
        onImagesChange={(updatedImages) => {
          if (lightboxPurchaseId) {
            const primary = updatedImages.find(i => i.is_primary)?.public_url || updatedImages[0]?.public_url || undefined;
            setPurchases(prev => prev.map(p => {
              if (p.id === lightboxPurchaseId) {
                return {
                  ...p,
                  primary_image_url: primary,
                  images: updatedImages,
                  images_count: updatedImages.length
                };
              }
              return p;
            }));
          }
          loadData();
        }}
      />

      {/* Mark as Bought Confirmation Modal */}
      {itemToMarkBought && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-400" />
                Registrar Compra Efetuada
              </h3>
              <button
                onClick={() => setItemToMarkBought(null)}
                className="text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-white/70">
                Você está confirmando a compra de: <strong className="text-white">{itemToMarkBought.product_name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Valor Real Pago (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={paidPriceInput}
                    onChange={e => setPaidPriceInput(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-emerald-400 font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="syncFin"
                  checked={syncFinancialInput}
                  onChange={e => setSyncFinancialInput(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-zinc-900 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="syncFin" className="text-xs text-white/80 cursor-pointer">
                  <strong>Registrar no Financeiro da Chácara</strong>
                  <p className="text-[11px] text-white/40">
                    Gera um lançamento oficial de saída no módulo financeiro vinculado a esta chácara.
                  </p>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemToMarkBought(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-semibold hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkBought}
                disabled={savingBought}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                {savingBought ? 'Salvando...' : 'Confirmar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
