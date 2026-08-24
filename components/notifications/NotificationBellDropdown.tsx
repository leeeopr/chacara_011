'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  CalendarCheck, 
  Clock, 
  DollarSign, 
  MessageSquare, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { AppNotification, getLiveAppNotifications } from '@/services/notificationsService';
import QuickCommunicationModal from './QuickCommunicationModal';

interface NotificationBellDropdownProps {
  onNavigate?: (tab: string) => void;
}

export default function NotificationBellDropdown({ onNavigate }: NotificationBellDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Quick Communication Modal State
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [commData, setCommData] = useState<{
    phone?: string;
    clientName?: string;
    chacaraName?: string;
    code?: string;
  }>({});

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getLiveAppNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // 1 min refresh
    return () => clearInterval(interval);
  }, []);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionClick = (notif: AppNotification) => {
    setIsOpen(false);
    if (notif.type === 'CHECKIN_HOJE' || notif.type === 'CHECKOUT_HOJE') {
      if (notif.metadata?.clientPhone) {
        setCommData({
          phone: notif.metadata.clientPhone,
          clientName: notif.metadata.clientName,
          chacaraName: notif.metadata.chacaraName,
          code: notif.metadata.code
        });
        setIsCommModalOpen(true);
        return;
      }
      if (onNavigate) onNavigate('reservas');
      return;
    }

    if (notif.type === 'VIABILIDADE_RISCO') {
      if (onNavigate) onNavigate('planejamento');
      return;
    }

    if (notif.type === 'PENDENCIA_URGENTE') {
      if (onNavigate) onNavigate('pendencias');
      return;
    }

    if (notif.type === 'CAIXA_BAIXO') {
      if (onNavigate) onNavigate('planejamento');
      return;
    }
  };

  const highPriorityCount = notifications.filter(n => n.priority === 'ALTA').length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="btn-header-notification-bell"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all cursor-pointer flex items-center justify-center"
        title="Central de Notificações & Alertas"
      >
        <Bell size={18} className={notifications.length > 0 ? 'text-[#FFD600]' : ''} />
        {notifications.length > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-lg ${
            highPriorityCount > 0 
              ? 'bg-rose-500 text-white animate-pulse' 
              : 'bg-[#FFD600] text-slate-950'
          }`}>
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          id="notification-dropdown-panel"
          className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-[#0F172A] border border-white/15 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFD600]/20 flex items-center justify-center text-[#FFD600]">
                <Bell size={14} />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Central de Comunicações & Alertas</h4>
                <p className="text-[10px] text-white/50">{notifications.length} avisos ativos</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={loadNotifications}
                disabled={loading}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
                title="Atualizar"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-[#00E5FF]' : ''} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="py-8 text-center text-xs text-white/50">
                <RefreshCw size={16} className="animate-spin mx-auto text-[#00E5FF] mb-2" />
                Atualizando avisos...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400 opacity-60" />
                <p className="text-xs text-white/80 font-bold">Tudo em dia!</p>
                <p className="text-[11px] text-white/40">Nenhum alerta crítico ou check-in pendente de envio.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`p-3.5 hover:bg-white/5 transition-all flex flex-col gap-2 ${
                    notif.priority === 'ALTA' ? 'bg-rose-500/[0.03]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {notif.type === 'VIABILIDADE_RISCO' && (
                      <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle size={13} />
                      </div>
                    )}
                    {notif.type === 'CHECKIN_HOJE' && (
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarCheck size={13} />
                      </div>
                    )}
                    {notif.type === 'CHECKOUT_HOJE' && (
                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={13} />
                      </div>
                    )}
                    {notif.type === 'CAIXA_BAIXO' && (
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <DollarSign size={13} />
                      </div>
                    )}
                    {notif.type === 'PENDENCIA_URGENTE' && (
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle size={13} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{notif.title}</h5>
                      <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.description}
                      </p>
                    </div>
                  </div>

                  {notif.actionLabel && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleActionClick(notif)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {notif.type === 'CHECKIN_HOJE' ? <MessageSquare size={11} /> : <ArrowRight size={11} />}
                        <span>{notif.actionLabel}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Quick Action */}
          <div className="p-3 border-t border-white/10 bg-slate-900/80 flex items-center justify-between text-[11px]">
            <button
              onClick={() => {
                setIsOpen(false);
                setCommData({});
                setIsCommModalOpen(true);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5"
            >
              <MessageSquare size={13} />
              <span>Nova Mensagem WhatsApp</span>
            </button>

            <span className="text-white/40 text-[10px]">Automação Ativa</span>
          </div>
        </div>
      )}

      {/* Quick Communication Modal */}
      <QuickCommunicationModal
        isOpen={isCommModalOpen}
        onClose={() => setIsCommModalOpen(false)}
        initialPhone={commData.phone}
        initialClientName={commData.clientName}
        initialChacaraName={commData.chacaraName}
        initialCode={commData.code}
      />
    </div>
  );
}
