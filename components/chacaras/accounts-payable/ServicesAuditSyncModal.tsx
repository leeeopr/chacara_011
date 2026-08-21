'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Calendar, 
  Building2, 
  DollarSign, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  auditExistingServicesForAccountsPayable, 
  batchGenerateAccountsForExistingServices,
  ServiceAccountPayableAuditItem
} from '@/services/serviceAccountsPayableAutomation';

interface ServicesAuditSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onAccountsCreated?: () => void;
}

export default function ServicesAuditSyncModal({
  isOpen,
  onClose,
  onSuccess,
  onAccountsCreated
}: ServicesAuditSyncModalProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [auditItems, setAuditItems] = useState<ServiceAccountPayableAuditItem[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      runAudit();
    }
  }, [isOpen]);

  async function runAudit() {
    setLoading(true);
    setResultMessage(null);
    try {
      const auditResult = await auditExistingServicesForAccountsPayable();
      setAuditItems(auditResult.auditItems || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchGenerate() {
    setSyncing(true);
    try {
      const count = await batchGenerateAccountsForExistingServices();
      setResultMessage(`${count} contas a pagar foram geradas com sucesso a partir dos serviços existentes!`);
      await runAudit();
      if (onSuccess) onSuccess();
      if (onAccountsCreated) onAccountsCreated();
    } catch (e: any) {
      setResultMessage(`Erro ao gerar contas: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  if (!isOpen) return null;

  const missingAccounts = auditItems.filter(i => !i.hasLinkedAccount && i.matchingRule);
  const alreadyLinked = auditItems.filter(i => i.hasLinkedAccount);
  const withoutRules = auditItems.filter(i => !i.matchingRule);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500 p-2.5 rounded-2xl text-[#0A0F2C]">
              <Zap size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                Auditoria de Serviços & Contas a Pagar
              </h3>
              <p className="text-xs text-white/50">
                Verifique se todos os serviços operacionais agendados possuem sua conta a pagar gerada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {resultMessage && (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{resultMessage}</span>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl">
              <span className="text-[11px] text-amber-400 font-bold uppercase block">Pendentes de Geração</span>
              <strong className="text-xl font-black text-white">{missingAccounts.length}</strong>
              <p className="text-[10px] text-white/50 mt-0.5">Com regra ativa</p>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
              <span className="text-[11px] text-emerald-400 font-bold uppercase block">Contas Vinculadas</span>
              <strong className="text-xl font-black text-white">{alreadyLinked.length}</strong>
              <p className="text-[10px] text-white/50 mt-0.5">Sincronizadas</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
              <span className="text-[11px] text-white/60 font-bold uppercase block">Sem Regra Cadastrada</span>
              <strong className="text-xl font-black text-white">{withoutRules.length}</strong>
              <p className="text-[10px] text-white/50 mt-0.5">Sem valor padrão</p>
            </div>
          </div>

          {/* Batch Generation Callout */}
          {missingAccounts.length > 0 && (
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  Gerar Contas Faltantes em Lote
                </h4>
                <p className="text-xs text-white/60 mt-0.5">
                  Existem {missingAccounts.length} serviço(s) com regra ativa que ainda não têm conta a pagar correspondente.
                </p>
              </div>

              <button
                onClick={handleBatchGenerate}
                disabled={syncing}
                className="bg-cyan-500 hover:bg-cyan-400 text-[#0A0F2C] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {syncing ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                <span>Gerar {missingAccounts.length} Contas Agora</span>
              </button>
            </div>
          )}

          {/* Detailed List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider">
              Detalhamento dos Serviços Auditados
            </h4>

            {loading ? (
              <div className="p-8 text-center text-white/40 text-xs animate-pulse">
                Executando auditoria do calendário operacional...
              </div>
            ) : auditItems.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-xs bg-white/5 rounded-2xl">
                Nenhum serviço operacional agendado encontrado no sistema.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {auditItems.map(item => {
                  return (
                    <div 
                      key={item.event.id}
                      className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-bold">{item.event.title}</strong>
                          <span className="text-[10px] text-white/50">({item.event.start_date})</span>
                        </div>
                        <p className="text-[11px] text-white/60 flex items-center gap-2">
                          <span>Prestador: <strong>{item.staffMember?.nome || 'A definir'}</strong></span>
                          <span>•</span>
                          <span>Chácara: <strong>{item.chacara?.name || 'Geral'}</strong></span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {item.hasLinkedAccount ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 size={10} />
                              {item.linkedAccount?.status || 'Vinculada'}
                            </span>
                            <div className="text-[11px] text-white/80 font-bold">
                              R$ {Number(item.linkedAccount?.valor_previsto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        ) : item.matchingRule ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Pendente Geração
                            </span>
                            <div className="text-[11px] text-emerald-400 font-bold">
                              R$ {Number(item.matchingRule.valor_padrao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/40 italic">
                            Sem regra de cobrança
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={runAudit}
            disabled={loading}
            className="text-xs text-white/60 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar Auditoria</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
