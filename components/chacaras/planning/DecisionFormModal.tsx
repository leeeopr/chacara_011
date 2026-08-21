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
  HelpCircle
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

interface DecisionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (decision: PlanningDecision) => void;
  decisionToEdit?: PlanningDecision | null;
  defaultChacaraId?: string;
  defaultClassification?: DecisionClassification;
}

export default function DecisionFormModal({
  isOpen,
  onClose,
  onSuccess,
  decisionToEdit,
  defaultChacaraId,
  defaultClassification
}: DecisionFormModalProps) {
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState<DecisionClassification>('OPERACIONAL');
  const [decisionType, setDecisionType] = useState<DecisionType>('OPERACIONAL');
  const [chacaraId, setChacaraId] = useState<string>('NONE');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [priority, setPriority] = useState<DecisionPriority>('MEDIA');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setTitle(decisionToEdit.title || '');
      setClassification(decisionToEdit.classification || 'OPERACIONAL');
      setDecisionType(decisionToEdit.decision_type || 'OPERACIONAL');
      setChacaraId(decisionToEdit.chacara_id || 'NONE');
      setDescription(decisionToEdit.description || '');
      setEstimatedCost(decisionToEdit.estimated_cost ? String(decisionToEdit.estimated_cost) : '');
      setTargetDate(decisionToEdit.target_date || '');
      setPriority(decisionToEdit.priority || 'MEDIA');
    } else {
      const initialClass = defaultClassification || 'OPERACIONAL';
      setTitle('');
      setClassification(initialClass);
      setDecisionType(initialClass === 'PROJETO_INVESTIMENTO' ? 'INVESTIMENTO' : 'OPERACIONAL');
      setChacaraId(defaultChacaraId || 'NONE');
      setDescription('');
      setEstimatedCost('');
      setTargetDate('');
      setPriority('MEDIA');
    }
    setError(null);
  }, [decisionToEdit, defaultChacaraId, defaultClassification, isOpen]);

  if (!isOpen) return null;

  const handleClassificationChange = (newClassification: DecisionClassification) => {
    setClassification(newClassification);
    // Ajustar sugestão de tipo padrão caso o usuário não tenha escolhido algo específico
    if (newClassification === 'PROJETO_INVESTIMENTO' && (decisionType === 'OPERACIONAL' || decisionType === 'COMPRA')) {
      setDecisionType('INVESTIMENTO');
    } else if (newClassification === 'OPERACIONAL' && decisionType === 'INVESTIMENTO') {
      setDecisionType('OPERACIONAL');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe um título para a decisão.');
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
      setError(err?.message || 'Ocorreu um erro ao salvar a decisão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0D153A] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0A0F2C]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              classification === 'PROJETO_INVESTIMENTO' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              {classification === 'PROJETO_INVESTIMENTO' ? <TrendingUp size={20} /> : <Workflow size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {decisionToEdit ? 'Editar Decisão' : 'Nova Decisão'}
              </h2>
              <p className="text-xs text-white/50">
                {decisionToEdit 
                  ? 'Atualize as informações da decisão em análise' 
                  : 'Cadastre a proposta para acompanhamento e deliberação'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. CLASSIFICAÇÃO DA DECISÃO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
              Classificação da Decisão <span className="text-rose-400">*</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opção: Decisão Operacional */}
              <button
                type="button"
                onClick={() => handleClassificationChange('OPERACIONAL')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  classification === 'OPERACIONAL'
                    ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Workflow size={14} />
                    Decisão Operacional
                  </span>
                  {classification === 'OPERACIONAL' && (
                    <CheckCircle2 size={15} className="text-cyan-400" />
                  )}
                </div>
                <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">
                  Decisões pontuais do dia a dia.
                  <span className="block text-[10px] text-cyan-200/50 mt-0.5">Ex: Colchões, prestadores, consertos rápidos</span>
                </p>
              </button>

              {/* Opção: Projeto / Investimento */}
              <button
                type="button"
                onClick={() => handleClassificationChange('PROJETO_INVESTIMENTO')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  classification === 'PROJETO_INVESTIMENTO'
                    ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Projeto / Investimento
                  </span>
                  {classification === 'PROJETO_INVESTIMENTO' && (
                    <CheckCircle2 size={15} className="text-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">
                  Decisões de alto impacto financeiro.
                  <span className="block text-[10px] text-emerald-200/50 mt-0.5">Ex: Piscina, energia solar, suítes, reformas</span>
                </p>
              </button>
            </div>
          </div>

          {/* 2. TÍTULO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
              Título da Decisão <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={classification === 'PROJETO_INVESTIMENTO' ? "Ex: Construir piscina aquecida na Chácara Recanto" : "Ex: Trocar colchões das suítes 1 e 2"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
            />
          </div>

          {/* 3. TIPO E CHÁCARA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                Tipo de Ação
              </label>
              <select
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value as DecisionType)}
                className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
              >
                {(Object.keys(DECISION_TYPE_META) as DecisionType[]).map((tp) => (
                  <option key={tp} value={tp}>
                    {DECISION_TYPE_META[tp].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Chácara */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                Chácara Relacionada
              </label>
              <select
                value={chacaraId}
                onChange={(e) => setChacaraId(e.target.value)}
                className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
              >
                <option value="NONE">Geral (Todas ou Sem Chácara Específica)</option>
                {chacaras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. CUSTO ESTIMADO E DATA DESEJADA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Custo Estimado */}
            <div className="space-y-1.5 sm:col-span-1">
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
                  className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Data Desejada / Prazo */}
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                Data Desejada
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
              />
            </div>

            {/* Prioridade */}
            <div className="space-y-1.5 sm:col-span-1">
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

          {/* 5. DESCRIÇÃO / JUSTIFICATIVA */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
              Descrição & Justificativa (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Explique o motivo da decisão, necessidades, opções de fornecedores ou impacto esperado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/15 focus:border-[#FFD600] rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#FFD600] hover:bg-[#ffe033] text-[#0A0F2C] text-xs font-black shadow-lg shadow-[#FFD600]/20 transition-all flex items-center gap-2"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{decisionToEdit ? 'Salvar Alterações' : 'Criar Decisão'}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
