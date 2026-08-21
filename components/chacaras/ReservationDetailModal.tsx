'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarCheck, 
  Users, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  LogOut, 
  LogIn, 
  Ban, 
  Clock, 
  DollarSign, 
  TreePine,
  Phone,
  Trash2,
  CreditCard,
  FileText,
  History,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Reservation, ReservationHistory, isCustomReservationPrice, getEffectiveReservationPrice, CrewMember } from '@/lib/chacaraTypes';
import { 
  executeCheckin, 
  executeCheckout, 
  confirmReservation,
  cancelReservation, 
  duplicateReservation,
  deleteReservation,
  updateReservation,
  getReservationHistory
} from '@/services/reservationsService';
import { getCrewMembers } from '@/services/crewService';
import ReservationFinancialTab from './ReservationFinancialTab';
import ConfirmationModal from '../ui/ConfirmationModal';
import Toast from '../ui/Toast';

interface ReservationDetailModalProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ReservationDetailModal({
  reservation,
  isOpen,
  onClose,
  onUpdate
}: ReservationDetailModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'FINANCIAL' | 'HISTORY'>('OVERVIEW');
  const [historyLogs, setHistoryLogs] = useState<ReservationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Staff Assignment State
  const [allCrewMembers, setAllCrewMembers] = useState<CrewMember[]>([]);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [editingStaffIds, setEditingStaffIds] = useState<string[]>([]);
  const [savingStaff, setSavingStaff] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCrew();
    }
  }, [isOpen]);

  useEffect(() => {
    if (reservation) {
      setEditingStaffIds(reservation.staff_ids || []);
    }
  }, [reservation]);

  const loadCrew = async () => {
    try {
      const crew = await getCrewMembers({ activeOnly: true });
      setAllCrewMembers(crew || []);
    } catch (e) {
      console.warn('Erro ao carregar colaboradores:', e);
    }
  };

  const handleSaveStaffAssignment = async () => {
    if (!reservation) return;
    setSavingStaff(true);
    setErrorMessage('');
    try {
      const newStaffNames = editingStaffIds.map(id => {
        const found = allCrewMembers.find(c => c.id === id);
        return found?.nome || 'Funcionário';
      });

      await updateReservation(reservation.id, {
        staff_ids: editingStaffIds,
        primary_staff_id: editingStaffIds[0] || undefined,
        staff_names: newStaffNames
      });

      setToastMsg('Funcionário(s) vinculado(s) à reserva com sucesso!');
      setShowToast(true);
      setIsEditingStaff(false);
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao vincular funcionários');
    } finally {
      setSavingStaff(false);
    }
  };

  useEffect(() => {
    if (reservation?.id && activeSubTab === 'HISTORY') {
      loadHistory();
    }
  }, [reservation?.id, activeSubTab]);

  const loadHistory = async () => {
    if (!reservation) return;
    setLoadingHistory(true);
    try {
      const logs = await getReservationHistory(reservation.id);
      setHistoryLogs(logs as ReservationHistory[]);
    } catch (e) {
      console.warn('Erro ao carregar histórico:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen || !reservation) return null;

  const cleanPhone = (reservation.client?.phone || '').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(reservation.client?.full_name || '')}%2C%20estou%20entrando%20em%20contato%20sobre%20a%20sua%20reserva%20${reservation.code}`;

  const handleConfirmRes = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await confirmReservation(reservation.id, 'Gerente / Administrador');
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao confirmar pré-reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await executeCheckin(reservation.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await executeCheckout(reservation.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar check-out');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await cancelReservation(reservation.id, cancelReason.trim() || 'Cancelamento solicitado no sistema');
      setShowCancelModal(false);
      onUpdate();
      onClose();
      setToastMsg('Reserva cancelada com sucesso.');
      setShowToast(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cancelar reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await deleteReservation(reservation.id);
      setShowDeleteModal(false);
      onUpdate();
      onClose();
      setToastMsg('Reserva excluída com sucesso.');
      setShowToast(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao excluir reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await duplicateReservation(reservation.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao duplicar reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD600] p-2 rounded-xl text-[#0A0F2C]">
              <CalendarCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#FFD600]">{reservation.code}</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  reservation.status === 'CONFIRMADA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  reservation.status === 'CHECKIN_REALIZADO' || reservation.status === 'HOSPEDADO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  reservation.status === 'CANCELADA' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {reservation.status}
                </span>
              </div>
              <p className="text-xs text-white/50">Reserva efetuada via {reservation.origin}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation Subheader */}
        <div className="px-6 bg-[#070A1E] border-b border-white/10 flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('OVERVIEW')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'OVERVIEW'
                ? 'border-[#FFD600] text-[#FFD600]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <FileText size={15} />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveSubTab('FINANCIAL')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'FINANCIAL'
                ? 'border-[#FFD600] text-[#FFD600]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <DollarSign size={15} />
            <span>Financeiro</span>
          </button>

          <button
            onClick={() => setActiveSubTab('HISTORY')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'HISTORY'
                ? 'border-[#FFD600] text-[#FFD600]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <History size={15} />
            <span>Histórico & Auditoria</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSubTab === 'FINANCIAL' ? (
            <ReservationFinancialTab
              reservation={reservation}
              onUpdate={onUpdate}
            />
          ) : activeSubTab === 'HISTORY' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFD600] flex items-center gap-2">
                  <ShieldCheck size={16} /> Linha do Tempo e Histórico de Alterações
                </h4>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="text-[11px] text-white/60 hover:text-white underline"
                >
                  Atualizar Histórico
                </button>
              </div>

              {loadingHistory ? (
                <p className="text-xs text-white/40 animate-pulse">Carregando histórico...</p>
              ) : historyLogs.length === 0 ? (
                <div className="p-6 text-center glass rounded-2xl border border-white/10 text-white/40 text-xs">
                  Nenhum registro de alteração encontrado para esta reserva.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="glass p-3.5 rounded-xl border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#FFD600]">{log.action_type}</span>
                        <span className="text-[10px] text-white/40">
                          {log.performed_at ? new Date(log.performed_at).toLocaleString('pt-BR') : 'Data N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-white/80">
                        {log.notes || 'Sem detalhes informados.'}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/5">
                        <span>Executado por: <strong className="text-white/70">{log.performed_by || 'Sistema'}</strong></span>
                        {log.new_status && (
                          <span>Novo Status: <strong className="text-emerald-400">{log.new_status}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Client & Chácara Overview Cards */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Card */}
            <div className="glass p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-white/40">Cliente Responsável</span>
              <h3 className="text-base font-black text-white">{reservation.client?.full_name || 'N/A'}</h3>
              <p className="text-xs text-white/60 flex items-center gap-2">
                <Phone size={14} className="text-[#FFD600]" />
                <span>{reservation.client?.phone || 'Sem telefone'}</span>
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all mt-2"
              >
                <MessageSquare size={14} />
                <span>Conversar no WhatsApp</span>
              </a>
            </div>

            {/* Chácara Card */}
            <div className="glass p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-white/40">Chácara Reservada</span>
              <h3 className="text-base font-black text-white">{reservation.chacara?.name || 'N/A'}</h3>
              <p className="text-xs text-white/60 flex items-center gap-1">
                <MapPin size={14} className="text-[#FFD600]" />
                <span>{reservation.chacara?.city || 'Cidade N/A'}</span>
              </p>
              <p className="text-xs text-white/40 mt-2">
                Capacidade: {reservation.chacara?.capacity_people || 'N/A'} pessoas
              </p>
            </div>
          </div>

          {/* Period & Schedule Details */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFD600]">Horários & Período</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-white/40">Entrada (Check-in)</p>
                <p className="text-sm font-black text-emerald-400 mt-0.5">{reservation.checkin_date}</p>
                <p className="text-white/60">Horário: {reservation.checkin_time?.slice(0, 5) || '14:00'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-white/40">Saída (Check-out)</p>
                <p className="text-sm font-black text-blue-400 mt-0.5">{reservation.checkout_date}</p>
                <p className="text-white/60">Horário: {reservation.checkout_time?.slice(0, 5) || '12:00'}</p>
              </div>
            </div>
          </div>

          {/* Equipe / Funcionário Responsável */}
          <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFD600] flex items-center gap-2">
                <UserCheck size={16} /> Equipe & Funcionários Responsáveis
              </h4>
              <button
                type="button"
                onClick={() => setIsEditingStaff(!isEditingStaff)}
                className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                {isEditingStaff ? 'Cancelar' : 'Alterar / Vincular'}
              </button>
            </div>

            {!isEditingStaff ? (
              <div className="space-y-2">
                {(!reservation.staff_ids || reservation.staff_ids.length === 0) ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                    <span>Nenhum funcionário vinculado a esta reserva (Sem funcionário definido).</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingStaff(true)}
                      className="underline font-bold hover:text-white cursor-pointer ml-2 shrink-0"
                    >
                      Vincular Agora
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {reservation.staff_ids.map((sId, idx) => {
                      const sName = reservation.staff_names?.[idx] || allCrewMembers.find(c => c.id === sId)?.nome || 'Funcionário';
                      return (
                        <div key={sId} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
                          <Users size={14} />
                          <span>{sName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-white/70">
                  Marque os colaboradores responsáveis por executar os serviços desta reserva:
                </p>
                <div className="flex flex-wrap gap-2">
                  {allCrewMembers.map(member => {
                    const isSelected = editingStaffIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditingStaffIds(prev => prev.filter(id => id !== member.id));
                          } else {
                            setEditingStaffIds(prev => [...prev, member.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FFD600] text-[#070A1E] font-bold shadow-md'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10'
                        }`}
                      >
                        <Users size={13} />
                        <span>{member.nome}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingStaff(false)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={savingStaff}
                    onClick={handleSaveStaffAssignment}
                    className="px-4 py-1.5 bg-[#FFD600] hover:bg-[#e6c200] text-[#070A1E] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingStaff ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guests Breakdown */}
          <div className="glass p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold text-white/40">Composição do Grupo</span>
            <div className="flex flex-wrap items-center gap-4 text-xs text-white">
              <span className="font-bold">Adultos: {reservation.guests_adults}</span>
              <span>Crianças: {reservation.guests_children}</span>
              <span>Bebês: {reservation.guests_infants}</span>
              <span>Pets: {reservation.guests_pets}</span>
            </div>
          </div>

          {/* Financial Summary */}
          {reservation.financial_summary && (
            <div className="glass p-5 rounded-2xl border border-[#FFD600]/30 bg-[#FFD600]/5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs uppercase font-black text-[#FFD600] tracking-wider flex items-center gap-1.5">
                  <DollarSign size={16} />
                  Resumo Financeiro & Precificação
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  reservation.financial_summary.payment_status === 'PAGO'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  Status: {reservation.financial_summary.payment_status || 'PENDENTE'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-white/80">
                {reservation.financial_summary.daily_rates_subtotal != null && (
                  <div className="flex justify-between">
                    <span>Subtotal das Diárias ({reservation.financial_summary.nights_count || 'N/A'} noites):</span>
                    <span className="font-bold text-white">R$ {Number(reservation.financial_summary.daily_rates_subtotal).toFixed(2)}</span>
                  </div>
                )}

                {reservation.financial_summary.cleaning_fee != null && (
                  <div className="flex justify-between">
                    <span>Taxa de Limpeza:</span>
                    <span className="font-bold text-white">R$ {Number(reservation.financial_summary.cleaning_fee).toFixed(2)}</span>
                  </div>
                )}

                {reservation.financial_summary.deposit_amount != null && (
                  <div className="flex justify-between text-white/50">
                    <span>Caução Devolutivo:</span>
                    <span>R$ {Number(reservation.financial_summary.deposit_amount).toFixed(2)}</span>
                  </div>
                )}

                {(reservation.financial_summary.extra_guests_total || 0) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Taxa de Hóspedes Excedentes:</span>
                    <span className="font-bold">+ R$ {Number(reservation.financial_summary.extra_guests_total).toFixed(2)}</span>
                  </div>
                )}

                {(reservation.financial_summary.pet_fee || 0) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Taxa de Pets:</span>
                    <span className="font-bold">+ R$ {Number(reservation.financial_summary.pet_fee).toFixed(2)}</span>
                  </div>
                )}

                {(reservation.financial_summary.event_fee || 0) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Taxa de Evento:</span>
                    <span className="font-bold">+ R$ {Number(reservation.financial_summary.event_fee).toFixed(2)}</span>
                  </div>
                )}

                {(reservation.financial_summary.rule_discounts_total || 0) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Descontos de Regras Aplicados:</span>
                    <span className="font-bold">- R$ {Number(reservation.financial_summary.rule_discounts_total).toFixed(2)}</span>
                  </div>
                )}

                {reservation.financial_summary.manual_adjustment_amount && reservation.financial_summary.manual_adjustment_amount !== 0 ? (
                  <div className="flex justify-between text-[#FFD600] font-bold border-t border-white/10 pt-1">
                    <span>Ajuste Manual ({reservation.financial_summary.manual_adjustment_reason || 'Autorizado'}):</span>
                    <span>{reservation.financial_summary.manual_adjustment_amount > 0 ? '+' : ''} R$ {Number(reservation.financial_summary.manual_adjustment_amount).toFixed(2)}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-sm pt-2 border-t border-white/20 font-black text-white">
                  <div className="flex items-center gap-2">
                    <span>Valor Total da Reserva:</span>
                    {isCustomReservationPrice(reservation) && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        ★ Valor Manual
                      </span>
                    )}
                  </div>
                  <span className="text-[#FFD600] text-base">
                    R$ {getEffectiveReservationPrice(reservation).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Special Requests & Notes */}
          {reservation.special_requests && (
            <div className="glass p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-white/40">Solicitações Especiais</span>
              <p className="text-xs text-white/70">{reservation.special_requests}</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDuplicate}
              disabled={loading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Copy size={14} />
              <span>Duplicar</span>
            </button>

            {reservation.status !== 'CANCELADA' && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={loading}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Ban size={14} />
                <span>Cancelar</span>
              </button>
            )}

            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={loading}
              className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={14} />
              <span>Excluir Reserva</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {reservation.status === 'PRE_RESERVA' && (
              <button
                onClick={handleConfirmRes}
                disabled={loading}
                className="px-5 py-2.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-[#FFD600]/20 transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={18} />
                <span>Confirmar Pré-Reserva</span>
              </button>
            )}

            {reservation.status === 'CONFIRMADA' && (
              <button
                onClick={handleCheckin}
                disabled={loading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg"
              >
                <LogIn size={16} />
                <span>Realizar Check-in</span>
              </button>
            )}

            {(reservation.status === 'CHECKIN_REALIZADO' || reservation.status === 'HOSPEDADO') && (
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg"
              >
                <LogOut size={16} />
                <span>Realizar Check-out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      <ConfirmationModal
        isOpen={showCancelModal}
        title="Confirmar cancelamento"
        description={
          <div className="space-y-3">
            <p className="text-white/90">Tem certeza que deseja cancelar esta reserva?</p>
            <p className="text-white/50 text-[11px]">
              Esta ação poderá ser revertida posteriormente reativando a reserva.
            </p>
            <div className="pt-1">
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Motivo do Cancelamento (opcional)</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Desistência do cliente / Imprevisto pessoal..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FFD600] resize-none"
              />
            </div>
          </div>
        }
        confirmText="Confirmar Cancelamento"
        cancelText="Voltar"
        variant="warning"
        isLoading={loading}
        onConfirm={handleConfirmCancel}
        onClose={() => setShowCancelModal(false)}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Confirmar exclusão"
        description={
          <div className="space-y-2">
            <p className="text-white/90">Tem certeza que deseja excluir esta reserva?</p>
            <p className="text-red-400 font-bold text-[11px]">
              Esta ação é permanente e não poderá ser desfeita.
            </p>
          </div>
        }
        confirmText="Excluir Reserva"
        cancelText="Cancelar"
        variant="danger"
        isLoading={loading}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
      />

      {/* TOAST DE NOTIFICAÇÃO */}
      <Toast
        isOpen={showToast}
        message={toastMsg}
        type="success"
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
