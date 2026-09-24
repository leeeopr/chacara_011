'use client';

import React, { useState } from 'react';
import { Settings, DollarSign, Bell, Shield, Database, Sparkles, RotateCcw, Monitor, Calendar, Server } from 'lucide-react';
import PricingManagement from './PricingManagement';
import CrewRolesSettings from './CrewRolesSettings';
import GoogleCalendarSettingsPanel from './GoogleCalendarSettingsPanel';
import SupabaseDatabasePanel from './SupabaseDatabasePanel';
import FinancialSettingsPanel from './FinancialSettingsPanel';
import { useAppMode } from '@/contexts/AppModeContext';

export default function ChacarasSettings() {
  const [activeSubTab, setActiveSubTab] = useState<'financial_settings' | 'supabase_sql' | 'google_calendar' | 'precificacao' | 'funcoes_equipe' | 'demonstracao' | 'notificacoes' | 'contratos' | 'integracoes'>('financial_settings');
  const { mode, isDemo, resetDemoData, setMode } = useAppMode();

  return (
    <div className="space-y-6 pb-8">
      {/* Settings Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
        <button
          onClick={() => setActiveSubTab('financial_settings')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'financial_settings'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Settings size={16} />
          <span>Percentuais Financeiros</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black">
            Central
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('supabase_sql')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'supabase_sql'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Database size={16} />
          <span>Banco de Dados & SQL Supabase</span>
          <span className="text-[10px] bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 px-2 py-0.5 rounded-full font-black">
            Produção
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('google_calendar')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'google_calendar'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Calendar size={16} />
          <span>Google Calendar</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black">
            Nativo
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('precificacao')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'precificacao'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <DollarSign size={16} />
          <span>Precificação & Regras de Valor</span>
          <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-black">
            Fase 3
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('funcoes_equipe')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'funcoes_equipe'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Sparkles size={16} />
          <span>Funções da Equipe</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black">
            Fase 5
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('demonstracao')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'demonstracao'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Monitor size={16} />
          <span>Modo Demonstração</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-black">
            Apresentação
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('notificacoes')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'notificacoes'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Bell size={16} />
          <span>Notificações WhatsApp</span>
        </button>

        <button
          onClick={() => setActiveSubTab('contratos')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'contratos'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Shield size={16} />
          <span>Contratos & Termos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('integracoes')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shrink-0 ${
            activeSubTab === 'integracoes'
              ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Database size={16} />
          <span>Integrações iCal / OTA</span>
        </button>
      </div>

      {/* Render Active Sub Tab */}
      {activeSubTab === 'financial_settings' && <FinancialSettingsPanel />}
      {activeSubTab === 'supabase_sql' && <SupabaseDatabasePanel />}
      {activeSubTab === 'google_calendar' && <GoogleCalendarSettingsPanel />}
      {activeSubTab === 'precificacao' && <PricingManagement />}
      {activeSubTab === 'funcoes_equipe' && <CrewRolesSettings />}

      {activeSubTab === 'demonstracao' && (
        <div className="glass p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Monitor className="text-amber-400" size={20} />
                Status do Ambiente
              </h3>
              <p className="text-xs text-white/60 mt-1">
                Gerencie o Modo Demonstração (Apresentação para Clientes) e isolamento de dados.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                isDemo 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isDemo ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                {isDemo ? 'Modo Demonstração Ativo' : 'Modo Produção'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Resetar Dados de Apresentação
              </h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Restaura o banco de dados simulado com o conjunto completo de dados realistas (chácaras, clientes, reservas, equipe e financeiro).
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja resetar o dataset do Modo Demonstração para os valores iniciais de apresentação?')) {
                    resetDemoData();
                    window.location.reload();
                  }
                }}
                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <RotateCcw size={16} />
                <span>Restaurar Dataset Inicial</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Alternar Modo de Operação
              </h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Navegue livremente entre os modos de demonstração e produção sem interferir nos registros do banco.
              </p>
              <button
                type="button"
                onClick={() => {
                  const target = isDemo ? 'PRODUCTION' : 'DEMO';
                  setMode(target);
                  window.location.reload();
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Sparkles size={16} />
                <span>Alternar para {isDemo ? 'Produção' : 'Modo Demonstração'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab !== 'supabase_sql' && activeSubTab !== 'google_calendar' && activeSubTab !== 'precificacao' && activeSubTab !== 'funcoes_equipe' && activeSubTab !== 'demonstracao' && (
        <div className="glass p-12 rounded-3xl border border-white/10 text-center space-y-3">
          <div className="p-3 bg-white/5 rounded-2xl w-fit mx-auto text-[#FFD600]">
            <Settings size={32} />
          </div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Módulo em Desenvolvimento (Fase Futura)
          </h3>
          <p className="text-xs text-white/50 max-w-md mx-auto">
            O módulo de {activeSubTab} será ativado nas próximas integrações.
          </p>
        </div>
      )}
    </div>
  );
}

