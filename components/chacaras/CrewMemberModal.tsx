'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  TreePine, 
  Sparkles, 
  Check, 
  X, 
  AlertTriangle,
  Building2,
  FileText,
  ShieldCheck,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  CreditCard,
  QrCode,
  Calendar,
  Info
} from 'lucide-react';
import { CrewMember, CrewRole, Chacara, PaymentFrequency } from '@/lib/chacaraTypes';
import { getCrewRoles, createCrewMember, updateCrewMember } from '@/services/crewService';
import { getChacaras } from '@/services/chacarasService';

interface CrewMemberModalProps {
  isOpen: boolean;
  member: CrewMember | null;
  defaultChacaraId?: string;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function CrewMemberModal({
  isOpen,
  member,
  defaultChacaraId,
  onClose,
  onSaveSuccess
}: CrewMemberModalProps) {
  // Steps: 1. Identificação -> 2. Funções & Chácaras
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<CrewRole[]>([]);
  const [availableChacaras, setAvailableChacaras] = useState<Chacara[]>([]);

  // Form Fields
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('MONTHLY');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);

  // Multi-selection states (N:N)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedChacaraIds, setSelectedChacaraIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      setStep(1);
      setShowAdvancedOptions(false);
      setErrorMessage('');

      if (member) {
        setNome(member.nome || '');
        setTelefone(member.telefone || '');
        setWhatsapp(member.whatsapp || member.telefone || '');
        setEmail(member.email || '');
        setPixKey(member.pix_key || '');
        setPaymentFrequency(member.payment_frequency || 'MONTHLY');
        setObservacoes(member.observacoes || '');
        setAtivo(member.ativo ?? true);
        setSelectedRoleIds(member.role_ids || []);
        setSelectedChacaraIds(member.chacara_ids || []);
      } else {
        setNome('');
        setTelefone('');
        setWhatsapp('');
        setEmail('');
        setPixKey('');
        setPaymentFrequency('MONTHLY');
        setObservacoes('');
        setAtivo(true);
        setSelectedRoleIds([]);
        setSelectedChacaraIds(defaultChacaraId ? [defaultChacaraId] : []);
      }
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    try {
      const [roles, chacaras] = await Promise.all([
        getCrewRoles(true),
        getChacaras()
      ]);
      setAvailableRoles(Array.isArray(roles) ? roles : []);
      setAvailableChacaras(Array.isArray(chacaras) ? chacaras : []);
    } catch (e) {
      console.error('Erro ao carregar dependências do funcionário:', e);
      setAvailableRoles([]);
      setAvailableChacaras([]);
    }
  };

  if (!isOpen) return null;

  const safeSelectedRoleIds = Array.isArray(selectedRoleIds) ? selectedRoleIds : [];
  const safeSelectedChacaraIds = Array.isArray(selectedChacaraIds) ? selectedChacaraIds : [];
  const safeAvailableRoles = Array.isArray(availableRoles) ? availableRoles : [];
  const safeAvailableChacaras = Array.isArray(availableChacaras) ? availableChacaras : [];

  const toggleRole = (roleId: string) => {
    if (!roleId) return;
    if (safeSelectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(safeSelectedRoleIds.filter(id => id !== roleId));
    } else {
      setSelectedRoleIds([...safeSelectedRoleIds, roleId]);
    }
  };

  const toggleChacara = (chacaraId: string) => {
    if (!chacaraId) return;
    if (safeSelectedChacaraIds.includes(chacaraId)) {
      setSelectedChacaraIds(safeSelectedChacaraIds.filter(id => id !== chacaraId));
    } else {
      setSelectedChacaraIds([...safeSelectedChacaraIds, chacaraId]);
    }
  };

  const handleNextStep = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMessage('');
    if (!nome || !nome.trim()) {
      setErrorMessage('Informe o nome completo do funcionário.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Se estiver na primeira etapa, apenas avança para a etapa 2 sem fechar nem salvar prematuramente
    if (step === 1) {
      handleNextStep(e);
      return;
    }

    if (!nome || !nome.trim()) {
      setErrorMessage('O nome do funcionário é obrigatório.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (member) {
        await updateCrewMember(
          member.id,
          {
            nome,
            telefone,
            whatsapp: whatsapp || telefone,
            email,
            pix_key: pixKey,
            payment_frequency: paymentFrequency,
            observacoes,
            ativo
          },
          safeSelectedRoleIds,
          safeSelectedChacaraIds
        );
      } else {
        await createCrewMember(
          {
            nome,
            telefone,
            whatsapp: whatsapp || telefone,
            email,
            pix_key: pixKey,
            payment_frequency: paymentFrequency,
            observacoes,
            ativo
          },
          safeSelectedRoleIds,
          safeSelectedChacaraIds
        );
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('[CrewMemberModal] Erro ao salvar funcionário:', err);
      setErrorMessage(err.message || 'Não foi possível salvar o funcionário. Verifique os dados e tente novamente.');
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
            <div className="bg-purple-500 p-2.5 rounded-2xl text-white">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {member ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-purple-400 font-bold">
                <span>Passo {step} de 2</span>
                <span className="text-white/30">•</span>
                <span className="text-white/70">
                  {step === 1 ? 'Etapa 1: Dados Pessoais' : 'Etapa 2: Funções e Chácaras'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-1.5 shrink-0">
          <div 
            className="bg-purple-500 h-full transition-all duration-300"
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
          
          {/* STEP 1: IDENTIFICAÇÃO */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User size={18} className="text-purple-400" />
                  Quem é o prestador / funcionário?
                </h3>
                <p className="text-xs text-white/50">Informe o nome e dados de contato</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: João da Silva Santos"
                    value={nome || ''}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-purple-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-8888"
                      value={telefone || ''}
                      onChange={(e) => {
                        setTelefone(e.target.value);
                        if (!whatsapp) setWhatsapp(e.target.value);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-purple-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="joao@email.com"
                      value={email || ''}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-purple-400 outline-none"
                    />
                  </div>
                </div>

                {/* SEÇÃO FINANCEIRA */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <QrCode size={16} className="text-emerald-400" />
                      <span>Configuração Financeira & Pagamentos</span>
                    </h4>
                    <p className="text-[11px] text-white/50">Defina a chave PIX e a frequência para acerto dos repasses</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Chave PIX para Pagamentos</label>
                    <div className="relative">
                      <QrCode size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                        value={pixKey || ''}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-400 outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-white/40 block mt-1">
                      Aceita CPF, CNPJ, telefone, e-mail ou chave aleatória sem restrições rígidas.
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Recorrência de Pagamento</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                      <select
                        value={paymentFrequency}
                        onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
                        className="w-full bg-[#0A0F2C] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-400 outline-none cursor-pointer"
                      >
                        <option value="MONTHLY">MENSAL (Fixado em repasse mensal)</option>
                        <option value="WEEKLY">SEMANAL (Fixado em repasse semanal)</option>
                        <option value="PER_RESERVATION">VINCULADO ÀS RESERVAS (1 dia antes do Check-in)</option>
                      </select>
                    </div>

                    {paymentFrequency === 'PER_RESERVATION' && (
                      <div className="mt-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
                        <Info size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                          <strong className="block text-emerald-300 font-bold">Pagamento Agendado por Reserva</strong>
                          <span>O pagamento deste funcionário será programado automaticamente para ser executado <strong>1 dia antes da data de Check-in</strong> de cada reserva das chácaras vinculadas.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FUNÇÕES E CHÁCARAS + ACCORDION AVANÇADO */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-purple-400" />
                  Quais funções e chácaras ele atende?
                </h3>
                <p className="text-xs text-white/50">Selecione uma ou mais opções</p>
              </div>

              {/* Roles Selection */}
              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-2">Funções Desempenhadas</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {safeAvailableRoles.length === 0 ? (
                    <p className="text-xs text-white/40 italic col-span-2 p-2">Nenhuma função cadastrada.</p>
                  ) : (
                    safeAvailableRoles.map(role => {
                      if (!role || !role.id) return null;
                      const isSelected = safeSelectedRoleIds.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleRole(role.id)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                            isSelected 
                              ? 'bg-purple-500/20 border-purple-400 text-purple-300' 
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                          }`}
                        >
                          <span>{role.nome || 'Sem nome'}</span>
                          {isSelected && <Check size={16} className="text-purple-400" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chácaras Selection */}
              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-2">Chácaras de Atuação</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {safeAvailableChacaras.length === 0 ? (
                    <p className="text-xs text-white/40 italic col-span-2 p-2">Nenhuma chácara cadastrada.</p>
                  ) : (
                    safeAvailableChacaras.map(ch => {
                      if (!ch || !ch.id) return null;
                      const isSelected = safeSelectedChacaraIds.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleChacara(ch.id)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                            isSelected 
                              ? 'bg-purple-500/20 border-purple-400 text-purple-300' 
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                          }`}
                        >
                          <span>{ch.name || 'Chácara'}</span>
                          {isSelected && <Check size={16} className="text-purple-400" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ACCORDION OPÇÕES AVANÇADAS */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-4 py-3 text-xs font-bold text-white/70 hover:text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-purple-400" />
                    ▼ Mais opções (Status & Observações)
                  </span>
                  {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Status Ativo</span>
                      <input
                        type="checkbox"
                        checked={Boolean(ativo)}
                        onChange={(e) => setAtivo(e.target.checked)}
                        className="w-4 h-4 accent-purple-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Observações / Chave PIX</label>
                      <textarea
                        rows={2}
                        value={observacoes || ''}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Chave PIX, dias disponíveis..."
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setStep(1);
                }}
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
                className="flex-1 max-w-[220px] bg-purple-500 hover:bg-purple-400 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
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
                    <span>Salvar Funcionário</span>
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
