'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User, 
  DollarSign, 
  Repeat, 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon,
  Check, 
  Filter,
  ShoppingCart,
  Layers
} from 'lucide-react';
import { 
  PropertyRoom, 
  MaintenanceRecord, 
  RoomStatus,
  ROOM_STATUS_META, 
  MAINTENANCE_PRIORITY_META, 
  MAINTENANCE_STATUS_META 
} from '@/lib/roomsMaintenanceTypes';
import { 
  getMaintenanceRecords, 
  updatePropertyRoom, 
  deletePropertyRoom,
  checkRoomDeletionSafety 
} from '@/services/roomsMaintenanceService';
import RoomIcon from './RoomIcon';
import MaintenanceFormModal from './MaintenanceFormModal';
import MaintenanceDetailModal from './MaintenanceDetailModal';

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  room: PropertyRoom;
  chacaraId: string;
  onEditRoom: (room: PropertyRoom) => void;
}

type TabType = 'PENDENTES' | 'HISTORICO' | 'RECORRENTES' | 'GASTOS';

export default function RoomDetailModal({
  isOpen,
  onClose,
  onSuccess,
  room,
  chacaraId,
  onEditRoom
}: RoomDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('PENDENTES');
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for maintenances
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [maintToEdit, setMaintToEdit] = useState<MaintenanceRecord | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMaintId, setSelectedMaintId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && room) {
      loadMaintenances();
    }
  }, [isOpen, room]);

  const loadMaintenances = async () => {
    setLoading(true);
    try {
      const data = await getMaintenanceRecords({ room_id: room.id });
      setMaintenances(data);
    } catch (e) {
      console.warn('Erro ao carregar manutenções do cômodo:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !room) return null;

  const statusMeta = ROOM_STATUS_META[room.status] || ROOM_STATUS_META.OPERACIONAL;

  // Filtered groups
  const activeMaints = maintenances.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'CANCELADA' && !m.is_deleted);
  const completedMaints = maintenances.filter(m => m.status === 'CONCLUIDA' && !m.is_deleted);
  const recurringMaints = maintenances.filter(m => m.is_recurring && !m.is_deleted);
  
  const urgentCount = activeMaints.filter(m => m.priority === 'URGENTE').length;
  const totalSpent = maintenances.reduce((sum, m) => sum + (m.actual_cost || 0), 0);
  const totalEstimated = activeMaints.reduce((sum, m) => sum + (m.estimated_cost || 0), 0);

  const handleOpenNewMaintenance = () => {
    setMaintToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEditMaintenance = (m: MaintenanceRecord) => {
    setMaintToEdit(m);
    setIsFormOpen(true);
  };

  const handleOpenMaintenanceDetail = (m: MaintenanceRecord) => {
    setSelectedMaintId(m.id);
    setIsDetailOpen(true);
  };

  const handleQuickStatusToggle = async (newStatus: RoomStatus) => {
    try {
      await updatePropertyRoom(room.id, { status: newStatus });
      onSuccess();
    } catch (e: any) {
      alert('Erro ao atualizar status do ambiente: ' + e.message);
    }
  };

  const handleDeleteRoom = async () => {
    const safety = await checkRoomDeletionSafety(room.id);
    if (!safety.canDelete) {
      alert(safety.message);
      return;
    }

    if (!confirm(`Deseja realmente excluir o ambiente "${room.name}"? ${safety.message}`)) return;

    try {
      await deletePropertyRoom(room.id);
      onSuccess();
      onClose();
    } catch (e: any) {
      alert('Erro ao excluir cômodo: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Visual Cover / Header (Airbnb Style) */}
        <div className="relative h-48 sm:h-60 w-full bg-gradient-to-r from-blue-950 to-indigo-950 overflow-hidden flex-shrink-0">
          {room.photo_url ? (
            <img src={room.photo_url} alt={room.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/30 p-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 mb-2">
                <RoomIcon name={room.icon} size={48} />
              </div>
              <span className="text-xs">{room.room_type_name}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F2C] via-[#0A0F2C]/60 to-transparent" />

          {/* Top Actions in Cover */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="glass px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-2 shadow-lg backdrop-blur-md">
              <RoomIcon name={room.icon} size={16} className="text-[#FFD600]" />
              <span className="text-xs font-black text-white">{room.room_type_name}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditRoom(room)}
                className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all"
                title="Editar cômodo"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={handleDeleteRoom}
                className="p-2 bg-black/50 hover:bg-rose-600/80 text-rose-300 rounded-xl backdrop-blur-md border border-white/20 transition-all"
                title="Excluir cômodo"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Bottom Title & Status in Cover */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${statusMeta.badgeBg}`}>
                  {statusMeta.label}
                </span>
                {urgentCount > 0 && (
                  <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded-lg text-xs font-black uppercase flex items-center gap-1 shadow-lg shadow-rose-500/40 animate-pulse">
                    <AlertTriangle size={12} />
                    <span>{urgentCount} Urgência{urgentCount > 1 ? 's' : ''}</span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{room.name}</h1>
              {room.description && (
                <p className="text-xs text-white/70 line-clamp-1 mt-0.5 max-w-xl">{room.description}</p>
              )}
            </div>

            <button
              onClick={handleOpenNewMaintenance}
              className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black px-4 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl shadow-[#FFD600]/20 flex-shrink-0"
            >
              <Plus size={16} />
              <span>Nova Manutenção</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 pb-2 border-b border-white/10 bg-white/[0.01]">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40">Pendentes</p>
              <p className="text-lg font-black text-amber-400">{activeMaints.length}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40">Urgentes</p>
              <p className="text-lg font-black text-rose-400">{urgentCount}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40">Concluídas</p>
              <p className="text-lg font-black text-emerald-400">{completedMaints.length}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40">Total Investido</p>
              <p className="text-lg font-black text-white">R$ {totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-white/10 flex items-center gap-4 bg-white/[0.02]">
          <button
            onClick={() => setActiveTab('PENDENTES')}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'PENDENTES'
                ? 'text-[#FFD600] border-[#FFD600]'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>Pendentes & Em Andamento ({activeMaints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORICO')}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'HISTORICO'
                ? 'text-[#FFD600] border-[#FFD600]'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Histórico Concluído ({completedMaints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('RECORRENTES')}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'RECORRENTES'
                ? 'text-[#FFD600] border-[#FFD600]'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Repeat size={14} />
            <span>Preventivas / Recorrentes ({recurringMaints.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: PENDENTES & EM ANDAMENTO */}
          {activeTab === 'PENDENTES' && (
            <div className="space-y-3">
              {activeMaints.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Tudo em dia com este ambiente!</h3>
                  <p className="text-xs text-white/50 max-w-sm mx-auto">
                    Não há manutenções pendentes no momento. Clique no botão abaixo para agendar um novo reparo ou melhoria.
                  </p>
                  <button
                    onClick={handleOpenNewMaintenance}
                    className="mt-2 bg-[#FFD600] text-[#0A0F2C] font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider"
                  >
                    + Adicionar Manutenção
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMaints.map((m) => {
                    const pMeta = MAINTENANCE_PRIORITY_META[m.priority] || MAINTENANCE_PRIORITY_META.MEDIA;
                    const sMeta = MAINTENANCE_STATUS_META[m.status] || MAINTENANCE_STATUS_META.IDENTIFICADA;
                    const hasPhotos = m.images && m.images.length > 0;

                    return (
                      <div
                        key={m.id}
                        onClick={() => handleOpenMaintenanceDetail(m)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                          m.priority === 'URGENTE'
                            ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/60'
                            : 'bg-white/5 border-white/10 hover:border-[#FFD600]/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl flex-shrink-0 ${pMeta.badgeBg}`}>
                            <Wrench size={18} />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${pMeta.badgeBg}`}>
                                {pMeta.label}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sMeta.badgeBg}`}>
                                {sMeta.label}
                              </span>
                              {m.is_recurring && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 flex items-center gap-1">
                                  <Repeat size={10} />
                                  <span>{m.recurrence_period}</span>
                                </span>
                              )}
                              {hasPhotos && (
                                <span className="text-[10px] text-white/40 flex items-center gap-1">
                                  <ImageIcon size={11} />
                                  <span>{m.images!.length} fotos</span>
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-white group-hover:text-[#FFD600] transition-colors">
                              {m.title}
                            </h4>

                            {m.description && (
                              <p className="text-xs text-white/50 line-clamp-1">{m.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-[11px] text-white/40 pt-1 flex-wrap">
                              {m.assigned_crew_name && (
                                <span className="flex items-center gap-1 text-white/70">
                                  <User size={12} className="text-[#FFD600]" />
                                  <span>{m.assigned_crew_name}</span>
                                </span>
                              )}
                              {m.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} className="text-cyan-400" />
                                  <span>Prazo: {new Date(m.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-2">
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              R$ {(m.actual_cost || m.estimated_cost || 0).toFixed(2)}
                            </span>
                            {m.estimated_cost > 0 && m.actual_cost === 0 && (
                              <p className="text-[10px] text-white/40">Estimado</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditMaintenance(m);
                              }}
                              className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10"
                            >
                              <Edit size={14} />
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

          {/* TAB 2: HISTÓRICO CONCLUÍDO */}
          {activeTab === 'HISTORICO' && (
            <div className="space-y-3">
              {completedMaints.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/5 text-white/40 text-xs">
                  Nenhuma manutenção arquivada no histórico deste ambiente.
                </div>
              ) : (
                completedMaints.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleOpenMaintenanceDetail(m)}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{m.title}</h4>
                        <p className="text-[11px] text-white/40">
                          {m.completed_at ? `Concluído em ${new Date(m.completed_at).toLocaleDateString('pt-BR')}` : 'Concluído'}
                          {m.assigned_crew_name && ` por ${m.assigned_crew_name}`}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-emerald-400">
                      R$ {(m.actual_cost || 0).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: RECORRENTES / PREVENTIVAS */}
          {activeTab === 'RECORRENTES' && (
            <div className="space-y-3">
              {recurringMaints.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                  <Repeat size={24} className="text-cyan-400 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Nenhuma manutenção preventiva configurada</h3>
                  <p className="text-xs text-white/40 max-w-sm mx-auto">
                    Configure manutenções periódicas (limpeza de ar, revisão de bomba, dedetização) para garantir a saúde contínua deste ambiente.
                  </p>
                </div>
              ) : (
                recurringMaints.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleOpenMaintenanceDetail(m)}
                    className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Repeat size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            {m.recurrence_period}
                          </span>
                          <h4 className="text-xs font-bold text-white">{m.title}</h4>
                        </div>
                        <p className="text-[11px] text-white/50 mt-0.5">
                          Próxima data: {m.next_occurrence_date ? new Date(m.next_occurrence_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Programada'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditMaintenance(m);
                      }}
                      className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {isFormOpen && (
          <MaintenanceFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              loadMaintenances();
              onSuccess();
            }}
            chacaraId={chacaraId}
            room={room}
            maintenanceToEdit={maintToEdit}
          />
        )}

        {isDetailOpen && selectedMaintId && (
          <MaintenanceDetailModal
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            onSuccess={() => {
              loadMaintenances();
              onSuccess();
            }}
            maintenanceId={selectedMaintId}
            room={room}
            onEdit={(m) => {
              setIsDetailOpen(false);
              handleOpenEditMaintenance(m);
            }}
          />
        )}
      </div>
    </div>
  );
}
