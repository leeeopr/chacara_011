'use client';

import React from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  DollarSign, 
  Image as ImageIcon 
} from 'lucide-react';
import { PropertyRoom, ROOM_STATUS_META } from '@/lib/roomsMaintenanceTypes';
import RoomIcon from './RoomIcon';

interface RoomCardProps {
  room: PropertyRoom;
  index: number;
  totalRooms: number;
  onOpenDetail: (room: PropertyRoom) => void;
  onEdit: (room: PropertyRoom) => void;
  onDelete: (room: PropertyRoom) => void;
  onNewMaintenance: (room: PropertyRoom) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export default function RoomCard({
  room,
  index,
  totalRooms,
  onOpenDetail,
  onEdit,
  onDelete,
  onNewMaintenance,
  onMoveUp,
  onMoveDown
}: RoomCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const stats = room.stats || {
    total_maintenances: 0,
    open_maintenances: 0,
    in_progress_maintenances: 0,
    urgent_maintenances: 0,
    completed_maintenances: 0,
    total_spent: 0,
    has_urgent: false
  };

  const statusMeta = ROOM_STATUS_META[room.status] || ROOM_STATUS_META.OPERACIONAL;
  const hasUrgent = stats.urgent_maintenances > 0;
  const hasOpen = stats.open_maintenances > 0;

  return (
    <div 
      className={`group relative bg-[#0D153A] rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col hover:shadow-xl hover:translate-y-[-2px] ${
        hasUrgent 
          ? 'border-rose-500/40 shadow-rose-500/10 shadow-lg ring-1 ring-rose-500/20' 
          : hasOpen
            ? 'border-amber-500/30 hover:border-amber-500/50'
            : 'border-white/10 hover:border-[#FFD600]/40'
      }`}
    >
      {/* Visual Header / Photo Area (Airbnb Style) */}
      <div 
        onClick={() => onOpenDetail(room)}
        className="relative h-44 w-full bg-gradient-to-br from-white/5 to-white/10 cursor-pointer overflow-hidden"
      >
        {room.photo_url ? (
          <img 
            src={room.photo_url} 
            alt={room.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/40 bg-gradient-to-br from-blue-950/40 to-indigo-950/60 p-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 mb-2">
              <RoomIcon name={room.icon} size={36} />
            </div>
            <span className="text-[11px] font-medium text-white/40">{room.room_type_name}</span>
          </div>
        )}

        {/* Gradient Overlay for Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D153A] via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="glass px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-md backdrop-blur-md">
            <RoomIcon name={room.icon} size={14} className="text-[#FFD600]" />
            <span className="text-[11px] font-bold text-white tracking-wide">{room.room_type_name}</span>
          </div>

          {/* Urgent Alert Badge */}
          {hasUrgent ? (
            <div className="bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-rose-500/40 animate-pulse">
              <AlertTriangle size={12} />
              <span>{stats.urgent_maintenances} Urgente</span>
            </div>
          ) : (
            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusMeta.badgeBg}`}>
              {statusMeta.label}
            </div>
          )}
        </div>

        {/* Order reorder triggers on hover */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded-lg backdrop-blur-sm">
          {onMoveUp && index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(index);
              }}
              title="Mover para cima"
              className="p-1 text-white/70 hover:text-white rounded hover:bg-white/20"
            >
              <ArrowUp size={13} />
            </button>
          )}
          {onMoveDown && index < totalRooms - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(index);
              }}
              title="Mover para baixo"
              className="p-1 text-white/70 hover:text-white rounded hover:bg-white/20"
            >
              <ArrowDown size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 
              onClick={() => onOpenDetail(room)}
              className="text-base font-black text-white hover:text-[#FFD600] transition-colors cursor-pointer line-clamp-1"
            >
              {room.name}
            </h3>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-all"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-[#0A0F2C] border border-white/20 rounded-xl shadow-2xl py-1 text-xs">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenDetail(room);
                      }}
                      className="w-full px-3 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <Wrench size={14} className="text-[#FFD600]" />
                      <span>Ver Manutenções</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onNewMaintenance(room);
                      }}
                      className="w-full px-3 py-2 text-left text-emerald-400 hover:bg-white/10 flex items-center gap-2 font-bold"
                    >
                      <Plus size={14} />
                      <span>Nova Manutenção</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(room);
                      }}
                      className="w-full px-3 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <Edit size={14} />
                      <span>Editar Ambiente</span>
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(room);
                      }}
                      className="w-full px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                    >
                      <Trash2 size={14} />
                      <span>Excluir Ambiente</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {room.description && (
            <p className="text-xs text-white/50 line-clamp-2 mt-1">
              {room.description}
            </p>
          )}
        </div>

        {/* Indicators Summary Area */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            {hasOpen ? (
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Clock size={13} className="text-amber-400" />
                <span>{stats.open_maintenances} pendência{stats.open_maintenances > 1 ? 's' : ''}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                <span>Tudo em ordem</span>
              </div>
            )}

            {stats.total_spent > 0 && (
              <span className="text-[11px] text-white/40 font-medium">
                Gasto: R$ {stats.total_spent.toFixed(2)}
              </span>
            )}
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onOpenDetail(room)}
              className="flex-1 bg-white/5 hover:bg-white/15 text-white/90 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-white/10"
            >
              <span>Gerenciar</span>
            </button>
            <button
              onClick={() => onNewMaintenance(room)}
              title="Adicionar manutenção rápida"
              className="bg-[#FFD600]/10 hover:bg-[#FFD600] text-[#FFD600] hover:text-[#0A0F2C] border border-[#FFD600]/30 font-black p-2 rounded-xl text-xs transition-all flex items-center justify-center"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
