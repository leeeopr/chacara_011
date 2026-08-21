'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  TreePine, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Building2, 
  Users, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Sliders, 
  Clock,
  Search,
  Image as ImageIcon,
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ArrowUp,
  ArrowDown,
  Edit2,
  UserPlus,
  ShieldCheck,
  Dog,
  Zap,
  PartyPopper,
  FileText,
  Info
} from 'lucide-react';
import { 
  Chacara, 
  Owner, 
  ChacaraStatus, 
  ChacaraPhoto, 
  ChacaraBlock, 
  BlockReason, 
  CrewMember, 
  Reservation 
} from '@/lib/chacaraTypes';
import { 
  createChacara, 
  updateChacara, 
  getOwners, 
  createOwner, 
  getChacaraById 
} from '@/services/chacarasService';
import { 
  getChacaraBlocks, 
  createChacaraBlock, 
  updateChacaraBlock, 
  deleteChacaraBlock, 
  getReservations 
} from '@/services/reservationsService';
import { 
  getCrewMembers, 
  linkCrewMemberToChacara, 
  unlinkCrewMemberFromChacara 
} from '@/services/crewService';

interface ChacaraFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  chacaraToEdit?: Chacara | null;
  onSuccess: () => void;
}

type TabType = 'geral' | 'endereco' | 'valores' | 'comodidades' | 'fotos' | 'bloqueios' | 'funcionarios' | 'calendario';

interface PhotoItem {
  id: string;
  url: string;
  is_main: boolean;
  display_order: number;
}

export default function ChacaraFormModal({
  isOpen,
  onClose,
  chacaraToEdit,
  onSuccess
}: ChacaraFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auxiliary Lists
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');

  // Photos State
  const [photosList, setPhotosList] = useState<PhotoItem[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [replacePhotoUrl, setReplacePhotoUrl] = useState('');

  // Blocks State
  const [blocks, setBlocks] = useState<ChacaraBlock[]>([]);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Partial<ChacaraBlock> | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);

  // Staff/Crew State
  const [allCrewMembers, setAllCrewMembers] = useState<CrewMember[]>([]);
  const [selectedStaffToLink, setSelectedStaffToLink] = useState('');

  // Integrated Calendar State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Form State
  const [formData, setFormData] = useState<Partial<Chacara>>({
    name: '',
    code: '',
    description: '',
    status: 'ATIVA',
    capacity_people: 15,
    max_capacity: 20,
    bedrooms_count: 3,
    bathrooms_count: 2,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: false,
    has_wifi: true,
    has_air_conditioning: false,
    has_equipped_kitchen: true,
    daily_rate_standard: 500,
    daily_rate_weekend: 800,
    daily_rate_holiday: 1000,
    deposit_amount: 300,
    cleaning_fee: 150,
    extra_guest_fee: 50,
    included_guests: 15,
    allow_pets: true,
    pet_fee: 50,
    energy_fee: 0,
    event_fee: 0,
    financial_notes: '',
    checkin_time: '14:00',
    checkout_time: '12:00',
    rules: 'Proibido som alto após 22h. Cuidar dos equipamentos e do imóvel.',
    notes: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    zip_code: '',
    latitude: undefined,
    longitude: undefined,
    owner_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab('geral');
      setErrorMessage('');
      setSuccessMessage('');
      setIsAddingOwner(false);
      setIsBlockModalOpen(false);
      setPreviewPhotoUrl(null);

      loadInitialData();
    }
  }, [isOpen, chacaraToEdit]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const ownersList = await getOwners();
      setOwners(ownersList);

      if (chacaraToEdit && chacaraToEdit.id) {
        // Fetch fresh full object from database to ensure no missing columns
        const freshChacara = await getChacaraById(chacaraToEdit.id);
        const dataToUse = freshChacara || chacaraToEdit;

        setFormData({
          ...dataToUse,
          capacity_people: dataToUse.capacity_people ?? 15,
          max_capacity: dataToUse.max_capacity ?? dataToUse.capacity_people ?? 20,
          bedrooms_count: dataToUse.bedrooms_count ?? 3,
          bathrooms_count: dataToUse.bathrooms_count ?? 2,
          daily_rate_standard: dataToUse.daily_rate_standard ?? 500,
          daily_rate_weekend: dataToUse.daily_rate_weekend ?? 800,
          daily_rate_holiday: dataToUse.daily_rate_holiday ?? 1000,
          deposit_amount: dataToUse.deposit_amount ?? 300,
          cleaning_fee: dataToUse.cleaning_fee ?? 150,
          extra_guest_fee: dataToUse.extra_guest_fee ?? 0,
          included_guests: dataToUse.included_guests ?? dataToUse.capacity_people ?? 15,
          allow_pets: dataToUse.allow_pets ?? false,
          pet_fee: dataToUse.pet_fee ?? 0,
          energy_fee: dataToUse.energy_fee ?? 0,
          event_fee: dataToUse.event_fee ?? 0,
          checkin_time: dataToUse.checkin_time || '14:00',
          checkout_time: dataToUse.checkout_time || '12:00',
          status: dataToUse.status || 'ATIVA',
          state: dataToUse.state || 'SP'
        });

        // Initialize Photos
        let existingPhotos: PhotoItem[] = [];
        if (dataToUse.photos && dataToUse.photos.length > 0) {
          existingPhotos = dataToUse.photos.map((p, idx) => ({
            id: p.id || `photo_${idx}`,
            url: p.url,
            is_main: !!p.is_main || idx === 0,
            display_order: p.display_order ?? idx
          }));
        } else if (dataToUse.main_photo_url) {
          existingPhotos = [{
            id: 'photo_main',
            url: dataToUse.main_photo_url,
            is_main: true,
            display_order: 0
          }];
        }
        setPhotosList(existingPhotos);

        // Load Blocks, Crew, Reservations for this chacara
        const [blocksList, crewList, resList] = await Promise.all([
          getChacaraBlocks(dataToUse.id),
          getCrewMembers(),
          getReservations({ chacara_id: dataToUse.id })
        ]);

        setBlocks(blocksList);
        setAllCrewMembers(crewList);
        setReservations(resList);
      } else {
        // Creating new Chácara
        setFormData({
          name: '',
          code: '',
          description: '',
          status: 'ATIVA',
          capacity_people: 15,
          max_capacity: 20,
          bedrooms_count: 3,
          bathrooms_count: 2,
          has_pool: true,
          has_barbecue: true,
          has_event_hall: false,
          has_wifi: true,
          has_air_conditioning: false,
          has_equipped_kitchen: true,
          daily_rate_standard: 500,
          daily_rate_weekend: 800,
          daily_rate_holiday: 1000,
          deposit_amount: 300,
          cleaning_fee: 150,
          extra_guest_fee: 50,
          included_guests: 15,
          allow_pets: true,
          pet_fee: 50,
          energy_fee: 0,
          event_fee: 0,
          financial_notes: '',
          checkin_time: '14:00',
          checkout_time: '12:00',
          rules: 'Proibido som alto após 22h. Cuidar do espaço.',
          notes: '',
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: 'SP',
          zip_code: '',
          owner_id: ''
        });
        setPhotosList([]);
        setBlocks([]);
        setReservations([]);
      }
    } catch (err: any) {
      console.warn('[ChacaraFormModal] Erro ao carregar dados:', err);
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen) return null;

  // Owner Quick Creation
  const handleCreateQuickOwner = async () => {
    if (!newOwnerName.trim()) {
      setErrorMessage('Informe o nome do proprietário.');
      return;
    }
    try {
      const created = await createOwner({ 
        full_name: newOwnerName.trim(), 
        phone: newOwnerPhone.trim() 
      });
      const updatedOwners = await getOwners();
      setOwners(updatedOwners);
      setFormData(prev => ({ ...prev, owner_id: created.id }));
      setIsAddingOwner(false);
      setNewOwnerName('');
      setNewOwnerPhone('');
      setSuccessMessage('Proprietário cadastrado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao cadastrar proprietário.');
    }
  };

  // Photo Operations
  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    const url = newPhotoUrl.trim();
    const isFirst = photosList.length === 0;

    const newPhoto: PhotoItem = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      url,
      is_main: isFirst,
      display_order: photosList.length
    };

    setPhotosList(prev => [...prev, newPhoto]);
    setNewPhotoUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setPhotosList(prev => [
            ...prev,
            {
              id: `photo_file_${Date.now()}_${idx}`,
              url: result,
              is_main: prev.length === 0 && idx === 0,
              display_order: prev.length + idx
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeletePhoto = (index: number) => {
    setPhotosList(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Ensure at least one photo is marked main if photos remain
      if (updated.length > 0 && !updated.some(p => p.is_main)) {
        updated[0].is_main = true;
      }
      return updated.map((p, i) => ({ ...p, display_order: i }));
    });
  };

  const handleSetMainPhoto = (index: number) => {
    setPhotosList(prev => prev.map((p, i) => ({
      ...p,
      is_main: i === index
    })));
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photosList.length) return;

    setPhotosList(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((p, i) => ({ ...p, display_order: i }));
    });
  };

  const handleReplacePhoto = (index: number) => {
    if (!replacePhotoUrl.trim()) return;
    setPhotosList(prev => prev.map((p, i) => i === index ? { ...p, url: replacePhotoUrl.trim() } : p));
    setEditingPhotoIndex(null);
    setReplacePhotoUrl('');
  };

  // Block Operations
  const handleOpenNewBlock = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    setEditingBlock({
      title: 'Bloqueio para Manutenção',
      reason: 'MANUTENCAO',
      start_date: today,
      end_date: tomorrow,
      description: ''
    });
    setIsBlockModalOpen(true);
  };

  const handleOpenEditBlock = (block: ChacaraBlock) => {
    setEditingBlock({ ...block });
    setIsBlockModalOpen(true);
  };

  const handleSaveBlockSubmit = async () => {
    if (!chacaraToEdit?.id) return;
    if (!editingBlock?.start_date || !editingBlock?.end_date) {
      setErrorMessage('Informe a data de início e término do bloqueio.');
      return;
    }
    if (!editingBlock.title?.trim()) {
      setErrorMessage('Informe o título do bloqueio.');
      return;
    }

    setSavingBlock(true);
    setErrorMessage('');
    try {
      if (editingBlock.id) {
        await updateChacaraBlock(editingBlock.id, {
          ...editingBlock,
          chacara_id: chacaraToEdit.id
        });
      } else {
        await createChacaraBlock({
          ...editingBlock,
          chacara_id: chacaraToEdit.id
        });
      }

      const updatedBlocks = await getChacaraBlocks(chacaraToEdit.id);
      setBlocks(updatedBlocks);
      setIsBlockModalOpen(false);
      setEditingBlock(null);
      setSuccessMessage('Bloqueio salvo com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar bloqueio.');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlockSubmit = async (blockId: string) => {
    if (!confirm('Tem certeza que deseja excluir este bloqueio?')) return;
    try {
      await deleteChacaraBlock(blockId);
      if (chacaraToEdit?.id) {
        const updatedBlocks = await getChacaraBlocks(chacaraToEdit.id);
        setBlocks(updatedBlocks);
      }
      setSuccessMessage('Bloqueio excluído.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao excluir bloqueio.');
    }
  };

  // Staff Link/Unlink
  const linkedStaff = allCrewMembers.filter(m => chacaraToEdit?.id && m.chacara_ids?.includes(chacaraToEdit.id));
  const availableStaff = allCrewMembers.filter(m => !chacaraToEdit?.id || !m.chacara_ids?.includes(chacaraToEdit.id));

  const handleLinkStaff = async () => {
    if (!selectedStaffToLink || !chacaraToEdit?.id) return;
    try {
      await linkCrewMemberToChacara(selectedStaffToLink, chacaraToEdit.id);
      const updatedCrew = await getCrewMembers();
      setAllCrewMembers(updatedCrew);
      setSelectedStaffToLink('');
      setSuccessMessage('Funcionário vinculado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao vincular funcionário.');
    }
  };

  const handleUnlinkStaff = async (memberId: string) => {
    if (!chacaraToEdit?.id) return;
    if (!confirm('Deseja desvincular este funcionário desta chácara?')) return;
    try {
      await unlinkCrewMemberFromChacara(memberId, chacaraToEdit.id);
      const updatedCrew = await getCrewMembers();
      setAllCrewMembers(updatedCrew);
      setSuccessMessage('Vínculo removido.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao desvincular funcionário.');
    }
  };

  // Submit Main Chácara Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      setErrorMessage('O nome da chácara é obrigatório.');
      setActiveTab('geral');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Prepare photos array for backend sync
      const photoUrls = photosList.map(p => p.url);
      const mainPhoto = photosList.find(p => p.is_main)?.url || photoUrls[0] || '';

      const payloadToSave: Partial<Chacara> = {
        ...formData,
        main_photo_url: mainPhoto
      };

      if (chacaraToEdit && chacaraToEdit.id) {
        await updateChacara(chacaraToEdit.id, payloadToSave, photoUrls);
      } else {
        await createChacara(payloadToSave, photoUrls);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar chácara:', err);
      setErrorMessage(err.message || 'Erro ao salvar chácara.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOwners = owners.filter(o => 
    o.full_name.toLowerCase().includes(ownerSearchTerm.toLowerCase()) ||
    (o.document_number && o.document_number.includes(ownerSearchTerm))
  );

  // Calendar Helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-5 sm:px-8 bg-zinc-950/80 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TreePine size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {chacaraToEdit ? `Editar: ${formData.name || 'Chácara'}` : 'Cadastrar Nova Chácara'}
                {formData.code && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-mono text-white/70">
                    {formData.code}
                  </span>
                )}
              </h2>
              <p className="text-xs text-white/50">
                {chacaraToEdit 
                  ? 'Edição completa de informações, fotos, bloqueios, valores e equipe.' 
                  : 'Preencha os dados abaixo para cadastrar a propriedade.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-8 bg-zinc-950/50 border-b border-white/10 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'geral' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 size={16} />
            Geral
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('endereco')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'endereco' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapPin size={16} />
            Endereço
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('valores')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'valores' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign size={16} />
            Valores & Horários
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comodidades')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'comodidades' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={16} />
            Comodidades
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fotos')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'fotos' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon size={16} />
            Fotos ({photosList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bloqueios')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'bloqueios' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Ban size={16} />
            Bloqueios ({blocks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('funcionarios')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'funcionarios' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={16} />
            Funcionários ({linkedStaff.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendario')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'calendario' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar size={16} />
            Calendário
          </button>
        </div>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 shrink-0">
            <Check size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {loadingData ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-white/50">Carregando dados da chácara do banco...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: GERAL */}
              {activeTab === 'geral' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Nome da Chácara <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Recanto das Palmeiras"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Status de Funcionamento
                      </label>
                      <select
                        value={formData.status || 'ATIVA'}
                        onChange={e => setFormData({ ...formData, status: e.target.value as ChacaraStatus })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="ATIVA">Ativa (Disponível para reservas)</option>
                        <option value="EM_MANUTENCAO">Em Manutenção</option>
                        <option value="INATIVA">Inativa</option>
                        <option value="INTERDITADA">Interditada</option>
                        <option value="VENDIDA">Vendida</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* Owner selection with quick owner creation */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white/80 flex items-center gap-2">
                        <Users size={16} className="text-emerald-400" />
                        Proprietário Vinculado
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingOwner(!isAddingOwner)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} />
                        {isAddingOwner ? 'Cancelar Cadastro' : 'Cadastrar Novo Proprietário'}
                      </button>
                    </div>

                    {isAddingOwner ? (
                      <div className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/30 space-y-3">
                        <p className="text-xs text-white/70 font-semibold">Novo Proprietário Rápido:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Nome Completo *"
                            value={newOwnerName}
                            onChange={e => setNewOwnerName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30"
                          />
                          <input
                            type="text"
                            placeholder="Telefone / WhatsApp"
                            value={newOwnerPhone}
                            onChange={e => setNewOwnerPhone(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateQuickOwner}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors"
                        >
                          Salvar Proprietário
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-3 text-white/30" />
                          <input
                            type="text"
                            placeholder="Buscar proprietário por nome..."
                            value={ownerSearchTerm}
                            onChange={e => setOwnerSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none"
                          />
                        </div>

                        <select
                          value={formData.owner_id || ''}
                          onChange={e => setFormData({ ...formData, owner_id: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value="">Nenhum proprietário selecionado</option>
                          {filteredOwners.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.full_name} {o.phone ? `(${o.phone})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Capacidade e Cômodos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Capacidade Padrão
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.capacity_people ?? 15}
                        onChange={e => setFormData({ ...formData, capacity_people: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Capacidade Máxima
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.max_capacity ?? formData.capacity_people ?? 20}
                        onChange={e => setFormData({ ...formData, max_capacity: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Nº de Quartos
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.bedrooms_count ?? 3}
                        onChange={e => setFormData({ ...formData, bedrooms_count: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Nº de Banheiros
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.bathrooms_count ?? 2}
                        onChange={e => setFormData({ ...formData, bathrooms_count: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Descrição, Regras e Observações */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Descrição da Propriedade
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description || ''}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ex: Excelente chácara para família e eventos, com ampla área verde..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 text-sm focus:outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Regras de Uso
                      </label>
                      <textarea
                        rows={2}
                        value={formData.rules || ''}
                        onChange={e => setFormData({ ...formData, rules: e.target.value })}
                        placeholder="Ex: Horário de silêncio após 22h, proibições..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 text-sm focus:outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Observações Internas (Administrativas)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.notes || ''}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas para controle interno..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 text-sm focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ENDEREÇO */}
              {activeTab === 'endereco' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={formData.zip_code || ''}
                        onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                        placeholder="13000-000"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Rua / Logradouro
                      </label>
                      <input
                        type="text"
                        value={formData.street || ''}
                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Ex: Alameda dos Pinheiros"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Número / Chácara Nº
                      </label>
                      <input
                        type="text"
                        value={(formData as any).number || (formData as any).address_number || ''}
                        onChange={e => setFormData({ ...formData, number: e.target.value } as any)}
                        placeholder="Ex: 450-B"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={formData.neighborhood || ''}
                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Ex: Vale Verde"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        Cidade / Estado
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Cidade"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                        />
                        <input
                          type="text"
                          maxLength={2}
                          value={formData.state || 'SP'}
                          onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                          placeholder="UF"
                          className="w-16 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coordenadas GPS */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <p className="text-xs font-semibold text-white/80 flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-400" />
                      Coordenadas de Localização GPS (Opcional)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] text-white/50 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.latitude ?? ''}
                          onChange={e => setFormData({ ...formData, latitude: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="-22.900000"
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/50 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.longitude ?? ''}
                          onChange={e => setFormData({ ...formData, longitude: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="-47.060000"
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VALORES & HORÁRIOS */}
              {activeTab === 'valores' && (
                <div className="space-y-6">
                  {/* Diárias Base */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Diárias do Imóvel</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="block text-xs font-semibold text-white/70 mb-1">
                          Diária Padrão (Seg - Qui) <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.daily_rate_standard ?? 500}
                            onChange={e => setFormData({ ...formData, daily_rate_standard: Number(e.target.value) })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white font-bold text-sm"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="block text-xs font-semibold text-white/70 mb-1">
                          Diária Fim de Semana (Sex - Dom)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.daily_rate_weekend ?? 800}
                            onChange={e => setFormData({ ...formData, daily_rate_weekend: Number(e.target.value) })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white font-bold text-sm"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="block text-xs font-semibold text-white/70 mb-1">
                          Diária Feriado / Pacote
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.daily_rate_holiday ?? 1000}
                            onChange={e => setFormData({ ...formData, daily_rate_holiday: Number(e.target.value) })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white font-bold text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Taxas Fixas e Caução */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Taxas Fixas & Garantias</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1">
                          Taxa de Limpeza
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.cleaning_fee ?? 150}
                            onChange={e => setFormData({ ...formData, cleaning_fee: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1">
                          Valor da Caução
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.deposit_amount ?? 300}
                            onChange={e => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1">
                          Taxa por Hóspede Extra / Noite
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.extra_guest_fee ?? 0}
                            onChange={e => setFormData({ ...formData, extra_guest_fee: Number(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Regras e Adicionais (Pets, Eventos, Energia) */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-xs font-bold text-white/80">Taxas Adicionais & Permissões</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Dog size={16} className="text-amber-400" />
                          <span className="text-xs font-semibold text-white">Aceita Pets?</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!formData.allow_pets}
                          onChange={e => setFormData({ ...formData, allow_pets: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                      </div>

                      {formData.allow_pets && (
                        <div>
                          <label className="block text-xs font-semibold text-white/70 mb-1">Taxa de Pet</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs text-white/40 font-bold">R$</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={formData.pet_fee ?? 0}
                              onChange={e => setFormData({ ...formData, pet_fee: Number(e.target.value) })}
                              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1">
                          <Zap size={12} className="text-yellow-400" /> Taxa de Energia
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.energy_fee ?? 0}
                            onChange={e => setFormData({ ...formData, energy_fee: Number(e.target.value) })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1">
                          <PartyPopper size={12} className="text-purple-400" /> Taxa de Eventos
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-white/40 font-bold">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.event_fee ?? 0}
                            onChange={e => setFormData({ ...formData, event_fee: Number(e.target.value) })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Horários */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Horários de Funcionamento</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
                          <Clock size={14} className="text-emerald-400" />
                          Horário de Check-in
                        </label>
                        <input
                          type="time"
                          value={formData.checkin_time || '14:00'}
                          onChange={e => setFormData({ ...formData, checkin_time: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
                          <Clock size={14} className="text-rose-400" />
                          Horário de Check-out
                        </label>
                        <input
                          type="time"
                          value={formData.checkout_time || '12:00'}
                          onChange={e => setFormData({ ...formData, checkout_time: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: COMODIDADES */}
              {activeTab === 'comodidades' && (
                <div className="space-y-4">
                  <p className="text-xs text-white/60 mb-2">
                    Selecione todas as comodidades e estruturas disponíveis nesta propriedade:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      formData.has_pool ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🏊‍♂️</span>
                        <div>
                          <p className="text-sm font-bold">Piscina</p>
                          <p className="text-[11px] text-white/40">Piscina privativa para uso dos hóspedes</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.has_pool}
                        onChange={e => setFormData({ ...formData, has_pool: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded"
                      />
                    </label>

                    <label className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      formData.has_barbecue ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🍖</span>
                        <div>
                          <p className="text-sm font-bold">Churrasqueira</p>
                          <p className="text-[11px] text-white/40">Área com churrasqueira e grelhas</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.has_barbecue}
                        onChange={e => setFormData({ ...formData, has_barbecue: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded"
                      />
                    </label>

                    <label className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      formData.has_event_hall ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎉</span>
                        <div>
                          <p className="text-sm font-bold">Salão de Festas / Eventos</p>
                          <p className="text-[11px] text-white/40">Espaço coberto para festas e reuniões</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.has_event_hall}
                        onChange={e => setFormData({ ...formData, has_event_hall: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded"
                      />
                    </label>

                    <label className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      formData.has_wifi ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📶</span>
                        <div>
                          <p className="text-sm font-bold">Internet Wi-Fi</p>
                          <p className="text-[11px] text-white/40">Conexão Wi-Fi no imóvel</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.has_wifi}
                        onChange={e => setFormData({ ...formData, has_wifi: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded"
                      />
                    </label>

                    <label className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      formData.has_air_conditioning ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">❄️</span>
                        <div>
                          <p className="text-sm font-bold">Ar-Condicionado</p>
                          <p className="text-[11px] text-white/40">Climatização nos cômodos</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.has_air_conditioning}
                        onChange={e => setFormData({ ...formData, has_air_conditioning: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded"
                      />
                    </label>

                    <label className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      formData.has_equipped_kitchen ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🍳</span>
                        <div>
                          <p className="text-sm font-bold">Cozinha Equipada</p>
                          <p className="text-[11px] text-white/40">Eletrodomésticos e utensílios</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.has_equipped_kitchen}
                        onChange={e => setFormData({ ...formData, has_equipped_kitchen: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 5: FOTOS */}
              {activeTab === 'fotos' && (
                <div className="space-y-6">
                  {/* Form to Add Photo */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <p className="text-xs font-semibold text-white/80">Adicionar Novas Fotos</p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="url"
                        placeholder="Cole o link da imagem (URL) aqui..."
                        value={newPhotoUrl}
                        onChange={e => setNewPhotoUrl(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPhoto}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} />
                        Adicionar URL
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[11px] text-white/40">ou selecione do dispositivo:</span>
                      <label className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1">
                        <ImageIcon size={14} />
                        Escolher Arquivos
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Photo Grid Gallery */}
                  {photosList.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/5">
                      <ImageIcon size={32} className="mx-auto text-white/20 mb-2" />
                      <p className="text-xs text-white/40">Nenhuma foto adicionada ainda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {photosList.map((photo, index) => (
                        <div
                          key={photo.id}
                          className={`relative rounded-2xl overflow-hidden border transition-all bg-zinc-900 group ${
                            photo.is_main ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-white/10'
                          }`}
                        >
                          <div className="aspect-video relative bg-black/40 overflow-hidden">
                            <img
                              src={photo.url}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/chacara_fallback/400/300';
                              }}
                            />

                            {/* Badge Principal */}
                            {photo.is_main && (
                              <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                                Foto Principal
                              </span>
                            )}

                            {/* Hover Controls */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                              <button
                                type="button"
                                title="Visualizar Ampliada"
                                onClick={() => setPreviewPhotoUrl(photo.url)}
                                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
                              >
                                <Maximize2 size={16} />
                              </button>

                              {!photo.is_main && (
                                <button
                                  type="button"
                                  title="Definir como Principal"
                                  onClick={() => handleSetMainPhoto(index)}
                                  className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors text-xs font-bold"
                                >
                                  Principal
                                </button>
                              )}

                              <button
                                type="button"
                                title="Substituir Foto"
                                onClick={() => {
                                  setEditingPhotoIndex(index);
                                  setReplacePhotoUrl(photo.url);
                                }}
                                className="p-2 rounded-xl bg-blue-500/80 hover:bg-blue-600 text-white transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>

                              <button
                                type="button"
                                title="Excluir Foto"
                                onClick={() => handleDeletePhoto(index)}
                                className="p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Reorder Buttons */}
                          <div className="p-2 bg-zinc-950 flex items-center justify-between text-xs text-white/50 border-t border-white/5">
                            <span>Ordem: #{index + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMovePhoto(index, 'up')}
                                className="p-1 rounded hover:bg-white/10 text-white disabled:opacity-20"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={index === photosList.length - 1}
                                onClick={() => handleMovePhoto(index, 'down')}
                                className="p-1 rounded hover:bg-white/10 text-white disabled:opacity-20"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Photo Replace Prompt Modal */}
                  {editingPhotoIndex !== null && (
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-blue-500/30 space-y-3">
                      <p className="text-xs font-semibold text-white">Substituir Imagem #{editingPhotoIndex + 1}:</p>
                      <input
                        type="url"
                        value={replacePhotoUrl}
                        onChange={e => setReplacePhotoUrl(e.target.value)}
                        placeholder="Nova URL da imagem..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingPhotoIndex(null)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplacePhoto(editingPhotoIndex)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold"
                        >
                          Confirmar Substituição
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: BLOQUEIOS DE AGENDA */}
              {activeTab === 'bloqueios' && (
                <div className="space-y-6">
                  {!chacaraToEdit?.id ? (
                    <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10">
                      <Info size={32} className="mx-auto text-amber-400 mb-2" />
                      <p className="text-sm font-bold text-white mb-1">Salve a chácara primeiro</p>
                      <p className="text-xs text-white/50">
                        Para gerenciar bloqueios de agenda, finalize o cadastro inicial da chácara.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">Bloqueios da Chácara</h3>
                          <p className="text-xs text-white/50">Gerencie períodos de manutenção, uso de proprietário e reformas.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenNewBlock}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                          <Plus size={16} />
                          Novo Bloqueio
                        </button>
                      </div>

                      {blocks.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 bg-white/5">
                          <Ban size={28} className="mx-auto text-white/20 mb-2" />
                          <p className="text-xs text-white/40">Nenhum bloqueio registrado para esta chácara.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {blocks.map(b => (
                            <div
                              key={b.id}
                              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white">{b.title || 'Bloqueio'}</span>
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                    {b.reason || 'MANUTENCAO'}
                                  </span>
                                </div>
                                <p className="text-xs text-white/60">
                                  Período: <strong className="text-white">{b.start_date}</strong> até <strong className="text-white">{b.end_date}</strong>
                                </p>
                                {b.description && (
                                  <p className="text-xs text-white/40 italic">{b.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBlock(b)}
                                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Edit2 size={14} />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlockSubmit(b.id)}
                                  className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-semibold transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Modal Interno de Edição/Criação de Bloqueio */}
                      {isBlockModalOpen && editingBlock && (
                        <div className="p-5 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-4">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Ban size={16} className="text-emerald-400" />
                            {editingBlock.id ? 'Editar Bloqueio' : 'Cadastrar Novo Bloqueio'}
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-white/70 mb-1">Título do Bloqueio *</label>
                              <input
                                type="text"
                                value={editingBlock.title || ''}
                                onChange={e => setEditingBlock({ ...editingBlock, title: e.target.value })}
                                placeholder="Ex: Manutenção da Piscina"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-white/70 mb-1">Motivo do Bloqueio</label>
                              <select
                                value={editingBlock.reason || 'MANUTENCAO'}
                                onChange={e => setEditingBlock({ ...editingBlock, reason: e.target.value as BlockReason })}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                              >
                                <option value="MANUTENCAO">Manutenção</option>
                                <option value="USO_PROPRIETARIO">Uso do Proprietário</option>
                                <option value="RESERVA_EXTERNA_MANUAL">Reserva Externa Manual</option>
                                <option value="REFORMA">Reforma / Obras</option>
                                <option value="OUTRO">Outro</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs text-white/70 mb-1">Data Início *</label>
                              <input
                                type="date"
                                value={editingBlock.start_date || ''}
                                onChange={e => setEditingBlock({ ...editingBlock, start_date: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-white/70 mb-1">Data Término *</label>
                              <input
                                type="date"
                                value={editingBlock.end_date || ''}
                                onChange={e => setEditingBlock({ ...editingBlock, end_date: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-white/70 mb-1">Descrição / Detalhes</label>
                            <textarea
                              rows={2}
                              value={editingBlock.description || ''}
                              onChange={e => setEditingBlock({ ...editingBlock, description: e.target.value })}
                              placeholder="Observações adicionais do bloqueio..."
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsBlockModalOpen(false);
                                setEditingBlock(null);
                              }}
                              className="px-4 py-2 rounded-xl bg-white/10 text-white font-semibold text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveBlockSubmit}
                              disabled={savingBlock}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5"
                            >
                              {savingBlock ? 'Salvando...' : 'Salvar Bloqueio'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 7: FUNCIONÁRIOS */}
              {activeTab === 'funcionarios' && (
                <div className="space-y-6">
                  {!chacaraToEdit?.id ? (
                    <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10">
                      <Info size={32} className="mx-auto text-amber-400 mb-2" />
                      <p className="text-sm font-bold text-white mb-1">Salve a chácara primeiro</p>
                      <p className="text-xs text-white/50">
                        Para vincular colaboradores da equipe, finalize o salvamento inicial da propriedade.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Form to Link Staff */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <p className="text-xs font-semibold text-white/80 flex items-center gap-2">
                          <UserPlus size={16} className="text-emerald-400" />
                          Vincular Funcionário Existente
                        </p>
                        
                        <div className="flex gap-2">
                          <select
                            value={selectedStaffToLink}
                            onChange={e => setSelectedStaffToLink(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                          >
                            <option value="">Selecione um funcionário cadastrado na equipe...</option>
                            {availableStaff.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.nome} {m.roles?.length ? `(${m.roles.map(r => r.nome).join(', ')})` : ''}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleLinkStaff}
                            disabled={!selectedStaffToLink}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs disabled:opacity-30 transition-colors flex items-center gap-1.5"
                          >
                            <Plus size={16} />
                            Vincular
                          </button>
                        </div>
                      </div>

                      {/* Linked Staff List */}
                      <div>
                        <h3 className="text-sm font-bold text-white mb-3">Funcionários Vinculados ({linkedStaff.length})</h3>

                        {linkedStaff.length === 0 ? (
                          <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 bg-white/5">
                            <Users size={28} className="mx-auto text-white/20 mb-2" />
                            <p className="text-xs text-white/40">Nenhum funcionário vinculado a esta chácara.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {linkedStaff.map(member => (
                              <div
                                key={member.id}
                                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/20">
                                    {member.nome.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{member.nome}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {member.roles?.map(r => (
                                        <span
                                          key={r.id}
                                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white/90"
                                          style={{ backgroundColor: `${r.cor || '#10B981'}40` }}
                                        >
                                          {r.nome}
                                        </span>
                                      ))}
                                    </div>
                                    {member.telefone && (
                                      <p className="text-[11px] text-white/40 mt-1">{member.telefone}</p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleUnlinkStaff(member.id)}
                                  className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-semibold transition-colors"
                                  title="Desvincular"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 8: CALENDÁRIO */}
              {activeTab === 'calendario' && (
                <div className="space-y-4">
                  {!chacaraToEdit?.id ? (
                    <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10">
                      <Info size={32} className="mx-auto text-amber-400 mb-2" />
                      <p className="text-sm font-bold text-white mb-1">Salve a chácara primeiro</p>
                      <p className="text-xs text-white/50">
                        O calendário de ocupação estará disponível após salvar o cadastro.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Calendar Header Nav */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                        >
                          <ChevronLeft size={18} />
                        </button>

                        <h3 className="text-sm font-bold text-white capitalize">
                          {calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h3>

                        <button
                          type="button"
                          onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      {/* Month Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} className="py-2 text-[11px] font-bold text-white/40 uppercase">
                            {day}
                          </div>
                        ))}

                        {/* Blank Days before month starts */}
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                          <div key={`blank_${i}`} className="p-2 bg-white/[0.02] rounded-xl min-h-[60px]" />
                        ))}

                        {/* Month Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const dayNum = i + 1;
                          const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                          // Find matching reservations or blocks
                          const dayReservations = reservations.filter(r => 
                            r.status !== 'CANCELADA' && 
                            formattedDate >= r.checkin_date && 
                            formattedDate <= r.checkout_date
                          );

                          const dayBlocks = blocks.filter(b => 
                            formattedDate >= b.start_date && 
                            formattedDate <= b.end_date
                          );

                          return (
                            <div
                              key={`day_${dayNum}`}
                              className="p-1.5 rounded-xl bg-white/5 border border-white/5 min-h-[64px] flex flex-col justify-between text-left hover:bg-white/10 transition-colors"
                            >
                              <span className="text-[11px] font-bold text-white/70">{dayNum}</span>

                              <div className="space-y-1">
                                {dayReservations.map(res => (
                                  <div
                                    key={res.id}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${
                                      res.status === 'CONFIRMADA'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}
                                    title={`Reserva: ${res.code}`}
                                  >
                                    {res.code}
                                  </div>
                                ))}

                                {dayBlocks.map(blk => (
                                  <div
                                    key={blk.id}
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 truncate"
                                    title={`Bloqueio: ${blk.title}`}
                                  >
                                    ⛔ {blk.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-white/60">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500" />
                          <span>Reserva Confirmada</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500" />
                          <span>Pré-Reserva</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-rose-500/40 border border-rose-500" />
                          <span>Bloqueio de Agenda</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-6 border-t border-white/10 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || loadingData}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando Alterações...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Salvar Chácara
                </>
              )}
            </button>
          </div>
        </form>

        {/* Lightbox / Full Photo Preview Overlay */}
        {previewPhotoUrl && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Visualização Ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        )}

      </div>
    </div>
  );
}
