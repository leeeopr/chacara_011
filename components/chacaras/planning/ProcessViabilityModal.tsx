'use client';

import React, { useState, useEffect, useId } from 'react';
import { 
  X, 
  Sparkles, 
  Calculator, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Plus, 
  Trash2, 
  TrendingDown, 
  Info,
  RefreshCw,
  Sliders,
  ChevronRight,
  ArrowDownRight,
  FileText,
  User,
  TreePine,
  HelpCircle
} from 'lucide-react';
import { 
  PlanningProcess, 
  CreatePlanningProcessInput, 
  UpdatePlanningProcessInput,
  PlanningProcessType, 
  PlanningProcessStatus,
  PaymentScheduleType,
  ProcessPriority,
  ProcessViabilityResult,
  PROCESS_TYPE_META,
  PROCESS_STATUS_META
} from '@/lib/planningProcessTypes';
import { Chacara } from '@/lib/chacaraTypes';
import { formatCurrency } from '@/lib/utils';
import { simulateProcessViability } from '@/services/financialProjectionService';
import { createPlanningProcess, updatePlanningProcess } from '@/services/planningProcessService';

interface ProcessViabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  processToEdit?: PlanningProcess | null;
  chacaras: Chacara[];
}

export default function ProcessViabilityModal({
  isOpen,
  onClose,
  onSaved,
  processToEdit,
  chacaras
}: ProcessViabilityModalProps) {
  const formId = useId();
  const isEditing = Boolean(processToEdit);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chacaraId, setChacaraId] = useState<string>('');
  const [processType, setProcessType] = useState<PlanningProcessType>('MANUTENCAO');
  const [priority, setPriority] = useState<ProcessPriority>('MEDIA');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentScheduleType>('A_VISTA');
  const [startDate, setStartDate] = useState<string>('');
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [safetyBuffer, setSafetyBuffer] = useState<number>(5000);
  const [notes, setNotes] = useState<string>('');

  // Disbursements state
  const [disbursements, setDisbursements] = useState<Array<{
    id?: string;
    installment_number: number;
    due_date: string;
    amount: number;
    notes?: string;
  }>>([]);

  // Simulation State ("What-If")
  const [simulationResult, setSimulationResult] = useState<ProcessViabilityResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Number of installments generator helper
  const [installmentsCount, setInstallmentsCount] = useState(2);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    const todayStr = new Date().toISOString().split('T')[0];

    if (processToEdit) {
      setTitle(processToEdit.title || '');
      setDescription(processToEdit.description || '');
      setChacaraId(processToEdit.chacara_id || '');
      setProcessType(processToEdit.process_type || 'MANUTENCAO');
      setPriority(processToEdit.priority || 'MEDIA');
      setEstimatedCost(processToEdit.estimated_cost || 0);
      setPaymentMethod(processToEdit.payment_method || 'A_VISTA');
      setStartDate(processToEdit.start_date || todayStr);
      setResponsibleName(processToEdit.responsible_name || '');
      setSafetyBuffer(processToEdit.safety_buffer_amount !== undefined ? processToEdit.safety_buffer_amount : 5000);
      setNotes(processToEdit.notes || '');

      if (processToEdit.disbursements && processToEdit.disbursements.length > 0) {
        setDisbursements(processToEdit.disbursements.map(d => ({
          id: d.id,
          installment_number: d.installment_number,
          due_date: d.due_date,
          amount: d.amount,
          notes: d.notes
        })));
        setInstallmentsCount(processToEdit.disbursements.length);
      } else {
        setDisbursements([{
          installment_number: 1,
          due_date: processToEdit.target_date || todayStr,
          amount: processToEdit.estimated_cost || 0,
          notes: 'Pagamento principal'
        }]);
        setInstallmentsCount(1);
      }
    } else {
      // Default new process
      setTitle('');
      setDescription('');
      setChacaraId(chacaras[0]?.id || '');
      setProcessType('MANUTENCAO');
      setPriority('MEDIA');
      setEstimatedCost(8000);
      setPaymentMethod('A_VISTA');
      setStartDate(todayStr);
      setResponsibleName('');
      setSafetyBuffer(5000);
      setNotes('');
      setDisbursements([{
        installment_number: 1,
        due_date: todayStr,
        amount: 8000,
        notes: 'À vista na contratação'
      }]);
      setInstallmentsCount(1);
    }
    setErrorMessage(null);
  }, [isOpen, processToEdit, chacaras]);

  // Recalculate disbursements whenever paymentMethod, estimatedCost, startDate or installmentsCount change
  const handleGenerateInstallments = (count: number, method: PaymentScheduleType, total: number, baseDate: string) => {
    const validCount = Math.max(1, count);
    const validTotal = Math.max(0, total);
    const startDateObj = baseDate ? new Date(baseDate + 'T12:00:00') : new Date();

    if (method === 'A_VISTA' || validCount === 1) {
      setDisbursements([{
        installment_number: 1,
        due_date: baseDate || new Date().toISOString().split('T')[0],
        amount: validTotal,
        notes: 'À vista'
      }]);
      return;
    }

    if (method === 'PAGAMENTO_FUTURO_UNICO') {
      const futureDate = new Date(startDateObj);
      futureDate.setDate(futureDate.getDate() + 30);
      setDisbursements([{
        installment_number: 1,
        due_date: futureDate.toISOString().split('T')[0],
        amount: validTotal,
        notes: 'Pagamento futuro único (30 dias)'
      }]);
      return;
    }

    // Parcelado
    const installmentValue = Math.floor((validTotal / validCount) * 100) / 100;
    const remainder = Math.round((validTotal - (installmentValue * validCount)) * 100) / 100;

    const newDisbursements: Array<{
      installment_number: number;
      due_date: string;
      amount: number;
      notes?: string;
    }> = [];

    for (let i = 0; i < validCount; i++) {
      const dDate = new Date(startDateObj);
      dDate.setMonth(dDate.getMonth() + i);
      const isLast = i === validCount - 1;
      const amt = isLast ? Math.round((installmentValue + remainder) * 100) / 100 : installmentValue;

      newDisbursements.push({
        installment_number: i + 1,
        due_date: dDate.toISOString().split('T')[0],
        amount: amt,
        notes: `Parcela ${i + 1}/${validCount}`
      });
    }

    setDisbursements(newDisbursements);
  };

  // Real-time "What-If" Simulation Hook
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const runSimulation = async () => {
      setSimulating(true);
      try {
        const res = await simulateProcessViability({
          title: title || 'Processo em Simulação',
          processType,
          estimatedCost,
          disbursements,
          safetyBuffer,
          chacara_id: chacaraId || undefined
        });
        if (isMounted) {
          setSimulationResult(res);
        }
      } catch (err) {
        console.error('Erro na simulação em tempo real:', err);
      } finally {
        if (isMounted) setSimulating(false);
      }
    };

    const timer = setTimeout(runSimulation, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, title, processType, estimatedCost, disbursements, safetyBuffer, chacaraId]);

  const handleUpdateDisbursement = (index: number, field: string, value: any) => {
    const updated = [...disbursements];
    if (!updated[index]) return;
    
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? Number(value) : value
    };

    setDisbursements(updated);

    // Update total estimatedCost sum
    const newSum = updated.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    setEstimatedCost(Math.round(newSum * 100) / 100);
  };

  const handleAddDisbursement = () => {
    const lastDate = disbursements[disbursements.length - 1]?.due_date || startDate || new Date().toISOString().split('T')[0];
    const nextDate = new Date(lastDate + 'T12:00:00');
    nextDate.setMonth(nextDate.getMonth() + 1);

    const nextIndex = disbursements.length + 1;
    setDisbursements([
      ...disbursements,
      {
        installment_number: nextIndex,
        due_date: nextDate.toISOString().split('T')[0],
        amount: 0,
        notes: `Parcela ${nextIndex}`
      }
    ]);
  };

  const handleRemoveDisbursement = (index: number) => {
    if (disbursements.length <= 1) return;
    const updated = disbursements.filter((_, i) => i !== index).map((d, i) => ({
      ...d,
      installment_number: i + 1
    }));
    setDisbursements(updated);
    const newSum = updated.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    setEstimatedCost(Math.round(newSum * 100) / 100);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Por favor, informe o título do processo.');
      return;
    }

    if (estimatedCost <= 0) {
      setErrorMessage('O custo estimado deve ser maior que zero.');
      return;
    }

    if (disbursements.length === 0) {
      setErrorMessage('Cadastre pelo menos uma parcela ou data de desembolso.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      if (isEditing && processToEdit) {
        await updatePlanningProcess(processToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          chacara_id: chacaraId || null,
          process_type: processType,
          estimated_cost: estimatedCost,
          payment_method: paymentMethod,
          disbursements,
          start_date: startDate || null,
          target_date: disbursements[0]?.due_date || startDate || null,
          priority,
          notes: notes.trim(),
          responsible_name: responsibleName.trim(),
          safety_buffer_amount: safetyBuffer,
          latest_viability_analysis: simulationResult
        });
      } else {
        await createPlanningProcess({
          title: title.trim(),
          description: description.trim(),
          chacara_id: chacaraId || null,
          process_type: processType,
          estimated_cost: estimatedCost,
          payment_method: paymentMethod,
          disbursements,
          start_date: startDate || null,
          target_date: disbursements[0]?.due_date || startDate || null,
          priority,
          notes: notes.trim(),
          responsible_name: responsibleName.trim(),
          safety_buffer_amount: safetyBuffer
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar processo:', err);
      setErrorMessage(err?.message || 'Falha ao salvar processo de planejamento.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentTypeMeta = PROCESS_TYPE_META[processType] || PROCESS_TYPE_META.OUTRO;
  const verdict = simulationResult?.verdict || 'DADOS_INSUFICIENTES';

  return (
    <div 
      id={`modal-overlay-${formId}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id={`modal-container-${formId}`}
        className="relative w-full max-w-6xl my-auto rounded-3xl bg-[#0F172A] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00E5FF]/20 to-[#3B82F6]/20 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {isEditing ? 'Editar & Simular Processo' : 'Novo Processo & Viabilidade Financeira'}
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-bold bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                  Simulação &quot;E Se?&quot;
                </span>
              </h2>
              <p className="text-xs text-white/60">
                Avalie o impacto no caixa livre, menor saldo projetado e reserva de emergência antes de autorizar.
              </p>
            </div>
          </div>

          <button
            id={`btn-close-modal-${formId}`}
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split Layout (Form on Left, Live Simulator on Right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* LEFT: Process Details & Payment Schedule (7 Cols) */}
          <div className="lg:col-span-7 p-6 space-y-6 overflow-y-auto">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Título e Chácara */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                  Título do Processo *
                </label>
                <input
                  id={`input-title-${formId}`}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Manutenção do motor da piscina, Aquisição de Enxoval, etc."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#00E5FF] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                    Chácara Relacionada
                  </label>
                  <select
                    id={`select-chacara-${formId}`}
                    value={chacaraId}
                    onChange={(e) => setChacaraId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-all"
                  >
                    <option value="">Geral / Todas as Propriedades</option>
                    {chacaras.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                    Tipo do Processo
                  </label>
                  <select
                    id={`select-type-${formId}`}
                    value={processType}
                    onChange={(e) => setProcessType(e.target.value as PlanningProcessType)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-all"
                  >
                    <option value="MANUTENCAO">Manutenção / Infraestrutura</option>
                    <option value="COMPRA">Compra / Suprimentos</option>
                    <option value="MELHORIA_INVESTIMENTO">Melhoria / Investimento</option>
                    <option value="OUTRO">Outro Processo</option>
                  </select>
                </div>
              </div>

              {/* Guidance Box based on Process Type */}
              <div className={`p-3.5 rounded-2xl ${currentTypeMeta.badgeBg} border ${currentTypeMeta.borderClass} flex items-start gap-3`}>
                <Info size={16} className={`shrink-0 mt-0.5 ${currentTypeMeta.textClass}`} />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-white/90">{currentTypeMeta.label}</p>
                  <p className="text-white/70 leading-relaxed">{currentTypeMeta.reservaGuidance}</p>
                </div>
              </div>
            </div>

            {/* 2. Custo e Forma de Pagamento */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h3 className="text-xs font-black text-[#00E5FF] uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={16} />
                Custos & Cronograma de Desembolso
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                    Custo Total (R$) *
                  </label>
                  <input
                    id={`input-cost-${formId}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={estimatedCost || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEstimatedCost(val);
                      handleGenerateInstallments(installmentsCount, paymentMethod, val, startDate);
                    }}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    id={`select-payment-method-${formId}`}
                    value={paymentMethod}
                    onChange={(e) => {
                      const method = e.target.value as PaymentScheduleType;
                      setPaymentMethod(method);
                      const cnt = method === 'PARCELADO' ? Math.max(2, installmentsCount) : 1;
                      setInstallmentsCount(cnt);
                      handleGenerateInstallments(cnt, method, estimatedCost, startDate);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="A_VISTA">À Vista (1 Parcela)</option>
                    <option value="PARCELADO">Parcelado</option>
                    <option value="PAGAMENTO_FUTURO_UNICO">Pagamento Futuro Único</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                    Data 1º Vencimento
                  </label>
                  <input
                    id={`input-start-date-${formId}`}
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      handleGenerateInstallments(installmentsCount, paymentMethod, estimatedCost, e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              {paymentMethod === 'PARCELADO' && (
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70">Quantidade de Parcelas:</span>
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 6, 12].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setInstallmentsCount(num);
                            handleGenerateInstallments(num, 'PARCELADO', estimatedCost, startDate);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            installmentsCount === num 
                              ? 'bg-[#00E5FF] text-slate-950 shadow-md' 
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {num}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDisbursement}
                    className="text-xs text-[#00E5FF] font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Parcela
                  </button>
                </div>
              )}

              {/* Lista Detalhada de Parcelas */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider flex justify-between">
                  <span>Cronograma de Desembolsos</span>
                  <span>Total: {formatCurrency(disbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0))}</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {disbursements.map((d, index) => (
                    <div 
                      key={index}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-1 text-center font-mono font-bold text-white/50">
                        #{d.installment_number}
                      </div>
                      <div className="col-span-4">
                        <input
                          type="date"
                          value={d.due_date}
                          onChange={(e) => handleUpdateDisbursement(index, 'due_date', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#00E5FF]"
                        />
                      </div>
                      <div className="col-span-4">
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-white/40 font-mono text-[10px]">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={d.amount || ''}
                            onChange={(e) => handleUpdateDisbursement(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#00E5FF]"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={d.notes || ''}
                          onChange={(e) => handleUpdateDisbursement(index, 'notes', e.target.value)}
                          placeholder="Obs"
                          className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] placeholder:text-white/30"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {disbursements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDisbursement(index)}
                            className="text-white/40 hover:text-rose-400 p-1"
                            title="Remover parcela"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Parâmetros de Segurança & Gestão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Colchão Mínimo (R$)</span>
                  <span className="text-[10px] text-white/40 font-normal">Margem de segurança</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-white/40 font-mono text-xs">R$</span>
                  <input
                    id={`input-safety-buffer-${formId}`}
                    type="number"
                    step="500"
                    min="0"
                    value={safetyBuffer}
                    onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                  Prioridade & Responsável
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    id={`select-priority-${formId}`}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ProcessPriority)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                  <input
                    id={`input-responsible-${formId}`}
                    type="text"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    placeholder="Responsável"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>

            {/* 4. Descrição / Escopo */}
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Descrição Detalhada / Escopo do Processo
              </label>
              <textarea
                id={`textarea-desc-${formId}`}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes sobre a necessidade, fornecedor cotado, escopo do conserto ou melhoria..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>

          {/* RIGHT: Real-time Viability Engine ("What-If Panel") (5 Cols) */}
          <div className="lg:col-span-5 p-6 bg-slate-950/40 flex flex-col justify-between space-y-6 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                  <Sparkles size={16} className="text-[#00E5FF]" />
                  Motor de Viabilidade &quot;E Se?&quot;
                </div>
                {simulating && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#00E5FF] animate-pulse">
                    <RefreshCw size={12} className="animate-spin" /> Recalculando...
                  </span>
                )}
              </div>

              {/* Traffic Light Verdict Badge */}
              <div className={`p-4 rounded-2xl border transition-all ${
                verdict === 'VIAVEL' 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : verdict === 'VIAVEL_COM_ATENCAO'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : verdict === 'NAO_VIAVEL'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 border-white/15 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  {verdict === 'VIAVEL' && <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />}
                  {verdict === 'VIAVEL_COM_ATENCAO' && <AlertTriangle size={24} className="text-amber-400 shrink-0" />}
                  {verdict === 'NAO_VIAVEL' && <XCircle size={24} className="text-rose-400 shrink-0" />}
                  {verdict === 'DADOS_INSUFICIENTES' && <HelpCircle size={24} className="text-slate-400 shrink-0" />}

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                      Parecer do Sistema
                    </span>
                    <h4 className="text-base font-black leading-tight">
                      {simulationResult?.verdictTitle || 'Aguardando parâmetros'}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Key Indicators Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    Caixa Livre Hoje
                  </span>
                  <div className="text-sm font-black text-white font-mono">
                    {formatCurrency(simulationResult?.caixaOperacionalLivreHoje || 0)}
                  </div>
                  <span className="text-[9px] text-white/40 block">Descontadas cauções</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    Reserva de Emergência
                  </span>
                  <div className="text-sm font-black text-amber-400 font-mono">
                    {formatCurrency(simulationResult?.reservaEmergenciaAtual || 0)}
                  </div>
                  <span className="text-[9px] text-amber-400/60 block">Fundo Blindado</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    Menor Saldo Sem Processo
                  </span>
                  <div className="text-sm font-black text-white font-mono">
                    {formatCurrency(simulationResult?.lowestCashPointBase.amount || 0)}
                  </div>
                  <span className="text-[9px] text-white/40 block">
                    em {simulationResult?.lowestCashPointBase.date.split('-').reverse().join('/')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/15 space-y-1">
                  <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider block">
                    Menor Saldo COM Processo
                  </span>
                  <div className={`text-sm font-black font-mono ${
                    (simulationResult?.lowestCashPointSimulated.amount || 0) < 0 
                      ? 'text-rose-400' 
                      : (simulationResult?.lowestCashPointSimulated.amount || 0) < safetyBuffer
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}>
                    {formatCurrency(simulationResult?.lowestCashPointSimulated.amount || 0)}
                  </div>
                  <span className="text-[9px] text-white/50 block">
                    em {simulationResult?.lowestCashPointSimulated.date.split('-').reverse().join('/')}
                  </span>
                </div>
              </div>

              {/* Justification & Bullet points */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-[11px] font-black text-white/70 uppercase tracking-wider block">
                  Justificativa Matemática
                </span>
                
                <p className="text-xs text-white/80 leading-relaxed">
                  {simulationResult?.justificationText}
                </p>

                {simulationResult?.bulletPoints && simulationResult.bulletPoints.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {simulationResult.bulletPoints.map((pt, i) => (
                      <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                        <span className="text-[#00E5FF] shrink-0 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {simulationResult?.recommendations && simulationResult.recommendations.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Recomendações do Sistema:
                    </span>
                    <ul className="space-y-1">
                      {simulationResult.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-amber-300/80 flex items-start gap-1.5">
                          <span className="text-amber-400">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                id={`btn-cancel-${formId}`}
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                id={`btn-save-${formId}`}
                type="button"
                onClick={handleSave}
                disabled={saving || simulating}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#00E5FF] to-[#3B82F6] text-slate-950 hover:brightness-110 shadow-lg shadow-[#00E5FF]/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>{isEditing ? 'Atualizar Processo' : 'Cadastrar Processo'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
