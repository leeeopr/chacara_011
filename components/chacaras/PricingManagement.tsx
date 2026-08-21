'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Settings, 
  Plus, 
  Edit3, 
  Copy, 
  Power, 
  Trash2, 
  Sparkles, 
  TreePine, 
  Check, 
  Calendar, 
  Users, 
  ShieldAlert, 
  History, 
  RefreshCw, 
  FileText,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Chacara, ChacaraPricingRule, PricingAuditLog } from '@/lib/chacaraTypes';
import { getChacaras } from '@/services/chacarasService';
import { pricingEngineService } from '@/services/pricingEngineService';
import PricingRuleModal from './PricingRuleModal';

export default function PricingManagement() {
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [selectedChacara, setSelectedChacara] = useState<Chacara | null>(null);
  const [activeTab, setActiveTab] = useState<'valores_base' | 'regras_preco' | 'auditoria'>('valores_base');
  
  const [loadingChacaras, setLoadingChacaras] = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingBase, setSavingBase] = useState(false);

  const [rules, setRules] = useState<ChacaraPricingRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<PricingAuditLog[]>([]);

  // Feedback Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal Regra State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<ChacaraPricingRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<ChacaraPricingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState(false);

  // Form Valores Base State
  const [baseForm, setBaseForm] = useState({
    daily_rate_standard: 0,
    daily_rate_weekend: 0,
    daily_rate_holiday: 0,
    cleaning_fee: 0,
    deposit_amount: 0,
    extra_guest_fee: 0,
    included_guests: 0,
    max_capacity: 0,
    allow_pets: true,
    pet_fee: 0,
    energy_fee: 0,
    event_fee: 0,
    financial_notes: ''
  });

  // Carregar chácaras no início
  useEffect(() => {
    loadChacaras();
  }, []);

  const loadChacaras = async () => {
    setLoadingChacaras(true);
    try {
      const list = await getChacaras();
      setChacaras(list);
      if (list.length > 0 && !selectedChacara) {
        handleSelectChacara(list[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar chácaras:', err);
    } finally {
      setLoadingChacaras(false);
    }
  };

  const handleSelectChacara = (chacara: Chacara) => {
    setSelectedChacara(chacara);
    setBaseForm({
      daily_rate_standard: chacara.daily_rate_standard || 0,
      daily_rate_weekend: chacara.daily_rate_weekend || 0,
      daily_rate_holiday: chacara.daily_rate_holiday || 0,
      cleaning_fee: chacara.cleaning_fee || 0,
      deposit_amount: chacara.deposit_amount || 0,
      extra_guest_fee: chacara.extra_guest_fee || 0,
      included_guests: chacara.included_guests || chacara.capacity_people || 0,
      max_capacity: chacara.max_capacity || chacara.capacity_people || 0,
      allow_pets: chacara.allow_pets ?? true,
      pet_fee: chacara.pet_fee || 0,
      energy_fee: chacara.energy_fee || 0,
      event_fee: chacara.event_fee || 0,
      financial_notes: chacara.financial_notes || ''
    });
    loadRules(chacara.id);
    loadAuditLogs(chacara.id);
  };

  const loadRules = async (chacaraId: string) => {
    setLoadingRules(true);
    try {
      const data = await pricingEngineService.getPricingRules(chacaraId);
      setRules(data);
    } catch (err) {
      console.error('Erro ao carregar regras:', err);
    } finally {
      setLoadingRules(false);
    }
  };

  const loadAuditLogs = async (chacaraId: string) => {
    try {
      const logs = await pricingEngineService.getAuditLogs(chacaraId);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err);
    }
  };

  // Salvar Valores Base
  const handleSaveBasePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChacara) return;

    setSavingBase(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const updated = await pricingEngineService.updateChacaraBasePricing(
        selectedChacara.id,
        baseForm,
        'Administrador',
        'Ajuste nos Valores Base e Parâmetros Financeiros'
      );

      // Atualizar no estado local
      setSelectedChacara(updated);
      setChacaras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccessMessage('Valores base atualizados com sucesso!');
      loadAuditLogs(selectedChacara.id);

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar valores base.');
    } finally {
      setSavingBase(false);
    }
  };

  // Handler de Regra
  const handleSaveRule = async (rulePayload: Partial<ChacaraPricingRule>) => {
    if (!selectedChacara) return;
    try {
      if (ruleToEdit) {
        await pricingEngineService.updatePricingRule(ruleToEdit.id, rulePayload, 'Administrador');
        setSuccessMessage('Regra de preço atualizada!');
      } else {
        await pricingEngineService.createPricingRule(rulePayload, 'Administrador');
        setSuccessMessage('Nova regra de preço criada com sucesso!');
      }
      loadRules(selectedChacara.id);
      loadAuditLogs(selectedChacara.id);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar regra.');
    }
  };

  const handleDuplicateRule = async (ruleId: string) => {
    if (!selectedChacara) return;
    try {
      await pricingEngineService.duplicatePricingRule(ruleId, 'Administrador');
      setSuccessMessage('Regra duplicada com sucesso!');
      loadRules(selectedChacara.id);
      loadAuditLogs(selectedChacara.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao duplicar regra.');
    }
  };

  const handleToggleRuleStatus = async (rule: ChacaraPricingRule) => {
    if (!selectedChacara) return;
    try {
      await pricingEngineService.updatePricingRule(
        rule.id,
        { is_active: !rule.is_active },
        'Administrador'
      );
      loadRules(selectedChacara.id);
      loadAuditLogs(selectedChacara.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDeleteRule = (rule: ChacaraPricingRule) => {
    setRuleToDelete(rule);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete || !selectedChacara) return;
    setDeletingRule(true);
    setErrorMessage('');
    try {
      await pricingEngineService.deletePricingRule(ruleToDelete.id, 'Administrador');
      setSuccessMessage(`Regra "${ruleToDelete.name}" excluída com sucesso!`);
      setRuleToDelete(null);
      await loadRules(selectedChacara.id);
      await loadAuditLogs(selectedChacara.id);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao excluir regra.');
    } finally {
      setDeletingRule(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="glass p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-[#0A0F2C] via-[#101740] to-[#0A0F2C]">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Fase 3 — Gestão Financeira & Precificação</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Configurações de Preços, Regras e Tarifas
          </h2>
          <p className="text-xs text-white/60 max-w-2xl">
            Defina diárias padrão, adicionais para fins de semana e feriados, taxas de limpeza e crie regras de precificação dinâmica por período, alta temporada ou quantidade de noites.
          </p>
        </div>
      </div>

      {/* Seletor de Chácaras */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
          <TreePine size={16} className="text-[#FFD600]" />
          <span>Selecione a Chácara para Configurar</span>
        </label>
        
        {loadingChacaras ? (
          <div className="h-14 bg-white/5 animate-pulse rounded-2xl border border-white/10" />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {chacaras.map((c) => {
              const isSelected = selectedChacara?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectChacara(c)}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-3 border shrink-0 ${
                    isSelected
                      ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_20px_rgba(255,214,0,0.3)] scale-[1.02]'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <TreePine size={16} className={isSelected ? 'text-[#0A0F2C]' : 'text-[#FFD600]'} />
                  <span>{c.name}</span>
                  {isSelected && <Check size={16} className="ml-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedChacara && (
        <div className="glass rounded-3xl border border-white/10 overflow-hidden">
          
          {/* Top Bar Tabs */}
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
              <button
                onClick={() => setActiveTab('valores_base')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                  activeTab === 'valores_base'
                    ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <DollarSign size={16} />
                <span>Valores Base & Tarifas</span>
              </button>

              <button
                onClick={() => setActiveTab('regras_preco')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                  activeTab === 'regras_preco'
                    ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Settings size={16} />
                <span>Regras de Preço Dinâmico</span>
                {rules.length > 0 && (
                  <span className="bg-black/20 text-xs px-2 py-0.5 rounded-full font-black">
                    {rules.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('auditoria')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                  activeTab === 'auditoria'
                    ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <History size={16} />
                <span>Trilha de Auditoria</span>
              </button>
            </div>

            {activeTab === 'regras_preco' && (
              <button
                onClick={() => {
                  setRuleToEdit(null);
                  setIsRuleModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] text-xs font-black hover:bg-[#ffe033] shadow-[0_0_15px_rgba(255,214,0,0.3)] transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Nova Regra de Preço</span>
              </button>
            )}
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="mx-6 mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
              <Check size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mx-6 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: VALORES BASE & TARIFAS */}
          {activeTab === 'valores_base' && (
            <form onSubmit={handleSaveBasePricing} className="p-6 space-y-8">
              
              {/* Diárias Base */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] uppercase tracking-wider">
                  <DollarSign size={16} />
                  <span>Diárias da Chácara ({selectedChacara.name})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1">
                      Diária Padrão (Segunda a Quinta)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.daily_rate_standard}
                        onChange={(e) => setBaseForm({ ...baseForm, daily_rate_standard: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1">
                      Diária Fim de Semana (Sexta a Domingo)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.daily_rate_weekend}
                        onChange={(e) => setBaseForm({ ...baseForm, daily_rate_weekend: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1">
                      Diária em Feriados
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.daily_rate_holiday}
                        onChange={(e) => setBaseForm({ ...baseForm, daily_rate_holiday: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Taxas Fixas e Caução */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] uppercase tracking-wider">
                  <FileText size={16} />
                  <span>Taxas Fixas e Caução</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Taxa de Limpeza Obrigátoria</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.cleaning_fee}
                        onChange={(e) => setBaseForm({ ...baseForm, cleaning_fee: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Valor do Caução (Devolutivo)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.deposit_amount}
                        onChange={(e) => setBaseForm({ ...baseForm, deposit_amount: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Taxa por Hóspede Excedente / Noite</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.extra_guest_fee}
                        onChange={(e) => setBaseForm({ ...baseForm, extra_guest_fee: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Taxa Fixa de Energia / Manutenção</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.energy_fee}
                        onChange={(e) => setBaseForm({ ...baseForm, energy_fee: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Capacidade e Políticas */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] uppercase tracking-wider">
                  <Users size={16} />
                  <span>Capacidade de Hóspedes & Políticas Especiais</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Capacidade Incluída na Diária</label>
                    <input
                      type="number"
                      min="1"
                      value={baseForm.included_guests}
                      onChange={(e) => setBaseForm({ ...baseForm, included_guests: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Capacidade Máxima Permitida</label>
                    <input
                      type="number"
                      min="1"
                      value={baseForm.max_capacity}
                      onChange={(e) => setBaseForm({ ...baseForm, max_capacity: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Permitir Animais de Estimação (Pets)</label>
                    <button
                      type="button"
                      onClick={() => setBaseForm({ ...baseForm, allow_pets: !baseForm.allow_pets })}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                        baseForm.allow_pets
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}
                    >
                      <span>{baseForm.allow_pets ? 'Sim, Pets Permitidos' : 'Não Permitido'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Taxa por Pet (se permitido)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!baseForm.allow_pets}
                        value={baseForm.pet_fee}
                        onChange={(e) => setBaseForm({ ...baseForm, pet_fee: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none disabled:opacity-30"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Taxa Adicional para Eventos / Festas</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#FFD600]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseForm.event_fee}
                        onChange={(e) => setBaseForm({ ...baseForm, event_fee: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FFD600] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Observações e Regras Financeiras</label>
                    <input
                      type="text"
                      value={baseForm.financial_notes}
                      onChange={(e) => setBaseForm({ ...baseForm, financial_notes: e.target.value })}
                      placeholder="Ex: Sinal de 50% na reserva, saldo em até 48h antes do check-in..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[#FFD600] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="pt-6 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={savingBase}
                  className="px-8 py-3 rounded-2xl bg-[#FFD600] text-[#0A0F2C] text-sm font-black hover:bg-[#ffe033] shadow-[0_0_20px_rgba(255,214,0,0.3)] transition-all flex items-center gap-2"
                >
                  {savingBase ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Salvar Valores e Parâmetros</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGRAS DE PREÇO DINÂMICO */}
          {activeTab === 'regras_preco' && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Regras Ativas e Promoções ({selectedChacara.name})
                  </h3>
                  <p className="text-xs text-white/50">
                    O sistema aplica a regra com maior prioridade de desempate quando o período ou condição da reserva for atendido.
                  </p>
                </div>
              </div>

              {loadingRules ? (
                <div className="p-8 text-center text-xs text-white/40 animate-pulse">
                  Carregando regras de precificação...
                </div>
              ) : rules.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl space-y-3">
                  <div className="p-3 bg-white/5 rounded-2xl w-fit mx-auto text-[#FFD600]">
                    <Settings size={28} />
                  </div>
                  <p className="text-sm font-bold text-white">Nenhuma regra de preço cadastrada</p>
                  <p className="text-xs text-white/50 max-w-md mx-auto">
                    Crie tarifas dinâmicas para feriados, alta temporada ou descontos automáticos para reservas de longa duração.
                  </p>
                  <button
                    onClick={() => {
                      setRuleToEdit(null);
                      setIsRuleModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] text-xs font-black hover:bg-[#ffe033] inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Criar Primeira Regra</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-white/60 font-bold uppercase tracking-wider border-b border-white/10">
                      <tr>
                        <th className="p-4">Regra / Nome</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Período / Dias</th>
                        <th className="p-4">Efeito / Valor</th>
                        <th className="p-4">Estadia Mín.</th>
                        <th className="p-4">Prioridade</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rules.map((rule) => {
                        let effectText = '—';
                        if (rule.price_override != null && rule.price_override > 0) {
                          effectText = `R$ ${rule.price_override.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /diária`;
                        } else if (rule.discount_percentage) {
                          effectText = `Desconto de ${rule.discount_percentage}%`;
                        } else if (rule.discount_amount) {
                          effectText = `Desconto de R$ ${rule.discount_amount.toFixed(2)}`;
                        } else if (rule.surcharge_percentage) {
                          effectText = `Acréscimo de ${rule.surcharge_percentage}%`;
                        } else if (rule.surcharge_amount) {
                          effectText = `Acréscimo de R$ ${rule.surcharge_amount.toFixed(2)}`;
                        }

                        return (
                          <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 font-bold text-white">
                              <div>{rule.name}</div>
                              {rule.notes && (
                                <div className="text-[10px] text-white/40 font-normal truncate max-w-xs">
                                  {rule.notes}
                                </div>
                              )}
                            </td>

                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/70 text-[10px] font-bold uppercase border border-white/10">
                                {rule.rule_type}
                              </span>
                            </td>

                            <td className="p-4 text-white/80">
                              {rule.start_date && rule.end_date ? (
                                <div>
                                  {new Date(rule.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
                                  {new Date(rule.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </div>
                              ) : (
                                <span className="text-white/40">Sempre Ativo</span>
                              )}
                            </td>

                            <td className="p-4 font-bold text-[#FFD600]">
                              {effectText}
                            </td>

                            <td className="p-4 text-white/80">
                              {rule.min_stay_nights || 1} noite(s)
                            </td>

                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold">
                                P{rule.priority}
                              </span>
                            </td>

                            <td className="p-4">
                              <button
                                onClick={() => handleToggleRuleStatus(rule)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                  rule.is_active
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                              >
                                {rule.is_active ? 'Ativa' : 'Inativa'}
                              </button>
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setRuleToEdit(rule);
                                    setIsRuleModalOpen(true);
                                  }}
                                  title="Editar Regra"
                                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDuplicateRule(rule.id)}
                                  title="Duplicar Regra"
                                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                                >
                                  <Copy size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRule(rule)}
                                  title="Excluir Regra"
                                  className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRILHA DE AUDITORIA */}
          {activeTab === 'auditoria' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Histórico de Alterações de Preço e Tarifas
                </h3>
                <button
                  onClick={() => loadAuditLogs(selectedChacara.id)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  <span>Atualizar</span>
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center border border-white/10 rounded-2xl text-xs text-white/40">
                  Nenhum registro de auditoria encontrado para esta chácara.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-start gap-4 text-xs"
                    >
                      <div className="p-2 rounded-xl bg-[#FFD600]/10 text-[#FFD600] shrink-0 mt-0.5">
                        <Clock size={16} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white uppercase tracking-wider">
                            {log.action_type}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : ''}
                          </span>
                        </div>
                        <p className="text-white/70">{log.reason || 'Alteração de preços/regras'}</p>
                        <div className="text-[10px] text-white/40">
                          Realizado por: <strong className="text-white/80">{log.performed_by_name || 'Usuário'}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Sobreposto de Regras */}
      {selectedChacara && (
        <PricingRuleModal
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setRuleToEdit(null);
          }}
          onSave={handleSaveRule}
          ruleToEdit={ruleToEdit}
          chacaraId={selectedChacara.id}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass bg-[#0F172A] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Regra de Preço?</h3>
                <p className="text-xs text-white/60">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <p className="text-xs font-bold text-white">{ruleToDelete.name}</p>
              {ruleToDelete.notes && (
                <p className="text-[11px] text-white/50">{ruleToDelete.notes}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRuleToDelete(null)}
                disabled={deletingRule}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteRule}
                disabled={deletingRule}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center gap-2 shadow-lg shadow-red-600/30"
              >
                {deletingRule ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
