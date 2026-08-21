'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, ShieldAlert, Sparkles, Check, Layers, AlertCircle } from 'lucide-react';
import { ChacaraPricingRule, PricingRuleType } from '@/lib/chacaraTypes';

interface PricingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleData: Partial<ChacaraPricingRule>) => Promise<void>;
  ruleToEdit?: ChacaraPricingRule | null;
  chacaraId: string;
}

const RULE_TYPES: { value: PricingRuleType; label: string; description: string }[] = [
  { value: 'SPECIFIC_PERIOD', label: 'Período Específico', description: 'Preço diferenciado para um intervalo de datas exato' },
  { value: 'HIGH_SEASON', label: 'Alta Temporada', description: 'Valor especial para meses ou períodos festivos de pico' },
  { value: 'LOW_SEASON', label: 'Baixa Temporada', description: 'Desconto promocional para períodos com menor demanda' },
  { value: 'HOLIDAY_PACKAGE', label: 'Pacote de Feriado', description: 'Pacote fechado para feriados prolongados e datas comemorativas' },
  { value: 'PROMOTION', label: 'Promoção Especial', description: 'Desconto temporário para atração de reservas' },
  { value: 'SURCHARGE', label: 'Acréscimo de Evento / Alta Demanda', description: 'Acréscimo percentual ou fixo para datas com alta procura' },
  { value: 'WEEKDAY_SPECIAL', label: 'Especial Meio de Semana', description: 'Desconto automático para segundas a quintas-feiras' },
];

const DAYS_OF_WEEK = [
  { day: 0, label: 'Dom' },
  { day: 1, label: 'Seg' },
  { day: 2, label: 'Ter' },
  { day: 3, label: 'Qua' },
  { day: 4, label: 'Qui' },
  { day: 5, label: 'Sex' },
  { day: 6, label: 'Sáb' },
];

export default function PricingRuleModal({
  isOpen,
  onClose,
  onSave,
  ruleToEdit,
  chacaraId,
}: PricingRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState<PricingRuleType>('SPECIFIC_PERIOD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  
  // Pricing Mode: 'OVERRIDE' | 'DISCOUNT' | 'SURCHARGE'
  const [pricingMode, setPricingMode] = useState<'OVERRIDE' | 'DISCOUNT' | 'SURCHARGE'>('OVERRIDE');
  
  const [priceOverride, setPriceOverride] = useState<number | ''>('');
  
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  
  const [surchargeType, setSurchargeType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [surchargeValue, setSurchargeValue] = useState<number | ''>('');

  const [minStayNights, setMinStayNights] = useState<number>(1);
  const [minReservationValue, setMinReservationValue] = useState<number | ''>('');
  const [priority, setPriority] = useState<number>(10);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (ruleToEdit) {
      setName(ruleToEdit.name || '');
      setRuleType(ruleToEdit.rule_type || 'SPECIFIC_PERIOD');
      setStartDate(ruleToEdit.start_date || '');
      setEndDate(ruleToEdit.end_date || '');
      setDaysOfWeek(ruleToEdit.days_of_week && ruleToEdit.days_of_week.length > 0 ? ruleToEdit.days_of_week : [0, 1, 2, 3, 4, 5, 6]);
      
      if (ruleToEdit.price_override != null && ruleToEdit.price_override > 0) {
        setPricingMode('OVERRIDE');
        setPriceOverride(ruleToEdit.price_override);
      } else if (ruleToEdit.discount_percentage || ruleToEdit.discount_amount) {
        setPricingMode('DISCOUNT');
        if (ruleToEdit.discount_percentage) {
          setDiscountType('PERCENTAGE');
          setDiscountValue(ruleToEdit.discount_percentage);
        } else {
          setDiscountType('FIXED');
          setDiscountValue(ruleToEdit.discount_amount || '');
        }
      } else if (ruleToEdit.surcharge_percentage || ruleToEdit.surcharge_amount) {
        setPricingMode('SURCHARGE');
        if (ruleToEdit.surcharge_percentage) {
          setSurchargeType('PERCENTAGE');
          setSurchargeValue(ruleToEdit.surcharge_percentage);
        } else {
          setSurchargeType('FIXED');
          setSurchargeValue(ruleToEdit.surcharge_amount || '');
        }
      } else {
        setPricingMode('OVERRIDE');
        setPriceOverride('');
      }

      setMinStayNights(ruleToEdit.min_stay_nights || 1);
      setMinReservationValue(ruleToEdit.min_reservation_value || '');
      setPriority(ruleToEdit.priority || 10);
      setIsActive(ruleToEdit.is_active ?? true);
      setNotes(ruleToEdit.notes || '');
    } else {
      // Reset Form
      setName('');
      setRuleType('SPECIFIC_PERIOD');
      setStartDate('');
      setEndDate('');
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
      setPricingMode('OVERRIDE');
      setPriceOverride('');
      setDiscountType('PERCENTAGE');
      setDiscountValue('');
      setSurchargeType('PERCENTAGE');
      setSurchargeValue('');
      setMinStayNights(1);
      setMinReservationValue('');
      setPriority(10);
      setIsActive(true);
      setNotes('');
    }
    setErrorMessage('');
  }, [ruleToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleDayOfWeek = (day: number) => {
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length === 1) return; // manter ao menos 1 dia
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  const handleSelectAllDays = () => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
  const handleWeekdaysOnly = () => setDaysOfWeek([1, 2, 3, 4]); // Seg, Ter, Qua, Qui
  const handleWeekendsOnly = () => setDaysOfWeek([0, 5, 6]); // Sex, Sáb, Dom

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Informe o nome da regra de preço.');
      return;
    }

    if (pricingMode === 'OVERRIDE' && (priceOverride === '' || Number(priceOverride) < 0)) {
      setErrorMessage('Informe um valor de diária válido.');
      return;
    }

    if (pricingMode === 'DISCOUNT' && (discountValue === '' || Number(discountValue) <= 0)) {
      setErrorMessage('Informe o valor ou percentual de desconto válido.');
      return;
    }

    if (pricingMode === 'SURCHARGE' && (surchargeValue === '' || Number(surchargeValue) <= 0)) {
      setErrorMessage('Informe o valor ou percentual de acréscimo válido.');
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setErrorMessage('A data final não pode ser anterior à data inicial.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const payload: Partial<ChacaraPricingRule> = {
        chacara_id: chacaraId,
        name: name.trim(),
        rule_type: ruleType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        days_of_week: daysOfWeek,
        min_stay_nights: Number(minStayNights) || 1,
        min_reservation_value: minReservationValue !== '' ? Number(minReservationValue) : 0,
        priority: Number(priority) || 10,
        is_active: isActive,
        notes: notes.trim(),
        price_override: pricingMode === 'OVERRIDE' ? Number(priceOverride) : undefined,
        discount_percentage: pricingMode === 'DISCOUNT' && discountType === 'PERCENTAGE' ? Number(discountValue) : 0,
        discount_amount: pricingMode === 'DISCOUNT' && discountType === 'FIXED' ? Number(discountValue) : 0,
        surcharge_percentage: pricingMode === 'SURCHARGE' && surchargeType === 'PERCENTAGE' ? Number(surchargeValue) : 0,
        surcharge_amount: pricingMode === 'SURCHARGE' && surchargeType === 'FIXED' ? Number(surchargeValue) : 0,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar a regra de precificação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#0D1335] border border-white/15 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative my-8 text-white">
        
        {/* Header Modal */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFD600]/10 text-[#FFD600] border border-[#FFD600]/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {ruleToEdit ? 'Editar Regra de Preço' : 'Nova Regra de Precificação Dinâmica'}
              </h3>
              <p className="text-xs text-white/50">
                Configure descontos, tarifas especiais, feriados ou pacotes sazonais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nome e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                Nome da Regra <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Réveillon 2026, Alta Temporada, Desconto Meio de Semana"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#FFD600] focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                Tipo de Regra
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as PricingRuleType)}
                className="w-full bg-[#121841] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#FFD600] focus:outline-none transition-colors"
              >
                {RULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Intervalo de Datas */}
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] uppercase tracking-wider">
              <Calendar size={16} />
              <span>Período da Regra (Opcional - deixe em branco para regra contínua)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/60 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Data Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dias da Semana Selecionáveis */}
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
                Dias da Semana Aplicáveis
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className="text-[10px] bg-white/10 hover:bg-white/20 text-white/80 px-2 py-1 rounded-lg transition-colors"
                >
                  Todos os Dias
                </button>
                <button
                  type="button"
                  onClick={handleWeekdaysOnly}
                  className="text-[10px] bg-white/10 hover:bg-white/20 text-white/80 px-2 py-1 rounded-lg transition-colors"
                >
                  Seg a Qui
                </button>
                <button
                  type="button"
                  onClick={handleWeekendsOnly}
                  className="text-[10px] bg-white/10 hover:bg-white/20 text-white/80 px-2 py-1 rounded-lg transition-colors"
                >
                  Fim de Semana
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = daysOfWeek.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleDayOfWeek(d.day)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                        : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modo de Precificação */}
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] uppercase tracking-wider">
              <DollarSign size={16} />
              <span>Efeito no Valor da Diária</span>
            </div>

            {/* Selector Modo */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setPricingMode('OVERRIDE')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  pricingMode === 'OVERRIDE'
                    ? 'bg-[#FFD600] text-[#0A0F2C]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Valor Fixo
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('DISCOUNT')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  pricingMode === 'DISCOUNT'
                    ? 'bg-emerald-500 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Desconto
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('SURCHARGE')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  pricingMode === 'SURCHARGE'
                    ? 'bg-amber-500 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Acréscimo
              </button>
            </div>

            {/* Inputs de acordo com o modo */}
            {pricingMode === 'OVERRIDE' && (
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Valor Fixo por Diária (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {pricingMode === 'DISCOUNT' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/70 mb-1">Tipo de Desconto</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                    className="w-full bg-[#121841] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentual (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    {discountType === 'PERCENTAGE' ? 'Porcentagem (%)' : 'Valor do Desconto (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={discountType === 'PERCENTAGE' ? '15%' : 'R$ 100,00'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {pricingMode === 'SURCHARGE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/70 mb-1">Tipo de Acréscimo</label>
                  <select
                    value={surchargeType}
                    onChange={(e) => setSurchargeType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                    className="w-full bg-[#121841] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentual (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    {surchargeType === 'PERCENTAGE' ? 'Porcentagem (%)' : 'Valor do Acréscimo (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={surchargeValue}
                    onChange={(e) => setSurchargeValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={surchargeType === 'PERCENTAGE' ? '20%' : 'R$ 150,00'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Condições & Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-white/70 mb-1">
                Mínimo de Diárias (Noites)
              </label>
              <input
                type="number"
                min="1"
                value={minStayNights}
                onChange={(e) => setMinStayNights(Number(e.target.value) || 1)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">
                Prioridade (Maior = prevalece)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) || 10)}
                placeholder="10"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">Status da Regra</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                <span>{isActive ? 'Ativa no Sistema' : 'Inativa'}</span>
              </button>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs text-white/70 mb-1">Observações Internas</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações para a equipe administrativa..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[#FFD600] focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] text-xs font-black hover:bg-[#ffe033] shadow-[0_0_15px_rgba(255,214,0,0.3)] transition-all flex items-center gap-2"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>{ruleToEdit ? 'Salvar Alterações' : 'Criar Regra'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
