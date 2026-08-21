'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Users, 
  BedDouble, 
  Bath, 
  Wifi, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  Lock, 
  Phone, 
  Building2,
  TreePine,
  Image as ImageIcon,
  UserPlus,
  MessageSquare,
  Unlink,
  UserCheck
} from 'lucide-react';
import { Chacara, Reservation, ChacaraBlock, CrewMember } from '@/lib/chacaraTypes';
import { getReservations, getChacaraBlocks, createChacaraBlock, deleteChacaraBlock } from '@/services/reservationsService';
import { getPropertyCrewMembers, getCrewMembers, linkMemberToProperty, unlinkMemberFromProperty } from '@/services/crewService';
import CrewMemberModal from './CrewMemberModal';
import CrewMemberDetailModal from './CrewMemberDetailModal';
import RoomsAndMaintenanceTab from './rooms/RoomsAndMaintenanceTab';
import { DoorClosed, Wrench } from 'lucide-react';

interface ChacaraDetailModalProps {
  chacara: Chacara | null;
  isOpen: boolean;
  onClose: () => void;
  onNewReservationForChacara: (chacaraId: string) => void;
  onEditChacara: (chacara: Chacara) => void;
}

export default function ChacaraDetailModal({
  chacara,
  isOpen,
  onClose,
  onNewReservationForChacara,
  onEditChacara
}: ChacaraDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'rooms' | 'reservas' | 'bloqueios' | 'fotos' | 'equipe'>('info');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<ChacaraBlock[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [allUnlinkedMembers, setAllUnlinkedMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Link existing member modal state
  const [isLinkExistingModalOpen, setIsLinkExistingModalOpen] = useState(false);
  const [selectedMemberToLink, setSelectedMemberToLink] = useState('');

  // Member CRUD Modals
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [isMemberDetailModalOpen, setIsMemberDetailModalOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<CrewMember | null>(null);

  // Form for new block
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [blockError, setBlockError] = useState('');
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockTitle, setBlockTitle] = useState('');
  const [blockReason, setBlockReason] = useState<'MANUTENCAO' | 'USO_PROPRIETARIO' | 'RESERVA_EXTERNA_MANUAL' | 'OUTRO'>('MANUTENCAO');

  useEffect(() => {
    if (isOpen && chacara) {
      loadData();
      setSelectedPhoto(chacara.main_photo_url || (chacara.photos?.[0]?.url) || null);
    }
  }, [isOpen, chacara]);

  const loadData = async () => {
    if (!chacara) return;
    setLoading(true);
    try {
      const [resData, blockData, myCrew, allCrew] = await Promise.all([
        getReservations({ chacara_id: chacara.id }),
        getChacaraBlocks(chacara.id),
        getPropertyCrewMembers(chacara.id),
        getCrewMembers()
      ]);
      setReservations(resData);
      setBlocks(blockData);
      setCrewMembers(myCrew);

      // Find members not yet linked to this chacara
      const unlinked = allCrew.filter(m => !m.chacara_ids?.includes(chacara.id));
      setAllUnlinkedMembers(unlinked);
    } catch (e) {
      console.warn('Erro ao carregar detalhes da chácara:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExistingMember = async () => {
    if (!chacara || !selectedMemberToLink) return;
    try {
      await linkMemberToProperty(selectedMemberToLink, chacara.id);
      setIsLinkExistingModalOpen(false);
      setSelectedMemberToLink('');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao vincular funcionário');
    }
  };

  const handleUnlinkCrewMember = async (memberId: string, memberName: string) => {
    if (!chacara) return;
    if (!confirm(`Deseja remover "${memberName}" do quadro desta chácara? O cadastro do funcionário e suas funções serão mantidos intactos.`)) return;
    try {
      await unlinkMemberFromProperty(memberId, chacara.id);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao desvincular funcionário');
    }
  };

  if (!isOpen || !chacara) return null;

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError('');

    if (!blockTitle.trim()) {
      setBlockError('Informe o título do bloqueio.');
      return;
    }
    if (!blockStartDate || !blockEndDate) {
      setBlockError('Informe as datas de início e término.');
      return;
    }
    if (blockStartDate > blockEndDate) {
      setBlockError('A data de início não pode ser posterior à data de término.');
      return;
    }

    setSavingBlock(true);
    try {
      await createChacaraBlock({
        chacara_id: chacara.id,
        start_date: blockStartDate,
        end_date: blockEndDate,
        title: blockTitle.trim(),
        reason: blockReason
      });
      setIsAddingBlock(false);
      setBlockStartDate('');
      setBlockEndDate('');
      setBlockTitle('');
      setBlockError('');
      await loadData();
    } catch (err: any) {
      setBlockError(err.message || 'Erro ao adicionar bloqueio');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await deleteChacaraBlock(blockId);
      setDeletingBlockId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar bloqueio');
    }
  };

  const allPhotos = [
    ...(chacara.main_photo_url ? [{ id: 'main', url: chacara.main_photo_url, is_main: true }] : []),
    ...(chacara.photos || []).filter(p => p.url !== chacara.main_photo_url)
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD600] p-2 rounded-xl text-[#0A0F2C]">
              <TreePine size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{chacara.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  chacara.status === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {chacara.status}
                </span>
              </div>
              <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                <MapPin size={12} />
                <span>{chacara.city || 'Cidade não informada'} - {chacara.neighborhood || 'Bairro N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNewReservationForChacara(chacara.id)}
              className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Nova Reserva</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onEditChacara(chacara);
              }}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all"
            >
              Editar
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 bg-white/[0.01] border-b border-white/10 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'info' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Geral & Comodidades
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'rooms' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <DoorClosed size={14} className={activeTab === 'rooms' ? 'text-[#FFD600]' : 'text-white/50'} />
            <span>Cômodos e Manutenções</span>
          </button>
          <button
            onClick={() => setActiveTab('reservas')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'reservas' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <span>Reservas ({reservations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bloqueios')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'bloqueios' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <span>Bloqueios / Manutenção ({blocks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('equipe')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'equipe' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Equipe ({crewMembers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('fotos')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'fotos' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Galeria de Fotos ({allPhotos.length})
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'rooms' && (
            <RoomsAndMaintenanceTab chacaraId={chacara.id} chacaraName={chacara.name} />
          )}

          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Photo Banner / Main Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 h-64 md:h-80 rounded-2xl overflow-hidden bg-white/5 border border-white/10 relative">
                  {selectedPhoto ? (
                    <img src={selectedPhoto} alt={chacara.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                      <ImageIcon size={48} />
                      <span className="text-xs mt-2">Nenhuma foto cadastrada</span>
                    </div>
                  )}
                </div>

                {/* Rates & Highlights */}
                <div className="glass p-5 rounded-2xl border border-white/10 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Tabela de Valores</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">Diária Padrão:</span>
                        <span className="font-black text-white">R$ {(chacara.daily_rate_standard || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">Diária Fim de Semana:</span>
                        <span className="font-black text-[#FFD600]">R$ {(chacara.daily_rate_weekend || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                        <span className="text-white/60">Taxa de Limpeza:</span>
                        <span className="font-bold text-white/90">R$ {(chacara.cleaning_fee || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Caução:</span>
                        <span className="font-bold text-white/90">R$ {(chacara.deposit_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs text-white/60">
                    <div className="flex items-center justify-between">
                      <span>Check-in Padrão:</span>
                      <span className="font-bold text-white">{chacara.checkin_time || '14:00'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Check-out Padrão:</span>
                      <span className="font-bold text-white">{chacara.checkout_time || '12:00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg text-[#FFD600]">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/40">Capacidade</p>
                    <p className="text-sm font-black text-white">{chacara.capacity_people} pessoas</p>
                  </div>
                </div>

                <div className="glass p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg text-blue-400">
                    <BedDouble size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/40">Quartos</p>
                    <p className="text-sm font-black text-white">{chacara.bedrooms_count} dormitórios</p>
                  </div>
                </div>

                <div className="glass p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg text-emerald-400">
                    <Bath size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/40">Banheiros</p>
                    <p className="text-sm font-black text-white">{chacara.bathrooms_count} WCs</p>
                  </div>
                </div>

                <div className="glass p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg text-purple-400">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/40">Proprietário</p>
                    <p className="text-xs font-bold text-white truncate">{chacara.owner?.full_name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Structure Amenities Checklist */}
              <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Estrutura & Lazer</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Piscina Privativa', active: chacara.has_pool },
                    { label: 'Churrasqueira / Área Gourmet', active: chacara.has_barbecue },
                    { label: 'Salão de Festas', active: chacara.has_event_hall },
                    { label: 'Wi-Fi de Alta Velocidade', active: chacara.has_wifi },
                    { label: 'Ar-Condicionado', active: chacara.has_air_conditioning },
                    { label: 'Cozinha Completa Equipada', active: chacara.has_equipped_kitchen },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                        item.active
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-white/[0.02] border-white/5 text-white/30'
                      }`}
                    >
                      <CheckCircle2 size={16} className={item.active ? 'text-emerald-400' : 'text-white/20'} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description & Rules */}
              {chacara.description && (
                <div className="glass p-5 rounded-2xl border border-white/10 space-y-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Sobre a Chácara</h3>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line">{chacara.description}</p>
                </div>
              )}

              {chacara.rules && (
                <div className="glass p-5 rounded-2xl border border-white/10 space-y-2 bg-amber-500/[0.02]">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Regras da Propriedade</h3>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line">{chacara.rules}</p>
                </div>
              )}
            </div>
          )}

          {/* Reservations Tab */}
          {activeTab === 'reservas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Histórico e Agendamentos da Chácara</h3>
                <button
                  onClick={() => onNewReservationForChacara(chacara.id)}
                  className="px-3 py-1.5 bg-[#FFD600] text-[#0A0F2C] font-black text-xs rounded-xl"
                >
                  + Nova Reserva
                </button>
              </div>

              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />)}
                </div>
              ) : reservations.length === 0 ? (
                <div className="p-8 text-center glass rounded-2xl border border-white/10">
                  <p className="text-xs text-white/50">Nenhuma reserva vinculada a esta chácara.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#FFD600]">{res.code}</span>
                          <span className="font-bold text-white">{res.client?.full_name || 'Cliente N/A'}</span>
                        </div>
                        <p className="text-white/50 mt-0.5">
                          {res.checkin_date} ({res.checkin_time?.slice(0, 5)}) até {res.checkout_date} ({res.checkout_time?.slice(0, 5)})
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          res.status === 'CONFIRMADA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {res.status}
                        </span>
                        <p className="text-white/40 text-[10px] mt-1">{res.total_guests || (res.guests_adults + res.guests_children)} hóspedes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Blocks Tab */}
          {activeTab === 'bloqueios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Bloqueios de Manutenção / Uso Proprietário</h3>
                  <p className="text-xs text-white/50">Datas bloqueadas impedem novas reservas automaticamente</p>
                </div>
                <button
                  onClick={() => setIsAddingBlock(!isAddingBlock)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/10"
                >
                  {isAddingBlock ? 'Cancelar' : '+ Novo Bloqueio'}
                </button>
              </div>

              {isAddingBlock && (
                <form onSubmit={handleAddBlock} className="glass p-4 rounded-2xl border border-white/15 space-y-3">
                  <h4 className="text-xs font-bold text-[#FFD600] uppercase">Adicionar Bloqueio de Data</h4>

                  {blockError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl">
                      {blockError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/60">Título do Bloqueio</label>
                      <input
                        type="text"
                        required
                        disabled={savingBlock}
                        value={blockTitle}
                        onChange={(e) => setBlockTitle(e.target.value)}
                        placeholder="Ex: Pintura da piscina / Uso da família"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/60">Motivo</label>
                      <select
                        disabled={savingBlock}
                        value={blockReason}
                        onChange={(e: any) => setBlockReason(e.target.value)}
                        className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 disabled:opacity-50"
                      >
                        <option value="MANUTENCAO">Manutenção / Reforma</option>
                        <option value="USO_PROPRIETARIO">Uso do Proprietário</option>
                        <option value="RESERVA_EXTERNA_MANUAL">Reserva Externa Manual</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/60">Data Início</label>
                      <input
                        type="date"
                        required
                        disabled={savingBlock}
                        value={blockStartDate}
                        onChange={(e) => setBlockStartDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/60">Data Fim</label>
                      <input
                        type="date"
                        required
                        disabled={savingBlock}
                        value={blockEndDate}
                        onChange={(e) => setBlockEndDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingBlock}
                      className="px-4 py-2 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingBlock ? (
                        <span>Salvando Bloqueio...</span>
                      ) : (
                        <span>Salvar Bloqueio</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {blocks.length === 0 ? (
                <div className="p-8 text-center glass rounded-2xl border border-white/10">
                  <p className="text-xs text-white/50">Nenhum bloqueio cadastrado para esta chácara.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blocks.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="font-bold text-amber-300">{b.title}</p>
                        <p className="text-white/60 text-[11px] mt-0.5">
                          Período: {b.start_date} até {b.end_date} • Motivo: {b.reason}
                        </p>
                      </div>
                      {deletingBlockId === b.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteBlock(b.id)}
                            className="text-white font-black text-[11px] px-2.5 py-1 bg-red-600 hover:bg-red-500 rounded-lg shadow transition-all"
                          >
                            Confirmar Exclusão
                          </button>
                          <button
                            onClick={() => setDeletingBlockId(null)}
                            className="text-white/60 hover:text-white text-[11px] px-2 py-1 bg-white/10 rounded-lg transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingBlockId(b.id)}
                          className="text-red-400 hover:text-red-300 font-bold text-[11px] px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Equipe Tab */}
          {activeTab === 'equipe' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <h3 className="font-bold text-sm text-white">Quadro de Funcionários da Chácara</h3>
                  <p className="text-xs text-white/50">
                    Membros vinculados a esta propriedade. É possível adicionar novos ou desvincular existentes sem apagar seus cadastros.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {allUnlinkedMembers.length > 0 && (
                    <button
                      onClick={() => setIsLinkExistingModalOpen(true)}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <UserCheck size={14} className="text-[#FFD600]" />
                      <span>Vincular Existente</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsNewMemberModalOpen(true)}
                    className="px-3.5 py-2 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                  >
                    <UserPlus size={14} />
                    <span>Novo Funcionário</span>
                  </button>
                </div>
              </div>

              {crewMembers.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <Users size={32} className="mx-auto text-white/30" />
                  <p className="text-xs text-white/50">Nenhum funcionário vinculado a esta chácara no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {crewMembers.map(m => {
                    const formattedWhatsAppUrl = m.whatsapp || m.telefone
                      ? `https://wa.me/55${(m.whatsapp || m.telefone || '').replace(/\D/g, '')}`
                      : null;

                    return (
                      <div key={m.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FFD600] text-[#0A0F2C] font-black text-sm flex items-center justify-center shrink-0">
                              {m.nome.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white">{m.nome}</h4>
                              <span className="text-[10px] text-white/50 block font-mono">{m.telefone || 'Sem telefone'}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            m.ativo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {m.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        {/* Roles */}
                        <div className="flex flex-wrap gap-1">
                          {m.roles?.map(role => {
                            const color = role.cor || '#10B981';
                            return (
                              <span
                                key={role.id}
                                className="px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${color}25`,
                                  color: color,
                                  border: `1px solid ${color}40`
                                }}
                              >
                                {role.nome}
                              </span>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                          {formattedWhatsAppUrl ? (
                            <a
                              href={formattedWhatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1"
                            >
                              <MessageSquare size={13} />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-white/30 text-[10px]">Sem WhatsApp</span>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedMemberDetail(m);
                                setIsMemberDetailModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] rounded-lg"
                            >
                              Perfil
                            </button>
                            <button
                              onClick={() => handleUnlinkCrewMember(m.id, m.nome)}
                              className="px-2 py-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1"
                              title="Remover vínculo com esta chácara"
                            >
                              <Unlink size={13} />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Photos Tab */}

          {activeTab === 'fotos' && (
            <div className="space-y-4">
              <p className="text-xs text-white/60">Clique em qualquer imagem para destacá-la no topo.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPhoto(photo.url)}
                    className={`h-36 rounded-2xl overflow-hidden border cursor-pointer relative group transition-all ${
                      selectedPhoto === photo.url ? 'border-[#FFD600] ring-2 ring-[#FFD600]/50' : 'border-white/10'
                    }`}
                  >
                    <img src={photo.url} alt="Foto chácara" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {photo.is_main && (
                      <span className="absolute top-2 left-2 bg-[#FFD600] text-[#0A0F2C] text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Vincular Funcionário Existente */}
      {isLinkExistingModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A0F2C] border border-white/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-white text-sm">Vincular Funcionário Existente</h3>
              <button onClick={() => setIsLinkExistingModalOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-white/60">
              Selecione um colaborador já cadastrado no sistema para trabalhar nesta chácara.
            </p>

            <select
              value={selectedMemberToLink}
              onChange={(e) => setSelectedMemberToLink(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#FFD600]"
            >
              <option value="" className="bg-[#0A0F2C]">-- Selecione o Funcionário --</option>
              {allUnlinkedMembers.map(m => (
                <option key={m.id} value={m.id} className="bg-[#0A0F2C]">
                  {m.nome} ({m.roles?.map(r => r.nome).join(', ') || 'Sem funções'})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsLinkExistingModalOpen(false)}
                className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleLinkExistingMember}
                disabled={!selectedMemberToLink}
                className="px-4 py-2 bg-[#FFD600] text-[#0A0F2C] font-black text-xs rounded-xl shadow disabled:opacity-50"
              >
                Confirmar Vínculo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submodal Cadastrar Novo Funcionário com Chácara Atual Pré-selecionada */}
      <CrewMemberModal
        isOpen={isNewMemberModalOpen}
        member={null}
        defaultChacaraId={chacara.id}
        onClose={() => setIsNewMemberModalOpen(false)}
        onSaveSuccess={loadData}
      />

      {/* Submodal Detalhe do Funcionário */}
      <CrewMemberDetailModal
        isOpen={isMemberDetailModalOpen}
        member={selectedMemberDetail}
        onClose={() => setIsMemberDetailModalOpen(false)}
        onEdit={(m) => {
          setIsMemberDetailModalOpen(false);
          setIsNewMemberModalOpen(true);
        }}
        onRefresh={loadData}
      />
    </div>
  );
}

