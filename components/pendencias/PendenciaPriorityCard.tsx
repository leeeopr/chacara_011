'use client';

import React, { useState } from 'react';
import {
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Check,
  Send,
  Building2,
  Tag,
  ListTodo
} from 'lucide-react';
import { Pendencia } from '@/lib/pendenciasTypes';
import { calculatePendenciaPriority, PriorityInfo } from '@/lib/priorityEngine';
import { updatePendenciaStatus, completePendencia } from '@/services/pendenciasService';

interface PendenciaPriorityCardProps {
  pendencia: Pendencia;
  currentUserId?: string;
  onOpenDetail: (id: string) => void;
  onReloadNeeded?: () => void;
  highlightHero?: boolean;
}

export default function PendenciaPriorityCard({
  pendencia,
  currentUserId,
  onOpenDetail,
  onReloadNeeded,
  highlightHero = false
}: PendenciaPriorityCardProps) {
  const [loadingAction, setLoadingAction] = useState(false);
  const info: PriorityInfo = calculatePendenciaPriority(pendencia, currentUserId);

  const handleQuickComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Deseja marcar "${pendencia.titulo}" como concluída?`)) return;

    setLoadingAction(true);
    try {
      await completePendencia(
        pendencia.id,
        currentUserId || 'usr-atual',
        'Concluído via ação rápida do cartão'
      );
      if (onReloadNeeded) onReloadNeeded();
    } catch (err: any) {
      alert(err.message || 'Erro ao concluir pendência');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleQuickReturn = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const obs = prompt('Informe a observação/motivo para devolver ou tramitar esta pendência:');
    if (obs === null) return;

    setLoadingAction(true);
    try {
      const nextStatus = pendencia.status === 'Devolvida' ? 'Em andamento' : 'Devolvida';
      await updatePendenciaStatus(
        pendencia.id,
        nextStatus,
        currentUserId || 'usr-atual',
        obs.trim() || 'Tramitado via ação rápida'
      );
      if (onReloadNeeded) onReloadNeeded();
    } catch (err: any) {
      alert(err.message || 'Erro ao tramitar pendência');
    } finally {
      setLoadingAction(false);
    }
  };

  // Hero Highlight Mode (for "O que fazer agora" box)
  if (highlightHero) {
    return (
      <div 
        onClick={() => onOpenDetail(pendencia.id)}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#12193E] via-[#0A0F2C] to-[#12193E] border-2 border-[#FFD600]/60 p-6 md:p-8 shadow-[0_0_30px_rgba(255,214,0,0.2)] hover:border-[#FFD600] transition-all cursor-pointer group space-y-6"
      >
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#FFD600] text-[#0A0F2C] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <Sparkles size={14} />
              Próxima Ação Recomendada
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}>
              Score: {info.score} pts
            </span>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder} uppercase`}>
            {info.label}
          </span>
        </div>

        {/* Content Body */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-white/50">
            {pendencia.grupo && (
              <span className="flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg bg-white/10" style={{ color: pendencia.grupo.cor }}>
                <Tag size={12} />
                {pendencia.grupo.nome}
              </span>
            )}
            {pendencia.chacara_nome && (
              <span className="flex items-center gap-1 font-semibold text-white/70 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                <Building2 size={12} className="text-[#FFD600]" />
                {pendencia.chacara_nome}
              </span>
            )}
          </div>

          <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-[#FFD600] transition-colors leading-tight">
            {pendencia.titulo}
          </h3>

          {pendencia.descricao && (
            <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
              {pendencia.descricao}
            </p>
          )}
        </div>

        {/* Info Grid (Who asked, Due date, Subitems) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/80">
          <div>
            <span className="text-[10px] uppercase font-bold text-white/40 block">Solicitante:</span>
            <p className="font-bold text-white truncate">{pendencia.criado_por_nome || 'Sistema'}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-white/40 block">Responsável Atual:</span>
            <p className="font-bold text-[#FFD600] truncate">{pendencia.responsavel_atual_nome || 'Ninguém'}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-white/40 block">Prazo Estimado:</span>
            <p className={`font-bold flex items-center gap-1 ${info.isOverdue ? 'text-rose-400 font-black' : 'text-white'}`}>
              <Clock size={12} />
              {pendencia.prazo ? `${pendencia.prazo} ${pendencia.prazo_hora || ''}` : 'Sem prazo definido'}
            </p>
          </div>
        </div>

        {/* Checklist Progress if available */}
        {info.subitemsTotal > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-white/60 flex items-center gap-1">
                <ListTodo size={14} className="text-[#FFD600]" />
                Progresso do Checklist:
              </span>
              <span className="text-[#FFD600]">{info.subitemsCompleted} / {info.subitemsTotal} ({Math.round((info.subitemsCompleted/info.subitemsTotal)*100)}%)</span>
            </div>
            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-[#FFD600] h-full rounded-full transition-all duration-500"
                style={{ width: `${(info.subitemsCompleted / info.subitemsTotal) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickComplete}
              disabled={loadingAction}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 size={16} />
              Resolver Agora
            </button>

            <button
              onClick={handleQuickReturn}
              disabled={loadingAction}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <RotateCcw size={14} className="text-[#FFD600]" />
              Devolver / Tramitar
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs text-[#FFD600] font-bold group-hover:translate-x-1 transition-transform">
            <span>Abrir Detalhes</span>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    );
  }

  // Standard Card Mode
  return (
    <div
      onClick={() => onOpenDetail(pendencia.id)}
      className={`p-4 sm:p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-[#FFD600]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4 ${info.cardGlow}`}
    >
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Group and Property Badge */}
          <div className="flex items-center gap-2 overflow-hidden">
            {pendencia.grupo && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0"
                style={{
                  backgroundColor: `${pendencia.grupo.cor}20`,
                  borderColor: pendencia.grupo.cor,
                  color: pendencia.grupo.cor
                }}
              >
                {pendencia.grupo.nome}
              </span>
            )}
            {pendencia.chacara_nome && (
              <span className="text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md truncate">
                🏡 {pendencia.chacara_nome}
              </span>
            )}
          </div>

          {/* Priority Badge */}
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}>
            {info.label}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-white group-hover:text-[#FFD600] transition-colors leading-snug line-clamp-2">
          {pendencia.titulo}
        </h4>

        {pendencia.descricao && (
          <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
            {pendencia.descricao}
          </p>
        )}
      </div>

      {/* Progress bar if subitems exist */}
      {info.subitemsTotal > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-white/50 font-semibold">
            <span>Checklist</span>
            <span>{info.subitemsCompleted}/{info.subitemsTotal}</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FFD600] h-full rounded-full transition-all duration-300"
              style={{ width: `${(info.subitemsCompleted / info.subitemsTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta Footer */}
      <div className="pt-2 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <div className="flex items-center gap-1 truncate max-w-[60%]">
            <User size={12} className="text-white/40 shrink-0" />
            <span className="truncate">{pendencia.responsavel_atual_nome || 'Sem responsável'}</span>
          </div>

          <div className={`flex items-center gap-1 font-bold ${info.isOverdue ? 'text-rose-400 font-extrabold' : 'text-white/70'}`}>
            <Clock size={12} />
            <span>{pendencia.prazo ? pendencia.prazo : 'Sem prazo'}</span>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center justify-between gap-2 pt-1" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickComplete}
              disabled={loadingAction}
              title="Marcar como Concluída"
              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all cursor-pointer"
            >
              <Check size={14} />
            </button>

            <button
              onClick={handleQuickReturn}
              disabled={loadingAction}
              title="Devolver ou Tramitar"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <RotateCcw size={14} className="text-[#FFD600]" />
            </button>
          </div>

          <button
            onClick={() => onOpenDetail(pendencia.id)}
            className="text-[11px] text-white/50 hover:text-[#FFD600] flex items-center gap-0.5 font-bold transition-colors cursor-pointer"
          >
            <span>Ver detalhes</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
