'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  Calendar, 
  DollarSign, 
  Building2, 
  Tag, 
  UserCheck, 
  Repeat, 
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  AccountPayable, 
  AccountPayableCategory, 
  AccountPayableType, 
  RecurrenceFrequency, 
  CreateAccountPayableInput,
  UpdateAccountPayableInput,
  ACCOUNT_PAYABLE_CATEGORIES 
} from '@/lib/accountsPayableTypes';
import { Chacara, CrewMember } from '@/lib/chacaraTypes';
import { getChacaras } from '@/services/chacarasService';
import { getCrewMembers } from '@/services/crewService';
import { createAccountPayable, updateAccountPayable } from '@/services/accountsPayableService';

interface AccountPayableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: AccountPayable | null;
  accountToEdit?: AccountPayable | null;
  defaultChacaraId?: string;
  defaultType?: AccountPayableType;
  defaultCategoria?: AccountPayableCategory;
  defaultPrestadorNome?: string;
  defaultPrestadorPix?: string;
  defaultPrestadorRole?: string;
}

export default function AccountPayableFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  accountToEdit,
  defaultChacaraId,
  defaultType,
  defaultCategoria,
  defaultPrestadorNome,
  defaultPrestadorPix,
  defaultPrestadorRole
}: AccountPayableFormModalProps) {
  const effectiveData = initialData || accountToEdit || null;
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [chacaraId, setChacaraId] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<AccountPayableCategory>('OUTROS');
  const [tipo, setTipo] = useState<AccountPayableType>('AVULSA');
  const [recorrenciaFrequencia, setRecorrenciaFrequencia] = useState<RecurrenceFrequency>('MENSAL');
  const [recorrenciaDia, setRecorrenciaDia] = useState<number>(10);
  const [dataVencimento, setDataVencimento] = useState('');
  const [valorPrevisto, setValorPrevisto] = useState('');
  const [valorReal, setValorReal] = useState('');
  const [prestadorId, setPrestadorId] = useState<string>('');
  const [prestadorNome, setPrestadorNome] = useState('');
  const [prestadorPix, setPrestadorPix] = useState('');
  const [prestadorRole, setPrestadorRole] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      initializeForm();
    }
  }, [isOpen, initialData, accountToEdit, defaultChacaraId, defaultType, defaultCategoria, defaultPrestadorNome, defaultPrestadorPix, defaultPrestadorRole]);

  async function loadDependencies() {
    try {
      const [chacarasList, crewList] = await Promise.all([
        getChacaras(),
        getCrewMembers({ activeOnly: true })
      ]);
      setChacaras(chacarasList || []);
      setCrewMembers(crewList || []);
    } catch (e) {
      console.error('[AccountPayableFormModal] Erro ao carregar dependências:', e);
    }
  }

  function initializeForm() {
    setError(null);
    if (effectiveData) {
      setChacaraId(effectiveData.chacara_id || '');
      setDescricao(effectiveData.descricao || '');
      setCategoria((effectiveData.categoria as AccountPayableCategory) || 'OUTROS');
      setTipo(effectiveData.tipo || 'AVULSA');
      setRecorrenciaFrequencia((effectiveData.recorrencia_frequencia as RecurrenceFrequency) || 'MENSAL');
      setRecorrenciaDia(effectiveData.recorrencia_dia_vencimento || 10);
      setDataVencimento(effectiveData.data_vencimento || '');
      setValorPrevisto(effectiveData.valor_previsto ? String(effectiveData.valor_previsto) : '');
      setValorReal(
        effectiveData.valor_real !== undefined && effectiveData.valor_real !== null 
          ? String(effectiveData.valor_real) 
          : (effectiveData.valor_pago !== undefined && effectiveData.valor_pago !== null 
              ? String(effectiveData.valor_pago) 
              : '')
      );
      setPrestadorId(effectiveData.prestador_id || '');
      setPrestadorNome(effectiveData.prestador_nome || '');
      setPrestadorPix(effectiveData.prestador_pix || '');
      setPrestadorRole(effectiveData.prestador_role || '');
      setObservacao(effectiveData.observacao || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setChacaraId(defaultChacaraId || '');
      setDescricao('');
      setCategoria(defaultCategoria || 'OUTROS');
      setTipo(defaultType || 'AVULSA');
      setRecorrenciaFrequencia('MENSAL');
      setRecorrenciaDia(10);
      setDataVencimento(today);
      setValorPrevisto('');
      setValorReal('');
      setPrestadorId('');
      setPrestadorNome(defaultPrestadorNome || '');
      setPrestadorPix(defaultPrestadorPix || '');
      setPrestadorRole(defaultPrestadorRole || '');
      setObservacao('');
    }
  }

  const handlePrestadorChange = (memberId: string) => {
    setPrestadorId(memberId);
    if (!memberId) {
      setPrestadorNome('');
      setPrestadorPix('');
      setPrestadorRole('');
      return;
    }

    const member = crewMembers.find(m => m.id === memberId);
    if (member) {
      const name = member.nome || member.name || member.full_name || '';
      setPrestadorNome(name);
      setPrestadorPix(member.chave_pix || member.pix_key || '');
      setPrestadorRole(member.funcao || member.role || member.funcao_principal || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!descricao.trim()) {
      setError('Informe uma descrição clara para a conta.');
      return;
    }

    const valorPrevistoNum = parseFloat(valorPrevisto.replace(',', '.'));
    if (isNaN(valorPrevistoNum) || valorPrevistoNum <= 0) {
      setError('Informe um valor previsto válido maior que zero.');
      return;
    }

    let valorRealNum: number | null = null;
    if (valorReal && valorReal.trim()) {
      const parsedReal = parseFloat(valorReal.replace(',', '.'));
      if (isNaN(parsedReal) || parsedReal < 0) {
        setError('O valor real informado não é válido.');
        return;
      }
      valorRealNum = parsedReal;
    }

    if (!dataVencimento) {
      setError('A data de vencimento é obrigatória.');
      return;
    }

    setLoading(true);

    try {
      const selectedChacara = chacaras.find(c => c.id === chacaraId);
      const chacaraNome = selectedChacara ? selectedChacara.name : (chacaraId ? undefined : 'Geral / Compartilhada');

      const payload: CreateAccountPayableInput = {
        chacara_id: chacaraId || null,
        chacara_nome: chacaraNome,
        descricao: descricao.trim(),
        categoria,
        tipo,
        recorrencia_frequencia: tipo === 'RECORRENTE' ? recorrenciaFrequencia : null,
        recorrencia_dia_vencimento: tipo === 'RECORRENTE' ? Number(recorrenciaDia) : null,
        data_vencimento: dataVencimento,
        valor_previsto: valorPrevistoNum,
        valor_real: valorRealNum,
        prestador_id: prestadorId || null,
        prestador_nome: prestadorNome.trim() || null,
        prestador_pix: prestadorPix.trim() || null,
        prestador_role: prestadorRole.trim() || null,
        observacao: observacao.trim() || null,
        registrado_por: 'Administrador'
      };

      if (effectiveData?.id) {
        const updatePayload: UpdateAccountPayableInput = {
          ...payload,
          status: effectiveData.status,
          data_pagamento: effectiveData.data_pagamento,
          responsavel_pagamento: effectiveData.responsavel_pagamento,
          origem_tipo: effectiveData.origem_tipo,
          origem_id: effectiveData.origem_id,
          origem_titulo: effectiveData.origem_titulo,
          origem_data_servico: effectiveData.origem_data_servico,
          provider_billing_rule_id: effectiveData.provider_billing_rule_id,
          valor_pago: effectiveData.status === 'PAGA'
            ? (valorRealNum !== null ? valorRealNum : valorPrevistoNum)
            : (effectiveData.valor_pago ?? null)
        };
        await updateAccountPayable(effectiveData.id, updatePayload);
      } else {
        await createAccountPayable(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[AccountPayableFormModal] Erro ao salvar conta:', err);
      setError(err.message || 'Erro ao salvar obrigação financeira.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0A0F2C] border border-white/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {effectiveData ? 'Editar Conta a Pagar' : 'Cadastrar Conta a Pagar'}
              </h2>
              <p className="text-xs text-white/50">
                Obrigação financeira, concessionária, prestador ou manutenção
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {effectiveData?.status === 'PAGA' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <div>
                <span className="font-bold">Conta Paga / Liquidada:</span> Qualquer alteração no valor ou nos dados será salva e persistida imediatamente no banco de dados.
              </div>
            </div>
          )}

          {/* Tipo de Obrigação (Avulsa vs Recorrente) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
              Tipo de Obrigação
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('AVULSA')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  tipo === 'AVULSA'
                    ? 'bg-blue-500/20 border-blue-500 text-white ring-1 ring-blue-500'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <Clock size={20} className={tipo === 'AVULSA' ? 'text-blue-400' : 'text-white/40'} />
                <div>
                  <p className="text-sm font-bold">Conta Avulsa</p>
                  <p className="text-[11px] text-white/50">Pagamento pontual / único</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo('RECORRENTE')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  tipo === 'RECORRENTE'
                    ? 'bg-purple-500/20 border-purple-500 text-white ring-1 ring-purple-500'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <Repeat size={20} className={tipo === 'RECORRENTE' ? 'text-purple-400' : 'text-white/40'} />
                <div>
                  <p className="text-sm font-bold">Recorrente / Fixa</p>
                  <p className="text-[11px] text-white/50">Mensal, quinzenal ou anual</p>
                </div>
              </button>
            </div>
          </div>

          {/* Description & Chácara Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                Descrição da Conta <span className="text-[#FFD600]">*</span>
              </label>
              <input
                type="text"
                required
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: CPFL Energia, Manutenção da Bomba, Diária Caseiro..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD600] focus:ring-1 focus:ring-[#FFD600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#FFD600]" />
                Chácara Vinculada
              </label>
              <select
                value={chacaraId}
                onChange={e => setChacaraId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD600]"
              >
                <option value="" className="bg-[#0A0F2C]">🏢 Geral / Compartilhada</option>
                {chacaras.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0A0F2C]">
                    🏡 {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-[#FFD600]" />
                Categoria <span className="text-[#FFD600]">*</span>
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value as AccountPayableCategory)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD600]"
              >
                {ACCOUNT_PAYABLE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-[#0A0F2C]">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence Options (if recurrent) */}
          {tipo === 'RECORRENTE' && (
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                <Repeat size={14} />
                <span>Configurações de Recorrência</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">
                    Frequência
                  </label>
                  <select
                    value={recorrenciaFrequencia}
                    onChange={e => setRecorrenciaFrequencia(e.target.value as RecurrenceFrequency)}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="MENSAL" className="bg-[#0A0F2C]">Mensal</option>
                    <option value="QUINZENAL" className="bg-[#0A0F2C]">Quinzenal</option>
                    <option value="SEMANAL" className="bg-[#0A0F2C]">Semanal</option>
                    <option value="ANUAL" className="bg-[#0A0F2C]">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">
                    Dia Padrão de Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={recorrenciaDia}
                    onChange={e => setRecorrenciaDia(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
              <p className="text-[11px] text-purple-300/70">
                Ao dar baixa nesta conta quando for paga, a próxima fatura do ciclo subsequente será gerada automaticamente.
              </p>
            </div>
          )}

          {/* Vencimento */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-[#FFD600]" />
              Data de Vencimento <span className="text-[#FFD600]">*</span>
            </label>
            <input
              type="date"
              required
              value={dataVencimento}
              onChange={e => setDataVencimento(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD600] [color-scheme:dark]"
            />
          </div>

          {/* Seção Financeira: Valor Previsto vs Valor Real */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/15 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                <DollarSign size={14} className="text-[#FFD600]" />
                Valores da Conta (Previsto × Real)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                Regra: Real &gt; Previsto
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campo 1: Valor Previsto */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center justify-between">
                  <span>Valor Previsto (R$) <span className="text-[#FFD600]">*</span></span>
                  <span className="text-[10px] text-white/40 font-normal">Configurado / Estimado</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-bold">R$</span>
                  <input
                    type="text"
                    required
                    value={valorPrevisto}
                    onChange={e => setValorPrevisto(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm font-bold font-mono focus:outline-none focus:border-[#FFD600]"
                  />
                </div>
                <p className="mt-1 text-[11px] text-white/40">
                  Valor base orçado para esta despesa.
                </p>
              </div>

              {/* Campo 2: Valor Real */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5 flex items-center justify-between">
                  <span className="text-emerald-400">Valor Real / Efetivo (R$)</span>
                  <span className="text-[10px] text-emerald-400/70 font-normal">Prioritário nos cálculos</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/60 text-xs font-bold">R$</span>
                  <input
                    type="text"
                    value={valorReal}
                    onChange={e => setValorReal(e.target.value)}
                    placeholder="Opcional (Ex: 537,82)"
                    className="w-full pl-9 pr-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-bold font-mono focus:outline-none focus:border-emerald-400"
                  />
                  {valorReal && (
                    <button
                      type="button"
                      onClick={() => setValorReal('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                      title="Limpar valor real e voltar ao valor previsto"
                    >
                      Voltar ao Previsto
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-white/40">
                  Deixe vazio se o valor real ainda não for conhecido.
                </p>
              </div>
            </div>

            {/* Live Comparison / Effective Value Feedback */}
            {(() => {
              const pNum = parseFloat(valorPrevisto.replace(',', '.')) || 0;
              const rNum = valorReal.trim() ? (parseFloat(valorReal.replace(',', '.')) || null) : null;
              const effective = rNum !== null ? rNum : pNum;
              const diff = rNum !== null ? (rNum - pNum) : 0;
              const isDiff = rNum !== null && Math.abs(diff) > 0.001;

              return (
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-blue-400 shrink-0" />
                    <div>
                      <span className="text-white/60">Valor considerado no sistema: </span>
                      <span className="font-black text-white font-mono">
                        {effective.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rNum !== null 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-white/10 text-white/70'
                      }`}>
                        {rNum !== null ? 'Base: Real' : 'Base: Previsto'}
                      </span>
                    </div>
                  </div>

                  {isDiff && (
                    <div className="text-[11px] font-mono shrink-0">
                      {diff > 0 ? (
                        <span className="text-rose-400 font-semibold">
                          +{diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (+{((diff / pNum) * 100).toFixed(1)}%) acima
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({((diff / pNum) * 100).toFixed(1)}%) economia
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Prestador / Beneficiário Selection */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-400" />
                Vincular Prestador de Serviço / Equipe (Opcional)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={prestadorId}
                  onChange={e => handlePrestadorChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="" className="bg-[#0A0F2C]">Nenhum membro selecionado (Avulso / Concessionária)</option>
                  {crewMembers.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#0A0F2C]">
                      👤 {m.nome || m.name || m.full_name} ({m.funcao || m.role || 'Equipe'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">
                  Nome do Favorecido
                </label>
                <input
                  type="text"
                  value={prestadorNome}
                  onChange={e => setPrestadorNome(e.target.value)}
                  placeholder="Ex: João da Silva / CPFL"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">
                  Chave PIX para Pagamento
                </label>
                <input
                  type="text"
                  value={prestadorPix}
                  onChange={e => setPrestadorPix(e.target.value)}
                  placeholder="CPF, CNPJ, E-mail ou Telefone"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
              Observações Adicionais
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Número de instalação, detalhes do boleto, acordos de pagamento..."
              className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD600]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] font-black text-sm hover:bg-[#FFD600]/90 transition-all shadow-[0_0_20px_rgba(255,214,0,0.25)] flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0A0F2C] border-t-transparent rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Wallet size={16} />
                <span>{initialData ? 'Atualizar Conta' : 'Salvar Conta'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
