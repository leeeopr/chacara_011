'use client';
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import { 
  X, Phone, DollarSign, Calendar, Clock, Send, Landmark, Receipt, 
  CreditCard, Coins, QrCode, Percent, ArrowRight, User, Tag, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { billingsService } from '@/services/billingsService';
import { PaymentMethod } from '@/lib/types';

interface FinancialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any; // Mapped financial event object
  onSuccess?: () => void;
}

export default function FinancialDetailModal({ isOpen, onClose, event, onSuccess }: FinancialDetailModalProps) {
  const [selectedTemplateType, setSelectedTemplateType] = useState<'friendly' | 'due' | 'received'>('friendly');
  const [messagePreview, setMessagePreview] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  // Payment states
  const [billingWithTx, setBillingWithTx] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [installments, setInstallments] = useState<number>(1);
  const [amountToPay, setAmountToPay] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMsgSectionOpen, setIsMsgSectionOpen] = useState(false);

  // Fallback default templates
  const DEFAULT_FRIENDLY_COLLECTION = `Olá {name}, tudo bem?\n\nEstamos entrando em contato para lembrar que existe um pagamento pendente referente ao seu atendimento.\n\nQualquer dúvida estamos à disposição.`;
  const DEFAULT_BILLING_DUE = `Olá {name}.\n\nPassando para lembrar que seu pagamento vence em {data_vencimento}.`;
  const DEFAULT_PAYMENT_CONFIRMATION = `Pagamento recebido com sucesso.\n\nAgradecemos pela confiança.`;

  // Fetch full billing details (with transaction history) on open
  useEffect(() => {
    if (!isOpen || !event || !event.billingData?.id) return;

    const loadFullBilling = async () => {
      setLoadingBilling(true);
      try {
        const full = await billingsService.getBillingById(event.billingData.id);
        setBillingWithTx(full);
        
        // Compute outstanding balance
        const totalPaid = (full?.billing_transactions || [])
          .filter((tx: any) => tx.status === 'CLEARED')
          .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
        const netTotal = full?.net_total || event.billingData?.net_total || 0;
        const remaining = Math.max(0, netTotal - totalPaid);
        
        setAmountToPay(remaining.toString());
      } catch (err) {
        console.error('Error loading full billing:', err);
      } finally {
        setLoadingBilling(false);
      }
    };

    loadFullBilling();

    // Get phone
    const rawPhone = event.billingData?.appointments?.patients?.whatsapp || event.billingData?.appointments?.whatsapp || event.whatsapp || '';
    setPatientPhone(rawPhone);

    // Auto-select template type based on event financialType
    if (event.financialType === 'recebimento') {
      setSelectedTemplateType('received');
    } else if (event.financialType === 'vencimento') {
      setSelectedTemplateType('due');
    } else {
      setSelectedTemplateType('friendly');
    }
  }, [isOpen, event]);

  // Load and format templates automatically on state change
  useEffect(() => {
    if (!event) return;

    const patientName = event.billingData?.appointments?.patients?.full_name || event.billingData?.appointments?.patient_name || 'Paciente';
    const amount = event.billingData?.net_total || event.billingData?.gross_total || 0;
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    
    let rawDate = event.billingData?.due_date || '';
    let formattedDate = '';
    if (rawDate) {
      try {
        const parts = rawDate.split('-');
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch (err) {
        formattedDate = rawDate;
      }
    }

    let template = '';
    if (selectedTemplateType === 'friendly') {
      template = localStorage.getItem('friendly_collection_template') || DEFAULT_FRIENDLY_COLLECTION;
    } else if (selectedTemplateType === 'due') {
      template = localStorage.getItem('billing_due_reminder_template') || DEFAULT_BILLING_DUE;
    } else {
      template = localStorage.getItem('payment_received_confirmation_template') || DEFAULT_PAYMENT_CONFIRMATION;
    }

    // Replace placeholders
    let formattedText = template
      .replace(/{name}/g, patientName)
      .replace(/{value}/g, formattedAmount)
      .replace(/{data_vencimento}/g, formattedDate);

    setMessagePreview(formattedText);
  }, [event, selectedTemplateType]);

  if (!isOpen || !event) return null;

  const billing = billingWithTx || event.billingData || {};
  const appointment = billing.appointments || {};
  const patientName = appointment.patients?.full_name || appointment.patient_name || 'Paciente Geral';
  const companyName = appointment.companies?.name || billing.companies?.name || '';
  const isPaid = billing.status === 'PAID';
  const isOverdue = billing.status === 'OVERDUE';
  const isPartiallyPaid = billing.status === 'PARTIALLY_PAID';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    OVERDUE: 'Atrasado',
    CANCELLED: 'Cancelado',
    PARTIALLY_PAID: 'Pago Parcial',
    WAIVED: 'Isento'
  };

  const paymentMethodLabels: Record<string, string> = {
    PIX: 'PIX',
    CASH: 'Dinheiro',
    DEBIT: 'Cartão de Débito',
    CREDIT: 'Cartão de Crédito',
    TRANSFER: 'Transferência',
    BOLETO: 'Boleto Bancário'
  };

  // Compute remaining balance
  const totalPaid = (billing?.billing_transactions || [])
    .filter((tx: any) => tx.status === 'CLEARED')
    .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const netTotal = appointment.net_value ?? billing?.net_total ?? 0;
  const remainingBalance = Math.max(0, netTotal - totalPaid);

  const handleSendWhatsApp = () => {
    if (!patientPhone) {
      alert('Este paciente não possui telefone cadastrado.');
      return;
    }

    const cleaned = patientPhone.replace(/\D/g, '');
    const finalPhone = (cleaned.length === 10 || cleaned.length === 11) ? `55${cleaned}` : cleaned;
    const encodedText = encodeURIComponent(messagePreview);
    
    window.open(`https://wa.me/${finalPhone}?text=${encodedText}`, '_blank');
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const valueToPay = Number(amountToPay);
    if (isNaN(valueToPay) || valueToPay <= 0) {
      alert('Insira um valor válido de recebimento.');
      return;
    }

    setIsSubmitting(true);
    try {
      await billingsService.registerTransaction({
        billing_id: billing.id,
        amount: valueToPay,
        payment_method: paymentMethod,
        status: 'CLEARED',
        installments: paymentMethod === 'CREDIT' ? installments : 1
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erro ao registrar recebimento: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0A1133] border border-emerald-500/20 w-full max-w-4xl rounded-[36px] overflow-hidden shadow-2xl relative"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 border-b border-emerald-500/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Landmark className="text-emerald-400" size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Atendimento de Recepção</span>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Confirmar Recebimento de Consulta</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/5 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Grid Split: 1. Resumo da Consulta / 2. Formulário de Recebimento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Column 1: Resumo da Consulta e Histórico */}
              <div className="flex flex-col gap-4">
                {/* Visual Header of Appointment */}
                <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-white/40 font-black block">Paciente</span>
                      <h4 className="font-black text-white text-lg leading-tight mt-1">{patientName}</h4>
                      {companyName && (
                        <div className="text-[10px] text-[#FFD600] font-black uppercase tracking-wider mt-1">
                          🏢 Convênio: {companyName}
                        </div>
                      )}
                      {appointment.status && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[8px] uppercase tracking-widest text-white/40 font-black">Status Clínico:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            appointment.status === 'ATENDIDO' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            appointment.status === 'CANCELADO' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                            appointment.status === 'PENDENTE' ? 'bg-amber-500/10 border-amber-500/20 text-[#FFD600]' :
                            'bg-white/5 border-white/10 text-white/60'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                      isOverdue || billing.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]' :
                      isPartiallyPaid ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                      'bg-white/10 text-white/60 border border-white/10'
                    }`}>
                      {statusLabels[billing.status] || billing.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 mt-3 border-t border-white/5">
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-white/40 font-black block">Data</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white mt-1">
                        <Calendar size={12} className="text-[#FFD600]" />
                        <span>{appointment.appointment_date ? format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy') : '--/--/----'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-white/40 font-black block">Horário</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white mt-1">
                        <Clock size={12} className="text-[#FFD600]" />
                        <span>{(appointment.start_time || '').substring(0, 5).replace(':', 'h')}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-white/40 font-black block">Tipo de Consulta</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white mt-1">
                        <Receipt size={12} className="text-[#FFD600]" />
                        <span>{appointment.appointment_types?.name || 'Consulta'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-white/40 font-black block">Nota Fiscal</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white mt-1">
                        <CheckCircle2 size={12} className={appointment.invoice_needed ? "text-emerald-400" : "text-white/30"} />
                        <span className={appointment.invoice_needed ? "text-emerald-400 font-extrabold" : "text-white/40"}>
                          {appointment.invoice_needed ? 'Sim (Emitir)' : 'Não'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {appointment.profiles?.full_name && (
                    <div className="pt-2 mt-2 border-t border-white/5 flex items-center gap-2">
                      <User size={12} className="text-[#FFD600]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        Profissional: {appointment.profiles.full_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Values & Balances */}
                <div className="glass p-5 rounded-2xl border border-white/5 space-y-3 bg-white/[0.01]">
                  <span className="text-[9px] uppercase tracking-widest text-white/40 font-black block">Resumo Financeiro</span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60 font-bold">Valor do Atendimento</span>
                      <span className="text-white/80 font-mono">{formatCurrency(appointment.agreed_price ?? billing.gross_total)}</span>
                    </div>

                    {((appointment.discount_value ?? billing.discount_total) > 0) && (
                      <div className="flex justify-between text-rose-400">
                        <span className="font-bold flex items-center gap-1">
                          <Tag size={12} /> Desconto
                        </span>
                        <span className="font-mono">-{formatCurrency(appointment.discount_value ?? billing.discount_total)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-white/5 font-black text-sm">
                      <span className="text-white">Valor Líquido</span>
                      <span className="text-emerald-400 font-mono">{formatCurrency(appointment.net_value ?? billing.net_total)}</span>
                    </div>

                    {totalPaid > 0 && (
                      <div className="flex justify-between text-emerald-300">
                        <span className="font-bold">Total Recebido</span>
                        <span className="font-mono">{formatCurrency(totalPaid)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-white/5 font-black text-base">
                      <span className="text-white">Saldo Restante</span>
                      <span className="text-[#FFD600] font-mono">{formatCurrency(remainingBalance)}</span>
                    </div>
                  </div>
                </div>

                {/* Log of Previous Transactions if any */}
                {(billing?.billing_transactions || []).length > 0 && (
                  <div className="glass p-4 rounded-2xl border border-white/5 space-y-2">
                    <span className="text-[8px] uppercase tracking-widest text-white/40 font-black block">Histórico de Transações</span>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                      {(billing.billing_transactions || []).map((tx: any) => (
                        <div key={tx.id} className="flex justify-between items-center text-[11px] py-1 border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-1.5 text-white/70">
                            <span className="font-black text-emerald-400">✓</span>
                            <span>{paymentMethodLabels[tx.payment_method] || tx.payment_method}</span>
                            {tx.installments > 1 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">{tx.installments}x</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/40">{tx.payment_date ? format(new Date(tx.payment_date), 'dd/MM/yy') : ''}</span>
                            <span className="font-bold font-mono text-emerald-400">{formatCurrency(tx.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Formulário de Recebimento */}
              <div className="glass p-6 rounded-3xl border border-emerald-500/10 flex flex-col justify-between bg-[#111942]/60">
                {loadingBilling ? (
                  <div className="flex-grow flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
                  </div>
                ) : remainingBalance <= 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
                      <Landmark className="text-emerald-400" size={32} />
                    </div>
                    <h5 className="font-black text-white text-lg">Consulta Quitada!</h5>
                    <p className="text-white/40 text-xs mt-1 leading-relaxed max-w-xs">
                      Não há mais saldo devedor pendente para este atendimento. A cobrança foi removida dos lembretes de pendências.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterPayment} className="flex-grow flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-black block">Dados do Recebimento</span>

                      {/* Payment Method Selector Grid */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Método de Pagamento</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'PIX', label: 'PIX', icon: QrCode },
                            { id: 'CASH', label: 'Dinheiro', icon: Coins },
                            { id: 'DEBIT', label: 'Débito', icon: CreditCard },
                            { id: 'CREDIT', label: 'Crédito', icon: CreditCard }
                          ].map((item) => {
                            const IconComp = item.icon;
                            const isSelected = paymentMethod === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setPaymentMethod(item.id as PaymentMethod)}
                                className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
                                  isSelected 
                                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-lg'
                                    : 'border-white/5 bg-white/[0.02] text-white/50 hover:text-white/80 hover:border-white/10'
                                }`}
                              >
                                <IconComp size={16} className={isSelected ? 'text-emerald-400' : 'text-white/30'} />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Installments field (CREDIT only) */}
                      {paymentMethod === 'CREDIT' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Quantidade de Parcelas</label>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setInstallments(num)}
                                className={`px-4 py-2.5 rounded-xl border text-xs font-black shrink-0 transition-all ${
                                  installments === num 
                                    ? 'border-emerald-500 bg-emerald-500/25 text-white'
                                    : 'border-white/5 bg-white/[0.01] text-white/40 hover:text-white/70'
                                }`}
                              >
                                {num}x
                              </button>
                            ))}
                          </div>
                          {installments > 1 && (
                            <span className="text-[10px] font-bold text-white/50 block mt-1">
                              Cada parcela: {formatCurrency(Number(amountToPay) / installments)}
                            </span>
                          )}
                        </motion.div>
                      )}

                      {/* Input for Value to Receive */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Valor a Receber</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-white/40 text-xs font-bold">R$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            max={remainingBalance}
                            value={amountToPay}
                            onChange={(e) => setAmountToPay(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-10 pr-4 font-black font-mono text-emerald-400 placeholder-white/20 text-lg tracking-wider outline-none focus:border-emerald-500/50 transition-colors"
                            placeholder="0,00"
                            required
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-white/40 px-1">
                          <span>Máximo permitido: {formatCurrency(remainingBalance)}</span>
                          <button
                            type="button"
                            onClick={() => setAmountToPay(remainingBalance.toString())}
                            className="text-emerald-400 hover:underline font-bold"
                          >
                            Preencher saldo total
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 uppercase tracking-[0.15em] text-xs disabled:opacity-40"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Confirmar Recebimento</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

            </div>

            {/* Note about NF issuing if active */}
            {billing.invoice_needed && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-bold flex items-center gap-2">
                <Receipt size={16} />
                <span>Emitir Nota Fiscal (Instrução Operacional cadastrada pelo Profissional)</span>
              </div>
            )}

            {/* MESSAGE TEMPLATES WORKFLOW (Collapsible for Clean Layout) */}
            <div className="border border-white/5 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsMsgSectionOpen(!isMsgSectionOpen)}
                className="w-full p-4 bg-white/[0.02] hover:bg-white/[0.04] text-left text-xs font-black uppercase tracking-widest text-white/60 flex justify-between items-center transition-all"
              >
                <span className="flex items-center gap-2">
                  <Phone size={14} className="text-emerald-400" />
                  Mensageria Financeira Ativa (Templates & Whatsapp)
                </span>
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40">
                  {isMsgSectionOpen ? 'Fechar' : 'Abrir'}
                </span>
              </button>

              <AnimatePresence>
                {isMsgSectionOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-5 border-t border-white/5 bg-black/20 space-y-4 overflow-hidden"
                  >
                    {/* Template selector buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'friendly', label: 'Cobrança Amigável', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/[0.02]' },
                        { id: 'due', label: 'Lembrete Venda', color: 'border-amber-500/20 text-amber-400 bg-amber-500/[0.02]' },
                        { id: 'received', label: 'Recibo Pago', color: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/[0.02]' }
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setSelectedTemplateType(btn.id as any)}
                          className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            selectedTemplateType === btn.id 
                              ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-lg'
                              : `${btn.color} opacity-60 hover:opacity-100`
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Message preview area */}
                    <div className="p-4 sm:p-5 bg-black/45 border border-white/5 rounded-2xl relative font-bold text-sm text-white/80 leading-relaxed">
                      <div className="absolute right-4 top-2 text-[8px] font-black uppercase tracking-widest text-[#FFD600] shrink-0 bg-[#FFD600]/10 px-2 py-0.5 rounded border border-[#FFD600]/20">
                        Prévia Whatsapp
                      </div>
                      <div className="whitespace-pre-wrap mt-2 select-text">{messagePreview}</div>
                    </div>

                    {/* Customer contact info and send button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[#FFD600]/5 border border-[#FFD600]/10 rounded-2xl gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20 shrink-0">
                          <Phone className="text-[#FFD600]" size={16} />
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-widest text-[#FFD600]/60 font-black">Telefone de Contato</span>
                          <span className="font-black text-sm text-white">{patientPhone || 'Sem número cadastrado'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        disabled={!patientPhone}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white font-black py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-40 uppercase tracking-widest text-xs"
                      >
                        <Send size={16} />
                        <span>Enviar por Whatsapp</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
