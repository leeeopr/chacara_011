'use client';

import React, { useState, useEffect } from 'react';
import { 
  DoorClosed, 
  Plus, 
  Search, 
  Filter, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  ArrowUpDown, 
  DollarSign, 
  RefreshCw,
  LayoutGrid,
  List
} from 'lucide-react';
import { PropertyRoom, RoomType, MaintenanceRecord } from '@/lib/roomsMaintenanceTypes';
import { 
  getPropertyRooms, 
  reorderPropertyRooms, 
  deletePropertyRoom,
  checkRoomDeletionSafety 
} from '@/services/roomsMaintenanceService';
import RoomCard from './RoomCard';
import RoomFormModal from './RoomFormModal';
import RoomDetailModal from './RoomDetailModal';
import RoomTypesManagerModal from './RoomTypesManagerModal';
import MaintenanceFormModal from './MaintenanceFormModal';

interface RoomsAndMaintenanceTabProps {
  chacaraId: string;
  chacaraName?: string;
}

export default function RoomsAndMaintenanceTab({
  chacaraId,
  chacaraName
}: RoomsAndMaintenanceTabProps) {
  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<PropertyRoom | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<PropertyRoom | null>(null);

  const [isTypesManagerOpen, setIsTypesManagerOpen] = useState(false);

  const [isMaintFormOpen, setIsMaintFormOpen] = useState(false);
  const [roomForNewMaint, setRoomForNewMaint] = useState<PropertyRoom | null>(null);

  useEffect(() => {
    loadRooms();
  }, [chacaraId]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await getPropertyRooms(chacaraId);
      setRooms(data);
    } catch (e) {
      console.warn('Erro ao carregar cômodos da chácara:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewRoom = () => {
    setRoomToEdit(null);
    setIsRoomFormOpen(true);
  };

  const handleOpenEditRoom = (room: PropertyRoom) => {
    setRoomToEdit(room);
    setIsRoomFormOpen(true);
  };

  const handleOpenDetailRoom = (room: PropertyRoom) => {
    setSelectedRoom(room);
    setIsDetailOpen(true);
  };

  const handleOpenNewMaintenance = (room: PropertyRoom) => {
    setRoomForNewMaint(room);
    setIsMaintFormOpen(true);
  };

  const handleDeleteRoom = async (room: PropertyRoom) => {
    const safety = await checkRoomDeletionSafety(room.id);
    if (!safety.canDelete) {
      alert(safety.message);
      return;
    }

    if (!confirm(`Deseja realmente excluir o ambiente "${room.name}"? ${safety.message}`)) return;

    try {
      await deletePropertyRoom(room.id);
      loadRooms();
    } catch (e: any) {
      alert('Erro ao excluir cômodo: ' + e.message);
    }
  };

  const handleMoveRoom = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= rooms.length) return;
    const newRooms = [...rooms];
    const [moved] = newRooms.splice(fromIndex, 1);
    newRooms.splice(toIndex, 0, moved);
    setRooms(newRooms);

    try {
      await reorderPropertyRooms(chacaraId, newRooms.map(r => r.id));
    } catch (e) {
      console.warn('Erro ao reordenar:', e);
    }
  };

  // Metrics
  const totalRooms = rooms.length;
  const roomsWithIssues = rooms.filter(r => (r.stats?.open_maintenances || 0) > 0).length;
  const urgentCount = rooms.reduce((sum, r) => sum + (r.stats?.urgent_maintenances || 0), 0);
  const totalSpent = rooms.reduce((sum, r) => sum + (r.stats?.total_spent || 0), 0);

  // Filtered rooms
  const filteredRooms = rooms.filter(r => {
    const matchSearch = searchTerm === '' || 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.room_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'TODOS' || 
      (statusFilter === 'MANUTENCAO' && (r.stats?.open_maintenances || 0) > 0) ||
      (statusFilter === 'URGENTE' && (r.stats?.urgent_maintenances || 0) > 0) ||
      (statusFilter === 'OPERACIONAL' && (r.stats?.open_maintenances || 0) === 0);

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <DoorClosed size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Total Ambientes</p>
            <p className="text-xl font-black text-white">{totalRooms}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Wrench size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Com Pendências</p>
            <p className="text-xl font-black text-amber-400">{roomsWithIssues}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Manutenções Urgentes</p>
            <p className="text-xl font-black text-rose-400">{urgentCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Investimento Total</p>
            <p className="text-lg font-black text-emerald-400">R$ {totalSpent.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search and Filters */}
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
            <input
              type="text"
              placeholder="Buscar ambiente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 focus:border-[#FFD600] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0D153A] border border-white/10 focus:border-[#FFD600] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="OPERACIONAL">Tudo em Ordem</option>
            <option value="MANUTENCAO">Com Manutenção</option>
            <option value="URGENTE">Apenas Urgentes</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsTypesManagerOpen(true)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all"
            title="Gerenciar tipos de cômodos"
          >
            <Layers size={14} className="text-[#FFD600]" />
            <span className="hidden md:inline">Tipos de Ambientes</span>
          </button>

          <button
            onClick={handleOpenNewRoom}
            className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-[#FFD600]/20 flex-shrink-0"
          >
            <Plus size={15} />
            <span>+ Novo Ambiente</span>
          </button>
        </div>
      </div>

      {/* Main Content: Airbnb Style Rooms Grid */}
      {loading ? (
        <div className="text-center py-16 text-white/40 text-xs flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#FFD600]" size={24} />
          <span>Carregando ambientes e manutenções...</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#FFD600]/10 text-[#FFD600] flex items-center justify-center mx-auto border border-[#FFD600]/20">
            <DoorClosed size={32} />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Nenhum ambiente encontrado</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
              Cadastre os cômodos e espaços da chácara (quartos, banheiros, piscina, cozinha, área gourmet) para controlar o estado e manutenções de cada ambiente.
            </p>
          </div>
          <button
            onClick={handleOpenNewRoom}
            className="bg-[#FFD600] text-[#0A0F2C] font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-xl shadow-[#FFD600]/20"
          >
            <Plus size={16} />
            <span>Cadastrar Primeiro Ambiente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room, idx) => (
            <RoomCard
              key={room.id}
              room={room}
              index={idx}
              totalRooms={filteredRooms.length}
              onOpenDetail={handleOpenDetailRoom}
              onEdit={handleOpenEditRoom}
              onDelete={handleDeleteRoom}
              onNewMaintenance={handleOpenNewMaintenance}
              onMoveUp={(index) => handleMoveRoom(index, index - 1)}
              onMoveDown={(index) => handleMoveRoom(index, index + 1)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isRoomFormOpen && (
        <RoomFormModal
          isOpen={isRoomFormOpen}
          onClose={() => setIsRoomFormOpen(false)}
          onSuccess={loadRooms}
          chacaraId={chacaraId}
          roomToEdit={roomToEdit}
          onOpenRoomTypesManager={() => {
            setIsRoomFormOpen(false);
            setIsTypesManagerOpen(true);
          }}
        />
      )}

      {isDetailOpen && selectedRoom && (
        <RoomDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            loadRooms();
          }}
          onSuccess={loadRooms}
          room={selectedRoom}
          chacaraId={chacaraId}
          onEditRoom={(r) => {
            setIsDetailOpen(false);
            handleOpenEditRoom(r);
          }}
        />
      )}

      {isTypesManagerOpen && (
        <RoomTypesManagerModal
          isOpen={isTypesManagerOpen}
          onClose={() => setIsTypesManagerOpen(false)}
          onTypeCreated={() => {
            setIsTypesManagerOpen(false);
            setIsRoomFormOpen(true);
          }}
        />
      )}

      {isMaintFormOpen && roomForNewMaint && (
        <MaintenanceFormModal
          isOpen={isMaintFormOpen}
          onClose={() => setIsMaintFormOpen(false)}
          onSuccess={loadRooms}
          chacaraId={chacaraId}
          room={roomForNewMaint}
          allRooms={rooms}
        />
      )}
    </div>
  );
}
