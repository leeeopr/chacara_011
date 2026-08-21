'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  TreePine, 
  Sparkles, 
  Clock, 
  X, 
  Edit3, 
  Power, 
  Trash2, 
  ShieldCheck, 
  Unlink, 
  ExternalLink,
  Building2,
  Calendar,
  AlertTriangle,
  History,
  QrCode,
  CreditCard,
  Info
} from 'lucide-react';
import { CrewMember, CrewAuditLog, CrewReservationPaymentSchedule } from '@/lib/chacaraTypes';
import { 
  unlinkMemberFromProperty, 
  toggleCrewMemberStatus, 
  getCrewAuditLogs,
  getCrewReservationPayments 
} from '@/services/crewService';

interface CrewMemberDetailModalProps {
  isOpen: boolean;
  member: CrewMember | null;
  onClose: () => void;
  onEdit: (member: CrewMember) => void;
  onRefresh: () => void;
}

export default function CrewMemberDetailModal({
  isOpen,
  member,
  onClose,
  onEdit,
  onRefresh
}: CrewMemberDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'PERFIL' | 'AUDITORIA'>('PERFIL');
  const [auditLogs, setAuditLogs] = useState<CrewAuditLog[]>([]);
  const [reservationPayments, setReservationPayments] = useState<CrewReservationPaymentSchedule[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      loadLogs();
      loadReservationPayments();
    }
  }, [isOpen, member]);

  const loadReservationPayments = async () => {
    if (!member) return;
    try {
      const payments = await getCrewReservationPayments(member.id);
      setReservationPayments(payments);
    } catch (e) {
      console.error('Erro ao carregar pagamentos agendados por reserva:', e);
      setReservationPayments([]);
    }
  };

  const loadLogs = async () => {
    if (!member) return;
    setLoadingLogs(true);
    try {
      const logs = await getCrewAuditLogs(member.id);
      setAuditLogs(logs);
    } catch (e) {
      console.error('Erro ao carregar logs de auditoria:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!isOpen || !member) return null;

  const formattedWhatsAppUrl = member.whatsapp || member.telefone
    ? `https://wa.me/55${(member.whatsapp || member.telefone || '').replace(/\D/g, '')}`
    : '#';

  const handleUnlinkProperty = async (chacaraId: string, chacaraName: string) => {
    if (!confirm(`Deseja remover o vínculo de "${member.nome}" com a chácara "${chacaraName}"? O cadastro do funcionário e suas funções serão mantidos intactos.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await unlinkMemberFromProperty(member.id, chacaraId);
      onRefresh();
      loadLogs();
    } catch (e: any) {
      alert(e.message || 'Erro ao remover vínculo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setActionLoading(true);
    try {
      await toggleCrewMemberStatus(member.id, !member.ativo);
      onRefresh();
      loadLogs();
    } catch (e: any) {
      alert(e.message || 'Erro ao alterar status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0A0F2C] border border-white/20 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-[#070A1E] border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFD600] text-[#0A0F2C] font-black text-xl flex items-center justify-center shadow-lg uppercase">
              {member.nome.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{member.nome}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  member.ativo ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {member.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5 flex items-center gap-2">
                <span>Cadastrado em {member.created_at ? new Date(member.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(member)}
              className="px-3 py-1.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Edit3 size={14} />
              <span>Editar</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 bg-[#070A1E]/50 border-b border-white/10 flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PERFIL')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'PERFIL' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <User size={15} />
            <span>Perfil e Atribuições</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDITORIA')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'AUDITORIA' ? 'border-[#FFD600] text-[#FFD600]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <History size={15} />
            <span>Histórico de Auditoria</span>
            {auditLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-white font-mono">
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {activeTab === 'PERFIL' ? (
            <>
              {/* Contact Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* WhatsApp */}
                <a
                  href={formattedWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                    member.whatsapp || member.telefone 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20' 
                      : 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <MessageSquare size={18} className="shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold block opacity-70">WhatsApp</span>
                    <span className="font-mono text-xs font-bold truncate">{member.whatsapp || member.telefone || 'Não informado'}</span>
                  </div>
                </a>

                {/* Telefone */}
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-white">
                  <Phone size={18} className="text-[#FFD600] shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-white/50 block">Telefone</span>
                    <span className="font-mono text-xs font-bold truncate">{member.telefone || 'Não informado'}</span>
                  </div>
                </div>

                {/* Email */}
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-white">
                  <Mail size={18} className="text-cyan-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-white/50 block">E-mail</span>
                    <span className="font-mono text-xs font-bold truncate">{member.email || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* SEÇÃO FINANCEIRA & PIX */}
              <div className="p-4 bg-[#0A0F2C] border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2">
                    <QrCode size={16} /> Configuração Financeira de Pagamentos
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {member.payment_frequency === 'WEEKLY' 
                      ? 'SEMANAL' 
                      : member.payment_frequency === 'PER_RESERVATION' 
                      ? 'VINCULADO ÀS RESERVAS' 
                      : 'MENSAL'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                    <span className="text-[10px] text-white/50 uppercase font-bold block">Chave PIX Cadastrada</span>
                    <span className="font-mono font-bold text-white text-sm block truncate">
                      {member.pix_key || <span className="text-white/30 italic font-normal">Nenhuma chave PIX cadastrada</span>}
                    </span>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                    <span className="text-[10px] text-white/50 uppercase font-bold block">Regra de Recorrência</span>
                    <span className="font-bold text-white block">
                      {member.payment_frequency === 'WEEKLY' && 'Pagamento semanal fixo'}
                      {member.payment_frequency === 'MONTHLY' && 'Pagamento mensal fixo'}
                      {(!member.payment_frequency || member.payment_frequency === 'PER_RESERVATION') && '1 dia antes do Check-in da Reserva'}
                    </span>
                  </div>
                </div>

                {member.payment_frequency === 'PER_RESERVATION' && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                        <Calendar size={14} /> Pagamentos Programados por Reserva ({reservationPayments.length})
                      </span>
                      <span className="text-[10px] text-white/40">Regra: Check-in - 1 Dia</span>
                    </div>

                    {reservationPayments.length === 0 ? (
                      <p className="text-xs text-white/40 italic p-2.5 bg-white/5 rounded-xl">
                        Nenhuma reserva futura encontrada para as chácaras vinculadas a este funcionário.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {reservationPayments.map(pay => (
                          <div key={pay.reference_id} className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white block">
                                Reserva #{pay.reservation_code} ({pay.chacara_name})
                              </span>
                              <span className="text-[10px] text-white/50 block">
                                Check-in: <strong className="text-white/80">{pay.checkin_date}</strong>
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                                Vencimento: {pay.payment_due_date}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold uppercase inline-block mt-0.5">
                                1 dia antes do check-in
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Roles Section with Color Badges */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-[#FFD600] tracking-wider flex items-center gap-2">
                  <Sparkles size={15} /> Funções e Especialidades Cadastradas
                </h3>

                {!member.roles || member.roles.length === 0 ? (
                  <p className="text-xs text-white/40 italic p-3 bg-white/5 rounded-xl">
                    Nenhuma função vinculada a este funcionário.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {member.roles.map(role => {
                      const color = role.cor || '#10B981';
                      return (
                        <div
                          key={role.id}
                          className="px-3.5 py-2 rounded-2xl border font-bold text-xs flex items-center gap-2 shadow-sm"
                          style={{
                            backgroundColor: `${color}20`,
                            color: color,
                            borderColor: `${color}50`
                          }}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span>{role.nome}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Linked Properties Section */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[#FFD600] tracking-wider flex items-center gap-2">
                    <TreePine size={15} /> Chácaras Atribuidas ({member.chacaras?.length || 0})
                  </h3>
                </div>

                {!member.chacaras || member.chacaras.length === 0 ? (
                  <p className="text-xs text-white/40 italic p-3 bg-white/5 rounded-xl">
                    Este funcionário não está vinculado a nenhuma chácara atualmente.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {member.chacaras.map(chacara => (
                      <div
                        key={chacara.id}
                        className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3 text-white"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                            <TreePine size={16} />
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-xs block truncate">{chacara.name}</span>
                            <span className="text-[10px] text-white/50">{chacara.city || 'Chácara do Sistema'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnlinkProperty(chacara.id, chacara.name)}
                          disabled={actionLoading}
                          title="Remover vínculo com esta chácara sem excluir o funcionário"
                          className="p-1.5 hover:bg-rose-500/20 text-white/40 hover:text-rose-300 rounded-lg transition-all shrink-0"
                        >
                          <Unlink size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              {member.observacoes && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h3 className="text-xs font-black uppercase text-[#FFD600] tracking-wider">
                    Observações Operacionais
                  </h3>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/80 whitespace-pre-wrap">
                    {member.observacoes}
                  </div>
                </div>
              )}

              {/* Status Toggle Action */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/50">Gerenciamento de status:</span>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    member.ativo 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  <Power size={14} />
                  <span>{member.ativo ? 'Desativar Cadastro' : 'Ativar Cadastro'}</span>
                </button>
              </div>
            </>
          ) : (
            /* Audit Logs Tab */
            <div className="space-y-3">
              <p className="text-xs text-white/50">
                Histórico completo de alterações no cadastro, troca de funções, vínculos com chácaras e status.
              </p>

              {loadingLogs ? (
                <p className="text-xs text-white/50 text-center py-8">Carregando histórico de auditoria...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-white/40 italic text-center py-8 bg-white/5 rounded-2xl">
                  Nenhum registro de auditoria encontrado para este funcionário.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/10 text-[#FFD600] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                        <History size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-xs">{log.operation}</span>
                          <span className="text-[10px] text-white/40 font-mono">
                            {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : ''}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 mt-0.5">{log.details}</p>
                        <span className="text-[10px] text-white/40 mt-1 block">Por: {log.performed_by || 'Sistema'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
