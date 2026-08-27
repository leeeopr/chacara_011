'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  XCircle,
  Lock,
  Percent,
  Sliders,
  Check,
  Layers,
  ShieldAlert,
  Wallet,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { PurchaseViabilityGlobalSummary } from '@/lib/purchaseViabilityTypes';
import { formatCurrency } from '@/lib/utils';
import { 
  setMaintenancePercentConfig, 
  setEmergencyReservePercentConfig,
  getEmergencyReservePercentConfig 
} from '@/services/purchaseViabilityService';

interface PurchaseViabilityOverviewHeaderProps {
  summary: PurchaseViabilityGlobalSummary | null;
  loading: boolean;
  selectedViabilityFilter: string;
  onSelectViabilityFilter: (filter: string) => void;
  onPercentChange: (newMaintenancePercent: number) => void;
}

export default function PurchaseViabilityOverviewHeader({
  summary,
  loading,
  selectedViabilityFilter,
  onSelectViabilityFilter,
  onPercentChange
}: PurchaseViabilityOverviewHeaderProps) {
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [tempMaintenancePercent, setTempMaintenancePercent] = useState<number>(summary?.percentualManutencao || 15);
  const [tempEmergencyPercent, setTempEmergencyPercent] = useState<number>(getEmergencyReservePercentConfig());

  if (loading || !summary) {
    return (
      <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10 animate-pulse space-y-4">
        <div className="h-6 w-64 bg-white/10 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const isFilterActive = (val: string) => selectedViabilityFilter === val;

  const handleSaveConfigs = () => {
    const maintVal = Math.max(0, Math.min(100, Number(tempMaintenancePercent)));
    const emergVal = Math.max(0, Math.min(100, Number(tempEmergencyPercent)));
    setMaintenancePercentConfig(maintVal);
    setEmergencyReservePercentConfig(emergVal);
    onPercentChange(maintVal);
    setIsEditingConfig(false);
  };

  const QUICK_MAINT_OPTIONS = [10, 15, 20, 25, 30];

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-400/20 shadow-xl space-y-5">
      {/* Header Top */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-400/20">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Viabilização Financeira das Compras
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-bold border border-amber-400/30">
                Lógica Oficial
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              Pergunta central: <strong>“Você consegue comprar este produto utilizando o seu Saldo Real Atual?”</strong>
            </p>
          </div>
        </div>

        {/* Configuration Button & Scope */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              setTempMaintenancePercent(summary.percentualManutencao);
              setTempEmergencyPercent(getEmergencyReservePercentConfig());
              setIsEditingConfig(!isEditingConfig);
            }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
            title="Ajustar percentuais de proteção"
          >
            <Sliders size={14} className="text-amber-400" />
            <span>Manutenção: <strong>{summary.percentualManutencao}%</strong></span>
          </button>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-white/40 block">Escopo:</span>
            <span className="text-xs font-bold text-amber-300">
              {summary.chacaraFilterName || 'Todas as Chácaras'}
            </span>
          </div>
        </div>
      </div>

      {/* Inline Configuration Drawer */}
      {isEditingConfig && (
        <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-400/40 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders size={14} className="text-amber-400" />
                Configurar Parâmetros de Proteção Financeira
              </h4>
              <p className="text-[11px] text-white/60 mt-0.5">
                O Saldo Real Atual é calculado deduzindo a <strong>Reserva de Emergência</strong> e o <strong>Mínimo Circulável de Manutenção</strong> do Total Comprovado.
              </p>
            </div>

            <button
              onClick={handleSaveConfigs}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md self-start sm:self-auto"
            >
              <Check size={14} />
              Aplicar e Recalcular
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
            {/* Mínimo Circulável Config */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Wrench size={13} />
                  Mínimo Circulável de Manutenção:
                </span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={tempMaintenancePercent}
                    onChange={(e) => setTempMaintenancePercent(Number(e.target.value))}
                    className="w-12 bg-transparent text-white font-black text-xs text-center focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40 font-bold">%</span>
                </div>
              </div>
              <p className="text-[10px] text-white/50">
                Parcela mantida em caixa para absorver manutenções operacionais da chácara.
              </p>
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {QUICK_MAINT_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setTempMaintenancePercent(pct)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      tempMaintenancePercent === pct
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Reserva de Emergência Config */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <ShieldAlert size={13} />
                  Reserva de Emergência:
                </span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={tempEmergencyPercent}
                    onChange={(e) => setTempEmergencyPercent(Number(e.target.value))}
                    className="w-12 bg-transparent text-white font-black text-xs text-center focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40 font-bold">%</span>
                </div>
              </div>
              <p className="text-[10px] text-white/50">
                Fundo de emergência separado e intocável para compras rotineiras.
              </p>
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {[10, 15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setTempEmergencyPercent(pct)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      tempEmergencyPercent === pct
                        ? 'bg-blue-400 text-zinc-950'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Distinct Financial Pillars: Formula in Action */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. TOTAL COMPROVADO */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                1. Total Comprovado
              </span>
              <Wallet size={14} className="text-white/40" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">
              {formatCurrency(summary.totalComprovado)}
            </p>
          </div>
          <p className="text-[11px] text-white/60 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Efetivamente recebido em conta
          </p>
        </div>

        {/* 2. RESERVA DE EMERGÊNCIA */}
        <div className="p-4 rounded-2xl bg-blue-500/[0.05] border border-blue-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                2. (−) Reserva Emergência
              </span>
              <ShieldAlert size={14} className="text-blue-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-400 mt-1">
              {formatCurrency(summary.reservaEmergencia)}
            </p>
          </div>
          <p className="text-[11px] text-blue-300/80 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Fundo protegido e intocável
          </p>
        </div>

        {/* 3. MÍNIMO CIRCULÁVEL DE MANUTENÇÃO */}
        <div className="p-4 rounded-2xl bg-amber-400/[0.06] border border-amber-400/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                3. (−) Mínimo Circulável ({summary.percentualManutencao}%)
              </span>
              <Wrench size={14} className="text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              {formatCurrency(summary.minimoCirculavelManutencao)}
            </p>
          </div>
          <p className="text-[11px] text-amber-300/80 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Destinado às manutenções
          </p>
        </div>

        {/* 4. SALDO REAL ATUAL DISPONÍVEL */}
        <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 flex flex-col justify-between shadow-lg shadow-emerald-500/5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
                4. (=) Saldo Real Atual
              </span>
              <ShieldCheck size={14} className="text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {formatCurrency(summary.saldoRealAtual)}
            </p>
          </div>
          <p className="text-[11px] text-emerald-300 font-semibold mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Disponível para viabilizar compras
          </p>
        </div>
      </div>

      {/* Viability Filters Bar */}
      <div className="pt-2">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-amber-400" />
            Diagnóstico de Viabilidade ({summary.totalComprasPendentes} compras pendentes)
          </span>
          {selectedViabilityFilter && (
            <button
              onClick={() => onSelectViabilityFilter('')}
              className="text-[11px] text-amber-300 hover:underline font-semibold cursor-pointer"
            >
              Limpar filtro
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Viáveis */}
          <button
            onClick={() => onSelectViabilityFilter(isFilterActive('VIAVEL') ? '' : 'VIAVEL')}
            className={`p-3 rounded-2xl border transition-all text-left cursor-pointer ${
              isFilterActive('VIAVEL')
                ? 'bg-emerald-500/20 border-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-white/[0.02] border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck size={14} />
                🟢 Viáveis Agora
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                {summary.viaveisCount}
              </span>
            </div>
            <p className="text-xs font-black text-white mt-1.5">
              {formatCurrency(summary.viaveisTotalCost)}
            </p>
            <span className="text-[10px] text-white/50 block mt-0.5">Custo cabe no Saldo Real Atual</span>
          </button>

          {/* Não Viáveis */}
          <button
            onClick={() => onSelectViabilityFilter(isFilterActive('NAO_VIAVEL') ? '' : 'NAO_VIAVEL')}
            className={`p-3 rounded-2xl border transition-all text-left cursor-pointer ${
              isFilterActive('NAO_VIAVEL')
                ? 'bg-rose-500/20 border-rose-500 shadow-md shadow-rose-500/20'
                : 'bg-white/[0.02] border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <XCircle size={14} />
                🔴 Não Viáveis
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black">
                {summary.naoViaveisCount}
              </span>
            </div>
            <p className="text-xs font-black text-white mt-1.5">
              {formatCurrency(summary.naoViaveisTotalCost)}
            </p>
            <span className="text-[10px] text-white/50 block mt-0.5">Custo excede o Saldo Real Atual</span>
          </button>

          {/* Bloqueados / Sem Preço */}
          <button
            onClick={() => onSelectViabilityFilter(isFilterActive('OUTROS') ? '' : 'OUTROS')}
            className={`p-3 rounded-2xl border transition-all text-left cursor-pointer ${
              isFilterActive('OUTROS')
                ? 'bg-purple-500/20 border-purple-500 shadow-md shadow-purple-500/20'
                : 'bg-white/[0.02] border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Lock size={14} />
                ⚪ Aguardando / Sem Preço
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-[10px] font-black">
                {summary.aguardandoDependenciaCount + summary.dadosInsuficientesCount}
              </span>
            </div>
            <p className="text-xs font-black text-white mt-1.5">
              {summary.aguardandoDependenciaCount} dep. | {summary.dadosInsuficientesCount} s/ valor
            </p>
            <span className="text-[10px] text-white/50 block mt-0.5">Trava de processo ou valor zerado</span>
          </button>
        </div>
      </div>
    </div>
  );
}

