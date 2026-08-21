'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarCheck, 
  Lock, 
  LogIn, 
  LogOut, 
  Sparkles, 
  Waves, 
  TreePine, 
  Wrench, 
  ClipboardCheck, 
  UserCheck, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Check, 
  X, 
  Trash2, 
  User, 
  Building2,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { UnifiedCalendarEvent } from '@/lib/useCalendarEvents';
import { OperationalEvent } from '@/lib/chacaraTypes';
import { AccountPayable } from '@/lib/accountsPayableTypes';

interface CompactCalendarEventProps {
  evt: UnifiedCalendarEvent;
  onEventClick: (evt: UnifiedCalendarEvent) => void;
  onConfirmPresence?: (opEvent: OperationalEvent) => void;
  onOpenAbsenceModal?: (opEvent: OperationalEvent) => void;
  onDeleteOpEvent?: (opEvent: OperationalEvent) => void;
  onPayAccount?: (account: AccountPayable) => void;
}

// Icon helper for compact/expanded state
function EventIcon({ iconName, size = 12, className = '' }: { iconName: string; size?: number; className?: string }) {
  switch (iconName) {
    case 'CreditCard': return <CreditCard size={size} className={className} />;
    case 'AlertTriangle': return <AlertTriangle size={size} className={className} />;
    case 'Home': return <CalendarCheck size={size} className={className} />;
    case 'Lock': return <Lock size={size} className={className} />;
    case 'LogIn': return <LogIn size={size} className={className} />;
    case 'LogOut': return <LogOut size={size} className={className} />;
    case 'Sparkles': return <Sparkles size={size} className={className} />;
    case 'Waves': return <Waves size={size} className={className} />;
    case 'TreePine': return <TreePine size={size} className={className} />;
    case 'Wrench': return <Wrench size={size} className={className} />;
    case 'ClipboardCheck': return <ClipboardCheck size={size} className={className} />;
    case 'UserCheck': return <UserCheck size={size} className={className} />;
    case 'Users': return <Users size={size} className={className} />;
    case 'Clock': return <Clock size={size} className={className} />;
    default: return <CalendarIcon size={size} className={className} />;
  }
}

export default function CompactCalendarEvent({
  evt,
  onEventClick,
  onConfirmPresence,
  onOpenAbsenceModal,
  onDeleteOpEvent,
  onPayAccount
}: CompactCalendarEventProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const isConfirmed = evt.status === 'CONFIRMADO' || evt.status === 'CONCLUIDO' || evt.status === 'CONFIRMADA' || evt.status === 'CHECKIN_REALIZADO' || evt.status === 'CHECKOUT_REALIZADO' || evt.status === 'PAGA';
  const isAbsent = evt.status === 'FALTOU' || evt.status === 'VENCIDA';
  const isBlocked = evt.entityType === 'BLOQUEIO';
  const isOperational = evt.entityType === 'OPERACIONAL';
  const isReserva = evt.entityType === 'RESERVA';
  const isExcepcional = evt.entityType === 'EXCEPCIONAL';
  const isContaPagar = evt.entityType === 'CONTA_PAGAR';

  const handleMouseEnter = () => {
    // Slight debounce to prevent flickering on quick mouse passes
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 80);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  // Border & Accent Color computation
  const baseColor = evt.color || '#3B82F6';

  return (
    <div 
      className="relative w-full group/compact"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. COMPACT STRIP (Always in flow, keeps grid dimension fixed) */}
      <div
        onClick={() => onEventClick(evt)}
        className={`w-full h-[22px] min-h-[22px] px-1.5 rounded-md border flex items-center justify-between gap-1 cursor-pointer transition-all duration-150 select-none overflow-hidden ${
          isHovered ? 'opacity-20 scale-[0.98]' : 'hover:brightness-110'
        }`}
        style={{
          backgroundColor: `${baseColor}25`,
          borderColor: `${baseColor}60`,
          borderLeftWidth: '3.5px',
          borderLeftColor: baseColor
        }}
      >
        <div className="flex items-center gap-1 min-w-0 truncate">
          <EventIcon iconName={evt.iconName} size={11} className="shrink-0 text-white/90" />
          <span className="text-[10px] font-bold truncate text-white tracking-tight">
            {evt.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-mono text-white/60 hidden sm:inline">
            {evt.startTime}
          </span>
          {isConfirmed && <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />}
          {isAbsent && <XCircle size={10} className="text-red-400 shrink-0" />}
          {isBlocked && <Lock size={10} className="text-red-400 shrink-0" />}
        </div>
      </div>

      {/* 2. EXPANDED OVERLAY CARD (Triggered on hover, rendered over grid via absolute positioning) */}
      {isHovered && (
        <div
          onClick={() => onEventClick(evt)}
          className="absolute top-0 left-0 right-0 z-50 w-[220px] sm:w-[240px] p-3 rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col gap-2 cursor-pointer animate-fadeIn transition-all duration-200"
          style={{
            backgroundColor: '#0A0F2C',
            borderColor: `${baseColor}80`,
            boxShadow: `0 10px 30px -5px ${baseColor}40, 0 4px 12px rgba(0,0,0,0.8)`
          }}
        >
          {/* Domain & Status Header */}
          <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1.5">
            {isReserva && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                🏠 {evt.status === 'PRE_RESERVA' ? 'Pré-Reserva' : 'Reserva'}
              </span>
            )}
            {isOperational && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-200 border border-sky-500/40 flex items-center gap-1">
                🛠️ {evt.eventTypeCode.toUpperCase()}
              </span>
            )}
            {isContaPagar && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                💳 Conta a Pagar
              </span>
            )}
            {isBlocked && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                🔒 Bloqueio
              </span>
            )}
            {isExcepcional && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                🚨 Evento Excepcional
              </span>
            )}

            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono font-bold text-white/60 bg-white/10 px-1.5 py-0.5 rounded">
                {evt.status}
              </span>
              {isConfirmed && <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
              {isAbsent && <XCircle size={13} className="text-red-400 shrink-0" />}
              {isBlocked && <Lock size={13} className="text-red-400 shrink-0" />}
            </div>
          </div>

          {/* Title & Icon */}
          <div className="flex items-start gap-2 pt-0.5">
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${baseColor}30`, color: baseColor }}
            >
              <EventIcon iconName={evt.iconName} size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-white leading-tight break-words">{evt.title}</h4>
              <p className="text-[10px] text-white/60 font-mono mt-0.5 flex items-center gap-1">
                <Clock size={10} className="text-cyan-400 shrink-0" />
                <span>{evt.startTime} - {evt.endTime}</span>
              </p>
            </div>
          </div>

          {/* Chácara & Client/Staff */}
          <div className="space-y-1 text-[10px] text-white/70 bg-white/5 p-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5 truncate">
              <Building2 size={11} className="text-emerald-400 shrink-0" />
              <span className="font-bold text-white truncate">{evt.chacaraName}</span>
            </div>

            {evt.clientName && (
              <div className="flex items-center gap-1.5 truncate text-[#FFD600]">
                <User size={11} className="shrink-0" />
                <span className="font-medium truncate">{evt.clientName}</span>
              </div>
            )}

            {evt.staffNames && evt.staffNames.length > 0 && (
              <div className="flex items-center gap-1.5 truncate text-sky-300">
                <Users size={11} className="shrink-0" />
                <span className="font-medium truncate">{evt.staffNames.join(', ')}</span>
              </div>
            )}
          </div>

          {evt.description && (
            <p className="text-[10px] text-white/50 line-clamp-2 italic px-0.5">
              "{evt.description}"
            </p>
          )}

          {/* Operational Event Quick Actions */}
          {evt.rawOperationalEvent && (
            <div 
              className="flex items-center gap-1.5 pt-1.5 border-t border-white/10 mt-0.5" 
              onClick={e => e.stopPropagation()}
            >
              {evt.status === 'AGENDADO' && onConfirmPresence && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmPresence(evt.rawOperationalEvent!);
                    setIsHovered(false);
                  }}
                  className="flex-1 py-1 px-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Confirmar Presença"
                >
                  <Check size={10} />
                  <span>Presença</span>
                </button>
              )}

              {evt.status === 'AGENDADO' && onOpenAbsenceModal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAbsenceModal(evt.rawOperationalEvent!);
                    setIsHovered(false);
                  }}
                  className="flex-1 py-1 px-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Informar Falta"
                >
                  <X size={10} />
                  <span>Falta</span>
                </button>
              )}

              {onDeleteOpEvent && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteOpEvent(evt.rawOperationalEvent!);
                    setIsHovered(false);
                  }}
                  className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-300 border border-white/10 rounded-lg transition-all cursor-pointer shrink-0"
                  title="Excluir Serviço"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )}

          {/* Accounts Payable Quick Actions */}
          {evt.rawAccountPayable && (
            <div
              className="flex items-center gap-1.5 pt-1.5 border-t border-white/10 mt-0.5"
              onClick={e => e.stopPropagation()}
            >
              {evt.status !== 'PAGA' && evt.status !== 'CANCELADA' && onPayAccount && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPayAccount(evt.rawAccountPayable!);
                    setIsHovered(false);
                  }}
                  className="flex-1 py-1 px-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Marcar Conta como Paga"
                >
                  <CheckCircle2 size={11} />
                  <span>Marcar como Paga</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
