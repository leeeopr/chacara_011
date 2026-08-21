'use client';

import React, { useEffect, useState } from 'react';
import { 
  TreePine, 
  CalendarCheck, 
  Users, 
  Plus, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Sparkles,
  AlertTriangle,
  X,
  Ban,
  Eye,
  Check,
  MessageSquare
} from 'lucide-react';
import { Chacara, Reservation, Client } from '@/lib/chacaraTypes';
import { getChacaras } from '@/services/chacarasService';
import { getReservations, confirmReservation, cancelReservation } from '@/services/reservationsService';
import { getClients } from '@/services/clientsService';
import { getExceptionalEvents, ExceptionalEvent } from '@/services/exceptionalEventsService';

import { TabType } from './ChacarasSidebar';
import OperationalPriorityDashboard from './OperationalPriorityDashboard';
import UserPendingPurchasesDashboard from '../pendencias/UserPendingPurchasesDashboard';
import PurchaseFormModal from '../pendencias/PurchaseFormModal';
import DashboardMaintenanceWidget from './rooms/DashboardMaintenanceWidget';
import { HousePurchase } from '@/lib/purchasesTypes';

interface ChacarasDashboardProps {
  onNavigate: (tab: TabType) => void;
  onNewReservation: () => void;
  onNewChacara: () => void;
  onNewClient: () => void;
  onSelectReservation: (reservation: Reservation) => void;
  onNewPendencia?: () => void;
  onOpenPendenciaDetail?: (id: string) => void;
}

export default function ChacarasDashboard({
  onNavigate,
  onNewReservation,
  onNewChacara,
  onNewClient,
  onSelectReservation,
  onNewPendencia,
  onOpenPendenciaDetail
}: ChacarasDashboardProps) {
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [exceptionalEvents, setExceptionalEvents] = useState<ExceptionalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Pending Pre-Reservations Modal State
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cancelingRes, setCancelingRes] = useState<Reservation | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');

  // Purchase Form Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<HousePurchase | null>(null);

  const handleOpenPurchaseDetail = (purchase: HousePurchase) => {
    setPurchaseToEdit(purchase);
    setIsPurchaseModalOpen(true);
  };

  const handleOpenNewPurchaseModal = () => {
    setPurchaseToEdit(null);
    setIsPurchaseModalOpen(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chData, resData, clData, excData] = await Promise.all([
        getChacaras(),
        getReservations(),
        getClients(),
        getExceptionalEvents()
      ]);
      setChacaras(chData);
      setReservations(resData);
      setClients(clData);
      setExceptionalEvents(excData || []);
    } catch (err) {
      console.warn('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeChacaras = chacaras.filter(c => c.status === 'ATIVA');
  const confirmedReservations = reservations.filter(r => r.status === 'CONFIRMADA' || r.status === 'HOSPEDADO' || r.status === 'CHECKIN_REALIZADO');
  const pendingPreReservations = reservations.filter(r => r.status === 'PRE_RESERVA' && !r.is_deleted);
  const activeExceptionalEvents = exceptionalEvents.filter(e => e.status === 'PENDENTE' || e.status === 'EM_ANDAMENTO');

  // Check for pre-reservations older than 48h
  const nowTs = new Date().getTime();
  const oldPendingReservations = pendingPreReservations.filter(r => {
    if (!r.created_at) return false;
    const createdTs = new Date(r.created_at).getTime();
    return (nowTs - createdTs) > (48 * 60 * 60 * 1000);
  });

  const handleConfirmPending = async (resId: string) => {
    setActionLoadingId(resId);
    try {
      await confirmReservation(resId, 'Gerente');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao confirmar pré-reserva');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelPending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelingRes || !cancelReasonText.trim()) return;
    setActionLoadingId(cancelingRes.id);
    try {
      await cancelReservation(cancelingRes.id, cancelReasonText.trim(), 'Gerente');
      setCancelingRes(null);
      setCancelReasonText('');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao cancelar pré-reserva');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Upcoming checkins in next 7 days
  const today = new Date().toISOString().split('T')[0];
  const upcomingCheckins = reservations
    .filter(r => r.checkin_date >= today && r.status !== 'CANCELADA' && r.status !== 'FINALIZADA')
    .slice(0, 5);

  const activeOccupancyRate = chacaras.length > 0 
    ? Math.round((confirmedReservations.length / (chacaras.length * 4)) * 100) 
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Exceptional Events & Important Alerts Section */}
      {activeExceptionalEvents.length > 0 && (
        <div className="p-5 rounded-3xl bg-red-950/30 border border-red-500/30 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  Eventos Excepcionais & Avisos Importantes ({activeExceptionalEvents.length})
                </h3>
                <p className="text-xs text-red-300/70">
                  Acontecimentos fora da rotina cadastrados no calendário do sistema
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('calendario')}
              className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Ver no Calendário →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeExceptionalEvents.slice(0, 6).map(exc => (
              <div 
                key={exc.id} 
                onClick={() => onNavigate('calendario')}
                className="p-3.5 rounded-2xl bg-[#0B0F19] border border-red-500/20 hover:border-red-500/50 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white group-hover:text-red-300 transition-colors line-clamp-1">
                    🚨 {exc.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                    {exc.priority}
                  </span>
                </div>

                {exc.description && (
                  <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                    {exc.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-white/50 pt-1.5 border-t border-white/5">
                  <span>📅 {new Date(exc.event_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  {exc.chacara_nome && <span className="truncate max-w-[100px]">🏡 {exc.chacara_nome}</span>}
                  {exc.responsible_name && <span className="truncate max-w-[100px]">👤 {exc.responsible_name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Banner for Pre-Reservations older than 48h */}
      {oldPendingReservations.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-[#0A0F2C] shrink-0 font-black">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-300">
                Alerta de Pré-Reservas Pendentes ({oldPendingReservations.length})
              </h4>
              <p className="text-xs text-white/70">
                Existem {oldPendingReservations.length} pré-reservas aguardando confirmação há mais de 48 horas!
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPendingModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#0A0F2C] font-black text-xs uppercase rounded-xl shadow-lg shrink-0 transition-all"
          >
            Analisar Pendências
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0A0F2C] via-[#121B4E] to-[#0A0F2C] border border-white/10 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles size={14} />
              <span>Painel de Controle — Fase 2</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Visão Geral do Propriedades & Reservas
            </h1>
            <p className="text-white/60 text-sm mt-1 max-w-xl">
              Gerencie a disponibilidade, acompanhe os check-ins da semana e agilize novas reservas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNewReservation}
              className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-3 px-5 rounded-2xl shadow-lg shadow-[#FFD600]/20 transition-all active:scale-[0.98] flex items-center gap-2 text-sm uppercase tracking-wider"
            >
              <Plus size={18} />
              <span>Nova Reserva</span>
            </button>
            <button
              onClick={onNewChacara}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-2xl border border-white/10 transition-all text-sm flex items-center gap-2"
            >
              <TreePine size={18} />
              <span>+ Chácara</span>
            </button>
            <button
              onClick={onNewClient}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-2xl border border-white/10 transition-all text-sm flex items-center gap-2"
            >
              <Users size={18} />
              <span>+ Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Priority Dashboard (O que fazer agora & Centro Inteligente de Operação) */}
      <OperationalPriorityDashboard
        onNavigateToPendencias={(filter) => {
          onNavigate('pendencias');
        }}
        onOpenPendenciaDetail={(id) => {
          if (onOpenPendenciaDetail) {
            onOpenPendenciaDetail(id);
          } else {
            onNavigate('pendencias');
          }
        }}
        onNewPendencia={() => {
          if (onNewPendencia) {
            onNewPendencia();
          } else {
            onNavigate('pendencias');
          }
        }}
      />

      {/* User Pending Purchases Dashboard (Minhas Compras Pendentes) */}
      <UserPendingPurchasesDashboard
        onOpenPurchaseDetail={handleOpenPurchaseDetail}
        onOpenNewPurchase={handleOpenNewPurchaseModal}
        onNavigateToPurchasesTab={() => onNavigate('pendencias')}
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div 
          onClick={() => onNavigate('chacaras')}
          className="glass rounded-2xl p-5 border border-white/10 hover:border-[#FFD600]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Chácaras Ativas</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <TreePine size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{activeChacaras.length}</span>
            <span className="text-xs font-bold text-white/40">de {chacaras.length} cadastradas</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center text-xs text-white/60">
            <span className="text-emerald-400 font-bold">{chacaras.filter(c => c.status === 'EM_MANUTENCAO').length}</span>
            <span className="ml-1">em manutenção</span>
            <ArrowUpRight size={14} className="ml-auto text-white/30 group-hover:text-[#FFD600]" />
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => setIsPendingModalOpen(true)}
          className="glass rounded-2xl p-5 border border-amber-500/30 hover:border-[#FFD600] bg-amber-500/5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Pré-Reservas Pendentes</span>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-[#FFD600] group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{pendingPreReservations.length}</span>
            <span className="text-xs font-bold text-amber-400">Aguardando</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center text-xs text-white/60">
            <span>{confirmedReservations.length} reservas confirmadas</span>
            <ArrowUpRight size={14} className="ml-auto text-white/30 group-hover:text-[#FFD600]" />
          </div>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => onNavigate('clientes')}
          className="glass rounded-2xl p-5 border border-white/10 hover:border-[#FFD600]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Total de Clientes</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{clients.length}</span>
            <span className="text-xs font-bold text-blue-400">Cadastrados</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center text-xs text-white/60">
            <span>{clients.filter(c => (c.total_reservations || 0) > 1).length} recorrentes</span>
            <ArrowUpRight size={14} className="ml-auto text-white/30 group-hover:text-[#FFD600]" />
          </div>
        </div>

        {/* Card 4 */}
        <div 
          onClick={() => onNavigate('calendario')}
          className="glass rounded-2xl p-5 border border-white/10 hover:border-[#FFD600]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Próximos Check-ins</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{upcomingCheckins.length}</span>
            <span className="text-xs font-bold text-purple-400">na fila</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center text-xs text-white/60">
            <span>Ver no calendário</span>
            <ArrowUpRight size={14} className="ml-auto text-white/30 group-hover:text-[#FFD600]" />
          </div>
        </div>
      </div>

      {/* Main Content Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Check-ins List (2 cols) */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-white/10 flex flex-col">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Clock size={20} className="text-[#FFD600]" />
                Próximas Reservas & Check-ins
              </h2>
              <p className="text-xs text-white/50 mt-0.5">Reservas agendadas com check-in pendente</p>
            </div>
            <button
              onClick={() => onNavigate('reservas')}
              className="text-xs font-bold text-[#FFD600] hover:underline flex items-center gap-1"
            >
              Ver Todas
              <ArrowUpRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : upcomingCheckins.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center my-auto">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30 mb-3">
                <CalendarCheck size={24} />
              </div>
              <p className="text-white/60 font-bold text-sm">Nenhuma reserva futura cadastrada</p>
              <p className="text-xs text-white/40 mt-1">Clique abaixo para criar uma nova reserva.</p>
              <button
                onClick={onNewReservation}
                className="mt-4 px-4 py-2 rounded-xl bg-[#FFD600] text-[#0A0F2C] font-black text-xs uppercase"
              >
                + Criar Reserva
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {upcomingCheckins.map((res) => {
                const checkinFormatted = new Date(`${res.checkin_date}T00:00:00`).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short'
                });
                const checkoutFormatted = new Date(`${res.checkout_date}T00:00:00`).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short'
                });

                return (
                  <div
                    key={res.id}
                    onClick={() => onSelectReservation(res)}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/20 flex flex-col items-center justify-center text-[#FFD600] shrink-0">
                        <span className="text-[10px] uppercase font-black">{checkinFormatted.split(' ')[1]}</span>
                        <span className="text-sm font-black leading-none">{checkinFormatted.split(' ')[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white/40 uppercase tracking-widest">{res.code}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            res.status === 'CONFIRMADA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            res.status === 'PRE_RESERVA' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {res.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white truncate mt-0.5">
                          {res.client?.full_name || 'Cliente não identificado'}
                        </h3>
                        <p className="text-xs text-white/50 truncate flex items-center gap-1 mt-0.5">
                          <TreePine size={12} className="text-[#FFD600]" />
                          <span>{res.chacara?.name || 'Chácara'}</span>
                          <span>•</span>
                          <span>{res.total_guests || (res.guests_adults + res.guests_children)} hóspedes</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white/80">{checkinFormatted} até {checkoutFormatted}</p>
                      <p className="text-[11px] text-white/40 mt-0.5">{res.checkin_time?.slice(0, 5)} às {res.checkout_time?.slice(0, 5)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chácaras Quick Overview (1 col) */}
        <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <TreePine size={20} className="text-[#FFD600]" />
              Minhas Propriedades
            </h2>
            <button
              onClick={() => onNavigate('chacaras')}
              className="text-xs font-bold text-[#FFD600] hover:underline"
            >
              Gerenciar
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2].map(i => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)}
            </div>
          ) : chacaras.length === 0 ? (
            <div className="py-8 text-center my-auto">
              <p className="text-xs text-white/50">Nenhuma chácara cadastrada ainda.</p>
              <button
                onClick={onNewChacara}
                className="mt-3 px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold text-xs"
              >
                + Cadastrar Chácara
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {chacaras.slice(0, 4).map((chacara) => (
                <div
                  key={chacara.id}
                  onClick={() => onNavigate('chacaras')}
                  className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden shrink-0 border border-white/10">
                    {chacara.main_photo_url ? (
                      <img src={chacara.main_photo_url} alt={chacara.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <TreePine size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{chacara.name}</h4>
                    <p className="text-xs text-white/50 truncate flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{chacara.city || 'Sem cidade'} - Cap: {chacara.capacity_people} p.</span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    chacara.status === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {chacara.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Seção Operacional de Cômodos & Manutenções */}
      <DashboardMaintenanceWidget onNavigateToChacaras={onNavigate} />

      {/* MODAL DE GERENCIAMENTO DE PRÉ-RESERVAS PENDENTES */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#0A0F2C] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-[#0A0F2C]">
                  <Clock size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Pré-Reservas Pendentes de Confirmação</h3>
                  <p className="text-xs text-amber-200">
                    Aprovação requerida antes da consolidação final no calendário
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {pendingPreReservations.length === 0 ? (
                <div className="p-12 text-center glass rounded-2xl border border-white/10 text-white/50 text-sm">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400" />
                  Nenhuma pré-reserva pendente de confirmação no momento!
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPreReservations.map((res) => {
                    const cleanPhone = (res.client?.phone || '').replace(/\D/g, '');
                    const waUrl = `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(res.client?.full_name || '')}%2C%20sobre%20sua%20pr%C3%A9-reserva%20${res.code}...`;

                    return (
                      <div key={res.id} className="glass p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-500/40 transition-all">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#FFD600] px-2.5 py-0.5 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/30">
                              {res.code}
                            </span>
                            <span className="text-sm font-bold text-white">{res.client?.full_name || 'Cliente N/A'}</span>
                            {res.created_at && (
                              <span className="text-[10px] text-white/40">
                                Criada em: {new Date(res.created_at).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-white/70">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-white/40 block">Chácara</span>
                              <strong className="text-white">{res.chacara?.name || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-white/40 block">Período</span>
                              <strong className="text-white">{res.checkin_date} a {res.checkout_date}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-white/40 block">Pessoas</span>
                              <strong className="text-white">{res.guests_adults} adult, {res.guests_children} cri.</strong>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-white/40 block">Valor Estimado</span>
                              <strong className="text-[#FFD600]">
                                R$ {Number(res.financial_summary?.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4 w-full md:w-auto justify-end">
                          {cleanPhone && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all text-xs flex items-center gap-1 font-bold"
                              title="Contato WhatsApp"
                            >
                              <MessageSquare size={16} />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setIsPendingModalOpen(false);
                              onSelectReservation(res);
                            }}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                          >
                            <Eye size={14} />
                            <span>Detalhes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCancelingRes(res)}
                            disabled={actionLoadingId === res.id}
                            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-red-500/30 transition-all"
                          >
                            <Ban size={14} />
                            <span>Recusar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConfirmPending(res.id)}
                            disabled={actionLoadingId === res.id}
                            className="px-4 py-2 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg shadow-[#FFD600]/20 transition-all"
                          >
                            <Check size={16} />
                            <span>{actionLoadingId === res.id ? 'Confirmando...' : 'Confirmar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cancel Confirmation Form */}
              {cancelingRes && (
                <form onSubmit={handleCancelPending} className="glass p-5 rounded-2xl border border-red-500/30 bg-red-500/10 space-y-3 mt-4">
                  <h4 className="text-xs font-black text-red-300 uppercase">
                    Recusar / Cancelar Pré-Reserva {cancelingRes.code}
                  </h4>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-white/60">Motivo da Recusa</label>
                    <textarea
                      required
                      rows={2}
                      value={cancelReasonText}
                      onChange={(e) => setCancelReasonText(e.target.value)}
                      placeholder="Ex: Não pagamento da entrada / Indisponibilidade aceita..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCancelingRes(null)}
                      className="px-3 py-1.5 bg-white/10 text-white font-bold text-xs rounded-xl"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoadingId === cancelingRes.id}
                      className="px-4 py-1.5 bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg"
                    >
                      Confirmar Cancelamento
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Purchase Form Modal for Dashboard */}
      <PurchaseFormModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        purchaseToEdit={purchaseToEdit}
        onSuccess={() => {
          setIsPurchaseModalOpen(false);
          window.dispatchEvent(new Event('purchases-updated'));
        }}
      />
    </div>
  );
}
