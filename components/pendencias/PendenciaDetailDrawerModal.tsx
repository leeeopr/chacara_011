'use client';

import React, { useState, useEffect } from 'react';
import {
  X, CheckSquare, Clock, User, Calendar, AlertCircle, MessageSquare,
  Send, RotateCcw, CheckCircle2, XCircle, Plus, Trash2, Tag, ChevronRight,
  ArrowRight, CornerDownRight, History, ShieldAlert
} from 'lucide-react';
import {
  Pendencia,
  PendenciaStatus,
  UserProfileOption,
  PendenciaSubitem,
  PendenciaHistorico
} from '@/lib/pendenciasTypes';
import {
  toggleSubitem,
  addSubitem,
  tramitarPendencia,
  concluirPendencia,
  cancelarPendencia,
  addComentario,
  getUserProfilesForAutocomplete,
  getPendenciaById
} from '@/services/pendenciasService';
import { useAuth } from '@/contexts/AuthContext';
import MiroBlockEditor from './MiroBlockEditor';


interface PendenciaDetailDrawerModalProps {
  pendenciaId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function PendenciaDetailDrawerModal({
  pendenciaId,
  isOpen,
  onClose,
  onUpdated
}: PendenciaDetailDrawerModalProps) {
  const { user, profile } = useAuth();

  const [pendencia, setPendencia] = useState<Pendencia | null>(null);
  const [loading, setLoading] = useState(false);

  // New subitem state
  const [newSubitemText, setNewSubitemText] = useState('');

  // Comment state
  const [comentarioText, setComentarioText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Devolution / Tramite Form Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<'tramitar' | 'devolver'>('devolver');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientOptions, setRecipientOptions] = useState<UserProfileOption[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfileOption | null>(null);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [transferObs, setTransferObs] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Conclude / Cancel Modal state
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [concludeObs, setConcludeObs] = useState('');
  const [submittingConclude, setSubmittingConclude] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelObs, setCancelObs] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelErrorMsg, setCancelErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const currentUser = {
    id: user?.id || 'usr-atual',
    email: user?.email || profile?.email || 'admin@chacaras.com.br',
    full_name: profile?.full_name || 'Usuário Atual'
  };

  useEffect(() => {
    if (isOpen && pendenciaId) {
      fetchData();
    }
  }, [isOpen, pendenciaId]);

  const fetchData = async () => {
    if (!pendenciaId) return;
    setLoading(true);
    const data = await getPendenciaById(pendenciaId);
    setPendencia(data);
    setLoading(false);
  };

  // Search autocomplete profiles when transfer modal is open
  useEffect(() => {
    if (isTransferModalOpen) {
      getUserProfilesForAutocomplete(recipientQuery).then(res => {
        setRecipientOptions(res);
        // Default to creator if returning/devolving and creator is available
        if (transferMode === 'devolver' && pendencia && !selectedRecipient) {
          const creatorOpt = res.find(r => r.id === pendencia.criado_por) || {
            id: pendencia.criado_por || 'usr-creator',
            email: pendencia.criado_por_email || '',
            full_name: pendencia.criado_por_nome || 'Criador da Pendência'
          };
          setSelectedRecipient(creatorOpt);
        }
      });
    }
  }, [recipientQuery, isTransferModalOpen, transferMode]);

  const handleToggleSubitem = async (sub: PendenciaSubitem) => {
    if (!pendencia) return;
    const newStatus = !sub.concluido;
    await toggleSubitem(sub.id, pendencia.id, newStatus, currentUser);
    await fetchData();
    onUpdated();
  };

  const handleAddSubitem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendencia || !newSubitemText.trim()) return;
    await addSubitem(pendencia.id, newSubitemText, currentUser);
    setNewSubitemText('');
    await fetchData();
    onUpdated();
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendencia || !comentarioText.trim()) return;
    setSendingComment(true);
    await addComentario(pendencia.id, comentarioText, currentUser);
    setComentarioText('');
    setSendingComment(false);
    await fetchData();
    onUpdated();
  };

  const handleOpenTransferModal = (mode: 'tramitar' | 'devolver') => {
    setTransferMode(mode);
    setTransferObs('');
    setSelectedRecipient(null);
    setIsTransferModalOpen(true);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendencia || !selectedRecipient) return;

    setSubmittingTransfer(true);
    const novoStatus: PendenciaStatus = transferMode === 'devolver' ? 'Devolvida' : 'Em andamento';

    await tramitarPendencia(
      pendencia.id,
      selectedRecipient,
      transferObs,
      novoStatus,
      currentUser
    );

    setSubmittingTransfer(false);
    setIsTransferModalOpen(false);
    await fetchData();
    onUpdated();
  };

  const handleConfirmConclude = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendencia) return;
    setSubmittingConclude(true);
    await concluirPendencia(pendencia.id, concludeObs, currentUser);
    setSubmittingConclude(false);
    setIsConcludeModalOpen(false);
    await fetchData();
    onUpdated();
  };

  const handleConfirmCancel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendencia) return;

    console.log('[UI Diagnostic] Clique em Confirmar Cancelamento recebido.', {
      pendenciaId: pendencia.id,
      titulo: pendencia.titulo,
      usuarioAutenticado: currentUser,
      observacoes: cancelObs
    });

    setSubmittingCancel(true);
    setCancelErrorMsg(null);

    try {
      const res = await cancelarPendencia(pendencia.id, cancelObs || 'Cancelada pelo usuário', currentUser);
      console.log('[UI Diagnostic] Resultado retornado por cancelarPendencia:', res);

      if (res.success) {
        setSubmittingCancel(false);
        setIsCancelModalOpen(false);
        setActionSuccessMsg('Pendência cancelada com sucesso!');
        setTimeout(() => setActionSuccessMsg(null), 4000);
        await fetchData();
        onUpdated();
      } else {
        setSubmittingCancel(false);
        setCancelErrorMsg(res.error || 'Falha ao cancelar pendência no banco de dados.');
      }
    } catch (err: any) {
      console.error('[UI Diagnostic] Exceção no cancelamento:', err);
      setSubmittingCancel(false);
      setCancelErrorMsg('Ocorreu um erro ao processar a requisição de cancelamento.');
    }
  };

  if (!isOpen) return null;

  const subitensList = pendencia?.subitens || [];
  const totalSub = subitensList.length;
  const concluidosSub = subitensList.filter(s => s.concluido).length;
  const percentSub = totalSub > 0 ? Math.round((concluidosSub / totalSub) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0A0F2C] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center font-black text-[#0A0F2C] shrink-0 shadow-lg"
              style={{
                backgroundColor: pendencia?.grupo?.cor || '#3B82F6',
                borderColor: `${pendencia?.grupo?.cor || '#3B82F6'}80`
              }}
            >
              <CheckSquare size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow"
                  style={{ backgroundColor: pendencia?.grupo?.cor || '#3B82F6' }}
                >
                  {pendencia?.grupo?.nome || 'Geral'}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    pendencia?.status === 'Concluída'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : pendencia?.status === 'Devolvida'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : pendencia?.status === 'Cancelada'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {pendencia?.status}
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    pendencia?.prioridade === 'Urgente'
                      ? 'bg-red-500 text-white'
                      : pendencia?.prioridade === 'Alta'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-white/10 text-white/80'
                  }`}
                >
                  {pendencia?.prioridade}
                </span>
              </div>

              <h2 className="text-base font-black text-white truncate mt-1">
                {pendencia?.titulo}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        {loading || !pendencia ? (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-white/40">
            Carregando detalhes da pendência...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Responsáveis & Metadata Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Criado Por</p>
                <p className="font-black text-white mt-0.5">{pendencia.criado_por_nome || 'Sistema'}</p>
                <p className="text-[10px] text-white/50">{pendencia.criado_por_email}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#FFD600] uppercase tracking-wider">Responsável Atual</p>
                <p className="font-black text-white mt-0.5">{pendencia.responsavel_atual_nome || 'Não definido'}</p>
                <p className="text-[10px] text-white/50">{pendencia.responsavel_atual_email}</p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-white/10 flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5 font-bold">
                  <Calendar size={14} className="text-[#FFD600]" />
                  Prazo: {pendencia.prazo ? new Date(pendencia.prazo).toLocaleDateString('pt-BR') : 'Sem data'} às {pendencia.prazo_hora || '18:00'}
                </span>
                <span className="text-[11px] text-white/40">
                  Criado em: {new Date(pendencia.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Editor de Conteúdo da Pendência Estilo Miro (Blocos: Texto, Tabela, Checklist) */}
            <div className="pt-2">
              <MiroBlockEditor
                taskId={pendencia.id}
                taskTitle={pendencia.titulo}
                onProgressUpdate={(percent, complete) => {
                  // Optional callback if needed
                }}
              />
            </div>

            {/* Action Banners or Quick Actions Panel */}
            {pendencia.status === 'Cancelada' ? (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-300">
                <XCircle size={22} className="shrink-0 text-red-400" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-red-400">Pendência Cancelada</p>
                  <p className="text-xs text-white/70">Esta demanda foi cancelada e seu ciclo operacional foi encerrado.</p>
                </div>
              </div>
            ) : pendencia.status === 'Concluída' ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
                <CheckCircle2 size={22} className="shrink-0 text-emerald-400" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Pendência Concluída</p>
                  <p className="text-xs text-white/70">Esta demanda foi concluída e arquivada no histórico.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#FFD600]/10 border border-[#FFD600]/20 space-y-3">
                <span className="text-xs font-black uppercase text-[#FFD600] tracking-wider block">
                  Ações de Trâmite, Conclusão e Cancelamento
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenTransferModal('devolver')}
                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <RotateCcw size={14} />
                    Devolver
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenTransferModal('tramitar')}
                    className="py-2.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Send size={14} />
                    Encaminhar
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConcludeModalOpen(true)}
                    className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <CheckCircle2 size={14} />
                    Concluir
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCancelObs('');
                      setCancelErrorMsg(null);
                      setIsCancelModalOpen(true);
                    }}
                    className="py-2.5 px-3 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-300 border border-white/10 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <XCircle size={14} />
                    Cancelar
                  </button>
                </div>
              </div>
            )}


            {/* Add Comment / Note */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-xs font-black uppercase text-white/70 tracking-wider block">
                Adicionar Observação / Comentário
              </span>
              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <input
                  type="text"
                  value={comentarioText}
                  onChange={(e) => setComentarioText(e.target.value)}
                  placeholder="Digite uma observação técnica ou justificativa..."
                  className="flex-1 px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#FFD600] placeholder-white/25"
                />
                <button
                  type="submit"
                  disabled={sendingComment || !comentarioText.trim()}
                  className="px-4 py-2.5 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-xs rounded-xl transition-all disabled:opacity-40 flex items-center gap-1"
                >
                  <Send size={14} />
                  Enviar
                </button>
              </form>
            </div>

            {/* Timeline / Movimentações preserved without loss */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#FFD600] tracking-wider flex items-center gap-2">
                  <History size={16} />
                  Histórico de Movimentações ({pendencia.historico?.length || 0})
                </span>
                <span className="text-[10px] text-white/40">Preservado integralmente</span>
              </div>

              <div className="relative pl-4 border-l-2 border-white/10 space-y-4">
                {(pendencia.historico || []).map((h) => (
                  <div key={h.id} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#FFD600] border-2 border-[#0A0F2C]" />

                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span className="font-bold text-white">
                          {h.de_usuario_nome || 'Usuário'}
                          {h.para_usuario_nome && ` ➔ ${h.para_usuario_nome}`}
                        </span>
                        <span>{new Date(h.created_at).toLocaleDateString('pt-BR')} às {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          h.tipo_acao === 'DEVOLUCAO'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : h.tipo_acao === 'CONCLUSAO'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : h.tipo_acao === 'CRIACAO'
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'bg-white/10 text-white/80'
                        }`}>
                          {h.tipo_acao}
                        </span>

                        {h.status_novo && (
                          <span className="text-[10px] text-white/50">
                            Status: {h.status_anterior ? `${h.status_anterior} → ` : ''}{h.status_novo}
                          </span>
                        )}
                      </div>

                      {h.observacoes && (
                        <p className="text-white/80 pt-1 leading-relaxed text-[11px] italic border-t border-white/5 mt-1">
                          "{h.observacoes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* SUB-MODAL: Devolution / Tramite Form */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0A0F2C] border border-white/20 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <RotateCcw size={18} className="text-[#FFD600]" />
                {transferMode === 'devolver' ? 'Devolver Pendência' : 'Encaminhar Pendência'}
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">
                  Selecionar Destinatário *
                </label>
                {selectedRecipient ? (
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-white">{selectedRecipient.full_name}</p>
                      <p className="text-[10px] text-white/60">{selectedRecipient.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRecipient(null)}
                      className="text-[10px] font-bold text-[#FFD600]"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientQuery}
                      onChange={(e) => setRecipientQuery(e.target.value)}
                      placeholder="Buscar por nome ou e-mail..."
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-[#FFD600]"
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#0F143C] border border-white/20 rounded-xl max-h-40 overflow-y-auto z-50">
                      {recipientOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedRecipient(opt)}
                          className="w-full p-2.5 text-left hover:bg-white/10 text-xs text-white border-b border-white/5"
                        >
                          <p className="font-bold">{opt.full_name}</p>
                          <p className="text-[10px] text-white/50">{opt.email}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">
                  Observações / Motivo da Devolução *
                </label>
                <textarea
                  rows={3}
                  required
                  value={transferObs}
                  onChange={(e) => setTransferObs(e.target.value)}
                  placeholder="Ex: Consegui comprar o extintor, porém o fornecedor da piscina precisa do orçamento do anfitrião..."
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-[#FFD600] placeholder-white/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer || !selectedRecipient}
                  className="px-5 py-2 bg-[#FFD600] text-[#0A0F2C] font-black text-xs rounded-xl transition-all disabled:opacity-50"
                >
                  {submittingTransfer ? 'Confirmando...' : 'Confirmar e Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Conclude Confirmation */}
      {isConcludeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0A0F2C] border border-white/20 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={18} />
                Concluir Pendência
              </h3>
              <button
                onClick={() => setIsConcludeModalOpen(false)}
                className="p-1 text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmConclude} className="space-y-4">
              <p className="text-xs text-white/80">
                Ao concluir, todos os subitens serão sinalizados como resolvidos e uma notificação de encerramento será enviada ao criador.
              </p>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">
                  Observações Finais de Encerramento (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={concludeObs}
                  onChange={(e) => setConcludeObs(e.target.value)}
                  placeholder="Ex: Todos os itens resolvidos e validados no local."
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-[#FFD600] placeholder-white/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConcludeModalOpen(false)}
                  className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingConclude}
                  className="px-5 py-2 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl transition-all"
                >
                  {submittingConclude ? 'Encerrando...' : 'Concluir Pendência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Cancel Confirmation */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0A0F2C] border border-white/20 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-red-400 flex items-center gap-2">
                <XCircle size={18} />
                Cancelar Pendência
              </h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <p className="text-xs text-white/80">
                Tem certeza de que deseja cancelar esta pendência? O status será alterado para <strong className="text-red-400">Cancelada</strong> e o histórico registrará este encerramento.
              </p>

              {cancelErrorMsg && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{cancelErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">
                  Motivo / Observações do Cancelamento (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={cancelObs}
                  onChange={(e) => setCancelObs(e.target.value)}
                  placeholder="Ex: Tarefa duplicada ou não é mais necessária..."
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-[#FFD600] placeholder-white/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="px-5 py-2 bg-red-500 hover:bg-red-400 text-white font-black text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {submittingCancel ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
