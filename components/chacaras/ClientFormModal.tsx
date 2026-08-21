'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Phone, Mail, FileText, MapPin, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Sliders, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Client } from '@/lib/chacaraTypes';
import { createClient, updateClient } from '@/services/clientsService';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  onSuccess: (createdClient?: Client) => void;
}

export default function ClientFormModal({
  isOpen,
  onClose,
  clientToEdit,
  onSuccess
}: ClientFormModalProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [formData, setFormData] = useState<Partial<Client>>({
    full_name: '',
    phone: '',
    secondary_phone: '',
    email: '',
    document_number: '',
    rg_number: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    zip_code: '',
    notes: '',
    is_blacklisted: false,
    blacklist_reason: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setShowAdvancedOptions(false);
      if (clientToEdit) {
        setFormData({ ...clientToEdit });
      } else {
        setFormData({
          full_name: '',
          phone: '',
          secondary_phone: '',
          email: '',
          document_number: '',
          rg_number: '',
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: 'SP',
          zip_code: '',
          notes: '',
          is_blacklisted: false,
          blacklist_reason: ''
        });
      }
      setErrorMessage('');
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    setErrorMessage('');
    if (!formData.full_name?.trim()) {
      setErrorMessage('Informe o nome completo do cliente.');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMessage('Informe o número de telefone/WhatsApp.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name?.trim()) {
      setErrorMessage('O nome do cliente é obrigatório.');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMessage('O telefone/WhatsApp é obrigatório.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      let saved: Client;
      if (clientToEdit) {
        saved = await updateClient(clientToEdit.id, formData);
      } else {
        saved = await createClient(formData);
      }
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      console.error('[ClientFormModal] Erro ao salvar cliente:', err);
      setErrorMessage(err.message || 'Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full sm:max-w-xl bg-[#0A0F2C] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[100vh] sm:max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD600] p-2.5 rounded-2xl text-[#0A0F2C]">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#FFD600] font-bold">
                <span>Passo {step} de 2</span>
                <span className="text-white/30">•</span>
                <span className="text-white/70">
                  {step === 1 ? 'Etapa 1: Dados de Contato' : 'Etapa 2: Documentos e Endereço'}
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
            className="bg-[#FFD600] h-full transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          
          {/* STEP 1: DADOS PRINCIPAIS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User size={18} className="text-[#FFD600]" />
                  Quem é o cliente?
                </h3>
                <p className="text-xs text-white/50">Informe o nome e contato principal</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formData.full_name || ''}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFD600] outline-none mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase">WhatsApp / Telefone *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-8888"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFD600] outline-none mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase">E-mail</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="carlos@email.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFD600] outline-none mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DOCUMENTOS E ENDEREÇO + CAMPOS AVANÇADOS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#FFD600]" />
                  Documentos & Localização
                </h3>
                <p className="text-xs text-white/50">Campos opcionais para emissão de contrato</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={formData.document_number || ''}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#FFD600] outline-none mt-1"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase">Cidade / Estado</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                      className="col-span-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#FFD600] outline-none"
                    />
                    <input
                      type="text"
                      value={formData.state || 'SP'}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="UF"
                      className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white text-center focus:border-[#FFD600] outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* ACCORDION PARA CAMPOS AVANÇADOS / SECUNDÁRIOS */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-4 py-3 text-xs font-bold text-white/70 hover:text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-[#FFD600]" />
                    ▼ Mais opções (Endereço Completo & Notas)
                  </span>
                  {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Rua / Logradouro</label>
                        <input
                          type="text"
                          value={formData.street || ''}
                          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                          placeholder="Rua..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/50 uppercase">Número</label>
                        <input
                          type="text"
                          value={formData.number || ''}
                          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                          placeholder="123"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none mt-0.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase">Observações Internas</label>
                      <textarea
                        rows={2}
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas sobre preferências..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none mt-0.5"
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
                className="flex-1 max-w-[220px] bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
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
                    <span>Salvar Cliente</span>
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
