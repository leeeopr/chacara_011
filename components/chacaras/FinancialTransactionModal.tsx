'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, TrendingDown, RefreshCw, Calendar, FileText, AlertTriangle, Check, X, ShieldCheck } from 'lucide-react';
import { Reservation, PaymentMethod } from '@/lib/chacaraTypes';
import { getReservations } from '@/services/reservationsService';
import { addReservationPayment, addReservationExpense, addReservationRefund } from '@/services/financialService';

interface FinancialTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'RECEBIMENTO' | 'DESPESA' | 'REEMBOLSO';
}

export default function FinancialTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'RECEBIMENTO'
}: FinancialTransactionModalProps) {
  const [type, setType] = useState<'RECEBIMENTO' | 'DESPESA' | 'REEMBOLSO'>(defaultType);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      loadReservations();
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setAmount('');
      setNotes('');
      setErrorMessage('');
    }
  }, [isOpen, defaultType]);

  const loadReservations = async () => {
    const list = await getReservations();
    const active = list.filter(r => !r.is_deleted && r.status !== 'CANCELADA');
    setReservations(active);
    if (active.length > 0) {
      setSelectedReservationId(active[0].id);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Informe um valor numérico válido maior que zero.');
      return;
    }

    if (!selectedReservationId) {
      setErrorMessage('Selecione uma reserva para vincular este lançamento financeiro.');
      return;
    }

    const reservation = reservations.find(r => r.id === selectedReservationId);
    if (!reservation) {
      setErrorMessage('Reserva selecionada não foi encontrada.');
      return;
    }

    setLoading(true);

    try {
      if (type === 'RECEBIMENTO') {
        await addReservationPayment(reservation, {
          amount: numericAmount,
          payment_method: paymentMethod,
          payment_date: date,
          notes: notes.trim(),
          performed_by: 'Administrador'
        });
      } else if (type === 'DESPESA') {
        await addReservationExpense(reservation, {
          description: notes.trim() || 'Despesa Extra / Lançamento',
          amount: numericAmount,
          expense_date: date,
          performed_by: 'Administrador'
        });
      } else if (type === 'REEMBOLSO') {
        await addReservationRefund(reservation, {
          amount: numericAmount,
          reason: notes.trim() || 'Reembolso Solicitado',
          refund_date: date,
          payment_method: paymentMethod,
          performed_by: 'Administrador'
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[FinancialTransactionModal] Erro ao registrar lançamento:', err);
      setErrorMessage(err.message || 'Erro ao registrar movimentação financeira.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0A0F2C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              type === 'RECEBIMENTO'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : type === 'DESPESA'
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
            }`}>
              {type === 'RECEBIMENTO' && <CreditCard size={20} />}
              {type === 'DESPESA' && <TrendingDown size={20} />}
              {type === 'REEMBOLSO' && <RefreshCw size={20} />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {type === 'RECEBIMENTO' && 'Novo Recebimento'}
                {type === 'DESPESA' && 'Nova Despesa Extra'}
                {type === 'REEMBOLSO' && 'Novo Reembolso'}
              </h3>
              <p className="text-xs text-white/50">Lançamento financeiro direto na reserva</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type Switcher */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setType('RECEBIMENTO')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                type === 'RECEBIMENTO'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Recebimento
            </button>
            <button
              type="button"
              onClick={() => setType('DESPESA')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                type === 'DESPESA'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Despesa Extra
            </button>
            <button
              type="button"
              onClick={() => setType('REEMBOLSO')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                type === 'REEMBOLSO'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Reembolso
            </button>
          </div>

          {/* Reservation Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70">
              Reserva Vinculada
            </label>
            <select
              value={selectedReservationId}
              onChange={(e) => setSelectedReservationId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFD600]"
              required
            >
              <option value="" disabled className="bg-[#0A0F2C]">Selecione a reserva...</option>
              {reservations.map(r => (
                <option key={r.id} value={r.id} className="bg-[#0A0F2C]">
                  [{r.code}] {r.client?.full_name || 'Hóspede'} — {r.chacara?.name || 'Chácara'} ({r.checkin_date})
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                <DollarSign size={14} className="text-[#FFD600]" />
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-[#FFD600]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#FFD600]" />
                Data do Lançamento
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFD600]"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          {type !== 'DESPESA' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/70">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFD600]"
              >
                <option value="PIX" className="bg-[#0A0F2C]">⚡ PIX</option>
                <option value="DINHEIRO" className="bg-[#0A0F2C]">💵 Dinheiro em Espécie</option>
                <option value="CARTAO_CREDITO" className="bg-[#0A0F2C]">💳 Cartão de Crédito</option>
                <option value="CARTAO_DEBITO" className="bg-[#0A0F2C]">💳 Cartão de Débito</option>
                <option value="TRANSFERENCIA" className="bg-[#0A0F2C]">🏦 Transferência / TED</option>
                <option value="OUTRO" className="bg-[#0A0F2C]">📌 Outro</option>
              </select>
            </div>
          )}

          {/* Notes / Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70">
              {type === 'DESPESA' ? 'Descrição da Despesa' : type === 'REEMBOLSO' ? 'Motivo do Reembolso' : 'Observação do Recebimento'}
            </label>
            <textarea
              rows={2}
              placeholder={
                type === 'DESPESA'
                  ? 'Ex: Taxa de limpeza extra ou quebra de objeto'
                  : type === 'REEMBOLSO'
                  ? 'Ex: Devolução de adiantamento devido a cancelamento'
                  : 'Ex: Pagamento da 1ª parcela via PIX'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD600] resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 text-white shadow-lg transition-all active:scale-[0.98] ${
                type === 'RECEBIMENTO'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  : type === 'DESPESA'
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                  : 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'
              }`}
            >
              {loading ? (
                <span>Gravando...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Confirmar Lançamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
