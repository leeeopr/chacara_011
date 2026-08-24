'use client';

import React, { useState } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Copy, 
  Check, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  CalendarCheck,
  FileText,
  DollarSign
} from 'lucide-react';
import { generateWhatsAppMessage } from '@/services/notificationsService';

interface QuickCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialClientName?: string;
  initialChacaraName?: string;
  initialCode?: string;
  initialPendingAmount?: number;
  initialCheckinDate?: string;
  initialCheckoutDate?: string;
}

export default function QuickCommunicationModal({
  isOpen,
  onClose,
  initialPhone = '',
  initialClientName = '',
  initialChacaraName = '',
  initialCode = '',
  initialPendingAmount = 0,
  initialCheckinDate = '',
  initialCheckoutDate = ''
}: QuickCommunicationModalProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [template, setTemplate] = useState<'BOAS_VINDAS' | 'REGRAS' | 'COBRANCA_SALDO' | 'VISTORIA_CAUCAO' | 'EQUIPE_LIMPEZA'>('BOAS_VINDAS');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone);
      const generated = generateWhatsAppMessage(template, {
        clientName: initialClientName,
        chacaraName: initialChacaraName,
        checkinDate: initialCheckinDate,
        checkoutDate: initialCheckoutDate,
        code: initialCode,
        pendingAmount: initialPendingAmount
      });
      setCustomMessage(generated);
    }
  }, [isOpen, template, initialClientName, initialChacaraName, initialPhone, initialCheckinDate, initialCheckoutDate, initialCode, initialPendingAmount]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${phoneWithCountry}?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div 
      id="quick-comm-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id="quick-comm-modal-container"
        className="relative w-full max-w-2xl my-auto rounded-3xl bg-[#0F172A] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Comunicação Efetiva & WhatsApp
              </h2>
              <p className="text-xs text-white/60">
                Disparo instantâneo com modelos personalizados para hóspedes e colaboradores
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Template Selector Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
              Selecione o Modelo de Mensagem:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTemplate('BOAS_VINDAS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  template === 'BOAS_VINDAS'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                <Sparkles size={13} />
                <span>Boas-Vindas & Acesso</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('REGRAS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  template === 'REGRAS'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                <ShieldCheck size={13} />
                <span>Regras & Silêncio</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('COBRANCA_SALDO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  template === 'COBRANCA_SALDO'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                <DollarSign size={13} />
                <span>Lembrete de Saldo PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('VISTORIA_CAUCAO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  template === 'VISTORIA_CAUCAO'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                <CalendarCheck size={13} />
                <span>Vistoria & Devolução Caução</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('EQUIPE_LIMPEZA')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  template === 'EQUIPE_LIMPEZA'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                <Users size={13} />
                <span>Alerta para Equipe</span>
              </button>
            </div>
          </div>

          {/* Recipient Phone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
              Telefone WhatsApp do Destinatário:
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: (11) 98765-4321 ou 11987654321"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition-all font-mono"
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Conteúdo da Mensagem (Editável):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-emerald-500 transition-all font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            Fechar
          </button>

          <button
            onClick={handleSendWhatsApp}
            disabled={!phone.trim()}
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Send size={15} />
            <span>Abrir no WhatsApp Web/App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
