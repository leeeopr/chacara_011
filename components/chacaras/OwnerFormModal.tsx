'use client';

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  AlertTriangle, 
  Check, 
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { createOwner } from '@/services/chacarasService';

interface OwnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OwnerFormModal({
  isOpen,
  onClose,
  onSuccess
}: OwnerFormModalProps) {
  // Steps: 1. Quem -> 2. Documentos & Observações
  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setShowAdvancedOptions(false);
      setFullName('');
      setPhone('');
      setEmail('');
      setDocumentNumber('');
      setNotes('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    setErrorMessage('');
    if (!fullName.trim()) {
      setErrorMessage('Informe o nome completo do proprietário.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Por favor, informe o nome completo do proprietário.');
      return;
    }

    setLoading(true);

    try {
      await createOwner({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        document_number: documentNumber.trim(),
        cpf_cnpj: documentNumber.trim(),
        notes: notes.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[OwnerFormModal] Erro ao cadastrar proprietário:', err);
      setErrorMessage(err.message || 'Erro ao cadastrar proprietário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full sm:max-w-md bg-[#0A0F2C] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[100vh] sm:max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2.5 rounded-2xl text-white">
              <Briefcase size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Novo Proprietário</h2>
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold">
                <span>Passo {step} de 2</span>
                <span className="text-white/30">•</span>
                <span className="text-white/70">
                  {step === 1 ? 'Etapa 1: Dados Pessoais' : 'Etapa 2: Documentos'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-1.5 shrink-0">
          <div 
            className="bg-indigo-500 h-full transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
            <AlertTriangle size={16} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          
          {/* STEP 1: DADOS PESSOAIS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User size={18} className="text-indigo-400" />
                  Quem é o proprietário?
                </h3>
                <p className="text-xs text-white/50">Nome do parceiro dono de chácara</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-8888"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-indigo-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="carlos@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DOCUMENTO & OPÇÕES AVANÇADAS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-indigo-400" />
                  Documentos & Informações Fiscais
                </h3>
                <p className="text-xs text-white/50">CPF/CNPJ para repasses contratuais</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-400 outline-none"
                />
              </div>

              {/* ACCORDION OPÇÕES AVANÇADAS */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-4 py-3 text-xs font-bold text-white/70 hover:text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-indigo-400" />
                    ▼ Mais opções (Observações Internas)
                  </span>
                  {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Observações Internas</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notas sobre dados bancários, chave PIX, acordos..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 max-w-[220px] bg-indigo-500 hover:bg-indigo-400 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                <span>Próximo Passo</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#0A0F2C] font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Salvar Proprietário</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
