'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lightbulb, 
  TreePine, 
  DollarSign, 
  Calendar, 
  AlignLeft, 
  Tag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Workflow,
  TrendingUp,
  Layers,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Building,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import { 
  PlanningDecision, 
  DecisionClassification,
  DecisionType, 
  DecisionPriority, 
  DECISION_TYPE_META,
  DECISION_PRIORITY_META,
  DECISION_CLASSIFICATION_META
} from '@/lib/planningTypes';
import { Chacara } from '@/lib/chacaraTypes';
import { getChacaras } from '@/services/chacarasService';
import { createPlanningDecision, updatePlanningDecision } from '@/services/planningService';
import { formatCurrency } from '@/lib/utils';

interface DecisionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (decision: PlanningDecision) => void;
  decisionToEdit?: PlanningDecision | null;
  defaultChacaraId?: string;
  defaultClassification?: DecisionClassification;
}

type StepNumber = 1 | 2 | 3 | 4;

export default function DecisionFormModal({
  isOpen,
  onClose,
  onSuccess,
  decisionToEdit,
  defaultChacaraId,
  defaultClassification
}: DecisionFormModalProps) {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  
  // Step 1: Classificação e Tipo
  const [classification, setClassification] = useState<DecisionClassification>('OPERACIONAL');
  const [decisionType, setDecisionType] = useState<DecisionType>('OPERACIONAL');
  
  // Step 2: Dados Principais & Valores
  const [title, setTitle] = useState('');
  const [chacaraId, setChacaraId] = useState<string>('NONE');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [priority, setPriority] = useState<DecisionPriority>('MEDIA');
  
  // Step 3: Justificativa & Impacto
  const [description, setDescription] = useState('');
  const [impactNotes, setImpactNotes] = useState('');

  // Status de envio
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadChacaras() {
      try {
        const list = await getChacaras();
        setChacaras(list.filter(c => !c.is_deleted));
      } catch (err) {
        console.error('Erro ao carregar chácaras no formulário:', err);
      }
    }
    if (isOpen) {
      loadChacaras();
    }
  }, [isOpen]);

  useEffect(() => {
    if (decisionToEdit) {
      setCurrentStep(1);
      setTitle(decisionToEdit.title || '');
      setClassification(decisionToEdit.classification || 'OPERACIONAL');
      setDecisionType(decisionToEdit.decision_type || 'OPERACIONAL');
      setChacaraId(decisionToEdit.chacara_id || 'NONE');
      setDescription(decisionToEdit.description || '');
      setImpactNotes(decisionToEdit.impact_notes || '');
      setEstimatedCost(decisionToEdit.estimated_cost ? String(decisionToEdit.estimated_cost) : '');
      setTargetDate(decisionToEdit.target_date || '');
      setPriority(decisionToEdit.priority || 'MEDIA');
    } else {
      const initialClass = defaultClassification || 'OPERACIONAL';
      setCurrentStep(1);
      setTitle('');
      setClassification(initialClass);
      setDecisionType(initialClass === 'PROJETO_INVESTIMENTO' ? 'INVESTIMENTO' : 'OPERACIONAL');
      setChacaraId(defaultChacaraId || 'NONE');
      setDescription('');
      setImpactNotes('');
      setEstimatedCost('');
      setTargetDate('');
      setPriority('MEDIA');
    }
    setError(null);
    setFieldErrors({});
  }, [decisionToEdit, defaultChacaraId, defaultClassification, isOpen]);

  if (!isOpen) return null;

  const handleClassificationChange = (newClassification: DecisionClassification) => {
    setClassification(newClassification);
    if (newClassification === 'PROJETO_INVESTIMENTO' && (decisionType === 'OPERACIONAL' || decisionType === 'COMPRA')) {
      setDecisionType('INVESTIMENTO');
    } else if (newClassification === 'OPERACIONAL' && decisionType === 'INVESTIMENTO') {
      setDecisionType('OPERACIONAL');
    }
  };

  // Validação por etapa
  const validateStep = (step: StepNumber): boolean => {
    const errors: Record<string, string> = {};
    setError(null);

    if (step === 1) {
      if (!classification) {
        errors.classification = 'Selecione a classificação da decisão.';
      }
      if (!decisionType) {
        errors.decisionType = 'Selecione o tipo de ação.';
      }
    } else if (step === 2) {
      if (!title.trim()) {
        errors.title = 'Por favor, informe um título descritivo para o planejamento.';
      } else if (title.trim().length < 3) {
        errors.title = 'O título deve conter pelo menos 3 caracteres.';
      }

      if (estimatedCost) {
        const parsed = parseFloat(estimatedCost.replace(',', '.'));
        if (isNaN(parsed) || parsed < 0) {
          errors.estimatedCost = 'Informe um valor numérico válido (ex: 1500,00).';
        }
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as StepNumber);
        setError(null);
        setFieldErrors({});
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as StepNumber);
      setError(null);
      setFieldErrors({});
    }
  };

  const handleFinalSubmit = async () => {
    // Validar todas as etapas
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedCost = estimatedCost ? parseFloat(estimatedCost.replace(',', '.')) : 0;
      const selectedChacaraId = chacaraId === 'NONE' ? null : chacaraId;

      if (decisionToEdit) {
        const updated = await updatePlanningDecision(decisionToEdit.id, {
          title: title.trim(),
          classification,
          decision_type: decisionType,
          chacara_id: selectedChacaraId,
          description: description.trim(),
          impact_notes: impactNotes.trim() || undefined,
          estimated_cost: isNaN(parsedCost) ? 0 : parsedCost,
          target_date: targetDate || null,
          priority
        });
        onSuccess(updated);
      } else {
        const created = await createPlanningDecision({
          title: title.trim(),
          classification,
          decision_type: decisionType,
          chacara_id: selectedChacaraId,
          description: description.trim(),
          impact_notes: impactNotes.trim() || undefined,
          estimated_cost: isNaN(parsedCost) ? 0 : parsedCost,
          target_date: targetDate || null,
          priority,
          status: 'EM_ANALISE'
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar decisão de planejamento:', err);
      setError(err?.message || 'Ocorreu um erro ao salvar a decisão no banco de dados. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectedChacaraName = chacaras.find(c => c.id === chacaraId)?.name || 'Geral (Sem Chácara Específica)';
  const parsedCostPreview = estimatedCost ? parseFloat(estimatedCost.replace(',', '.')) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0D153A] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* ========================================================================= */}
        {/* CABEÇALHO DO MODAL                                                        */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A0F2C] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              classification === 'PROJETO_INVESTIMENTO' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              {classification === 'PROJETO_INVESTIMENTO' ? <TrendingUp size={20} /> : <Workflow size={20} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {decisionToEdit ? 'Editar Planejamento / Decisão' : 'Novo Planejamento & Decisão'}
              </h2>
              <p className="text-[11px] text-white/50">
                {decisionToEdit 
                  ? 'Atualize os dados e previsões financeiras da decisão' 
                  : 'Cadastre a proposta de gasto ou investimento com governança'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* WIZARD PROGRESS BAR (ETAPAS)                                              */}
        {/* ========================================================================= */}
        <div className="bg-[#0A0F2C]/60 px-6 py-3 border-b border-white/5 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Classificação' },
              { num: 2, label: 'Definição' },
              { num: 3, label: 'Impacto' },
              { num: 4, label: 'Confirmação' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (isPast) setCurrentStep(step.num as StepNumber);
                    else if (step.num === currentStep + 1 && validateStep(currentStep)) {
                      setCurrentStep(step.num as StepNumber);
                    }
                  }}
                  className={`flex items-center gap-2 p-1.5 rounded-xl text-left transition-all ${
                    isActive 
                      ? 'bg-[#FFD600]/15 border border-[#FFD600]/40 text-white' 
                      : isPast 
                        ? 'text-emerald-400 hover:bg-white/5 cursor-pointer' 
                        : 'text-white/30 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isActive 
                      ? 'bg-[#FFD600] text-[#0A0F2C]' 
                      : isPast 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-white/10 text-white/40'
                  }`}>
                    {isPast ? <Check size={11} /> : step.num}
                  </div>
                  <span className="text-[11px] font-bold truncate hidden sm:inline">
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPO DO FORMULÁRIO (CONTEÚDO DINÂMICO POR ETAPA)                        */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Atenção</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* ETAPA 1: CLASSIFICAÇÃO E TIPO DE AÇÃO                                  */}
          {/* ----------------------------------------------------------------------- */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                  1. Qual é a natureza deste planejamento? <span className="text-rose-400">*</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Opção: Decisão Operacional */}
                  <button
                    type="button"
                    onClick={() => handleClassificationChange('OPERACIONAL')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      classification === 'OPERACIONAL'
                        ? 'bg-cyan-500/15 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-300 flex items-center gap-2">
                        <Workflow size={16} />
                        Decisão Operacional
                      </span>
                      {classification === 'OPERACIONAL' && (
                        <CheckCircle2 size={16} className="text-cyan-400" />
                      )}
                    </div>
                    <p className="text-xs text-white/70 mt-2 leading-relaxed">
                      Gastos e melhorias rotineiras do dia a dia.
                    </p>
                    <span className="text-[10px] text-cyan-200/60 mt-1 block font-medium">
                      Ex: Troca de colchões, insumos, reparos rápidos, prestadores
                    </span>
                  </button>

                  {/* Opção: Projeto / Investimento */}
                  <button
                    type="button"
                    onClick={() => handleClassificationChange('PROJETO_INVESTIMENTO')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      classification === 'PROJETO_INVESTIMENTO'
                        ? 'bg-emerald-500/15 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-300 flex items-center gap-2">
                        <Sparkles size={16} />
                        Projeto & Investimento
                      </span>
                      {classification === 'PROJETO_INVESTIMENTO' && (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-white/70 mt-2 leading-relaxed">
                      Projetos estruturais de alto impacto financeiro.
                    </p>
                    <span className="text-[10px] text-emerald-200/60 mt-1 block font-medium">
                      Ex: Construção de piscina, placas solares, reformas, climatização
                    </span>
                  </button>
                </div>
              </div>

              {/* Tipo de Ação Específica */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                  2. Categoria / Tipo Específico
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(DECISION_TYPE_META) as DecisionType[]).map((tp) => {
                    const isSelected = decisionType === tp;
                    const meta = DECISION_TYPE_META[tp];
                    return (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setDecisionType(tp)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-[#FFD600]/15 border-[#FFD600]/50 text-white ring-1 ring-[#FFD600]/30'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className={`text-xs font-black ${isSelected ? 'text-[#FFD600]' : 'text-white'}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-white/40 truncate">
                          {tp === 'INVESTIMENTO' && 'Capex & expansão'}
                          {tp === 'REFORMA' && 'Obras e alvenaria'}
                          {tp === 'COMPRA' && 'Móveis & aparelhos'}
                          {tp === 'MANUTENCAO' && 'Preventiva/Corretiva'}
                          {tp === 'OPERACIONAL' && 'Rotina diária'}
                          {tp === 'OUTRO' && 'Diversos'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* ETAPA 2: DADOS PRINCIPAIS, VALORES E PRAZO                              */}
          {/* ----------------------------------------------------------------------- */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                  Título do Planejamento <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={
                    classification === 'PROJETO_INVESTIMENTO' 
                      ? "Ex: Aquecimento solar da piscina principal" 
                      : "Ex: Aquisição de 4 novos jogos de lençol e colchões"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full bg-[#0A0F2C] border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-colors ${
                    fieldErrors.title ? 'border-rose-500 focus:border-rose-400' : 'border-white/15 focus:border-[#FFD600]'
                  }`}
                />
                {fieldErrors.title && (
                  <span className="text-[11px] text-rose-400 block">{fieldErrors.title}</span>
                )}
              </div>

              {/* Chácara Relacionada */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                  Chácara / Propriedade Relacionada
                </label>
                <select
                  value={chacaraId}
                  onChange={(e) => setChacaraId(e.target.value)}
                  className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                >
                  <option value="NONE">Geral (Todas as Propriedades ou Corporativo)</option>
                  {chacaras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custo Estimado, Prazo e Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Custo Estimado */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                    Custo Estimado (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      className={`w-full bg-[#0A0F2C] border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors ${
                        fieldErrors.estimatedCost ? 'border-rose-500' : 'border-white/15 focus:border-[#FFD600]'
                      }`}
                    />
                  </div>
                  {fieldErrors.estimatedCost && (
                    <span className="text-[10px] text-rose-400 block">{fieldErrors.estimatedCost}</span>
                  )}
                </div>

                {/* Data Desejada / Prazo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                    Data Alvo / Previsão
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Prioridade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                    Prioridade
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as DecisionPriority)}
                    className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    {(Object.keys(DECISION_PRIORITY_META) as DecisionPriority[]).map((pr) => (
                      <option key={pr} value={pr}>
                        {DECISION_PRIORITY_META[pr].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* ETAPA 3: JUSTIFICATIVA, FORNECEDORES & IMPACTO                          */}
          {/* ----------------------------------------------------------------------- */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                  Descrição & Justificativa Técnica
                </label>
                <textarea
                  rows={4}
                  placeholder="Detalhe o escopo, orçamento de fornecedores cotados, necessidade operacional ou benefício para os hóspedes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                  Notas de Retorno / Impacto Financeiro (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Aumento estimado de R$ 150 na diária média após conclusão da obra..."
                  value={impactNotes}
                  onChange={(e) => setImpactNotes(e.target.value)}
                  className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* ETAPA 4: REVISÃO & CONFIRMAÇÃO FINAL ANTES DE SALVAR                   */}
          {/* ----------------------------------------------------------------------- */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-[#0A0F2C] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Resumo do Planejamento</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    classification === 'PROJETO_INVESTIMENTO'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  }`}>
                    {classification === 'PROJETO_INVESTIMENTO' ? 'Projeto / Investimento' : 'Decisão Operacional'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-white/40 block font-medium">Título da Decisão</span>
                    <h3 className="text-base font-black text-white">{title || 'Sem título informado'}</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <span className="text-[10px] text-white/40 block uppercase font-bold">Tipo de Ação</span>
                      <span className="text-xs font-bold text-white">{DECISION_TYPE_META[decisionType]?.label}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/40 block uppercase font-bold">Chácara</span>
                      <span className="text-xs font-bold text-white truncate block">{selectedChacaraName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/40 block uppercase font-bold">Custo Estimado</span>
                      <span className="text-xs font-black text-[#FFD600]">
                        {parsedCostPreview > 0 ? formatCurrency(parsedCostPreview) : 'Sob Orçamento'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/40 block uppercase font-bold">Data Alvo</span>
                      <span className="text-xs font-bold text-white">{targetDate || 'A definir'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/40 block uppercase font-bold">Prioridade</span>
                      <span className="text-xs font-bold text-white">{DECISION_PRIORITY_META[priority]?.label}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/40 block uppercase font-bold">Status Inicial</span>
                      <span className="text-xs font-bold text-amber-300">Em Análise</span>
                    </div>
                  </div>

                  {description && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[10px] text-white/40 block uppercase font-bold">Justificativa</span>
                      <p className="text-xs text-white/70 mt-0.5 leading-relaxed line-clamp-3">{description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-xl flex items-center gap-2.5 text-xs text-[#FFD600]">
                <ShieldCheck size={16} className="shrink-0" />
                <span>O planejamento será salvo diretamente no Supabase com trilha de auditoria e status &quot;Em Análise&quot;.</span>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* RODAPÉ COM NAVEGAÇÃO DE ETAPAS E AÇÃO FINAL                              */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0A0F2C] flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ArrowLeft size={15} />
                <span>Voltar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl bg-[#FFD600] hover:bg-[#ffe033] text-[#0A0F2C] text-xs font-black shadow-lg shadow-[#FFD600]/15 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#FFD600] hover:bg-[#ffe033] text-[#0A0F2C] text-xs font-black shadow-xl shadow-[#FFD600]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Salvando no Supabase...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{decisionToEdit ? 'Confirmar Alterações' : 'Criar Planejamento'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
