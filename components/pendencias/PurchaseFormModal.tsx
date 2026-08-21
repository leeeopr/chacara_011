'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShoppingBag,
  DollarSign,
  Calendar,
  User,
  TreePine,
  Link2,
  AlertTriangle,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  FileText,
  Tag,
  Building,
  CheckCircle2,
  Camera,
  Upload,
  Trash2,
  Star,
  Eye,
  Plus,
  ExternalLink,
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
  createHousePurchase,
  updateHousePurchase,
  getHousePurchases,
  getPurchaseImages,
  uploadPurchasePhoto,
  deletePurchasePhoto,
  setPrimaryPurchasePhoto,
  checkCircularDependency
} from '@/services/purchasesService';
import { getChacaras } from '@/services/chacarasService';
import { getCrewMembers } from '@/services/crewService';
import { getPendencias, getUserProfilesForAutocomplete } from '@/services/pendenciasService';
import { Chacara } from '@/lib/chacaraTypes';
import { Pendencia } from '@/lib/pendenciasTypes';
import PurchaseImageLightbox from './PurchaseImageLightbox';

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseToEdit?: HousePurchase | null;
  onSuccess: () => void;
  initialChacaraId?: string;
  initialTaskId?: string;
}

const CATEGORIES: PurchaseCategory[] = [
  'Manutenção',
  'Limpeza',
  'Cozinha',
  'Banheiro',
  'Jardim',
  'Piscina',
  'Eletrônicos',
  'Mobiliário',
  'Segurança',
  'Consumíveis',
  'Outros'
];

const UNITS = ['un', 'cx', 'kg', 'm', 'pacote', 'litro', 'kit', 'par', 'rolo'];

export default function PurchaseFormModal({
  isOpen,
  onClose,
  purchaseToEdit,
  onSuccess,
  initialChacaraId,
  initialTaskId
}: PurchaseFormModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dropdown lists
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [crewMembers, setCrewMembers] = useState<{ id: string; name: string }[]>([]);
  const [otherPurchases, setOtherPurchases] = useState<HousePurchase[]>([]);
  const [tasks, setTasks] = useState<Pendencia[]>([]);

  // Form state
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('un');
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [paidPrice, setPaidPrice] = useState<number>(0);
  const [priority, setPriority] = useState<PurchasePriority>('INFRAESTRUTURA');
  const [status, setStatus] = useState<PurchaseStatus>('A_COMPRAR');
  const [chacaraId, setChacaraId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [dependsOnPurchaseId, setDependsOnPurchaseId] = useState<string>('');
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<PurchaseCategory>('Outros');
  const [supplier, setSupplier] = useState<string>('');
  const [productUrl, setProductUrl] = useState<string>('');

  // Images state
  const [images, setImages] = useState<PurchaseImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage('');
      loadAuxiliaryData();

      if (purchaseToEdit) {
        setProductName(purchaseToEdit.product_name || '');
        setDescription(purchaseToEdit.description || '');
        setQuantity(purchaseToEdit.quantity !== undefined ? purchaseToEdit.quantity : 1);
        setUnit(purchaseToEdit.unit || 'un');
        setEstimatedPrice(purchaseToEdit.estimated_price !== undefined ? purchaseToEdit.estimated_price : 0);
        setPaidPrice(purchaseToEdit.paid_price !== undefined && purchaseToEdit.paid_price !== null ? purchaseToEdit.paid_price : 0);
        setPriority(purchaseToEdit.priority || 'NORMAL');
        setStatus(purchaseToEdit.status || 'A_COMPRAR');
        setChacaraId(purchaseToEdit.chacara_id || '');
        setTaskId(purchaseToEdit.task_id || '');
        setDependsOnPurchaseId(purchaseToEdit.depends_on_purchase_id || '');
        setResponsibleId(purchaseToEdit.responsible_id || '');
        setResponsibleName(purchaseToEdit.responsible_name || '');
        setDueDate(purchaseToEdit.due_date ? String(purchaseToEdit.due_date).split('T')[0] : '');
        setCategory(purchaseToEdit.category || 'Outros');
        setSupplier(purchaseToEdit.supplier || '');
        setProductUrl(purchaseToEdit.product_url || '');

        // Load images for the existing item
        loadItemImages(purchaseToEdit);
      } else {
        setProductName('');
        setDescription('');
        setQuantity(1);
        setUnit('un');
        setEstimatedPrice(0);
        setPaidPrice(0);
        setPriority('INFRAESTRUTURA');
        setStatus('A_COMPRAR');
        setChacaraId(initialChacaraId || '');
        setTaskId(initialTaskId || '');
        setDependsOnPurchaseId('');
        setResponsibleId('');
        setResponsibleName('');
        setDueDate('');
        setCategory('Outros');
        setSupplier('');
        setProductUrl('');
        setImages([]);
      }
    }
  }, [isOpen, purchaseToEdit, initialChacaraId, initialTaskId]);

  const loadItemImages = async (item: HousePurchase) => {
    try {
      const loaded = await getPurchaseImages(item.id);
      if (loaded.length > 0) {
        setImages(loaded);
      } else if (item.images && item.images.length > 0) {
        setImages(item.images);
      } else if (item.primary_image_url) {
        setImages([
          {
            id: 'primary-init',
            purchase_id: item.id,
            public_url: item.primary_image_url,
            file_name: 'Foto Principal',
            is_primary: true
          }
        ]);
      } else {
        setImages([]);
      }
    } catch (e) {
      if (item.images) setImages(item.images);
    }
  };

  const loadAuxiliaryData = async () => {
    try {
      const [chList, realUsers, crewList, purList, taskList] = await Promise.all([
        getChacaras(),
        getUserProfilesForAutocomplete(''),
        getCrewMembers(),
        getHousePurchases(),
        getPendencias()
      ]);

      setChacaras(chList);
      
      // Combine real Supabase Auth users as top priority options
      const formattedRealUsers = realUsers.map(u => ({
        id: u.id,
        name: `${u.full_name}${u.email ? ` (${u.email})` : ''}`
      }));

      const formattedCrew = crewList
        .filter(c => !realUsers.some(r => r.id === c.id))
        .map(c => ({ id: c.id, name: c.nome || c.name || '' }));

      setCrewMembers([...formattedRealUsers, ...formattedCrew]);
      
      // Filter out self and circular items if editing
      setOtherPurchases(purList.filter(p => !purchaseToEdit || p.id !== purchaseToEdit.id));
      setTasks(taskList);
    } catch (e) {
      console.warn('Erro ao carregar auxiliares do formulário de compras:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMessage('');

    try {
      const targetPurchaseId = purchaseToEdit?.id || 'temp-new';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isFirst = images.length === 0 && i === 0;

        if (purchaseToEdit) {
          const uploaded = await uploadPurchasePhoto(purchaseToEdit.id, file, isFirst);
          setImages(prev => {
            if (isFirst) {
              return [uploaded, ...prev.map(img => ({ ...img, is_primary: false }))];
            }
            return [...prev, uploaded];
          });
        } else {
          // Local preview for new item before initial creation
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const newLocalImg: PurchaseImage = {
            id: `temp-${Date.now()}-${i}`,
            public_url: dataUrl,
            file_name: file.name,
            file_size: file.size,
            is_primary: isFirst
          };

          setImages(prev => {
            if (isFirst) {
              return [newLocalImg, ...prev.map(img => ({ ...img, is_primary: false }))];
            }
            return [...prev, newLocalImg];
          });
        }
      }
    } catch (err: any) {
      console.error('Erro no upload de foto:', err);
      setErrorMessage('Não foi possível carregar a imagem selecionada.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (purchaseToEdit) {
        await deletePurchasePhoto(imgId, purchaseToEdit.id);
      }
      setImages(prev => {
        const filtered = prev.filter(img => img.id !== imgId);
        // If deleted was primary and list has remaining, set first as primary
        const wasPrimary = prev.find(img => img.id === imgId)?.is_primary;
        if (wasPrimary && filtered.length > 0) {
          filtered[0].is_primary = true;
          if (purchaseToEdit) {
            setPrimaryPurchasePhoto(purchaseToEdit.id, filtered[0].id || '', filtered[0].public_url);
          }
        }
        return filtered;
      });
    } catch (e) {
      console.warn('Erro ao deletar imagem:', e);
    }
  };

  const handleSetPrimaryImage = async (imgId: string, imgUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (purchaseToEdit) {
        await setPrimaryPurchasePhoto(purchaseToEdit.id, imgId, imgUrl);
      }
      setImages(prev =>
        prev.map(img => ({
          ...img,
          is_primary: img.id === imgId
        }))
      );
    } catch (e) {
      console.warn('Erro ao definir foto principal:', e);
    }
  };

  if (!isOpen) return null;

  const handleNextStep = (e?: React.MouseEvent | React.FormEvent) => {
    e?.preventDefault();
    if (currentStep === 1) {
      if (!productName.trim()) {
        setErrorMessage('Informe o nome do produto antes de continuar.');
        return;
      }
      setErrorMessage('');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setErrorMessage('');
      setCurrentStep(3);
    }
  };

  const handlePrevStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setErrorMessage('');
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // STEP GUARD: If user presses enter on step 1 or 2, proceed to next step
    if (currentStep < 3) {
      handleNextStep(e);
      return;
    }

    if (!productName.trim()) {
      setErrorMessage('Informe o nome do produto.');
      setCurrentStep(1);
      return;
    }

    // Circular dependency check
    if (purchaseToEdit && dependsOnPurchaseId) {
      const isLoop = checkCircularDependency(purchaseToEdit.id, dependsOnPurchaseId, otherPurchases);
      if (isLoop) {
        setErrorMessage('A dependência selecionada causa um ciclo circular (Item A depende de Item B que depende de Item A). Selecione outra compra ou nenhuma.');
        return;
      }
    }

    if (loading) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const selectedChacaraObj = chacaras.find(c => c.id === chacaraId);
      const selectedTaskObj = tasks.find(t => t.id === taskId);
      const selectedDepObj = otherPurchases.find(p => p.id === dependsOnPurchaseId);

      const primaryImg = images.find(img => img.is_primary)?.public_url || images[0]?.public_url || null;

      const payload = {
        product_name: productName.trim(),
        description: description.trim(),
        quantity: Number(quantity || 1),
        unit,
        estimated_price: Number(estimatedPrice || 0),
        paid_price: Number(paidPrice || 0),
        priority,
        status,
        chacara_id: chacaraId || null,
        chacara_nome: selectedChacaraObj?.name || null,
        task_id: taskId || null,
        task_titulo: selectedTaskObj?.titulo || null,
        depends_on_purchase_id: dependsOnPurchaseId || null,
        depends_on_purchase_name: selectedDepObj?.product_name || null,
        responsible_id: responsibleId || null,
        responsible_name: responsibleName || null,
        due_date: dueDate ? dueDate.split('T')[0] : null,
        category,
        supplier: supplier.trim(),
        product_url: productUrl.trim() || null,
        primary_image_url: primaryImg,
        images: images
      };

      if (purchaseToEdit) {
        // STRICT UPDATE: Never creates duplicate
        await updateHousePurchase(purchaseToEdit.id, payload);
      } else {
        await createHousePurchase(payload);
      }

      // Notify other components & real-time views
      window.dispatchEvent(new CustomEvent('purchases-updated'));
      window.dispatchEvent(new CustomEvent('pendencias-updated'));

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar item de compra:', err);
      setErrorMessage(err.message || 'Erro ao salvar item de compra no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
          
          {/* Header */}
          <div className="p-5 bg-zinc-950/90 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShoppingBag size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {purchaseToEdit ? (
                    <>
                      <span>Editar Item de Compra</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Edição
                      </span>
                    </>
                  ) : (
                    'Nova Compra da Chácara'
                  )}
                </h2>
                <p className="text-xs text-white/50">
                  {purchaseToEdit 
                    ? `Alterando informações de: ${purchaseToEdit.product_name}`
                    : 'Gestão com prioridade, dependências e integração financeira.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar (não salva alterações)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="px-6 py-3 bg-zinc-950/40 border-b border-white/5 flex items-center justify-between text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => { setErrorMessage(''); setCurrentStep(1); }}
              className="flex items-center gap-2 cursor-pointer group focus:outline-none"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-colors ${currentStep === 1 ? 'bg-amber-400 text-zinc-950 font-black' : 'bg-white/10 text-white/60 group-hover:bg-white/20'}`}>1</span>
              <span className={currentStep === 1 ? 'text-amber-400 font-bold' : 'text-white/40 group-hover:text-white/70'}>1. O que Comprar & Chácara</span>
            </button>

            <ChevronRight size={14} className="text-white/20" />

            <button
              type="button"
              onClick={() => {
                if (!productName.trim()) {
                  setErrorMessage('Informe o nome do produto antes de continuar.');
                  setCurrentStep(1);
                  return;
                }
                setErrorMessage('');
                setCurrentStep(2);
              }}
              className="flex items-center gap-2 cursor-pointer group focus:outline-none"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-colors ${currentStep === 2 ? 'bg-amber-400 text-zinc-950 font-black' : 'bg-white/10 text-white/60 group-hover:bg-white/20'}`}>2</span>
              <span className={currentStep === 2 ? 'text-amber-400 font-bold' : 'text-white/40 group-hover:text-white/70'}>2. Valores, Fornecedor & Fotos</span>
            </button>

            <ChevronRight size={14} className="text-white/20" />

            <button
              type="button"
              onClick={() => {
                if (!productName.trim()) {
                  setErrorMessage('Informe o nome do produto antes de continuar.');
                  setCurrentStep(1);
                  return;
                }
                setErrorMessage('');
                setCurrentStep(3);
              }}
              className="flex items-center gap-2 cursor-pointer group focus:outline-none"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-colors ${currentStep === 3 ? 'bg-amber-400 text-zinc-950 font-black' : 'bg-white/10 text-white/60 group-hover:bg-white/20'}`}>3</span>
              <span className={currentStep === 3 ? 'text-amber-400 font-bold' : 'text-white/40 group-hover:text-white/70'}>3. Vínculos, Prazos & Dependências</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* STEP 1: PRODUTO & CHÁCARA */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Nome do Produto / Item <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="Ex: Torneira Monocomando Banheiro, Cloro 10kg..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Categoria do Produto
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as PurchaseCategory)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Chácara / Imóvel Relacionado
                    </label>
                    <select
                      value={chacaraId}
                      onChange={e => setChacaraId(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="">Geral / Todas as Chácaras</option>
                      {chacaras.map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Unidade
                    </label>
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Nível de Urgência
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as PurchasePriority)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="INFRAESTRUTURA" className="text-rose-400 font-bold">🔴 1. Infraestrutura (Mais importante)</option>
                      <option value="ESTRUTURA" className="text-amber-400 font-bold">⚡ 2. Estrutura (Intermediário)</option>
                      <option value="SUPERESTRUTURA" className="text-sky-400 font-bold">🔹 3. Superestrutura (Menos importante)</option>
                      {/* Backward compatibility */}
                      <option value="URGENTE" className="text-rose-400">🔥 URGENTE (Legado)</option>
                      <option value="ALTA" className="text-amber-400">⚡ ALTA (Legado)</option>
                      <option value="NORMAL" className="text-blue-400">🔹 NORMAL (Legado)</option>
                      <option value="BAIXA" className="text-zinc-400">💤 BAIXA (Legado)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Status da Compra
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as PurchaseStatus)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                  >
                    <option value="A_COMPRAR">🟡 A COMPRAR (Disponível)</option>
                    <option value="EM_COTACAO">🔵 EM COTAÇÃO</option>
                    <option value="AGUARDANDO_DEPENDENCIA">🟣 AGUARDANDO DEPENDÊNCIA (Bloqueado)</option>
                    <option value="COMPRADO">🟢 COMPRADO (Finalizado)</option>
                    <option value="CANCELADO">🔴 CANCELADO</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: VALORES, FORNECEDOR & FOTOS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <p className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <DollarSign size={16} />
                    Estimativa & Controle de Custo
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Valor Unitário Estimado (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={estimatedPrice}
                          onChange={e => setEstimatedPrice(parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white font-bold text-sm focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-white/40 mt-1">
                        Total Estimado: R$ {(estimatedPrice * quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

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
                          value={paidPrice}
                          onChange={e => setPaidPrice(parseFloat(e.target.value) || 0)}
                          placeholder="Preenchido ao comprar"
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-emerald-400 font-bold text-sm focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-white/40 mt-1">
                        Preenchido quando a compra for efetuada.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Fornecedor / Loja Recomendada
                    </label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={e => setSupplier(e.target.value)}
                      placeholder="Ex: Leroy Merlin, Mercado Livre, Telhanorte..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-white/70">
                        Link do Produto / Loja Online (URL)
                      </label>
                      {productUrl.trim() && (
                        <a
                          href={productUrl.startsWith('http') ? productUrl : `https://${productUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink size={12} />
                          <span>Testar Link</span>
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <Globe size={15} className="absolute left-3.5 top-3 text-white/40" />
                      <input
                        type="url"
                        value={productUrl}
                        onChange={e => setProductUrl(e.target.value)}
                        placeholder="https://www.mercadolivre.com.br/..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 font-mono text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-white/40 mt-1">
                      Gera um botão clicável nos cards para redirecionar diretamente ao produto.
                    </p>
                  </div>
                </div>

                {/* PHOTOS GALLERY & UPLOAD */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Camera size={16} className="text-amber-400" />
                        Fotos e Imagens do Item
                      </p>
                      <p className="text-[11px] text-white/50">
                        Anexe fotos da peça quebrada, modelo de referência ou embalagem.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>Adicionar Foto</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {images.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                      {images.map((img, idx) => (
                        <div
                          key={img.id || idx}
                          onClick={() => {
                            setLightboxIndex(idx);
                            setLightboxOpen(true);
                          }}
                          className={`relative group aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                            img.is_primary
                              ? 'border-[#FFD600] ring-2 ring-[#FFD600]/30 shadow-lg'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <img
                            src={img.public_url}
                            alt={img.file_name || 'Foto'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Primary Badge */}
                          {img.is_primary ? (
                            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#FFD600] text-zinc-950 font-black text-[9px] flex items-center gap-1 shadow-md">
                              <Star size={10} className="fill-zinc-950" />
                              Principal
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleSetPrimaryImage(img.id || '', img.public_url, e)}
                              className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 hover:bg-[#FFD600] text-white hover:text-black font-bold text-[9px] opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5"
                              title="Tornar Foto Principal"
                            >
                              <Star size={9} />
                              Definir Principal
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteImage(img.id || '', e)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/80 hover:bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                            title="Remover Foto"
                          >
                            <Trash2 size={12} />
                          </button>

                          {/* View overlay */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Eye size={18} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-white/20 hover:border-amber-400/50 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-black/20 hover:bg-black/40"
                    >
                      <Camera size={24} className="mx-auto text-white/40 mb-2" />
                      <p className="text-xs font-semibold text-white/70">
                        Nenhuma foto adicionada ainda
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Clique aqui para selecionar fotos do seu dispositivo.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* STEP 3: VÍNCULOS, PRAZOS & DEPENDÊNCIAS */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <p className="text-xs font-bold text-white/80 flex items-center gap-2">
                    <Link2 size={16} className="text-amber-400" />
                    Dependência de Outra Compra
                  </p>
                  <p className="text-[11px] text-white/50">
                    Se este item depende que outro produto seja comprado primeiro (ex: suporte antes da TV, torneira antes do reparo), selecione abaixo:
                  </p>

                  <select
                    value={dependsOnPurchaseId}
                    onChange={e => setDependsOnPurchaseId(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none"
                  >
                    <option value="">Nenhuma dependência (Livre para comprar agora)</option>
                    {otherPurchases.map(p => (
                      <option key={p.id} value={p.id}>
                        Depende de: {p.product_name} [{p.status}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-white/70">
                        Prazo / Data Limite
                      </label>
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate('')}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Limpar Data
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Responsável pela Compra
                    </label>
                    <select
                      value={responsibleId}
                      onChange={e => {
                        const selectedId = e.target.value;
                        const sel = crewMembers.find(c => c.id === selectedId);
                        setResponsibleId(selectedId);
                        const cleanName = sel?.name ? sel.name.replace(/\s*\([^)]*\)/, '').trim() : '';
                        setResponsibleName(cleanName);
                      }}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="">Nenhum responsável definido (Livre)</option>
                      {crewMembers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Vincular a uma Tarefa / Pendência (Opcional)
                  </label>
                  <select
                    value={taskId}
                    onChange={e => setTaskId(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    <option value="">Nenhuma tarefa vinculada</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>
                        Tarefa: {t.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Descrição / Observações Adicionais
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Especificações técnicas, dimensões, cor ou detalhes..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* Footer Controls */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  Voltar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
                >
                  Continuar
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {purchaseToEdit ? 'Salvar Alterações' : 'Criar Item de Compra'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Modal */}
      <PurchaseImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
        initialIndex={lightboxIndex}
        productName={productName || 'Foto da Compra'}
      />
    </>
  );
}
