'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ShieldAlert, 
  Wrench, 
  Wallet, 
  Check, 
  RotateCcw, 
  Building2, 
  Globe, 
  Info, 
  Sparkles,
  HelpCircle,
  Save
} from 'lucide-react';
import { getChacaras } from '@/services/chacarasService';
import { Chacara } from '@/lib/chacaraTypes';
import { 
  getAllFinancialSettings, 
  getFinancialSettings, 
  saveFinancialSettings, 
  subscribeToFinancialSettingsUpdates 
} from '@/services/financialSettingsService';
import { 
  ChacaraFinancialSettings, 
  DEFAULT_FINANCIAL_SETTINGS, 
  validateFinancialPercent 
} from '@/lib/financialSettingsTypes';

export default function FinancialSettingsPanel() {
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [settingsList, setSettingsList] = useState<ChacaraFinancialSettings[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>('GLOBAL'); // 'GLOBAL' or chacara_id
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Editable fields for the selected scope
  const [emergencyPercent, setEmergencyPercent] = useState<number>(20);
  const [maintenancePercent, setMaintenancePercent] = useState<number>(15);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToFinancialSettingsUpdates((updated) => {
      // Refresh list
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chList, sets] = await Promise.all([
        getChacaras(),
        getAllFinancialSettings()
      ]);
      setChacaras(chList);
      setSettingsList(sets);

      // Load initial scope (Global)
      const globalSetting = sets.find(s => s.chacara_id === null) || DEFAULT_FINANCIAL_SETTINGS;
      setEmergencyPercent(globalSetting.emergency_reserve_percent);
      setMaintenancePercent(globalSetting.maintenance_percent);
      setNotes(globalSetting.notes || '');
    } catch (e) {
      console.warn('Erro ao carregar configurações financeiras:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (newScope: string) => {
    setSelectedScope(newScope);
    const targetId = newScope === 'GLOBAL' ? null : newScope;
    const found = settingsList.find(s => s.chacara_id === targetId);

    if (found) {
      setEmergencyPercent(found.emergency_reserve_percent);
      setMaintenancePercent(found.maintenance_percent);
      setNotes(found.notes || '');
    } else {
      // Fallback to global values as placeholder
      const globalSetting = settingsList.find(s => s.chacara_id === null) || DEFAULT_FINANCIAL_SETTINGS;
      setEmergencyPercent(globalSetting.emergency_reserve_percent);
      setMaintenancePercent(globalSetting.maintenance_percent);
      setNotes('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetId = selectedScope === 'GLOBAL' ? null : selectedScope;
      const validatedEmerg = validateFinancialPercent(emergencyPercent);
      const validatedMaint = validateFinancialPercent(maintenancePercent);

      const saved = await saveFinancialSettings({
        chacara_id: targetId,
        emergency_reserve_percent: validatedEmerg,
        maintenance_percent: validatedMaint,
        notes: notes
      });

      // Update state
      const updatedList = [...settingsList];
      const idx = updatedList.findIndex(s => s.chacara_id === targetId);
      if (idx >= 0) {
        updatedList[idx] = saved;
      } else {
        updatedList.push(saved);
      }
      setSettingsList(updatedList);

      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    } catch (e) {
      console.error('Erro ao salvar configuração financeira:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setEmergencyPercent(DEFAULT_FINANCIAL_SETTINGS.emergency_reserve_percent);
    setMaintenancePercent(DEFAULT_FINANCIAL_SETTINGS.maintenance_percent);
    setNotes(DEFAULT_FINANCIAL_SETTINGS.notes || '');
  };

  const globalSetting = settingsList.find(s => s.chacara_id === null) || DEFAULT_FINANCIAL_SETTINGS;
  const currentChacaraName = selectedScope === 'GLOBAL' 
    ? 'Configuração Global Padrão' 
    : chacaras.find(c => c.id === selectedScope)?.name || 'Chácara Selecionada';

  return (
    <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-8 animate-fade-in text-white">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] text-[10px] font-black uppercase tracking-wider border border-[#FFD600]/30">
              Gestão Financeira & Proteção
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Fonte Única da Verdade
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sliders className="text-[#FFD600]" size={24} />
            Percentuais Financeiros da Chácara
          </h2>
          <p className="text-xs text-white/60 mt-1 max-w-2xl">
            Configure centralmente os percentuais da <strong>Reserva de Emergência</strong> e do <strong>Mínimo Circulável para Manutenção</strong>. 
            Todas as telas, módulos de compras, viabilidade, fluxo de caixa e relatórios adotam estas regras instantaneamente.
          </p>
        </div>

        {/* Global summary badge */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 shrink-0">
          <div>
            <span className="text-[10px] text-white/40 uppercase font-black block">Padrão Global Atual</span>
            <div className="text-sm font-black text-white flex items-center gap-3 mt-0.5">
              <span className="text-emerald-400">Reserva: {globalSetting.emergency_reserve_percent}%</span>
              <span className="text-white/20">•</span>
              <span className="text-blue-400">Manutenção: {globalSetting.maintenance_percent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scope Selector: Global vs Specific Chácaras */}
      <div className="space-y-3">
        <label className="text-xs font-black uppercase text-white/70 tracking-wider flex items-center gap-2">
          <Building2 size={14} className="text-[#FFD600]" />
          Selecione o Escopo de Configuração
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => handleScopeChange('GLOBAL')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-start gap-1 border cursor-pointer ${
              selectedScope === 'GLOBAL'
                ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-lg shadow-[#FFD600]/20'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 font-black text-[11px]">
              <Globe size={13} />
              <span>Padrão Global</span>
            </div>
            <span className="text-[10px] opacity-75">
              {globalSetting.emergency_reserve_percent}% Res. / {globalSetting.maintenance_percent}% Manut.
            </span>
          </button>

          {chacaras.map(ch => {
            const specific = settingsList.find(s => s.chacara_id === ch.id);
            const isSelected = selectedScope === ch.id;

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleScopeChange(ch.id)}
                className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-start gap-1 border cursor-pointer truncate ${
                  isSelected
                    ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-lg shadow-[#FFD600]/20'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-[11px] truncate w-full">
                  <Building2 size={13} className="shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </div>
                <span className="text-[10px] opacity-75">
                  {specific ? `${specific.emergency_reserve_percent}% / ${specific.maintenance_percent}%` : 'Herda Global'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Parameters Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. RESERVA DE EMERGÊNCIA */}
        <div className="p-6 bg-gradient-to-br from-[#0A0F2C] to-[#0d1c3a] border border-emerald-500/30 rounded-3xl space-y-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                  1. % Reserva de Emergência
                </h3>
                <p className="text-xs text-white/60">
                  Proteção de caixa contra imprevistos severos
                </p>
              </div>
            </div>
            <span className="text-2xl font-black text-emerald-300">
              {emergencyPercent}%
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={emergencyPercent}
                onChange={(e) => setEmergencyPercent(Number(e.target.value))}
                className="flex-1 accent-emerald-500 cursor-pointer h-2.5 bg-white/10 rounded-lg"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={emergencyPercent}
                  onChange={(e) => setEmergencyPercent(validateFinancialPercent(e.target.value))}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-right text-emerald-400 font-black text-sm focus:outline-none focus:border-emerald-400"
                />
                <span className="absolute right-2 top-2 text-xs text-emerald-400/50 pointer-events-none font-bold">%</span>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] text-white/40 uppercase font-bold">Atalhos:</span>
              {[0, 10, 15, 20, 25, 30].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setEmergencyPercent(pct)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    emergencyPercent === pct
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 text-xs text-white/70 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Info size={14} className="text-emerald-400" />
              Como este percentual é utilizado:
            </div>
            <p className="text-[11px] leading-relaxed text-white/60">
              Calculado como <strong>{emergencyPercent}%</strong> sobre o <strong>Total Comprovado</strong> em conta. 
              Esse valor é blindado e deduzido do caixa operacional, impedindo que compras rotineiras invadam o colchão de segurança patrimonial.
            </p>
          </div>
        </div>

        {/* 2. MÍNIMO CIRCULÁVEL DE MANUTENÇÃO */}
        <div className="p-6 bg-gradient-to-br from-[#0A0F2C] to-[#121c44] border border-blue-500/30 rounded-3xl space-y-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Wrench size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-blue-400 tracking-wider">
                  2. % Mínimo Circulável Manutenção
                </h3>
                <p className="text-xs text-white/60">
                  Giro operacional dedicado a reparos e conservação
                </p>
              </div>
            </div>
            <span className="text-2xl font-black text-blue-300">
              {maintenancePercent}%
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={maintenancePercent}
                onChange={(e) => setMaintenancePercent(Number(e.target.value))}
                className="flex-1 accent-blue-500 cursor-pointer h-2.5 bg-white/10 rounded-lg"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={maintenancePercent}
                  onChange={(e) => setMaintenancePercent(validateFinancialPercent(e.target.value))}
                  className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-right text-blue-400 font-black text-sm focus:outline-none focus:border-blue-400"
                />
                <span className="absolute right-2 top-2 text-xs text-blue-400/50 pointer-events-none font-bold">%</span>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] text-white/40 uppercase font-bold">Atalhos:</span>
              {[0, 5, 10, 15, 20, 25].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setMaintenancePercent(pct)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    maintenancePercent === pct
                      ? 'bg-blue-500 text-slate-950 font-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 text-xs text-white/70 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Info size={14} className="text-blue-400" />
              Como este percentual é utilizado:
            </div>
            <p className="text-[11px] leading-relaxed text-white/60">
              Calculado como <strong>{maintenancePercent}%</strong> sobre o <strong>Total Comprovado</strong>. 
              Garante que a chácara sempre mantenha em caixa capital suficiente para bancar manutenções preventivas e corretivas contínuas.
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Impact & Formula Live Demonstration */}
      <div className="p-6 bg-[#0A0F2C] border border-[#FFD600]/30 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="text-[#FFD600]" size={18} />
            <h4 className="text-xs font-black uppercase text-white tracking-wider">
              Demonstração da Fórmula Oficial com os Parâmetros Atuais ({currentChacaraName})
            </h4>
          </div>
          <span className="text-[11px] text-[#FFD600] font-black">
            Saldo Real = Total Comprovado − ({emergencyPercent}% Reserva) − ({maintenancePercent}% Manutenção)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-white/50 uppercase font-black block">1. Base Simulada (Total Comprovado)</span>
            <div className="text-lg font-black text-white mt-1">R$ 50.000,00</div>
          </div>

          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 uppercase font-black block">2. Reserva de Emergência ({emergencyPercent}%)</span>
            <div className="text-lg font-black text-emerald-400 mt-1">
              − R$ {(50000 * (emergencyPercent / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <span className="text-[10px] text-blue-400 uppercase font-black block">3. Mínimo Circulável ({maintenancePercent}%)</span>
            <div className="text-lg font-black text-blue-400 mt-1">
              − R$ {(50000 * (maintenancePercent / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 bg-[#FFD600]/10 rounded-2xl border border-[#FFD600]/30">
            <span className="text-[10px] text-[#FFD600] uppercase font-black block">4. Saldo Real Atual Disponível</span>
            <div className="text-xl font-black text-[#FFD600] mt-1">
              R$ {Math.max(0, 50000 - (50000 * (emergencyPercent / 100)) - (50000 * (maintenancePercent / 100))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={handleResetToDefaults}
          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs rounded-xl border border-white/10 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw size={15} />
          <span>Restaurar Valores Padrão (20% / 15%)</span>
        </button>

        <div className="flex items-center gap-3">
          {savedFeedback && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs animate-fade-in">
              <Check size={16} />
              <span>Configurações salvas e propagadas em tempo real!</span>
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-3 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-2xl shadow-xl shadow-[#FFD600]/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RotateCcw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>Salvar Configuração ({currentChacaraName})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
