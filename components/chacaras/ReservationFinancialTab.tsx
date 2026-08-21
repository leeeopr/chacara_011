'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Receipt, 
  FileText, 
  History, 
  RotateCcw, 
  Edit3, 
  Check, 
  X, 
  ArrowDownRight, 
  ArrowUpRight,
  HelpCircle,
  Percent,
  Tag,
  ShieldAlert,
  UploadCloud,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { 
  Reservation, 
  ReservationFullFinancialSummary, 
  PaymentMethod, 
  DepositStatus,
  getEffectiveReservationPrice,
  isCustomReservationPrice 
} from '@/lib/chacaraTypes';
import { 
  getReservationFinancialSummary, 
  addReservationPayment, 
  updateReservationDeposit, 
  addReservationExpense, 
  addReservationRefund, 
  updateChargeDiscountOrAdjustment 
} from '@/services/financialService';
import { updateReservationCustomPrice } from '@/services/reservationsService';
import { getPaymentDocumentsForReservation } from '@/services/fiscalService';
import { PaymentDocument, FiscalReservationItem } from '@/lib/fiscalTypes';
import UploadPaymentDocumentModal from '../fiscal/UploadPaymentDocumentModal';

interface ReservationFinancialTabProps {
  reservation: Reservation;
  onUpdate: () => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro em Espécie',
  CARTAO_DEBITO: 'Cartão de Débito',
  CARTAO_CREDITO: 'Cartão de Crédito',
  TRANSFERENCIA: 'Transferência Bancária (TED/DOC)',
  BOLETO: 'Boleto Bancário',
  OUTRO: 'Outro Método'
};

const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  PREVISTO: 'Previsto / Pendente',
  RECEBIDO: 'Recebido e Retido',
  DEVOLVIDO: 'Devolvido ao Cliente',
  RETIDO_PARCIAL: 'Retido Parcialmente',
  RETIDO_TOTAL: 'Retido Totalmente'
};

export default function ReservationFinancialTab({ reservation, onUpdate }: ReservationFinancialTabProps) {
  const [summary, setSummary] = useState<ReservationFullFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal overlays inside financial tab
  const [activeAction, setActiveAction] = useState<'NONE' | 'PAYMENT' | 'DEPOSIT' | 'EXPENSE' | 'REFUND' | 'EDIT_CHARGE' | 'CUSTOM_PRICE'>('NONE');

  // Form States
  // Custom Price Override State
  const [customPriceVal, setCustomPriceVal] = useState<string>('');
  const [customPriceReason, setCustomPriceReason] = useState<string>('');

  // Form States
  // Payment
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('PIX');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');

  // Deposit
  const [depReceivedAmount, setDepReceivedAmount] = useState('');
  const [depReturnedAmount, setDepReturnedAmount] = useState('');
  const [depStatus, setDepStatus] = useState<DepositStatus>('RECEBIDO');
  const [depReason, setDepReason] = useState('');
  const [depNotes, setDepNotes] = useState('');

  // Expense
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Refund
  const [refAmount, setRefAmount] = useState('');
  const [refReason, setRefReason] = useState('');
  const [refMethod, setRefMethod] = useState<PaymentMethod>('PIX');

  // Edit Charge
  const [adjAmount, setAdjAmount] = useState('');
  const [discAmount, setDiscAmount] = useState('');
  const [editReason, setEditReason] = useState('');

  // Fiscal Documents (Carnê-Leão)
  const [fiscalDocs, setFiscalDocs] = useState<PaymentDocument[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    loadFinancials();
  }, [reservation.id]);

  const loadFinancials = async () => {
    setLoading(true);
    try {
      const data = await getReservationFinancialSummary(reservation);
      setSummary(data);

      const docs = await getPaymentDocumentsForReservation(reservation.id);
      setFiscalDocs(docs);

      // Pre-fill fields
      setPayAmount(data.net_balance > 0 ? data.net_balance.toFixed(2) : '');
      setDepReceivedAmount(data.deposit.expected_amount.toString());
      setDepReturnedAmount(data.deposit.received_amount.toString());
      setDepStatus(data.deposit.status);
      setDepReason(data.deposit.retention_reason || '');
      setDepNotes(data.deposit.notes || '');

      setAdjAmount(data.charge.manual_adjustment.toString());
      setDiscAmount(data.charge.discounts_total.toString());
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await addReservationPayment(reservation, {
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        payment_date: payDate,
        notes: payNotes,
        performed_by: 'Administrador'
      });

      setSuccessMessage('Pagamento registrado com sucesso!');
      setActiveAction('NONE');
      await loadFinancials();
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await updateReservationDeposit(reservation, {
        received_amount: depReceivedAmount ? parseFloat(depReceivedAmount) : undefined,
        returned_amount: depReturnedAmount ? parseFloat(depReturnedAmount) : undefined,
        status: depStatus,
        retention_reason: depReason,
        notes: depNotes,
        performed_by: 'Administrador'
      });

      setSuccessMessage('Caução atualizada com sucesso!');
      setActiveAction('NONE');
      await loadFinancials();
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar caução.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await addReservationExpense(reservation, {
        description: expDescription,
        amount: parseFloat(expAmount),
        expense_date: expDate,
        performed_by: 'Administrador'
      });

      setSuccessMessage('Lançamento extra registrado!');
      setExpDescription('');
      setExpAmount('');
      setActiveAction('NONE');
      await loadFinancials();
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao adicionar despesa extra.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await addReservationRefund(reservation, {
        amount: parseFloat(refAmount),
        reason: refReason,
        payment_method: refMethod,
        performed_by: 'Administrador'
      });

      setSuccessMessage('Reembolso registrado com sucesso!');
      setRefAmount('');
      setRefReason('');
      setActiveAction('NONE');
      await loadFinancials();
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar reembolso.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await updateChargeDiscountOrAdjustment(reservation, {
        manual_adjustment: parseFloat(adjAmount || '0'),
        discounts_total: parseFloat(discAmount || '0'),
        reason: editReason,
        performed_by: 'Administrador'
      });

      setSuccessMessage('Cobrança reajustada com sucesso!');
      setEditReason('');
      setActiveAction('NONE');
      await loadFinancials();
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao reajustar cobrança.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const numVal = customPriceVal.trim() !== '' ? Number(customPriceVal) : null;
      await updateReservationCustomPrice(reservation.id, numVal, 'Administrador', customPriceReason);
      setSuccessMessage(numVal !== null ? 'Valor personalizado salvo com sucesso!' : 'Valor personalizado removido. A reserva voltou ao valor padrão.');
      setActiveAction('NONE');
      await loadFinancials();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar valor personalizado.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCustomPrice = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await updateReservationCustomPrice(reservation.id, null, 'Administrador', 'Retornado ao preço padrão');
      setSuccessMessage('Valor personalizado removido. A reserva agora utiliza o preço padrão calculated por diárias.');
      setActiveAction('NONE');
      await loadFinancials();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao remover valor personalizado.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3 text-white/50">
        <Clock className="animate-spin text-[#FFD600]" size={28} />
        <p className="text-xs font-bold">Carregando dados financeiros persistidos...</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-white/10 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={16} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-white/10 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border ${
          isCustomReservationPrice(reservation) 
            ? 'bg-purple-500/10 border-purple-500/30' 
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Valor Contratado</span>
            {isCustomReservationPrice(reservation) && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                Manual
              </span>
            )}
          </div>
          <p className="text-lg font-black text-white mt-1">
            R$ {summary.total_contracted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-white/50 mt-1">
            {isCustomReservationPrice(reservation) ? 'Valor personalizado negociado' : 'Calculado por diárias'}
          </p>
        </div>

        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider block">Valor Recebido</span>
          <p className="text-lg font-black text-emerald-400 mt-1">
            R$ {summary.total_received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-300/60 mt-1">{summary.payments.length} pagamento(s)</p>
        </div>

        <div className={`p-4 rounded-2xl border ${
          summary.net_balance > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
            {summary.net_balance > 0 ? 'Saldo a Pagar' : 'Saldo Quitado'}
          </span>
          <p className={`text-lg font-black mt-1 ${summary.net_balance > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
            R$ {Math.abs(summary.net_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-white/10">
            {summary.financial_status}
          </span>
        </div>

        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
          <span className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider block">Caução Prevista</span>
          <p className="text-lg font-black text-purple-300 mt-1">
            R$ {summary.deposit.expected_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-purple-300/60 mt-1">Status: {DEPOSIT_STATUS_LABELS[summary.deposit.status] || summary.deposit.status}</p>
        </div>
      </div>

      {/* Control Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-2xl">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wider px-2">Ações Financeiras:</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveAction('PAYMENT')}
            className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Registrar Pagamento</span>
          </button>

          <button
            onClick={() => {
              setCustomPriceVal(reservation.custom_price != null ? String(reservation.custom_price) : String(summary.total_contracted));
              setCustomPriceReason('');
              setActiveAction('CUSTOM_PRICE');
            }}
            className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <DollarSign size={14} />
            <span>Definir Preço Manual</span>
          </button>

          <button
            onClick={() => setActiveAction('DEPOSIT')}
            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <ShieldCheck size={14} />
            <span>Controle de Caução</span>
          </button>

          <button
            onClick={() => setActiveAction('EXPENSE')}
            className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Receipt size={14} />
            <span>Despesa Extra</span>
          </button>

          <button
            onClick={() => setActiveAction('REFUND')}
            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Reembolso</span>
          </button>

          <button
            onClick={() => setActiveAction('EDIT_CHARGE')}
            className="px-3 py-2 bg-[#FFD600]/20 hover:bg-[#FFD600]/30 text-[#FFD600] border border-[#FFD600]/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Edit3 size={14} />
            <span>Reajustar Cobrança</span>
          </button>
        </div>
      </div>

      {/* Action Overlay Forms */}
      {/* 0. Custom Price Override Form */}
      {activeAction === 'CUSTOM_PRICE' && (
        <form onSubmit={handleSaveCustomPrice} className="p-5 bg-purple-950/40 border border-purple-500/30 rounded-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <h4 className="text-xs font-black text-purple-300 uppercase flex items-center gap-2">
              <DollarSign size={16} /> Valor Personalizado / Manual da Reserva
            </h4>
            <button type="button" onClick={() => setActiveAction('NONE')} className="p-1 text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="text-xs text-purple-200/80 space-y-1">
            <p>
              Esta opção permite definir um valor negociado para esta reserva específica.
            </p>
            <p className="text-[11px] text-white/50">
              • Alterar o valor desta reserva <strong>NÃO altera</strong> o valor padrão da chácara nem afeta outras reservas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Valor Total Negociado (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 1300.00"
                value={customPriceVal}
                onChange={(e) => setCustomPriceVal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Motivo / Observação</label>
              <input
                type="text"
                placeholder="Ex: Desconto especial negociado no WhatsApp"
                value={customPriceReason}
                onChange={(e) => setCustomPriceReason(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isCustomReservationPrice(reservation) ? (
              <button
                type="button"
                onClick={handleRemoveCustomPrice}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition-all"
              >
                Voltar ao Valor Padrão Calculado
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveAction('NONE')}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Salvar Valor Manual
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Action Overlay Forms */}
      {/* 1. Register Payment */}
      {activeAction === 'PAYMENT' && (
        <form onSubmit={handleRegisterPayment} className="p-5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <h4 className="text-xs font-black text-emerald-400 uppercase flex items-center gap-2">
              <CreditCard size={16} /> Novo Recebimento de Pagamento
            </h4>
            <button type="button" onClick={() => setActiveAction('NONE')} className="p-1 text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Forma de Pagamento</label>
              <select
                value={payMethod}
                onChange={(e: any) => setPayMethod(e.target.value)}
                className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Data do Pagamento</label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Observações / Comprovante</label>
            <input
              type="text"
              placeholder="Ex: Sinal via PIX Banco Itaú..."
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveAction('NONE')} className="px-3.5 py-1.5 bg-white/10 text-white font-bold text-xs rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-md">
              {loading ? 'Salvando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      )}

      {/* 2. Manage Deposit */}
      {activeAction === 'DEPOSIT' && (
        <form onSubmit={handleUpdateDeposit} className="p-5 bg-purple-950/40 border border-purple-500/30 rounded-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <h4 className="text-xs font-black text-purple-300 uppercase flex items-center gap-2">
              <ShieldCheck size={16} /> Gestão de Caução da Reserva
            </h4>
            <button type="button" onClick={() => setActiveAction('NONE')} className="p-1 text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Valor Recebido (R$)</label>
              <input
                type="number"
                step="0.01"
                value={depReceivedAmount}
                onChange={(e) => setDepReceivedAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Valor Devolvido (R$)</label>
              <input
                type="number"
                step="0.01"
                value={depReturnedAmount}
                onChange={(e) => setDepReturnedAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Status da Caução</label>
              <select
                value={depStatus}
                onChange={(e: any) => setDepStatus(e.target.value)}
                className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                {Object.entries(DEPOSIT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {(depStatus === 'RETIDO_PARCIAL' || depStatus === 'RETIDO_TOTAL') && (
            <div>
              <label className="text-[10px] font-bold uppercase text-red-400 block mb-1">Motivo da Retenção (Obrigatório)</label>
              <input
                type="text"
                required
                placeholder="Ex: Quebra de vaso sanitário durante a hospedagem..."
                value={depReason}
                onChange={(e) => setDepReason(e.target.value)}
                className="w-full bg-white/5 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Observações do Depósito</label>
            <input
              type="text"
              placeholder="Ex: Devolvido via PIX chave CPF no checkout..."
              value={depNotes}
              onChange={(e) => setDepNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveAction('NONE')} className="px-3.5 py-1.5 bg-white/10 text-white font-bold text-xs rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 bg-purple-500 hover:bg-purple-400 text-white font-black text-xs rounded-xl shadow-md">
              {loading ? 'Salvando...' : 'Salvar Caução'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Add Expense */}
      {activeAction === 'EXPENSE' && (
        <form onSubmit={handleAddExpense} className="p-5 bg-amber-950/40 border border-amber-500/30 rounded-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <h4 className="text-xs font-black text-amber-300 uppercase flex items-center gap-2">
              <Receipt size={16} /> Lançar Despesa / Consumo Extra
            </h4>
            <button type="button" onClick={() => setActiveAction('NONE')} className="p-1 text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Descrição do Lançamento</label>
              <input
                type="text"
                required
                placeholder="Ex: Quebra de utensílios, energia excedente, limpeza extra..."
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveAction('NONE')} className="px-3.5 py-1.5 bg-white/10 text-white font-bold text-xs rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-md">
              {loading ? 'Lançando...' : 'Adicionar Despesa Extra'}
            </button>
          </div>
        </form>
      )}

      {/* 4. Add Refund */}
      {activeAction === 'REFUND' && (
        <form onSubmit={handleAddRefund} className="p-5 bg-red-950/40 border border-red-500/30 rounded-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
            <h4 className="text-xs font-black text-red-300 uppercase flex items-center gap-2">
              <RotateCcw size={16} /> Registrar Reembolso / Devolução
            </h4>
            <button type="button" onClick={() => setActiveAction('NONE')} className="p-1 text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Valor Reembolsado (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={refAmount}
                onChange={(e) => setRefAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Forma de Devolução</label>
              <select
                value={refMethod}
                onChange={(e: any) => setRefMethod(e.target.value)}
                className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Motivo do Reembolso</label>
              <input
                type="text"
                required
                placeholder="Ex: Cancelamento dentro do prazo / Devolução de sinal..."
                value={refReason}
                onChange={(e) => setRefReason(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveAction('NONE')} className="px-3.5 py-1.5 bg-white/10 text-white font-bold text-xs rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-md">
              {loading ? 'Processando...' : 'Confirmar Reembolso'}
            </button>
          </div>
        </form>
      )}

      {/* 5. Edit Charge / Discounts */}
      {activeAction === 'EDIT_CHARGE' && (
        <form onSubmit={handleSaveEditCharge} className="p-5 bg-[#FFD600]/10 border border-[#FFD600]/30 rounded-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#FFD600]/20 pb-3">
            <h4 className="text-xs font-black text-[#FFD600] uppercase flex items-center gap-2">
              <Edit3 size={16} /> Reajuste de Cobrança & Descontos
            </h4>
            <button type="button" onClick={() => setActiveAction('NONE')} className="p-1 text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Descontos Totais (R$)</label>
              <input
                type="number"
                step="0.01"
                value={discAmount}
                onChange={(e) => setDiscAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-white/60 block mb-1">Ajuste Manual (+/- R$)</label>
              <input
                type="number"
                step="0.01"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-[#FFD600] block mb-1">Motivo / Justificativa (Obrigatório para Auditoria)</label>
              <input
                type="text"
                required
                placeholder="Ex: Concedido 10% de desconto por cortesia comercial autorizada..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full bg-white/5 border border-[#FFD600]/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveAction('NONE')} className="px-3.5 py-1.5 bg-white/10 text-white font-bold text-xs rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 bg-[#FFD600] hover:bg-[#FFE500] text-black font-black text-xs rounded-xl shadow-md">
              {loading ? 'Salvando...' : 'Salvar Reajuste'}
            </button>
          </div>
        </form>
      )}

      {/* Snapshot breakdown card */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
          <span>Composição Contratual da Cobrança</span>
          <span className="text-[10px] text-white/40 font-normal">Criado em: {new Date(summary.charge.created_at || '').toLocaleDateString('pt-BR')}</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-white/40 block text-[10px]">Diárias Subtotal:</span>
            <span className="font-bold text-white">R$ {summary.charge.daily_rates_subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px]">Taxa Limpeza:</span>
            <span className="font-bold text-white">R$ {summary.charge.cleaning_fee.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px]">Pessoas Extras:</span>
            <span className="font-bold text-white">R$ {summary.charge.extra_guests_fee.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px]">Taxa Pets:</span>
            <span className="font-bold text-white">R$ {summary.charge.pet_fee.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px]">Energia / Eventos:</span>
            <span className="font-bold text-white">R$ {(summary.charge.energy_fee + summary.charge.event_fee).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px]">Descontos:</span>
            <span className="font-bold text-emerald-400">- R$ {summary.charge.discounts_total.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px]">Ajuste Manual:</span>
            <span className="font-bold text-amber-400">R$ {summary.charge.manual_adjustment.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px]">Total Imutável:</span>
            <span className="font-black text-[#FFD600]">R$ {summary.charge.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tables Section: Payments, Expenses, Refunds & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payments List */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><CreditCard size={14} /> Historico de Pagamentos</span>
            <span className="text-[10px] text-white/50">{summary.payments.length} registro(s)</span>
          </h4>

          {summary.payments.length === 0 ? (
            <p className="text-xs text-white/40 py-3 text-center">Nenhum pagamento registrado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {summary.payments.map((p) => (
                <div key={p.id} className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400">R$ {p.amount.toFixed(2)}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                        {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
                      </span>
                    </div>
                    {p.notes && <p className="text-[10px] text-white/60 mt-0.5">{p.notes}</p>}
                  </div>
                  <div className="text-right text-[10px] text-white/40">
                    <p>{p.payment_date}</p>
                    <p>por {p.created_by}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses & Refunds List */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Receipt size={14} /> Extras e Reembolsos</span>
            <span className="text-[10px] text-white/50">{summary.expenses.length + summary.refunds.length} lançamento(s)</span>
          </h4>

          {summary.expenses.length === 0 && summary.refunds.length === 0 ? (
            <p className="text-xs text-white/40 py-3 text-center">Nenhum extra ou reembolso registrado.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {summary.expenses.map((e) => (
                <div key={e.id} className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{e.description}</p>
                    <p className="text-[10px] text-amber-300">Extra: + R$ {e.amount.toFixed(2)}</p>
                  </div>
                  <span className="text-[10px] text-white/40">{e.expense_date}</span>
                </div>
              ))}

              {summary.refunds.map((r) => (
                <div key={r.id} className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-red-300">Reembolso: - R$ {r.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-white/60">{r.reason}</p>
                  </div>
                  <span className="text-[10px] text-white/40">{r.refund_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log History */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History size={14} className="text-[#FFD600]" />
          <span>Histórico de Auditoria Financeira</span>
        </h4>

        {summary.audit_logs.length === 0 ? (
          <p className="text-xs text-white/40 py-2">Nenhum evento registrado no log.</p>
        ) : (
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {summary.audit_logs.map((log) => (
              <div key={log.id} className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[#FFD600] text-[11px] block">{log.operation}</span>
                  <p className="text-[10px] text-white/80">{log.reason}</p>
                </div>
                <div className="text-right text-[9px] text-white/40 shrink-0">
                  <p>{new Date(log.created_at || '').toLocaleString('pt-BR')}</p>
                  <p>{log.performed_by}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comprovantes Fiscais (Carnê-Leão) Card */}
      <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={14} /> Comprovantes Fiscais (Carnê-Leão)
          </h4>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5 border border-purple-500/30 transition-all cursor-pointer"
          >
            <UploadCloud size={14} />
            <span>{fiscalDocs.length > 0 ? 'Gerenciar Comprovantes' : 'Anexar Comprovante'}</span>
          </button>
        </div>

        {fiscalDocs.length === 0 ? (
          <p className="text-xs text-white/40 py-2">Nenhum comprovante fiscal anexado a esta reserva.</p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {fiscalDocs.map((doc) => (
              <a
                key={doc.id}
                href={doc.public_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10"
              >
                <FileText size={14} />
                <span className="truncate max-w-[150px]">{doc.file_name}</span>
                <span className="opacity-70">(R$ {Number(doc.amount).toFixed(2)})</span>
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Upload Payment Document Modal */}
      <UploadPaymentDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        reservation={{
          reservation_id: reservation.id,
          chacara_id: reservation.chacara_id,
          chacara_nome: reservation.chacara?.name || 'Chácara',
          code: reservation.code,
          checkin_date: reservation.checkin_date,
          checkout_date: reservation.checkout_date,
          client_nome: reservation.client?.full_name || 'Cliente',
          client_document: (reservation.client as any)?.cpf_cnpj || reservation.client?.document_number || 'Não informado',
          total_price: summary?.total_contracted || (reservation as any).total_price || 0,
          total_proven_amount: fiscalDocs.reduce((s, d) => s + (Number(d.amount) || 0), 0),
          documents: fiscalDocs,
          has_documents: fiscalDocs.length > 0,
          has_multiple_documents: fiscalDocs.length > 1,
          status: reservation.status
        }}
        onSuccess={() => loadFinancials()}
      />
    </div>
  );
}
