'use client';

import React from 'react';
import {
  X,
  ShieldCheck,
  XCircle,
  Lock,
  HelpCircle,
  DollarSign,
  Info,
  CheckCircle2,
  Wallet,
  ShieldAlert,
  Wrench,
  ArrowRight
} from 'lucide-react';
import { HousePurchase } from '@/lib/purchasesTypes';
import { PurchaseViabilityAnalysis } from '@/lib/purchaseViabilityTypes';
import { formatCurrency } from '@/lib/utils';

interface PurchaseViabilityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: HousePurchase | null;
  analysis: PurchaseViabilityAnalysis | null;
  onMarkAsBought?: (purchaseId: string) => void;
}

export default function PurchaseViabilityDetailModal({
  isOpen,
  onClose,
  purchase,
  analysis,
  onMarkAsBought
}: PurchaseViabilityDetailModalProps) {
  if (!isOpen || !purchase || !analysis) return null;

  const isViable = analysis.verdict === 'VIAVEL';
  const isNotViable = analysis.verdict === 'NAO_VIAVEL';
  const isBlocked = analysis.verdict === 'AGUARDANDO_DEPENDENCIA';

  const getVerdictCardStyle = () => {
    if (isViable) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: <ShieldCheck className="text-emerald-400" size={24} />,
        title: '🟢 Compra Viável',
        sub: 'Cabe integralmente no Saldo Real Atual disponível'
      };
    }
    if (isNotViable) {
      return {
        bg: 'bg-rose-500/10 border-rose-500/30',
        text: 'text-rose-400',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <XCircle className="text-rose-400" size={24} />,
        title: '🔴 Compra Não Viável',
        sub: 'Custo superior ao Saldo Real Atual disponível'
      };
    }
    if (isBlocked) {
      return {
        bg: 'bg-purple-500/10 border-purple-500/30',
        text: 'text-purple-300',
        badge: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
        icon: <Lock className="text-purple-400" size={24} />,
        title: '⚪ Aguardando Dependência',
        sub: 'Bloqueada até a conclusão da etapa prévia'
      };
    }
    return {
      bg: 'bg-zinc-800/50 border-white/10',
      text: 'text-zinc-300',
      badge: 'bg-zinc-700/50 text-zinc-300 border-white/20',
      icon: <HelpCircle className="text-zinc-400" size={24} />,
      title: '⚪ Preço Não Informado',
      sub: 'Informe o valor previsto ou preço real'
    };
  };

  const style = getVerdictCardStyle();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${style.bg}`}>
              {style.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${style.badge}`}>
                  {analysis.verdictLabel}
                </span>
                <span className="text-[11px] text-white/40">Demonstrativo de Viabilidade</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                {purchase.product_name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Core Question & Verdict Box */}
        <div className={`p-5 rounded-2xl border ${style.bg} space-y-3`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-base font-black ${style.text} flex items-center gap-2`}>
              {style.title}
            </h3>
            <span className="text-[11px] text-white/50 font-medium">
              Pergunta: “Você consegue comprar este produto utilizando o seu Saldo Real Atual?”
            </span>
          </div>

          {/* Direct official phrase */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/5">
            <p className="text-xs font-bold text-white leading-relaxed">
              “{analysis.fraseExplicativa}”
            </p>
          </div>

          <p className="text-xs text-white/80 leading-relaxed">
            {analysis.justification}
          </p>
        </div>

        {/* Detailed 6-Step Demonstration requested by User */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={14} className="text-amber-400" />
              Demonstrativo Detalhado de Viabilidade (Raio-X)
            </h4>
            <span className="text-[10px] text-white/40 font-mono">
              Fórmula Oficial do Sistema
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Total Comprovado */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet size={16} className="text-white/60" />
                <div>
                  <span className="text-[11px] font-bold text-white block">1. Total Comprovado</span>
                  <span className="text-[10px] text-white/50">Receitas comprovadamente recebidas em conta</span>
                </div>
              </div>
              <span className="text-sm font-black text-white">
                {formatCurrency(analysis.totalComprovado)}
              </span>
            </div>

            {/* 2. Reserva de Emergência */}
            <div className="p-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={16} className="text-blue-400" />
                <div>
                  <span className="text-[11px] font-bold text-blue-300 block">2. (−) Reserva de Emergência</span>
                  <span className="text-[10px] text-blue-200/60">Fundo intocável protegido</span>
                </div>
              </div>
              <span className="text-sm font-black text-blue-300">
                - {formatCurrency(analysis.reservaEmergencia)}
              </span>
            </div>

            {/* 3. Mínimo Circulável */}
            <div className="p-3 rounded-xl bg-amber-400/[0.04] border border-amber-400/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wrench size={16} className="text-amber-400" />
                <div>
                  <span className="text-[11px] font-bold text-amber-300 block">
                    3. (−) Mínimo Circulável ({analysis.percentualManutencao}%)
                  </span>
                  <span className="text-[10px] text-amber-200/60">Parcela protegida para absorver manutenções</span>
                </div>
              </div>
              <span className="text-sm font-black text-amber-300">
                - {formatCurrency(analysis.minimoCirculavelManutencao)}
              </span>
            </div>

            {/* 4. Saldo Real Atual */}
            <div className="p-3.5 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div>
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider block">
                    4. (=) Saldo Real Atual Disponível
                  </span>
                  <span className="text-[10px] text-white/60">Total Comprovado − Reserva − Mínimo Circulável</span>
                </div>
              </div>
              <span className="text-base font-black text-emerald-400">
                {formatCurrency(analysis.saldoRealAtual)}
              </span>
            </div>

            {/* 5. Custo da Compra */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowRight size={16} className="text-rose-400" />
                <div>
                  <span className="text-[11px] font-bold text-rose-300 block">5. (−) Custo da Compra</span>
                  <span className="text-[10px] text-white/50">
                    {purchase.paid_price && purchase.paid_price > 0 ? 'Preço Real registrado' : 'Preço Previsto informado'}
                  </span>
                </div>
              </div>
              <span className="text-sm font-black text-rose-300">
                - {formatCurrency(analysis.cost)}
              </span>
            </div>

            {/* 6. Saldo Após a Compra */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              analysis.isViable 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-rose-500/10 border-rose-500/30'
            }`}>
              <div>
                <span className={`text-xs font-black uppercase tracking-wider block ${
                  analysis.isViable ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  6. (=) Saldo Após a Compra:
                </span>
                <p className="text-[11px] text-white/70 mt-0.5">
                  {analysis.isViable 
                    ? `Compra viável: restam ${formatCurrency(analysis.saldoAposCompra)} livres no Saldo Real Atual.`
                    : `Compra inviável: faltam ${formatCurrency(Math.abs(analysis.saldoAposCompra))} em relação ao Saldo Real Atual disponível.`}
                </p>
              </div>

              <span className={`text-lg font-black shrink-0 ${
                analysis.isViable ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(analysis.saldoAposCompra)}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Recommendation */}
        {analysis.recommendation && (
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-white/80">
              <strong className="text-white font-semibold block mb-0.5">Recomendação:</strong>
              {analysis.recommendation}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
          <div>
            <span>Chácara: <strong className="text-white">{purchase.chacara_nome || 'Geral'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>

            {purchase.status !== 'COMPRADO' && onMarkAsBought && (
              <button
                onClick={() => onMarkAsBought(purchase.id)}
                className={`px-4 py-2 rounded-xl font-black text-zinc-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                  isViable 
                    ? 'bg-emerald-400 hover:bg-emerald-300' 
                    : 'bg-amber-400 hover:bg-amber-300'
                }`}
              >
                <CheckCircle2 size={15} />
                Registrar como Comprado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

