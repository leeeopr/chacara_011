'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Plus, 
  Eye, 
  Ban, 
  Copy, 
  Filter, 
  MessageSquare, 
  TreePine, 
  Users, 
  Clock,
  Sparkles,
  Trash2,
  AlertTriangle,
  X,
  IdCard
} from 'lucide-react';
import { Reservation, Chacara, Client, ReservationStatus, getEffectiveReservationPrice, isCustomReservationPrice } from '@/lib/chacaraTypes';
import { getReservations, cancelReservation, duplicateReservation, deleteReservation } from '@/services/reservationsService';
import { getChacaras } from '@/services/chacarasService';
import { getClients } from '@/services/clientsService';
import NewReservationModal from './NewReservationModal';
import ReservationDetailModal from './ReservationDetailModal';
import ReservationsCarneLeaoTab from './ReservationsCarneLeaoTab';
import ConfirmationModal from '../ui/ConfirmationModal';
import Toast from '../ui/Toast';

interface ReservationsManagementProps {
  initialChacaraId?: string;
  initialClientId?: string;
}

export default function ReservationsManagement({
  initialChacaraId,
  initialClientId
}: ReservationsManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'reservas' | 'carne_leao'>('reservas');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [chacaraFilter, setChacaraFilter] = useState<string>('TODAS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Action Modals
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null);
  const [cancelingReservation, setCancelingReservation] = useState<Reservation | null>(null);
  const [quickCancelReason, setQuickCancelReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadFiltersData();
  }, []);

  useEffect(() => {
    loadReservations();
  }, [searchTerm, statusFilter, chacaraFilter, startDate, endDate]);

  const loadFiltersData = async () => {
    const [chData, clData] = await Promise.all([
      getChacaras(),
      getClients()
    ]);
    setChacaras(chData);
    setClients(clData);
  };

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await getReservations({
        search: searchTerm,
        status: statusFilter,
        chacara_id: chacaraFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setReservations(data);
    } catch (e) {
      console.warn('Erro ao carregar reservas:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (res: Reservation) => {
    setSelectedReservation(res);
    setIsDetailModalOpen(true);
  };

  const handleDuplicate = async (resId: string) => {
    setActionLoading(true);
    try {
      await duplicateReservation(resId);
      await loadReservations();
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar reserva');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingReservation) return;
    setActionLoading(true);
    setActionError('');
    try {
      await deleteReservation(deletingReservation.id);
      setDeletingReservation(null);
      await loadReservations();
      setToastMsg('Reserva excluída com sucesso.');
      setShowToast(true);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao excluir reserva.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelingReservation) return;
    setActionLoading(true);
    setActionError('');
    try {
      await cancelReservation(cancelingReservation.id, quickCancelReason.trim() || 'Cancelamento solicitado no sistema');
      setCancelingReservation(null);
      setQuickCancelReason('');
      await loadReservations();
      setToastMsg('Reserva cancelada com sucesso.');
      setShowToast(true);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao cancelar reserva.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Sub-Tabs Bar: Todas as Reservas vs Carnê-Leão */}
      <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('reservas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'reservas'
              ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <CalendarCheck size={16} />
          <span>Todas as Reservas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('carne_leao')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'carne_leao'
              ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <IdCard size={16} />
          <span>Gestão de Comprovantes (Carnê-Leão)</span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
            activeSubTab === 'carne_leao' ? 'bg-[#0A0F2C]/20 text-[#0A0F2C]' : 'bg-purple-500/20 text-purple-300'
          }`}>
            Fiscal
          </span>
        </button>
      </div>

      {/* Sub-Tab 2: Carnê-Leão */}
      {activeSubTab === 'carne_leao' ? (
        <ReservationsCarneLeaoTab
          onOpenReservationDetail={async (resId) => {
            let r = reservations.find(x => x.id === resId);
            if (!r) {
              try {
                const list = await getReservations({});
                r = list.find(x => x.id === resId);
              } catch (e) {
                console.warn('Erro ao buscar reserva:', e);
              }
            }
            if (r) handleOpenDetail(r);
          }}
        />
      ) : (
        <>
          {/* Top Bar with Search & Multi-Filters */}
          <div className="glass p-5 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Pesquisar por código, cliente, observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-[#FFD600] outline-none"
            />
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="w-full md:w-auto bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-6 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Nova Reserva</span>
          </button>
        </div>

        {/* Filter Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold text-white/40">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#FFD600] outline-none mt-1"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="PRE_RESERVA">Pré-Reserva</option>
              <option value="CHECKIN_REALIZADO">Check-in Realizado</option>
              <option value="CHECKOUT_REALIZADO">Check-out Realizado</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/40">Chácara</label>
            <select
              value={chacaraFilter}
              onChange={(e) => setChacaraFilter(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#FFD600] outline-none mt-1"
            >
              <option value="TODAS">Todas as Chácaras</option>
              {chacaras.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/40">Período De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white mt-1"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/40">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white mt-1"
            />
          </div>
        </div>
      </div>

      {/* Reservations List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)}
        </div>
      ) : reservations.length === 0 ? (
        <div className="glass p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
          <CalendarCheck size={48} className="text-white/20 mb-3" />
          <h3 className="text-base font-bold text-white">Nenhuma reserva localizada</h3>
          <p className="text-xs text-white/50 mt-1 max-w-sm">
            Nenhuma reserva corresponde aos filtros selecionados. Altere os parâmetros ou crie uma nova reserva.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="mt-4 px-4 py-2 bg-[#FFD600] text-[#0A0F2C] font-black text-xs rounded-xl uppercase"
          >
            + Nova Reserva
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((res) => {
            const checkinFormatted = new Date(`${res.checkin_date}T00:00:00`).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const checkoutFormatted = new Date(`${res.checkout_date}T00:00:00`).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            return (
              <div
                key={res.id}
                className="glass rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left Info Block */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFD600]/10 border border-[#FFD600]/20 flex flex-col items-center justify-center text-[#FFD600] shrink-0 font-black">
                    <span className="text-[10px] uppercase">Código</span>
                    <span className="text-xs">{res.code}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white truncate">
                        {res.client?.full_name || 'Cliente não informado'}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        res.status === 'CONFIRMADA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        res.status === 'PRE_RESERVA' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        res.status === 'CHECKIN_REALIZADO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        res.status === 'CANCELADA' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {res.status}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 font-bold text-white/80">
                        <TreePine size={13} className="text-[#FFD600]" />
                        {res.chacara?.name || 'Chácara N/A'}
                      </span>
                      <span>•</span>
                      <span>{res.total_guests || (res.guests_adults + res.guests_children)} hóspedes</span>
                      <span>•</span>
                      <span className="text-white/40">Origem: {res.origin}</span>
                    </p>
                  </div>
                </div>

                {/* Center Dates & Price */}
                <div className="text-left md:text-right text-xs shrink-0">
                  <div className="flex items-center md:justify-end gap-1.5">
                    <span className="font-black text-white text-sm">
                      R$ {getEffectiveReservationPrice(res).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {isCustomReservationPrice(res) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Manual
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-white/80 mt-0.5">{checkinFormatted} até {checkoutFormatted}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">
                    Entrada: {res.checkin_time?.slice(0, 5)} • Saída: {res.checkout_time?.slice(0, 5)}
                  </p>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleOpenDetail(res)}
                    className="p-2 bg-white/5 hover:bg-white/15 text-white rounded-xl flex items-center gap-1 text-xs font-bold transition-all"
                    title="Visualizar Detalhes"
                  >
                    <Eye size={16} />
                    <span className="hidden sm:inline">Ver</span>
                  </button>

                  <button
                    onClick={() => handleDuplicate(res.id)}
                    disabled={actionLoading}
                    className="p-2 bg-white/5 hover:bg-white/15 text-white rounded-xl flex items-center gap-1 text-xs transition-all disabled:opacity-50"
                    title="Duplicar Reserva"
                  >
                    <Copy size={16} />
                  </button>

                  {res.status !== 'CANCELADA' && (
                    <button
                      onClick={() => {
                        setCancelingReservation(res);
                        setQuickCancelReason('');
                        setActionError('');
                      }}
                      className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl flex items-center gap-1 text-xs transition-all"
                      title="Cancelar Reserva"
                    >
                      <Ban size={16} />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDeletingReservation(res);
                      setActionError('');
                    }}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl flex items-center gap-1 text-xs transition-all"
                    title="Excluir Reserva"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* Modal de Confirmação de Cancelamento de Reserva */}
      <ConfirmationModal
        isOpen={!!cancelingReservation}
        title="Confirmar cancelamento"
        description={
          <div className="space-y-3">
            <p className="text-white/90">Tem certeza que deseja cancelar esta reserva?</p>
            <p className="text-white/50 text-[11px]">
              Esta ação poderá ser revertida posteriormente reativando a reserva.
            </p>
            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Motivo do Cancelamento (opcional)</label>
              <textarea
                rows={2}
                disabled={actionLoading}
                value={quickCancelReason}
                onChange={(e) => setQuickCancelReason(e.target.value)}
                placeholder="Ex: Desistência do cliente / Imprevisto..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FFD600] resize-none"
              />
            </div>
            {actionError && (
              <p className="text-xs text-red-400 font-bold">{actionError}</p>
            )}
          </div>
        }
        confirmText="Confirmar Cancelamento"
        cancelText="Voltar"
        variant="warning"
        isLoading={actionLoading}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelingReservation(null)}
      />

      {/* Modal de Confirmação de Exclusão de Reserva */}
      <ConfirmationModal
        isOpen={!!deletingReservation}
        title="Confirmar exclusão"
        description={
          <div className="space-y-2">
            <p className="text-white/90">Tem certeza que deseja excluir esta reserva?</p>
            <p className="text-red-400 font-bold text-[11px]">
              Esta ação é permanente e não poderá ser desfeita.
            </p>
            {actionError && (
              <p className="text-xs text-red-400 font-bold">{actionError}</p>
            )}
          </div>
        }
        confirmText="Excluir Reserva"
        cancelText="Cancelar"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingReservation(null)}
      />

      {/* Toast de Notificação */}
      <Toast
        isOpen={showToast}
        message={toastMsg}
        type="success"
        onClose={() => setShowToast(false)}
      />

      {/* New Reservation Multi-Step Modal */}
      <NewReservationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={loadReservations}
        initialChacaraId={initialChacaraId}
        initialClientId={initialClientId}
      />

      {/* Detail Overlay Modal */}
      <ReservationDetailModal
        reservation={selectedReservation}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={loadReservations}
      />
    </div>
  );
}
