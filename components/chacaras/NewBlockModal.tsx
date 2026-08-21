'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ban, 
  Calendar, 
  TreePine, 
  AlertTriangle, 
  Check, 
  X, 
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Chacara, BlockReason } from '@/lib/chacaraTypes';
import { getChacaras } from '@/services/chacarasService';
import { createChacaraBlock } from '@/services/reservationsService';

interface NewBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialChacaraId?: string;
}

export default function NewBlockModal({
  isOpen,
  onClose,
  onSuccess,
  initialChacaraId
}: NewBlockModalProps) {
  // Steps: 1. Chácara e Motivo -> 2. Período e Detalhes
  const [step, setStep] = useState<number>(1);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [chacaraSearchTerm, setChacaraSearchTerm] = useState('');
  const [selectedChacaraId, setSelectedChacaraId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState<BlockReason>('MANUTENCAO');
  const [description, setDescription] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadChacaras();
      setStep(1);
      setShowAdvancedOptions(false);
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setTitle('');
      setReason('MANUTENCAO');
      setDescription('');
      setErrorMessage('');
    }
  }, [isOpen]);

  const loadChacaras = async () => {
    try {
      const list = await getChacaras({ status: 'ATIVA' });
      setChacaras(list);

      if (initialChacaraId && list.some(c => c.id === initialChacaraId)) {
        setSelectedChacaraId(initialChacaraId);
      } else if (list.length > 0) {
        setSelectedChacaraId(list[0].id);
      }
    } catch (e) {
      console.warn('Erro ao carregar chácaras:', e);
    }
  };

  if (!isOpen) return null;

  const handleNextStep = () => {
    setErrorMessage('');
    if (!selectedChacaraId) {
      setErrorMessage('Selecione uma chácara.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Informe a identificação ou motivo do bloqueio.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedChacaraId) {
      setErrorMessage('Por favor, selecione uma chácara.');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMessage('Informe a data inicial e final do bloqueio.');
      return;
    }

    if (startDate > endDate) {
      setErrorMessage('A data inicial não pode ser posterior à data final.');
      return;
    }

    setLoading(true);

    try {
      await createChacaraBlock({
        chacara_id: selectedChacaraId,
        start_date: startDate,
        end_date: endDate,
        title: title.trim() || 'Bloqueio de Agenda',
        reason,
        description: description.trim() || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[NewBlockModal] Erro ao criar bloqueio:', err);
      setErrorMessage(err.message || 'Erro ao registrar bloqueio de datas.');
    } finally {
      setLoading(false);
    }
  };

  const filteredChacaras = chacaras.filter(c => 
    c.name.toLowerCase().includes(chacaraSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full sm:max-w-lg bg-[#0A0F2C] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[100vh] sm:max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500 p-2.5 rounded-2xl text-white">
              <Ban size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Novo Bloqueio de Datas</h2>
              <div className="flex items-center gap-2 text-xs text-rose-400 font-bold">
                <span>Passo {step} de 2</span>
                <span className="text-white/30">•</span>
                <span className="text-white/70">
                  {step === 1 ? 'Etapa 1: Chácara e Motivo' : 'Etapa 2: Período e Detalhes'}
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
            className="bg-rose-500 h-full transition-all duration-300"
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
          
          {/* STEP 1: CHÁCARA & MOTIVO */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TreePine size={18} className="text-rose-400" />
                  Selecione a chácara e a razão do bloqueio
                </h3>
                <p className="text-xs text-white/50">Impeça novas reservas no período</p>
              </div>

              {/* Title / Motivo Curto */}
              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Título / Identificação do Bloqueio *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Manutenção da Piscina / Uso Proprietário"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-rose-400 outline-none"
                />
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
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-rose-400 outline-none"
                  />
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {filteredChacaras.map(ch => {
                    const isSelected = selectedChacaraId === ch.id;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => setSelectedChacaraId(ch.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-rose-500/20 border-rose-400 text-white font-bold' 
                            : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                        }`}
                      >
                        <span className="text-xs">{ch.name}</span>
                        {isSelected && <Check size={16} className="text-rose-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PERÍODO & DETALHES AVANÇADOS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-rose-400" />
                  Qual será o período do bloqueio?
                </h3>
                <p className="text-xs text-white/50">Defina as datas de início e término</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Data Inicial</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-rose-400 outline-none"
                  />
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Data Final</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-rose-400 outline-none"
                  />
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
                    <Sliders size={14} className="text-rose-400" />
                    ▼ Mais opções (Tipo de Motivo & Observações)
                  </span>
                  {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Tipo de Motivo</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value as BlockReason)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="MANUTENCAO" className="bg-[#0A0F2C]">Manutenção / Reparo</option>
                        <option value="PROPRIETARIO" className="bg-[#0A0F2C]">Uso do Proprietário</option>
                        <option value="RESERVA_EXTERNA" className="bg-[#0A0F2C]">Reserva Externa</option>
                        <option value="OUTRO" className="bg-[#0A0F2C]">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Detalhamento Adicional</label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Observações sobre o bloqueio..."
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
                className="flex-1 max-w-[220px] bg-rose-500 hover:bg-rose-400 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
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
                    <span>Salvar Bloqueio</span>
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
