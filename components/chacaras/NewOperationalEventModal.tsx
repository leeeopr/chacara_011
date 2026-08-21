'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  UserCheck, 
  Sparkles, 
  AlertCircle, 
  Wrench, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sliders, 
  ChevronDown, 
  ChevronUp,
  Search,
  CheckCircle2,
  TreePine,
  DollarSign,
  Trash2
} from 'lucide-react';
import { 
  OperationalEvent, 
  OperationalEventType, 
  Chacara, 
  CrewMember 
} from '@/lib/chacaraTypes';
import { 
  ProviderBillingRule, 
  AccountPayable 
} from '@/lib/accountsPayableTypes';
import { 
  getOperationalEventTypes, 
  saveOperationalEvent, 
  deleteOperationalEvent 
} from '@/services/operationalCalendarService';
import { getChacaras } from '@/services/chacarasService';
import { getCrewMembers } from '@/services/crewService';
import { 
  findMatchingBillingRule, 
  calculateDueDateFromRule 
} from '@/services/providerBillingRulesService';
import { 
  getLinkedAccountPayableForService 
} from '@/services/serviceAccountsPayableAutomation';
import DeleteServiceConfirmModal from './DeleteServiceConfirmModal';

interface NewOperationalEventModalProps {
  isOpen: boolean;
  eventToEdit?: OperationalEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewOperationalEventModal({
  isOpen,
  eventToEdit,
  onClose,
  onSuccess
}: NewOperationalEventModalProps) {
  // Steps: 1. Serviço e Chácara -> 2. Data e Horário -> 3. Responsável e Opções
  const [step, setStep] = useState<number>(1);
  const [eventTypes, setEventTypes] = useState<OperationalEventType[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Financial Automation States
  const [matchingRule, setMatchingRule] = useState<ProviderBillingRule | null>(null);
  const [linkedAccount, setLinkedAccount] = useState<AccountPayable | null>(null);
  const [autoGenerateAccount, setAutoGenerateAccount] = useState(true);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomPricing, setShowCustomPricing] = useState(false);

  // Search terms
  const [chacaraSearchTerm, setChacaraSearchTerm] = useState('');
  const [crewSearchTerm, setCrewSearchTerm] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [eventTypeCode, setEventTypeCode] = useState<string>('limpeza');
  const [chacaraId, setChacaraId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('10:00');
  const [primaryStaffId, setPrimaryStaffId] = useState<string>('');
  const [priority, setPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  
  // Automations
  const [autoWhatsapp, setAutoWhatsapp] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setStep(1);
      setShowAdvancedOptions(false);
      setFormError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || '');
      setEventTypeCode(eventToEdit.event_type_code || 'limpeza');
      setChacaraId(eventToEdit.chacara_id || '');
      setDescription(eventToEdit.description || '');
      setStartDate(eventToEdit.start_date || new Date().toISOString().split('T')[0]);
      setStartTime(eventToEdit.start_time || '08:00');
      setEndDate(eventToEdit.end_date || eventToEdit.start_date || new Date().toISOString().split('T')[0]);
      setEndTime(eventToEdit.end_time || '10:00');
      const staff = eventToEdit.staff_ids || [];
      setPrimaryStaffId(staff[0] || '');
      setPriority(eventToEdit.priority || 'MEDIA');

      // Check linked account payable
      if (eventToEdit.id) {
        getLinkedAccountPayableForService(eventToEdit.id).then(acc => {
          setLinkedAccount(acc);
        });
      }
    } else {
      resetForm();
    }
  }, [eventToEdit, isOpen]);

  // Carregar regra de cobrança compatível quando o prestador, chácara ou tipo mudar
  useEffect(() => {
    if (primaryStaffId) {
      findMatchingBillingRule(primaryStaffId, chacaraId || null, eventTypeCode || null).then(rule => {
        setMatchingRule(rule);
        if (rule && rule.valor_padrao > 0 && !customAmount) {
          setCustomAmount(rule.valor_padrao.toString());
        }
      });
    } else {
      setMatchingRule(null);
    }
  }, [primaryStaffId, chacaraId, eventTypeCode]);

  const resetForm = () => {
    setTitle('');
    setEventTypeCode('limpeza');
    setChacaraId('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:00');
    setEndDate(new Date().toISOString().split('T')[0]);
    setEndTime('10:00');
    setPrimaryStaffId('');
    setPriority('MEDIA');
    setAutoWhatsapp(true);
    setMatchingRule(null);
    setLinkedAccount(null);
    setAutoGenerateAccount(true);
    setCustomAmount('');
    setShowCustomPricing(false);
  };

  const loadInitialData = async () => {
    try {
      const [typesData, chacarasData, crewData] = await Promise.all([
        getOperationalEventTypes(),
        getChacaras(),
        getCrewMembers()
      ]);
      setEventTypes(typesData);
      setChacaras(chacarasData);
      setCrewMembers(crewData);

      if (chacarasData.length > 0 && !chacaraId) {
        setChacaraId(chacarasData[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleNextStep = () => {
    setFormError(null);
    if (step === 1) {
      if (!chacaraId) {
        setFormError('Selecione a chácara onde o serviço será realizado.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!startDate) {
        setFormError('Selecione a data do serviço.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chacaraId) {
      setFormError('Por favor, selecione uma chácara.');
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const selectedType = eventTypes.find(t => t.code === eventTypeCode);
      const computedTitle = title.trim() || selectedType?.name || 'Serviço Operacional';

      await saveOperationalEvent({
        id: eventToEdit?.id,
        chacara_id: chacaraId,
        event_type_code: eventTypeCode,
        title: computedTitle,
        description: description,
        start_date: startDate,
        start_time: startTime,
        end_date: endDate || startDate,
        end_time: endTime,
        status: 'AGENDADO',
        priority: priority,
        staff_ids: primaryStaffId ? [primaryStaffId] : [],
        metadata: {
          ...(eventToEdit?.metadata || {}),
          ...(eventToEdit?.id ? { is_manual_override: true, user_edited_at: new Date().toISOString() } : {})
        }
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      setFormError(e.message || 'Erro ao agendar serviço operacional.');
    } finally {
      setLoading(false);
    }
  };

  const filteredChacaras = chacaras.filter(ch => 
    ch.name.toLowerCase().includes(chacaraSearchTerm.toLowerCase())
  );

  const filteredCrew = crewMembers.filter(c => 
    c.nome?.toLowerCase().includes(crewSearchTerm.toLowerCase()) ||
    c.roles?.some(r => r.nome?.toLowerCase().includes(crewSearchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full sm:max-w-xl bg-[#0A0F2C] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[100vh] sm:max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500 p-2.5 rounded-2xl text-[#0A0F2C]">
              <Wrench size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {eventToEdit ? 'Editar Serviço' : 'Agendar Serviço Operacional'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold">
                <span>Passo {step} de 3</span>
                <span className="text-white/30">•</span>
                <span className="text-white/70">
                  {step === 1 && 'Etapa 1: Serviço e Chácara'}
                  {step === 2 && 'Etapa 2: Data e Horário'}
                  {step === 3 && 'Etapa 3: Responsável e Opções'}
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
            className="bg-cyan-400 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          
          {/* STEP 1: TIPO DE SERVIÇO & CHÁCARA */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench size={18} className="text-cyan-400" />
                  Qual é o serviço e onde será realizado?
                </h3>
                <p className="text-xs text-white/50">Selecione a categoria da manutenção/equipe</p>
              </div>

              {/* Event Type Grid Buttons */}
              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-2">Tipo de Serviço</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { code: 'limpeza', label: '🧹 Limpeza Geral' },
                    { code: 'piscina', label: '🏊 Piscina' },
                    { code: 'jardinagem', label: '🌱 Jardinagem' },
                    { code: 'manutencao', label: '🔧 Manutenção' },
                    { code: 'vistoria', label: '📋 Vistoria' },
                    { code: 'outro', label: '✨ Outro' }
                  ].map(t => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setEventTypeCode(t.code)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left ${
                        eventTypeCode === t.code 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md' 
                          : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chácara Search */}
              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Chácara *</label>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Pesquisar chácara..."
                    value={chacaraSearchTerm}
                    onChange={(e) => setChacaraSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {filteredChacaras.map(ch => {
                    const isSelected = chacaraId === ch.id;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => setChacaraId(ch.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold' 
                            : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                        }`}
                      >
                        <span className="text-xs">{ch.name}</span>
                        {isSelected && <Check size={16} className="text-cyan-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DATA & HORÁRIO */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-cyan-400" />
                  Quando o serviço deve ocorrer?
                </h3>
                <p className="text-xs text-white/50">Defina o dia e os horários previstos</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Data do Serviço</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Horário Início</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Horário Término</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESPONSÁVEL & ACCORDION AVANÇADO */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck size={18} className="text-cyan-400" />
                  Quem executará o serviço?
                </h3>
                <p className="text-xs text-white/50">Vincule o prestador responsável</p>
              </div>

              {/* Crew Search */}
              <div>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Pesquisar funcionário responsável..."
                    value={crewSearchTerm}
                    onChange={(e) => setCrewSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                  <div
                    onClick={() => setPrimaryStaffId('')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      !primaryStaffId ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold' : 'bg-white/5 border-white/10 text-white/60'
                    }`}
                  >
                    <span className="text-xs">A definir / Qualquer disponível</span>
                    {!primaryStaffId && <Check size={16} className="text-cyan-400" />}
                  </div>

                  {filteredCrew.map(c => {
                    const isSelected = primaryStaffId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setPrimaryStaffId(c.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold' : 'bg-white/5 border-white/10 text-white/70'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{c.nome}</p>
                          <p className="text-[10px] text-white/40">{c.roles?.[0]?.nome || 'Equipe'}</p>
                        </div>
                        {isSelected && <Check size={16} className="text-cyan-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CARD DE AUTOMAÇÃO FINANCEIRA: CONTAS A PAGAR */}
              {primaryStaffId ? (
                <div className="p-3.5 sm:p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-cyan-500 text-[#0A0F2C] p-1.5 rounded-lg">
                        <DollarSign size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          Automação: Contas a Pagar
                          <span className="text-[9px] bg-cyan-400/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded-md border border-cyan-400/30">
                            Automático
                          </span>
                        </h4>
                        <p className="text-[11px] text-white/60">
                          {matchingRule 
                            ? `Regra ativa: ${matchingRule.descricao_padrao}`
                            : 'Nenhuma regra padrão cadastrada para este prestador'}
                        </p>
                      </div>
                    </div>

                    {linkedAccount ? (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        linkedAccount.status === 'PAGA'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : linkedAccount.status === 'VENCIDA'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        Conta {linkedAccount.status}
                      </span>
                    ) : null}
                  </div>

                  {linkedAccount ? (
                    <div className="bg-black/30 p-2.5 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-white/80">
                        <span>Valor da Conta:</span>
                        <strong className="text-cyan-400 font-bold">
                          R$ {Number(linkedAccount.valor_previsto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-white/60 text-[11px]">
                        <span>Vencimento:</span>
                        <span>{linkedAccount.data_vencimento}</span>
                      </div>
                      {linkedAccount.status === 'PAGA' && (
                        <p className="text-[10px] text-emerald-400 pt-1 border-t border-white/10 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Esta conta já foi PAGA. O histórico financeiro está blindado e não será alterado.
                        </p>
                      )}
                    </div>
                  ) : matchingRule ? (
                    <div className="bg-black/30 p-2.5 rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Valor Previsto:</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-400 font-bold text-sm">
                            R$ {Number(customAmount || matchingRule.valor_padrao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                          <button
                            type="button"
                            onClick={() => setShowCustomPricing(!showCustomPricing)}
                            className="text-[10px] text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                          >
                            {showCustomPricing ? 'Fechar' : 'Editar Valor'}
                          </button>
                        </div>
                      </div>

                      {showCustomPricing && (
                        <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                          <span className="text-[11px] text-white/60">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder={matchingRule.valor_padrao.toString()}
                            className="flex-1 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-400"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-white/60 text-[11px]">
                        <span>Regra de Vencimento:</span>
                        <span>
                          {matchingRule.regra_vencimento === 'SAME_DAY'
                            ? 'Mesmo dia do serviço'
                            : matchingRule.regra_vencimento === 'DAYS_AFTER'
                            ? `${matchingRule.dias_apos_servico || 0} dias após o serviço (${calculateDueDateFromRule(startDate, 'DAYS_AFTER', matchingRule.dias_apos_servico)})`
                            : `Dia ${matchingRule.dia_fixo_mes || 5} do mês seguinte`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/50 bg-black/20 p-2.5 rounded-xl">
                      Para gerar a conta a pagar automaticamente, você pode configurar a regra padrão deste prestador no módulo Contas a Pagar.
                    </p>
                  )}
                </div>
              ) : null}

              {/* ACCORDION OPÇÕES AVANÇADAS */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-4 py-3 text-xs font-bold text-white/70 hover:text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-cyan-400" />
                    ▼ Mais opções (Instruções & Prioridade)
                  </span>
                  {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Prioridade</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="BAIXA" className="bg-[#0A0F2C]">Baixa</option>
                        <option value="MEDIA" className="bg-[#0A0F2C]">Média</option>
                        <option value="ALTA" className="bg-[#0A0F2C]">Alta</option>
                        <option value="URGENTE" className="bg-[#0A0F2C]">Urgente</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Instruções / Observações</label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Verificar motor do filtro, trazer produtos..."
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
            <div className="flex items-center gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(prev => prev - 1)}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Voltar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              {eventToEdit && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-3.5 py-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Excluir este serviço"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              )}
            </div>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-cyan-400 hover:bg-cyan-300 text-[#0A0F2C] font-black py-3 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                <span>Próximo Passo</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-[#0A0F2C] font-black py-3 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Salvar Serviço</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Modal Confirmar Exclusão de Serviço */}
        <DeleteServiceConfirmModal
          isOpen={isDeleteModalOpen}
          event={eventToEdit || null}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={async ({ scope, disableAutomation, reason }) => {
            if (!eventToEdit) return;
            await deleteOperationalEvent(eventToEdit.id, scope, {
              disableAutomation,
              reason,
              deletedBy: 'Administrador'
            });
            setIsDeleteModalOpen(false);
            onClose();
            onSuccess();
          }}
        />
      </div>
    </div>
  );
}
