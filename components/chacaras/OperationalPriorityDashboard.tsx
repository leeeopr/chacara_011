'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckSquare,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Users,
  ChevronRight,
  Plus,
  TrendingUp,
  Inbox,
  Hourglass,
  Check
} from 'lucide-react';
import { Pendencia } from '@/lib/pendenciasTypes';
import { getPendencias } from '@/services/pendenciasService';
import { useAuth } from '@/contexts/AuthContext';
import { categorizePendencias, computePendenciasStats, sortPendenciasByPriority } from '@/lib/priorityEngine';
import PendenciaPriorityCard from '../pendencias/PendenciaPriorityCard';

interface OperationalPriorityDashboardProps {
  onNavigateToPendencias: (tabFilter?: string) => void;
  onOpenPendenciaDetail: (id: string) => void;
  onNewPendencia: () => void;
}

export default function OperationalPriorityDashboard({
  onNavigateToPendencias,
  onOpenPendenciaDetail,
  onNewPendencia
}: OperationalPriorityDashboardProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || 'usr-atual';

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendencias();
  }, []);

  const loadPendencias = async () => {
    setLoading(true);
    try {
      const data = await getPendencias({}, currentUserId);
      setPendencias(data);
    } catch (err) {
      console.warn('Erro ao carregar pendências do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = categorizePendencias(pendencias, currentUserId);
  const stats = computePendenciasStats(pendencias, currentUserId);

  const topHeroItem = categories.proximaAcaoDestaque;
  const nextPriorities = categories.fazerAgora
    .filter(p => p.id !== topHeroItem?.id)
    .slice(0, 3);

  return (
    <div className="space-y-6 my-6">
      {/* Top Title & Header for Operational Priority */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0A0F2C] via-[#12193E] to-[#0A0F2C] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#FFD600] text-[#0A0F2C] rounded-2xl shadow-[0_0_15px_rgba(255,214,0,0.3)] shrink-0">
            <CheckSquare size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Centro Inteligente de Operação
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] text-[10px] font-black uppercase tracking-wider">
                Prioridade Dinâmica
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              O que precisa ser feito agora para manter as chácaras em perfeito funcionamento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToPendencias()}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Ver Todas ({stats.ativasCount})</span>
            <ChevronRight size={16} />
          </button>

          <button
            onClick={onNewPendencia}
            className="px-4 py-2.5 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Nova Pendência</span>
          </button>
        </div>
      </div>

      {/* Hero Box: O QUE FAZER AGORA */}
      {topHeroItem ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-white/60">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={14} className="text-[#FFD600]" />
              Foco Atual: O que fazer agora
            </span>
            <button
              onClick={() => onNavigateToPendencias('fazerAgora')}
              className="text-[#FFD600] hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Ver fila prioritária</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <PendenciaPriorityCard
            pendencia={topHeroItem}
            currentUserId={currentUserId}
            onOpenDetail={onOpenPendenciaDetail}
            onReloadNeeded={loadPendencias}
            highlightHero={true}
          />
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-base font-black text-emerald-300">Nenhuma pendência crítica pendente!</h3>
          <p className="text-xs text-white/70">Tudo está em dia na operação das chácaras.</p>
        </div>
      )}

      {/* Próximas Prioridades Cards Grid */}
      {nextPriorities.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Clock size={14} className="text-[#FFD600]" />
            Próximas Prioridades da Fila
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextPriorities.map(item => (
              <PendenciaPriorityCard
                key={item.id}
                pendencia={item}
                currentUserId={currentUserId}
                onOpenDetail={onOpenPendenciaDetail}
                onReloadNeeded={loadPendencias}
              />
            ))}
          </div>
        </div>
      )}

      {/* Operational Sections KPI & Status Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Precisa da Sua Atenção */}
        <div
          onClick={() => onNavigateToPendencias('fazerAgora')}
          className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/30 hover:border-rose-500 transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-black uppercase tracking-wider">Atenção Imediata</span>
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{stats.atrasadas + stats.devolvidas}</p>
            <p className="text-xs text-white/60 mt-1">
              {stats.atrasadas} atrasadas • {stats.devolvidas} devolvidas
            </p>
          </div>
          <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Resolver pendências</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* Card 2: Vencendo Hoje */}
        <div
          onClick={() => onNavigateToPendencias('hoje')}
          className="p-5 rounded-2xl bg-gradient-to-br from-[#FFD600]/10 to-[#FFD600]/5 border border-[#FFD600]/30 hover:border-[#FFD600] transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-[#FFD600]">
            <span className="text-xs font-black uppercase tracking-wider">Vencem Hoje</span>
            <Clock size={18} />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{stats.vencemHoje}</p>
            <p className="text-xs text-white/60 mt-1">
              Prazo limite até às 23:59 de hoje
            </p>
          </div>
          <div className="text-[11px] font-bold text-[#FFD600] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Ver itens de hoje</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* Card 3: Aguardando Resposta / Terceiros */}
        <div
          onClick={() => onNavigateToPendencias('aguardandoResposta')}
          className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-500/30 hover:border-sky-500 transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-black uppercase tracking-wider">Aguardando Terceiros</span>
            <Hourglass size={18} />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{categories.aguardandoResposta.length}</p>
            <p className="text-xs text-white/60 mt-1">
              Coanfitriões, prestadores ou fornecedores
            </p>
          </div>
          <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Acompanhar respostas</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* Card 4: Taxa de Conclusão e Entregas */}
        <div
          onClick={() => onNavigateToPendencias('concluidas')}
          className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 hover:border-emerald-500 transition-all cursor-pointer space-y-3 group"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-black uppercase tracking-wider">Performance Semanal</span>
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{stats.completionRate}%</p>
            <p className="text-xs text-white/60 mt-1">
              {stats.concluidasEstaSemana} concluídas esta semana
            </p>
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Ver histórico concluído</span>
            <ChevronRight size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
