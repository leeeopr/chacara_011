'use client';

import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Building2, 
  Tag, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Repeat, 
  FileText,
  Sparkles,
  ExternalLink,
  Info,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  AccountPayable, 
  getAccountEffectiveValue, 
  hasAccountRealValue, 
  formatBRL 
} from '@/lib/accountsPayableTypes';
import { deleteAccountPayable } from '@/services/accountsPayableService';
import ConfirmActionModal from '../ConfirmActionModal';

interface AccountPayableDetailModalProps {
  isOpen: boolean;
  account: AccountPayable | null;
  onClose: () => void;
  onPay: (account: AccountPayable) => void;
  onEdit: (account: AccountPayable) => void;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export default function AccountPayableDetailModal({
  isOpen,
  account,
  onClose,
  onPay,
  onEdit,
  onDelete,
  onUpdate
}: AccountPayableDetailModalProps) {
  const [copiedPix, setCopiedPix] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  if (!isOpen || !account) return null;

  const isPaid = account.status === 'PAGA';
  const isOverdue = account.status === 'VENCIDA';
  const isPending = account.status === 'PENDENTE';

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteAccountPayable(account.id);
      setIsConfirmDeleteOpen(false);
      onDelete?.();
      onUpdate?.();
      onClose();
    } catch (err) {
      console.error('Erro ao excluir conta a pagar:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const valorPrevisto = Number(account.valor_previsto || 0);
  const valorReal = account.valor_real !== undefined && account.valor_real !== null 
    ? Number(account.valor_real) 
    : (account.valor_pago != null ? Number(account.valor_pago) : null);
  const valorConsiderado = getAccountEffectiveValue(account);
  const temReal = hasAccountRealValue(account);

  const diferenca = temReal && valorReal !== null ? (valorReal - valorPrevisto) : 0;
  const percDiferenca = valorPrevisto > 0 ? (diferenca / valorPrevisto) * 100 : 0;

  const handleCopyPix = () => {
    if (!account.prestador_pix) return;
    navigator.clipboard.writeText(account.prestador_pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A0F2C] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-lg">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {account.categoria || 'CONTA A PAGAR'}
                </span>
                {account.tipo === 'RECORRENTE' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <Repeat size={10} />
                    <span>Recorrente</span>
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isPaid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : isOverdue
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isPaid && <CheckCircle2 size={10} />}
                  {isOverdue && <AlertTriangle size={10} />}
                  {isPending && <Clock size={10} />}
                  <span>{account.status}</span>
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">{account.descricao}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Main Financial Values Card: Previsto × Real */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                Detalhamento Financeiro
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                temReal 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {temReal ? 'Calculado pelo Valor Real' : 'Calculado pelo Valor Previsto'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Valor Previsto */}
              <div className="p-3 bg-black/30 border border-white/5 rounded-xl">
                <span className="text-[10px] font-semibold text-white/40 block">Valor Previsto</span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  {formatBRL(valorPrevisto)}
                </span>
                <span className="text-[10px] text-white/40 block mt-0.5">Base orçada</span>
              </div>

              {/* Valor Real */}
              <div className="p-3 bg-black/30 border border-emerald-500/20 rounded-xl">
                <span className="text-[10px] font-semibold text-emerald-400/80 block">Valor Real / Pago</span>
                <span className={`text-base sm:text-lg font-black font-mono ${temReal ? 'text-emerald-400' : 'text-white/30'}`}>
                  {temReal ? formatBRL(valorReal) : 'Não informado'}
                </span>
                <span className="text-[10px] text-emerald-400/60 block mt-0.5">
                  {temReal ? 'Prioritário' : 'Vazio'}
                </span>
              </div>

              {/* Valor Considerado */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold text-purple-300 block">Considerado</span>
                <span className="text-base sm:text-lg font-black text-[#FFD600] font-mono">
                  {formatBRL(valorConsiderado)}
                </span>
                <span className="text-[10px] text-purple-300/70 block mt-0.5">
                  Saldo & Relatórios
                </span>
              </div>
            </div>

            {/* Variação (se houver real e for diferente do previsto) */}
            {temReal && Math.abs(diferenca) > 0.001 && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-1">
                  {diferenca > 0 ? <TrendingUp size={13} className="text-rose-400" /> : <TrendingDown size={13} className="text-emerald-400" />}
                  Variação (Real vs Previsto):
                </span>
                <span className={`font-bold font-mono ${diferenca > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {diferenca > 0 ? '+' : ''}{formatBRL(diferenca)} ({percDiferenca > 0 ? '+' : ''}{percDiferenca.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
              <span className="text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Building2 size={13} className="text-emerald-400" />
                <span>Chácara / Local</span>
              </span>
              <p className="text-white font-bold">{account.chacara_nome || 'Geral / Todas'}</p>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
              <span className="text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Calendar size={13} className="text-[#FFD600]" />
                <span>Data de Vencimento</span>
              </span>
              <p className="text-white font-mono font-bold">{account.data_vencimento}</p>
            </div>

            {account.prestador_nome && (
              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <UserCheck size={13} className="text-blue-400" />
                  <span>Prestador de Serviço Vinculado</span>
                </span>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div>
                    <p className="text-white font-bold">{account.prestador_nome}</p>
                    {account.prestador_role && (
                      <span className="text-[11px] text-white/50">{account.prestador_role}</span>
                    )}
                  </div>

                  {account.prestador_pix && (
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Copiar Chave PIX"
                    >
                      {copiedPix ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedPix ? 'PIX Copiado!' : 'Copiar PIX'}</span>
                    </button>
                  )}
                </div>
                {account.prestador_pix && (
                  <p className="text-[11px] font-mono text-purple-300/70 pt-1">
                    Chave: {account.prestador_pix}
                  </p>
                )}
              </div>
            )}

            {isPaid && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <CheckCircle2 size={13} />
                  <span>Informações de Liquidação</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-white/80">
                  <div>
                    <span className="text-white/40 block">Data de Pagamento:</span>
                    <span className="font-mono font-bold text-white">{account.data_pagamento || '-'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Responsável:</span>
                    <span className="font-bold text-white">{account.responsavel_pagamento || 'Administrador'}</span>
                  </div>
                </div>
              </div>
            )}

            {(account.origem_id || account.origem_tipo) && (
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-sky-300 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Sparkles size={13} />
                  <span>Origem da Conta ({account.origem_tipo || 'Operacional'})</span>
                </span>
                <p className="text-xs text-white/70">
                  {account.origem_titulo ? `${account.origem_titulo} - ` : ''}
                  {account.origem_id ? `Ref: ${account.origem_id.slice(0, 8)}` : 'Gerada automaticamente por regras operacionais'}
                  {account.origem_data_servico ? ` (${account.origem_data_servico})` : ''}
                </p>
              </div>
            )}

            {account.observacao && (
              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <FileText size={13} className="text-amber-400" />
                  <span>Observações & Instruções</span>
                </span>
                <p className="text-xs text-white/80 whitespace-pre-wrap">{account.observacao}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between gap-3 bg-white/[0.02] flex-wrap">
          <button
            type="button"
            onClick={() => setIsConfirmDeleteOpen(true)}
            disabled={isDeleting}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Excluir</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(account)}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Pencil size={15} />
              <span>Editar</span>
            </button>

            {!isPaid && (
              <button
                type="button"
                onClick={() => onPay(account)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Marcar como Paga</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={isConfirmDeleteOpen}
        title="Excluir Lançamento"
        message={`Tem certeza que deseja excluir permanentemente "${account.descricao}"? Esta ação removerá a obrigação financeira.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
}
