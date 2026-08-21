'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Settings2, 
  Clock, 
  Database, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info,
  Check,
  X,
  Layers,
  Repeat
} from 'lucide-react';
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { SyncOptions } from '@/services/googleCalendarService';

export default function GoogleCalendarSettingsPanel() {
  const {
    isConnected,
    user,
    selectedCalendarId,
    setSelectedCalendarId,
    availableCalendars,
    autoSyncEnabled,
    setAutoSyncEnabled,
    isSyncing,
    lastSyncResult,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    triggerSync,
    refreshCalendars
  } = useGoogleCalendar();

  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync Scope Toggles
  const [projectionMonths, setProjectionMonths] = useState<number>(6);
  const [includeReservations, setIncludeReservations] = useState<boolean>(true);
  const [includeOperational, setIncludeOperational] = useState<boolean>(true);
  const [includeBlocks, setIncludeBlocks] = useState<boolean>(true);
  const [includeRecurringRules, setIncludeRecurringRules] = useState<boolean>(true);

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMessage(null);
    try {
      await connectGoogleCalendar();
      setSuccessMessage('Conta do Google Calendar conectada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar com a conta do Google.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Deseja realmente desconectar sua conta do Google Calendar? As sincronizações automáticas serão pausadas.')) {
      await disconnectGoogleCalendar();
      setSuccessMessage('Conta desconectada com sucesso.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleSyncNow = async (forceFull = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const opts: SyncOptions = {
        calendarId: selectedCalendarId,
        projectionMonths,
        includeReservations,
        includeOperational,
        includeBlocks,
        includeRecurringRules,
        forceFullReconciliation: forceFull
      };

      const result = await triggerSync(opts);
      if (result.success) {
        setSuccessMessage(`Sincronização concluída! Processados ${result.totalProcessed} itens (${result.created} criados, ${result.updated} atualizados, ${result.deleted} removidos).`);
      } else {
        setErrorMessage(`Sincronização concluída com ${result.errors} erros. Verifique os logs detalhados abaixo.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao executar sincronização com Google Calendar.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#0A0F2C] via-[#0E153A] to-[#141B4D]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4285F4]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-[#4285F4]/15 border border-[#4285F4]/30 text-[#4285F4] rounded-2xl shrink-0 shadow-lg shadow-[#4285F4]/10">
              <CalendarIcon size={32} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-white">
                  Integração Google Calendar
                </h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                  isConnected 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-white/10 text-white/50 border-white/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                  {isConnected ? 'Conectado e Idempotente' : 'Não Conectado'}
                </span>
              </div>
              <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
                Sincronize reservas de hóspedes, bloqueios de propriedades e serviços operacionais recorrentes em tempo real com o Google Calendar com mapeamento único por ID (`source_type`, `source_id`), evitando duplicações.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {isConnected ? (
              <button
                type="button"
                onClick={() => handleSyncNow(false)}
                disabled={isSyncing}
                className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-3 px-6 rounded-2xl shadow-xl shadow-[#FFD600]/20 transition-all active:scale-[0.98] flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="bg-white hover:bg-gray-100 text-[#0A0F2C] font-bold py-3 px-6 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{connecting ? 'Conectando...' : 'Conectar com Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connection & Account Card */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#4285F4]" />
                Conta Vinculada
              </h4>
              {isConnected && (
                <button
                  onClick={refreshCalendars}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                  title="Atualizar lista de calendários"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            {isConnected && user ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Google'} className="w-11 h-11 rounded-full border border-white/20" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#4285F4] text-white font-black flex items-center justify-center text-base">
                      {user.displayName ? user.displayName.charAt(0) : 'G'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{user.displayName || 'Usuário Google'}</p>
                    <p className="text-xs text-white/50 truncate">{user.email || 'Email não disponível'}</p>
                  </div>
                </div>

                {/* Calendar Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/70 block uppercase tracking-wider">
                    Calendário de Destino
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCalendarId}
                      onChange={(e) => setSelectedCalendarId(e.target.value)}
                      className="w-full bg-[#070A1E] border border-white/15 rounded-xl px-4 py-3 text-xs text-white appearance-none focus:outline-none focus:border-[#4285F4]"
                    >
                      <option value="primary">Calendário Principal (Primary)</option>
                      {availableCalendars.filter(c => c.id !== 'primary').map(c => (
                        <option key={c.id} value={c.id}>
                          {c.summary} ({c.id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-white/40 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-white/40">
                    Selecione em qual calendário da sua conta Google os eventos serão criados.
                  </p>
                </div>

                {/* Disconnect Option */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} />
                    <span>Desconectar Conta Google</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
                  <CalendarIcon size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">Nenhuma Conta Conectada</p>
                  <p className="text-[11px] text-white/50 max-w-xs mx-auto">
                    Conecte sua conta do Google para habilitar a sincronização bidirecional e o controle de agenda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-[#0A0F2C] font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{connecting ? 'Conectando...' : 'Fazer Login com Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Info / Architecture Card */}
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database size={14} className="text-[#FFD600]" />
              Mapeamento Idempotente (`google_calendar_events`)
            </h4>
            <ul className="text-[11px] text-white/60 space-y-2 list-disc list-inside leading-relaxed">
              <li>Mapeamento direto entre registros locais (`source_id`) e IDs do Google Event (`google_event_id`).</li>
              <li>Sincronizações repetidas executam chamadas de atualização `PATCH` em vez de criar novos eventos.</li>
              <li>Suporte nativo a regras de recorrência RRULE e exceções.</li>
              <li>Varredura configurável (janela de projeção de até 12 meses).</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Sync Settings & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Options Card */}
          <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings2 size={16} className="text-[#FFD600]" />
                Regras de Sincronização & Escopo
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 font-medium">Auto-Sync</span>
                <button
                  type="button"
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    autoSyncEnabled ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    autoSyncEnabled ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Projection Window */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 block uppercase tracking-wider">
                  Janela de Projeção Futura
                </label>
                <div className="relative">
                  <select
                    value={projectionMonths}
                    onChange={(e) => setProjectionMonths(Number(e.target.value))}
                    className="w-full bg-[#070A1E] border border-white/15 rounded-xl px-4 py-3 text-xs text-white appearance-none focus:outline-none focus:border-[#FFD600]"
                  >
                    <option value={3}>Próximos 3 meses</option>
                    <option value={6}>Próximos 6 meses (Padrão)</option>
                    <option value={12}>Próximos 12 meses</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-white/40 pointer-events-none" />
                </div>
                <p className="text-[11px] text-white/40">
                  Define até quantos meses no futuro o sistema projetará e manterá sincronizados os eventos recorrentes.
                </p>
              </div>

              {/* Toggles List */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-white/70 block uppercase tracking-wider">
                  Entidades Sincronizadas
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeReservations}
                      onChange={(e) => setIncludeReservations(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#FFD600] bg-white/10 border-white/20"
                    />
                    <span>Reservas de Hóspedes (Confirmadas e Pré-reservas)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeOperational}
                      onChange={(e) => setIncludeOperational(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#FFD600] bg-white/10 border-white/20"
                    />
                    <span>Serviços Operacionais (Limpeza, Manutenção, Piscina, etc.)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeBlocks}
                      onChange={(e) => setIncludeBlocks(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#FFD600] bg-white/10 border-white/20"
                    />
                    <span>Bloqueios Administrativos de Chácaras</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeRecurringRules}
                      onChange={(e) => setIncludeRecurringRules(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#FFD600] bg-white/10 border-white/20"
                    />
                    <span>Regras Recorrentes (RRULE nativo do Google Calendar)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => handleSyncNow(true)}
                disabled={!isConnected || isSyncing}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40"
              >
                <Repeat size={14} />
                <span>Forçar Reconciliação Total</span>
              </button>

              <button
                type="button"
                onClick={() => handleSyncNow(false)}
                disabled={!isConnected || isSyncing}
                className="px-6 py-3 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#FFD600]/20 flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Sincronizando Sistema...' : 'Sincronizar com Google Calendar'}</span>
              </button>
            </div>
          </div>

          {/* Last Sync Execution Summary */}
          {lastSyncResult && (
            <div className="glass p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} className="text-emerald-400" />
                  Última Execução: {new Date(lastSyncResult.syncedAt).toLocaleString('pt-BR')}
                </h4>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  lastSyncResult.success 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                }`}>
                  {lastSyncResult.success ? 'Concluído com Sucesso' : 'Com Erros'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] font-bold text-white/50 uppercase">Processados</p>
                  <p className="text-lg font-black text-white">{lastSyncResult.totalProcessed}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
                  <p className="text-[10px] font-bold text-emerald-300 uppercase">Criados</p>
                  <p className="text-lg font-black text-emerald-400">{lastSyncResult.created}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center">
                  <p className="text-[10px] font-bold text-blue-300 uppercase">Atualizados</p>
                  <p className="text-lg font-black text-blue-400">{lastSyncResult.updated}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-center">
                  <p className="text-[10px] font-bold text-red-300 uppercase">Removidos / Erros</p>
                  <p className="text-lg font-black text-red-400">{lastSyncResult.deleted} / {lastSyncResult.errors}</p>
                </div>
              </div>

              {/* Logs Drawer / List */}
              {lastSyncResult.logs && lastSyncResult.logs.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold text-white/60 uppercase">
                    Log de Atividades Recentes:
                  </p>
                  <div className="max-h-48 overflow-y-auto bg-[#070A1E] rounded-2xl p-3 border border-white/10 space-y-1.5 font-mono text-[11px]">
                    {lastSyncResult.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 border-b border-white/5 pb-1">
                        <span className="text-white/40 shrink-0">{log.timestamp}</span>
                        <span className={
                          log.level === 'success' ? 'text-emerald-400' :
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-amber-400' : 'text-blue-300'
                        }>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-white/80 break-words">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
