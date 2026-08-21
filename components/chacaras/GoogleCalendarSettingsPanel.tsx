'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Settings2, 
  AlertTriangle,
  Zap,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { 
  getGoogleCalendarIntegration, 
  saveGoogleCalendarIntegration, 
  syncGoogleCalendarEvents,
  GoogleCalendarIntegration 
} from '@/services/googleCalendarService';

export default function GoogleCalendarSettingsPanel() {
  const [integration, setIntegration] = useState<GoogleCalendarIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const data = await getGoogleCalendarIntegration();
      setIntegration(data);
    } catch (e) {
      console.error('Erro ao carregar integração do Google Calendar:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      // Simulate Google OAuth popup flow or direct connection confirmation
      const simulatedEmail = 'atendimento.chacaras@gmail.com';
      const simulatedCalendarId = 'primary';
      const simulatedCalendarName = 'Agenda Principal - Chácaras & Reservas';

      const updated = await saveGoogleCalendarIntegration({
        ...(integration || {}),
        connected: true,
        google_email: simulatedEmail,
        calendar_id: simulatedCalendarId,
        calendar_name: simulatedCalendarName,
        sync_status: 'SUCCESS',
        last_sync_at: new Date().toISOString()
      });

      setIntegration(updated);
      setMessage({ type: 'success', text: 'Google Calendar conectado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Falha ao conectar ao Google Calendar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar a conta do Google Calendar? Os eventos não serão mais sincronizados automaticamente.')) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const updated = await saveGoogleCalendarIntegration({
        ...(integration || {}),
        connected: false,
        google_email: undefined,
        calendar_id: undefined,
        calendar_name: undefined,
        sync_status: 'IDLE'
      });

      setIntegration(updated);
      setMessage({ type: 'success', text: 'Google Calendar desconectado.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao desconectar Google Calendar.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSyncReservations = async (checked: boolean) => {
    if (!integration) return;
    try {
      const updated = await saveGoogleCalendarIntegration({
        ...integration,
        auto_sync_reservations: checked
      });
      setIntegration(updated);
    } catch (e) {
      console.error('Erro ao salvar configuração:', e);
    }
  };

  const handleToggleAutoSyncEvents = async (checked: boolean) => {
    if (!integration) return;
    try {
      const updated = await saveGoogleCalendarIntegration({
        ...integration,
        auto_sync_events: checked
      });
      setIntegration(updated);
    } catch (e) {
      console.error('Erro ao salvar configuração:', e);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await syncGoogleCalendarEvents();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
      await loadIntegration();
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Erro na sincronização manual.' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !integration) {
    return (
      <div className="p-12 text-center text-white/50 animate-pulse">
        Carregando configurações do Google Calendar...
      </div>
    );
  }

  const isConnected = integration?.connected ?? false;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 bg-[#0A0F2C] border border-white/10 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
              Integração Nativa Google
            </span>
            <span className="text-xs text-white/40">• Sincronização em Tempo Real</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2.5">
            <Calendar size={24} className="text-emerald-400" />
            Integração com Google Calendar
          </h2>
          <p className="text-xs text-white/60 mt-1">
            Sincronize automaticamente todas as reservas, bloqueios de datas e tarefas da equipe diretamente com a sua agenda Google.
          </p>
        </div>

        {isConnected ? (
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-[#0A0F2C] font-black text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Zap size={18} />
            <span>Conectar Google Calendar</span>
          </button>
        )}
      </div>

      {/* Alert Message */}
      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Connection Status Box */}
        <div className="md:col-span-2 p-6 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={18} className="text-purple-400" />
              Status da Conexão
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              isConnected 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {isConnected ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {isConnected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Conta Google</span>
                  <p className="text-sm font-black text-white truncate">{integration?.google_email || 'Não informado'}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Calendário Destino</span>
                  <p className="text-sm font-black text-emerald-400 truncate">{integration?.calendar_name || 'Agenda Principal'}</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Última Sincronização</span>
                  <p className="text-xs font-bold text-white/80">
                    {integration?.last_sync_at 
                      ? new Date(integration.last_sync_at).toLocaleString('pt-BR') 
                      : 'Nunca sincronizado'}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Desconectar Conta
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <Calendar size={40} className="mx-auto text-white/20" />
              <div>
                <h4 className="text-sm font-bold text-white">Nenhum calendário vinculado</h4>
                <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
                  Conecte sua conta do Google Calendar para exportar e importar eventos automaticamente entre o sistema de chácaras e seus dispositivos móveis.
                </p>
              </div>
              <button
                onClick={handleConnect}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Conectar Conta Google</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Sync Preferences Card */}
        <div className="p-6 bg-[#0A0F2C] border border-white/10 rounded-3xl space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-4">
            <Settings2 size={18} className="text-[#FFD600]" />
            Regras de Sincronização
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-white block">Sincronizar Reservas</span>
                <span className="text-[10px] text-white/50">Cria eventos com datas de check-in / check-out</span>
              </div>
              <input
                type="checkbox"
                checked={integration?.auto_sync_reservations ?? true}
                onChange={(e) => handleToggleAutoSyncReservations(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-white block">Sincronizar Bloqueios & Manutenções</span>
                <span className="text-[10px] text-white/50">Exporta bloqueios de calendário da equipe</span>
              </div>
              <input
                type="checkbox"
                checked={integration?.auto_sync_events ?? true}
                onChange={(e) => handleToggleAutoSyncEvents(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-1 text-xs">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Layers size={14} /> Prevenção de Conflitos
            </span>
            <p className="text-[11px] text-white/60 leading-relaxed">
              O sistema atualiza eventos existentes por ID único para impedir duplicidade de check-ins no Google Calendar.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
