'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
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
  DollarSign,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Link2,
  Check,
  RotateCcw,
  Eye,
  Edit,
  Filter,
  X,
  Camera,
  Image as ImageIcon,
  Globe
} from 'lucide-react';
import {
  HousePurchase,
  PurchasePriority,
  PurchaseStatus,
  PurchaseCategory,
  PurchaseImage
} from '@/lib/purchasesTypes';
import {
  getHousePurchases,
  markPurchaseAsBought,
  computePurchasesStats
} from '@/services/purchasesService';
import { useAuth } from '@/contexts/AuthContext';
import PurchaseImageLightbox from './PurchaseImageLightbox';

interface UserPendingPurchasesDashboardProps {
  onOpenPurchaseDetail?: (purchase: HousePurchase) => void;
  onOpenNewPurchase?: () => void;
  onOpenTaskDetail?: (taskId: string) => void;
  onNavigateToPurchasesTab?: () => void;
}

type ScopeMode = 'MY_PURCHASES' | 'ALL_PURCHASES';
type FilterTab = 'allPending' | 'urgent' | 'blocked' | 'dueSoon' | 'completed';

const PRIORITY_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  INFRAESTRUTURA: { label: 'INFRAESTRUTURA', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  ESTRUTURA: { label: 'ESTRUTURA', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  SUPERESTRUTURA: { label: 'SUPERESTRUTURA', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/40' },
  URGENTE: { label: 'URGENTE', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  ALTA: { label: 'ALTA', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  NORMAL: { label: 'NORMAL', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  BAIXA: { label: 'BAIXA', bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' }
};

const STATUS_BADGES: Record<PurchaseStatus, { label: string; bg: string; text: string }> = {
  A_COMPRAR: { label: 'A COMPRAR', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
  EM_COTACAO: { label: 'EM COTAÇÃO', bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400' },
  AGUARDANDO_DEPENDENCIA: { label: 'AGUARDANDO DEPENDÊNCIA', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-300' },
  COMPRADO: { label: 'COMPRADO', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  CANCELADO: { label: 'CANCELADO', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' }
};

export default function UserPendingPurchasesDashboard({
  onOpenPurchaseDetail,
  onOpenNewPurchase,
  onOpenTaskDetail,
  onNavigateToPurchasesTab
}: UserPendingPurchasesDashboardProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || '';
  
  // Check if current user has administrative permissions
  const isAdminOrManager = useMemo(() => {
    if (!user) return false;
    const roleUpper = (user.role || '').toUpperCase();
    return roleUpper === 'ADMIN' || roleUpper === 'GERENTE' || roleUpper === 'ANFITRIAO' || roleUpper === 'ADMINISTRADOR';
  }, [user]);

  // Scope & Filters
  const [scopeMode, setScopeMode] = useState<ScopeMode>('MY_PURCHASES');
  const [filterTab, setFilterTab] = useState<FilterTab>('allPending');
  
  const [purchases, setPurchases] = useState<HousePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedParentId, setHighlightedParentId] = useState<string | null>(null);

  // Quick "Mark as Bought" Modal state
  const [itemToMarkBought, setItemToMarkBought] = useState<HousePurchase | null>(null);
  const [paidPriceInput, setPaidPriceInput] = useState<number>(0);
  const [syncFinancialInput, setSyncFinancialInput] = useState<boolean>(true);
  const [savingBought, setSavingBought] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPurchaseId, setLightboxPurchaseId] = useState<string | undefined>(undefined);
  const [lightboxImages, setLightboxImages] = useState<PurchaseImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxTitle, setLightboxTitle] = useState('');

  useEffect(() => {
    loadPurchases();

    const handlePurchasesUpdated = () => {
      loadPurchases();
    };

    window.addEventListener('purchases-updated', handlePurchasesUpdated);
    window.addEventListener('pendencias-updated', handlePurchasesUpdated);

    return () => {
      window.removeEventListener('purchases-updated', handlePurchasesUpdated);
      window.removeEventListener('pendencias-updated', handlePurchasesUpdated);
    };
  }, [currentUserId, scopeMode]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const filters = scopeMode === 'MY_PURCHASES' && currentUserId ? { responsible_id: currentUserId } : {};
      const data = await getHousePurchases(filters);
      setPurchases(data);
    } catch (err) {
      console.warn('Erro ao carregar compras do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Filtered List for Current User / Scope
  const scopedItems = useMemo(() => {
    if (scopeMode === 'MY_PURCHASES' && currentUserId) {
      return purchases.filter(p => p.responsible_id === currentUserId);
    }
    return purchases;
  }, [purchases, scopeMode, currentUserId]);

  // 2. Open Pending Items vs Completed
  const openPendingItems = useMemo(() => {
    return scopedItems.filter(p => p.status !== 'COMPRADO' && p.status !== 'CANCELADO');
  }, [scopedItems]);

  const completedItems = useMemo(() => {
    return scopedItems.filter(p => p.status === 'COMPRADO');
  }, [scopedItems]);

  // 3. Priority Rank Ordering Function
  const sortedPendingItems = useMemo(() => {
    const priorityRank: Record<string, number> = {
      INFRAESTRUTURA: 1,
      URGENTE: 1.5,
      ESTRUTURA: 2,
      ALTA: 2.5,
      SUPERESTRUTURA: 3,
      NORMAL: 3.5,
      BAIXA: 4
    };

    return [...openPendingItems].sort((a, b) => {
      const rankDiff = (priorityRank[a.priority] || 99) - (priorityRank[b.priority] || 99);
      if (rankDiff !== 0) return rankDiff;

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [openPendingItems]);

  // 4. Specific Context Subsets
  const urgentItems = useMemo(() => {
    return sortedPendingItems.filter(p => p.priority === 'INFRAESTRUTURA' || p.priority === 'URGENTE');
  }, [sortedPendingItems]);

  const blockedItems = useMemo(() => {
    return sortedPendingItems.filter(p => p.status === 'AGUARDANDO_DEPENDENCIA');
  }, [sortedPendingItems]);

  const dueSoonItems = useMemo(() => {
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + 3);

    return sortedPendingItems.filter(p => {
      if (!p.due_date) return false;
      const d = new Date(p.due_date + 'T23:59:59');
      return d <= limit;
    });
  }, [sortedPendingItems]);

  // 5. Final Displayed Items according to selected Tab
  const displayedItems = useMemo(() => {
    switch (filterTab) {
      case 'urgent':
        return urgentItems;
      case 'blocked':
        return blockedItems;
      case 'dueSoon':
        return dueSoonItems;
      case 'completed':
        return completedItems;
      case 'allPending':
      default:
        return sortedPendingItems;
    }
  }, [filterTab, urgentItems, blockedItems, dueSoonItems, completedItems, sortedPendingItems]);

  // Jump to parent dependency helper
  const handleJumpToParent = (parentId: string) => {
    setHighlightedParentId(parentId);
    if (scopeMode !== 'ALL_PURCHASES') {
      setScopeMode('ALL_PURCHASES');
    }
    setFilterTab('allPending');

    setTimeout(() => {
      const el = document.getElementById(`purchase-card-${parentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    setTimeout(() => {
      setHighlightedParentId(null);
    }, 4000);
  };

  const handleInitiateMarkBought = (item: HousePurchase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItemToMarkBought(item);
    setPaidPriceInput(item.paid_price || item.estimated_price * item.quantity || 0);
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
      loadPurchases();
      window.dispatchEvent(new CustomEvent('purchases-updated'));
    } catch (err) {
      console.error('Erro ao marcar compra como concluída:', err);
    } finally {
      setSavingBought(false);
    }
  };

  const handleOpenPhoto = (item: HousePurchase, e: React.MouseEvent) => {
    e.stopPropagation();
    const imgs = item.images && item.images.length > 0
      ? item.images
      : item.primary_image_url
      ? [{ id: '1', purchase_id: item.id, public_url: item.primary_image_url, is_primary: true }]
      : [];
    setLightboxPurchaseId(item.id);
    setLightboxImages(imgs);
    setLightboxIndex(0);
    setLightboxTitle(item.product_name);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Scope Selector & Quick Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0A0F2C]/70 p-3 rounded-2xl border border-white/10">
        
        {/* Scope Toggle (Minhas Compras vs Todas) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 w-full sm:w-auto">
          <button
            onClick={() => setScopeMode('MY_PURCHASES')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              scopeMode === 'MY_PURCHASES'
                ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md shadow-[#FFD600]/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={13} />
            <span>Minhas Compras</span>
          </button>

          <button
            onClick={() => setScopeMode('ALL_PURCHASES')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              scopeMode === 'ALL_PURCHASES'
                ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md shadow-[#FFD600]/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <TreePine size={13} />
            <span>Todas as Chácaras</span>
          </button>
        </div>

        {/* Global Module Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onOpenNewPurchase && (
            <button
              onClick={onOpenNewPurchase}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Nova Compra</span>
            </button>
          )}

          {onNavigateToPurchasesTab && (
            <button
              onClick={onNavigateToPurchasesTab}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="Abrir Módulo Completo de Compras"
            >
              <span>Ver Módulo Completo</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterTab('allPending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            filterTab === 'allPending'
              ? 'bg-white/20 text-white border border-white/30 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <Clock size={13} />
          <span>Pendentes ({openPendingItems.length})</span>
        </button>

        <button
          onClick={() => setFilterTab('urgent')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            filterTab === 'urgent'
              ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent'
          }`}
        >
          <Flame size={13} className="text-rose-400" />
          <span>Urgentes ({urgentItems.length})</span>
        </button>

        <button
          onClick={() => setFilterTab('blocked')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            filterTab === 'blocked'
              ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent'
          }`}
        >
          <Lock size={13} className="text-purple-400" />
          <span>Bloqueados / Dependência ({blockedItems.length})</span>
        </button>

        <button
          onClick={() => setFilterTab('dueSoon')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            filterTab === 'dueSoon'
              ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent'
          }`}
        >
          <AlertTriangle size={13} className="text-amber-400" />
          <span>Prazo Próximo ({dueSoonItems.length})</span>
        </button>

        <button
          onClick={() => setFilterTab('completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            filterTab === 'completed'
              ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent'
          }`}
        >
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span>Comprados ({completedItems.length})</span>
        </button>
      </div>

      {/* Main Items Grid */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/50">Carregando lista de compras...</p>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="p-8 text-center bg-[#0A0F2C]/40 border border-white/10 rounded-3xl space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-emerald-300">✨ Tudo em dia!</h3>
            <p className="text-xs text-white/70 max-w-md mx-auto mt-1">
              {scopeMode === 'MY_PURCHASES'
                ? 'Você não possui nenhuma compra pendente sob sua responsabilidade no momento.'
                : 'Nenhuma compra cadastrada para o filtro selecionado.'}
            </p>
          </div>
          {onOpenNewPurchase && (
            <button
              onClick={onOpenNewPurchase}
              className="mt-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Cadastrar Nova Compra</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedItems.map(item => {
            const pBadge = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.NORMAL;
            const sBadge = STATUS_BADGES[item.status] || STATUS_BADGES.A_COMPRAR;
            const isBlocked = item.status === 'AGUARDANDO_DEPENDENCIA';
            const isHighlighted = highlightedParentId === item.id;
            const primaryPhoto = item.primary_image_url || (item.images?.find(i => i.is_primary)?.public_url) || (item.images?.[0]?.public_url) || null;
            const photoCount = item.images_count || (item.images ? item.images.length : (primaryPhoto ? 1 : 0));

            return (
              <div
                key={item.id}
                id={`purchase-card-${item.id}`}
                onClick={() => onOpenPurchaseDetail && onOpenPurchaseDetail(item)}
                className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3 relative group cursor-pointer ${
                  isHighlighted
                    ? 'border-[#FFD600] ring-2 ring-[#FFD600]/50 bg-[#FFD600]/10 shadow-[0_0_20px_rgba(255,214,0,0.3)]'
                    : isBlocked
                    ? 'border-purple-500/30 hover:border-purple-500/60 bg-purple-950/10'
                    : item.priority === 'URGENTE'
                    ? 'border-rose-500/30 hover:border-rose-500/60 bg-rose-950/10'
                    : 'border-white/10 hover:border-amber-400/40 bg-[#0A0F2C]/60'
                }`}
              >
                {/* 1. PHOTO SECTION DIRECTLY ON CARD */}
                {primaryPhoto ? (
                  <div
                    onClick={(e) => handleOpenPhoto(item, e)}
                    className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 bg-black/40 group/photo cursor-pointer shadow-md shrink-0"
                    title="Clique para abrir galeria e gerenciar fotos deste item"
                  >
                    <img
                      src={primaryPhoto}
                      alt={item.product_name}
                      className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                    {/* Floating Top Badges over Photo */}
                    <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 z-10">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${pBadge.bg} ${pBadge.text} border ${pBadge.border} flex items-center gap-1 backdrop-blur-md shadow-sm`}>
                          {item.priority === 'URGENTE' && <Flame size={12} />}
                          <span>{pBadge.label}</span>
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${sBadge.bg} ${sBadge.text} border backdrop-blur-md shadow-sm`}>
                          {sBadge.label}
                        </span>
                      </div>

                      {/* Quantity & Unit Badge */}
                      <div className="px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-xl text-center shrink-0 border border-white/15 shadow-sm">
                        <span className="text-xs font-black text-white">{item.quantity}</span>
                        <span className="text-[10px] font-bold text-white/70 ml-1">{item.unit || 'un'}</span>
                      </div>
                    </div>

                    {/* Floating Bottom Photo Overlay Info */}
                    <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between z-10 text-white text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white/90 border border-white/10 font-semibold text-[10px]">
                        {item.category || 'Geral'}
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
                    {/* Header Badges when no photo */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${pBadge.bg} ${pBadge.text} border ${pBadge.border} flex items-center gap-1`}>
                          {item.priority === 'URGENTE' && <Flame size={12} />}
                          <span>{pBadge.label}</span>
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${sBadge.bg} ${sBadge.text} border`}>
                          {sBadge.label}
                        </span>

                        {item.category && (
                          <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/60 text-[10px] font-bold border border-white/10 flex items-center gap-1">
                            <Tag size={10} />
                            <span>{item.category}</span>
                          </span>
                        )}
                      </div>

                      <div className="px-2.5 py-1 bg-white/10 rounded-xl text-center shrink-0 border border-white/10">
                        <span className="text-xs font-black text-white">{item.quantity}</span>
                        <span className="text-[10px] font-bold text-white/50 ml-1">{item.unit || 'un'}</span>
                      </div>
                    </div>

                    {/* Neutral Photo Upload Trigger Banner */}
                    <div
                      onClick={(e) => handleOpenPhoto(item, e)}
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

                {/* 2. ITEM NAME */}
                <div>
                  <h3 className="text-base font-black text-white tracking-tight group-hover:text-amber-400 transition-colors">
                    {item.product_name}
                  </h3>
                </div>

                {/* Description if present */}
                {item.description && (
                  <p className="text-xs text-white/70 line-clamp-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                    {item.description}
                  </p>
                )}

                {/* BLOCK / DEPENDENCY ALERT BOX */}
                {item.depends_on_purchase_id && (
                  <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                    isBlocked
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isBlocked ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        {isBlocked ? <Lock size={14} /> : <Unlock size={14} />}
                      </div>
                      <div>
                        <p className="font-black text-[11px] uppercase tracking-wider">
                          {isBlocked ? '🟡 AGUARDANDO DEPENDÊNCIA' : '🟢 DEPENDÊNCIA LIBERADA'}
                        </p>
                        <p className="text-[11px] text-white/70">
                          Depende de: <strong className="text-white font-bold">{item.depends_on_purchase_name || 'Compra Anterior'}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToParent(item.depends_on_purchase_id!);
                      }}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all self-start sm:self-auto border border-white/10 cursor-pointer"
                    >
                      <Link2 size={12} />
                      <span>Ver Dependência</span>
                    </button>
                  </div>
                )}

                {/* Metadata Row: Chácara, Task, Due Date, Responsible */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 pt-1">
                  {item.chacara_nome && (
                    <div className="flex items-center gap-1.5">
                      <TreePine size={13} className="text-[#FFD600] shrink-0" />
                      <span className="truncate font-semibold text-white">{item.chacara_nome}</span>
                    </div>
                  )}

                  {item.due_date && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-amber-400 shrink-0" />
                      <span>Prazo: <strong className="text-white font-bold">{new Date(item.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                    </div>
                  )}

                  {item.responsible_name && (
                    <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                      <User size={13} className="text-sky-400 shrink-0" />
                      <span className="truncate">Resp: <strong className="text-white font-bold">{item.responsible_name}</strong></span>
                    </div>
                  )}

                  {item.task_titulo && (
                    <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                      <Link2 size={13} className="text-purple-400 shrink-0" />
                      <span className="truncate">Tarefa: <strong className="text-white font-bold">{item.task_titulo}</strong></span>
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

                {/* Footer Bar: Price & Direct Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                  
                  {/* Price info */}
                  <div>
                    {item.status === 'COMPRADO' ? (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400">Pago Efetuado</span>
                        <p className="text-sm font-black text-emerald-300">
                          R$ {(item.paid_price || item.estimated_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/50">Valor Estimado</span>
                        <p className="text-sm font-black text-[#FFD600]">
                          R$ {(item.estimated_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2">
                    {item.status !== 'COMPRADO' && item.status !== 'CANCELADO' && (
                      <button
                        onClick={(e) => handleInitiateMarkBought(item, e)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        title="Marcar como Comprada"
                      >
                        <Check size={14} />
                        <span>Comprado</span>
                      </button>
                    )}

                    {onOpenPurchaseDetail && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPurchaseDetail(item);
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-amber-400 hover:text-zinc-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
                        title="Editar todas as informações do item"
                      >
                        <Edit size={13} />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
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
          loadPurchases();
        }}
      />

      {/* QUICK MARK BOUGHT MODAL */}
      {itemToMarkBought && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0A0F2C] border border-white/20 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-base font-black text-white">Confirmar Compra Realizada</h3>
              </div>
              <button
                onClick={() => setItemToMarkBought(null)}
                className="p-1 text-white/50 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-white/80">
                Você está marcando o item <strong className="text-[#FFD600] font-bold">{itemToMarkBought.product_name}</strong> como concluído.
              </p>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">
                  Valor Efetivamente Pago (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paidPriceInput}
                  onChange={(e) => setPaidPriceInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-[#FFD600]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-white/80 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={syncFinancialInput}
                  onChange={(e) => setSyncFinancialInput(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#FFD600]"
                />
                <span>Lançar no Financeiro da Chácara como Despesa</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setItemToMarkBought(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMarkBought}
                disabled={savingBought}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#0A0F2C] rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingBought ? (
                  <div className="w-4 h-4 border-2 border-[#0A0F2C] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirmar Compra</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
