'use client';

import React, { useState } from 'react';
import { X, Landmark, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { OpenFinanceConnect } from './OpenFinanceConnect';

interface OpenFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (itemData: any) => void;
}

export default function OpenFinanceModal({
  isOpen,
  onClose,
  onSuccess,
}: OpenFinanceModalProps) {
  const [connectionSuccess, setConnectionSuccess] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSuccess = (itemData: any) => {
    setConnectionSuccess(itemData);
    if (onSuccess) onSuccess(itemData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0A0F2C] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Open Finance • Pluggy Connect
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Conecte sua conta bancária de forma segura para sincronizar transações.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {connectionSuccess ? (
            <div className="p-6 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-emerald-300">Banco Conectado com Sucesso!</h4>
                <p className="text-xs text-slate-300">
                  Item ID: <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded">{connectionSuccess?.item?.id || connectionSuccess?.id || 'Conectado'}</code>
                </p>
                <p className="text-xs text-slate-400">
                  As transações e saldos serão atualizados através dos webhooks da Pluggy.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setConnectionSuccess(null);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  Conectar Outro Banco
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Pluggy Connect Widget Embedded Container */}
              <div className="min-h-[350px] flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950/60 border border-white/5 p-2">
                <OpenFinanceConnect
                  onSuccess={handleSuccess}
                  onError={(err) => console.error('[Modal] Erro no Pluggy:', err)}
                  onClose={onClose}
                />
              </div>

              {/* Security Footnote */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-[11px] text-slate-400">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Ambiente regulamentado pelo Banco Central (Open Finance Brasil). Suas credenciais de login nunca são visualizadas nem armazenadas pelo nosso sistema.
                </span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
