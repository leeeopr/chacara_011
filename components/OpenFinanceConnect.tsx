'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertCircle, RefreshCw, Landmark } from 'lucide-react';

// Dynamically import PluggyConnect with ssr: false to prevent "window is not defined" error in Next.js SSR
const DynamicPluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 border border-white/10 rounded-2xl text-center space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Carregando widget...</p>
          <p className="text-xs text-slate-400">Preparando integração bancária</p>
        </div>
      </div>
    ),
  }
);

interface OpenFinanceConnectProps {
  itemId?: string;
  clientUserId?: string;
  onSuccess?: (itemData: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export function OpenFinanceConnect({
  itemId,
  clientUserId,
  onSuccess,
  onError,
  onClose,
}: OpenFinanceConnectProps) {
  const [connectToken, setConnectToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (itemId) params.append('itemId', itemId);
      if (clientUserId) params.append('clientUserId', clientUserId);

      const url = `/api/connect-token${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.accessToken) {
        throw new Error(
          data.error || 'Não foi possível obter o token de conexão do Pluggy. Verifique se o CLIENT_ID e CLIENT_SECRET estão configurados no ambiente.'
        );
      }

      setConnectToken(data.accessToken);
    } catch (err: any) {
      console.error('[OpenFinanceConnect] Erro ao buscar token:', err);
      setError(err?.message || 'Falha ao conectar com o serviço do Pluggy.');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, [itemId, clientUserId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 border border-white/10 rounded-2xl text-center space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Iniciando Open Finance...</p>
          <p className="text-xs text-slate-400">Gerando sessão segura com o Pluggy</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-500/20 rounded-2xl text-left space-y-4 w-full">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-red-300">Falha ao inicializar Pluggy Connect</h4>
            <p className="text-xs text-red-400/90">{error}</p>
          </div>
        </div>

        <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-[11px] text-slate-300 space-y-1">
          <p className="font-semibold text-amber-300">Como resolver:</p>
          <p>Configure <code className="text-emerald-400 bg-white/5 px-1 py-0.5 rounded">CLIENT_ID</code> e <code className="text-emerald-400 bg-white/5 px-1 py-0.5 rounded">CLIENT_SECRET</code> nas variáveis de ambiente do projeto.</p>
        </div>

        <button
          onClick={fetchToken}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-xs text-white font-medium rounded-xl transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tentar novamente</span>
        </button>
      </div>
    );
  }

  if (!connectToken) {
    return null;
  }

  return (
    <div className="w-full flex justify-center">
      <DynamicPluggyConnect
        connectToken={connectToken}
        includeSandbox={true}
        onSuccess={(itemData) => {
          console.log('[Pluggy] Conexão bem-sucedida:', itemData);
          if (onSuccess) onSuccess(itemData);
        }}
        onError={(err) => {
          console.error('[Pluggy] Erro de conexão:', err);
          if (onError) onError(err);
        }}
        onClose={() => {
          console.log('[Pluggy] Widget fechado');
          if (onClose) onClose();
        }}
      />
    </div>
  );
}

export default OpenFinanceConnect;
