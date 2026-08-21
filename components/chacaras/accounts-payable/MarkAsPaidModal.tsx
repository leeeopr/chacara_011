'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  User, 
  Copy, 
  Check, 
  Sparkles, 
  AlertCircle,
  Repeat,
  FileText
} from 'lucide-react';
import { AccountPayable, MarkAsPaidInput, getAccountEffectiveValue, formatBRL } from '@/lib/accountsPayableTypes';
import { markAccountPayableAsPaid } from '@/services/accountsPayableService';

interface MarkAsPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: AccountPayable | null;
}

export default function MarkAsPaidModal({
  isOpen,
  onClose,
  onSuccess,
  account
}: MarkAsPaidModalProps) {
  const [valorPago, setValorPago] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [responsavel, setResponsavel] = useState('Administrador');
  const [observacao, setObservacao] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && account) {
      const today = new Date().toISOString().split('T')[0];
      const effectiveVal = account.valor_real !== undefined && account.valor_real !== null 
        ? account.valor_real 
        : (account.valor_pago != null ? account.valor_pago : account.valor_previsto);
      setValorPago(String(effectiveVal || 0));
      setDataPagamento(today);
      setResponsavel('Administrador');
      setObservacao(account.observacao || '');
      setCopiedPix(false);
      setError(null);
    }
  }, [isOpen, account]);

  const handleCopyPix = () => {
    if (!account?.prestador_pix) return;
    navigator.clipboard.writeText(account.prestador_pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setError(null);

    const valorNum = parseFloat(valorPago.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Informe um valor pago válido.');
      return;
    }

    if (!dataPagamento) {
      setError('Informe a data de liquidação do pagamento.');
      return;
    }

    setLoading(true);

    try {
      const input: MarkAsPaidInput = {
        valor_pago: valorNum,
        data_pagamento: dataPagamento,
        responsavel_pagamento: responsavel.trim() || 'Administrador',
        observacao: observacao.trim() || undefined
      };

      await markAccountPayableAsPaid(account.id, input);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[MarkAsPaidModal] Erro ao liquidar conta:', err);
      setError(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0A0F2C] border border-emerald-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Dar Baixa / Registrar Pagamento
              </h2>
              <p className="text-xs text-white/50">
                Confirmar quitação desta obrigação financeira
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Summary Banner */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-white/50 uppercase font-semibold">Conta</p>
                <h3 className="text-base font-bold text-white">{account.descricao}</h3>
                <p className="text-xs text-white/60">
                  {account.chacara_nome || '🏢 Geral / Compartilhada'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50 uppercase font-semibold">Previsto</p>
                <p className="text-base font-black text-[#FFD600] font-mono">
                  R$ {Number(account.valor_previsto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* PIX Key Banner if available */}
            {account.prestador_pix && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between bg-black/30 p-2.5 rounded-lg">
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] text-white/50 uppercase font-semibold">
                    Favorecido: {account.prestador_nome || 'Prestador'}
                  </p>
                  <p className="text-xs text-emerald-400 font-mono font-bold truncate">
                    PIX: {account.prestador_pix}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Valor Efetivamente Pago & Data de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <DollarSign size={13} className="text-emerald-400" />
                Valor Efetivo Pago (R$) <span className="text-[#FFD600]">*</span>
              </label>
              <input
                type="text"
                required
                value={valorPago}
                onChange={e => setValorPago(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm font-bold font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-400" />
                Data do Pagamento <span className="text-[#FFD600]">*</span>
              </label>
              <input
                type="date"
                required
                value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-400 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Responsável pelo Pagamento */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
              <User size={13} className="text-emerald-400" />
              Responsável / Autorizador
            </label>
            <input
              type="text"
              value={responsavel}
              onChange={e => setResponsavel(e.target.value)}
              placeholder="Ex: Dona Chácara / Secretária"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Observações / Anotações */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
              <FileText size={13} className="text-emerald-400" />
              Comprovante / Observações do Pagamento
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Número de autenticação bancária, link do comprovante ou notas..."
              className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Recurrence automatic instance notice */}
          {account.tipo === 'RECORRENTE' && (
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-3">
              <Repeat size={16} className="text-purple-400 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-200">
                <strong>Conta Recorrente ({account.recorrencia_frequencia || 'Mensal'}):</strong> Ao confirmar este pagamento, o sistema gerará automaticamente a fatura do próximo ciclo para que seu fluxo financeiro permaneça sempre em dia.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar Pagamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
