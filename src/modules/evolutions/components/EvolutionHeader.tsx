'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldAlert, Award, Zap, CheckCircle, Database } from 'lucide-react';
import { EvolutionPack } from '../types';

interface EvolutionHeaderProps {
  pack: EvolutionPack | null;
  consumedWeight: number;
  remainingWeight: number;
  percentage: number;
  evolutionCount: number;
  canCreate: boolean;
  onNewClick: () => void;
}

export default function EvolutionHeader({
  pack,
  consumedWeight,
  remainingWeight,
  percentage,
  evolutionCount,
  canCreate,
  onNewClick
}: EvolutionHeaderProps) {
  const isHighSaturation = percentage >= 80;
  const isSaturated = percentage >= 100;

  return (
    <section className="relative glass glass-reflection rounded-[40px] border border-white/5 p-10 md:p-14 overflow-hidden">
      {/* Decorative ambient blurred ring */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF6F00]/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Segment: Active Title */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#FF6F00]/10 border border-[#FF6F00]/25 rounded-full">
            <Activity size={12} className="text-[#FF6F00] animate-pulse" />
            <span className="text-[9px] font-black text-[#FF6F00] uppercase tracking-wider">
              {pack ? `Status do Pack Ativo #${pack.number}` : 'Aguardando Inicialização'}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-[0.01em]">
            Evolução do <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6F00] to-orange-400">Ecosystem</span>
          </h2>

          <p className="text-sm text-white/50 leading-relaxed max-w-xl font-medium">
            Mapeamos o crescimento tecnológico de forma modular. Cada pack de arquitetura suporta até <strong className="text-[#FF6F00]">10 pontos de custo</strong>. O rollover de infraestrutura é automático e determinado pelo peso acumulado.
          </p>

          {canCreate && (
            <button
              onClick={onNewClick}
              className="group relative inline-flex items-center gap-3 px-8 py-4.5 bg-gradient-to-r from-[#FF6F00] to-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_15px_35px_rgba(255,111,0,0.25)] hover:shadow-[0_15px_40px_rgba(255,111,0,0.35)] hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
            >
              <Zap size={14} className="group-hover:animate-bounce" />
              Inserir na Linha de Expansão
            </button>
          )}
        </div>

        {/* Right Segment: Telemetry Metrics */}
        <div className="lg:col-span-5 bg-white/[0.01] border border-white/5 p-8 rounded-[30px] space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em] block">
                Módulo Ativo
              </span>
              <p className="text-3xl font-black text-white font-mono">
                {pack ? `Pack #${pack.number}` : '-'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em] block">
                Carga Acumulada
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono">{consumedWeight}</span>
                <span className="text-xs font-bold text-white/25 font-mono">/{pack?.max_weight || 10} pts</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-wider">
              <span className="text-white/60 flex items-center gap-1.5 font-sans">
                Saturação da Capacidade
              </span>
              <span className="text-lg font-black text-[#FF6F00] font-mono">{percentage}%</span>
            </div>

            {/* Simulated hardware progress track */}
            <div className="h-3 w-full bg-white/5 rounded-full p-0.5 border border-white/10 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1.2, ease: 'circOut' }}
                className={`h-full rounded-full bg-gradient-to-r from-[#FF6F00] to-orange-400 shadow-[0_0_15px_rgba(255,111,0,0.35)]`}
              />
            </div>

            {/* Saturações e Telemetria Alerts */}
            <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-[#FF6F00]">
              <span className="text-white/20">Residual: {remainingWeight} pts</span>
              {isSaturated ? (
                <span className="text-rose-500 font-black animate-pulse flex items-center gap-1">
                  <ShieldAlert size={10} /> Capacidade Saturação Máxima
                </span>
              ) : isHighSaturation ? (
                <span className="text-[#FF6F00] font-black animate-pulse flex items-center gap-1">
                  <Award size={10} /> Atenção: Limiar Excedido
                </span>
              ) : pack ? (
                <span className="text-emerald-500 font-black flex items-center gap-1">
                  <CheckCircle size={10} /> Operação Estável
                </span>
              ) : (
                <span className="text-white/30 flex items-center gap-1">
                  <Database size={10} /> Offline
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
