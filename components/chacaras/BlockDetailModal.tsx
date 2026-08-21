'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Ban, 
  Calendar, 
  TreePine, 
  Clock, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Check,
  FileText,
  UserCheck
} from 'lucide-react';
import { ChacaraBlock, Chacara, BlockReason } from '@/lib/chacaraTypes';
import { updateChacaraBlock, deleteChacaraBlock } from '@/services/reservationsService';
import { getChacaras } from '@/services/chacarasService';

interface BlockDetailModalProps {
  block: ChacaraBlock | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const REASON_LABELS: Record<BlockReason, string> = {
  MANUTENCAO: 'Manutenção / Reforma',
  USO_PROPRIETARIO: 'Uso do Proprietário',
  RESERVA_EXTERNA_MANUAL: 'Reserva Externa Manual',
  REFORMA: 'Reforma Estrutural',
  OUTRO: 'Outro Motivo'
};

export default function BlockDetailModal({
  block,
  isOpen,
  onClose,
  onUpdate
}: BlockDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [chacaras, setChacaras] = useState<Chacara[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState<BlockReason>('MANUTENCAO');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [chacaraId, setChacaraId] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadChacaras();
      if (block) {
        setTitle(block.title || '');
        setReason(block.reason || 'MANUTENCAO');
        setStartDate(block.start_date || '');
        setEndDate(block.end_date || '');
        setDescription(block.description || '');
        setChacaraId(block.chacara_id || '');
      }
      setIsEditing(false);
      setIsConfirmingDelete(false);
      setErrorMessage('');
    }
  }, [isOpen, block]);

  const loadChacaras = async () => {
    const list = await getChacaras();
    setChacaras(list);
  };

  if (!isOpen || !block) return null;

  const chacaraObj = chacaras.find(c => c.id === (block.chacara_id || chacaraId)) || block.chacara;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await updateChacaraBlock(block.id, {
        chacara_id: chacaraId,
        title: title.trim(),
        reason: reason,
        start_date: startDate,
        end_date: endDate,
        description: description.trim()
      });

      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar bloqueio.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      await deleteChacaraBlock(block.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao deletar bloqueio.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass rounded-3xl border border-red-500/30 overflow-hidden shadow-2xl text-white">
        {/* Header with Block Stripe Styling */}
        <div className="p-6 bg-gradient-to-r from-red-950/80 via-red-900/60 to-black/80 border-b border-red-500/20 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-400">
                <Ban size={24} />
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-red-500/30 text-red-200 border border-red-500/40 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Bloqueio de Data Ativo
                </span>
                <h2 className="text-lg font-black text-white mt-1">{block.title || 'Bloqueio Administrativo'}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white bg-white/10 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-4">
              {/* Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Chácara</span>
                  <div className="flex items-center gap-2 mt-1 text-xs font-bold text-white">
                    <TreePine size={14} className="text-[#FFD600]" />
                    <span>{chacaraObj?.name || 'Todas as Chácaras / Não especificada'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Motivo</span>
                  <p className="text-xs font-bold text-red-300 mt-1">
                    {REASON_LABELS[block.reason] || block.reason}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-red-300/80 uppercase tracking-wider block">Período de Bloqueio</span>
                <div className="flex items-center justify-between text-xs font-black text-white">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-red-400" />
                    <span>Início: {block.start_date}</span>
                  </div>
                  <span className="text-red-400">➔</span>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-red-400" />
                    <span>Término: {block.end_date}</span>
                  </div>
                </div>
              </div>

              {block.description && (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block flex items-center gap-1.5 mb-1">
                    <FileText size={12} /> Observações / Detalhes
                  </span>
                  <p className="text-xs text-white/80 whitespace-pre-wrap">{block.description}</p>
                </div>
              )}

              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-[11px] text-white/60">
                <span className="flex items-center gap-1">
                  <UserCheck size={13} className="text-white/40" /> Criado por: Admin / Sistema
                </span>
                {block.created_at && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-white/40" /> {new Date(block.created_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {isConfirmingDelete ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>Tem certeza de que deseja remover este bloqueio de data? Esta ação é irreversível.</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      <span>{loading ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={loading}
                    className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>Excluir Bloqueio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={loading}
                    className="px-4 py-2.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Edit3 size={14} />
                    <span>Editar Bloqueio</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Edit Form */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Título do Bloqueio</label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD600] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Chácara</label>
                  <select
                    disabled={loading}
                    value={chacaraId}
                    onChange={(e) => setChacaraId(e.target.value)}
                    className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    {chacaras.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Motivo</label>
                  <select
                    disabled={loading}
                    value={reason}
                    onChange={(e: any) => setReason(e.target.value)}
                    className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="MANUTENCAO">Manutenção / Reforma</option>
                    <option value="USO_PROPRIETARIO">Uso do Proprietário</option>
                    <option value="RESERVA_EXTERNA_MANUAL">Reserva Externa Manual</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Data Início</label>
                  <input
                    type="date"
                    required
                    disabled={loading}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Data Fim</label>
                  <input
                    type="date"
                    required
                    disabled={loading}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Observações</label>
                <textarea
                  rows={3}
                  disabled={loading}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre o motivo do bloqueio..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
