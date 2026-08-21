'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Clock, 
  Building2,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { 
  ProviderBillingRule, 
  DueDateRuleType, 
  ACCOUNT_PAYABLE_CATEGORIES 
} from '@/lib/accountsPayableTypes';
import { 
  getProviderBillingRules, 
  saveProviderBillingRule, 
  deleteProviderBillingRule 
} from '@/services/providerBillingRulesService';
import { getCrewMembers } from '@/services/crewService';
import { getChacaras } from '@/services/chacarasService';
import { getOperationalEventTypes } from '@/services/operationalCalendarService';
import { CrewMember, Chacara, OperationalEventType } from '@/lib/chacaraTypes';

export default function ProviderBillingRulesTab() {
  const [rules, setRules] = useState<ProviderBillingRule[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [eventTypes, setEventTypes] = useState<OperationalEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProviderBillingRule | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [prestadorId, setPrestadorId] = useState('');
  const [chacaraId, setChacaraId] = useState<string>(''); // empty string = Geral
  const [eventTypeCode, setEventTypeCode] = useState<string>(''); // empty = Qualquer serviço
  const [descricaoPadrao, setDescricaoPadrao] = useState('');
  const [categoria, setCategoria] = useState('EQUIPE_LIMPEZA');
  const [valorPadrao, setValorPadrao] = useState<number | string>(300);
  const [regraVencimento, setRegraVencimento] = useState<DueDateRuleType>('DAYS_AFTER');
  const [diasAposServico, setDiasAposServico] = useState<number | string>(3);
  const [diaFixoMes, setDiaFixoMes] = useState<number | string>(5);
  const [ativo, setAtivo] = useState(true);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rulesData, crewData, chacarasData, typesData] = await Promise.all([
        getProviderBillingRules(),
        getCrewMembers(),
        getChacaras(),
        getOperationalEventTypes()
      ]);
      setRules(rulesData);
      setCrewMembers(crewData);
      setChacaras(chacarasData);
      setEventTypes(typesData);
    } catch (e) {
      console.error('[ProviderBillingRulesTab] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenNew = () => {
    setEditingRule(null);
    setPrestadorId(crewMembers[0]?.id || '');
    setChacaraId('');
    setEventTypeCode('');
    setDescricaoPadrao('Serviço de Limpeza Pós-Check-out');
    setCategoria('EQUIPE_LIMPEZA');
    setValorPadrao(300);
    setRegraVencimento('DAYS_AFTER');
    setDiasAposServico(3);
    setDiaFixoMes(5);
    setAtivo(true);
    setObservacao('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: ProviderBillingRule) => {
    setEditingRule(rule);
    setPrestadorId(rule.prestador_id);
    setChacaraId(rule.chacara_id || '');
    setEventTypeCode(rule.event_type_code || '');
    setDescricaoPadrao(rule.descricao_padrao);
    setCategoria(rule.categoria);
    setValorPadrao(rule.valor_padrao);
    setRegraVencimento(rule.regra_vencimento);
    setDiasAposServico(rule.dias_apos_servico != null ? rule.dias_apos_servico : 0);
    setDiaFixoMes(rule.dia_fixo_mes != null ? rule.dia_fixo_mes : 5);
    setAtivo(rule.ativo);
    setObservacao(rule.observacao || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra de cobrança?')) {
      await deleteProviderBillingRule(id);
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestadorId) {
      setFormError('Selecione o prestador de serviço.');
      return;
    }
    if (!valorPadrao || Number(valorPadrao) <= 0) {
      setFormError('Informe um valor padrão válido maior que zero.');
      return;
    }

    setModalLoading(true);
    setFormError(null);

    const staffObj = crewMembers.find(c => c.id === prestadorId);
    const chacaraObj = chacaras.find(c => c.id === chacaraId);

    try {
      await saveProviderBillingRule({
        id: editingRule?.id,
        prestador_id: prestadorId,
        prestador_nome: staffObj?.nome || staffObj?.name || 'Prestador',
        prestador_pix: staffObj?.pix_key || staffObj?.chave_pix || '',
        prestador_role: (staffObj?.roles && staffObj.roles[0]?.nome) || staffObj?.funcao || '',
        chacara_id: chacaraId ? chacaraId : null,
        chacara_nome: chacaraId ? (chacaraObj?.name || 'Chácara Vinculada') : 'Geral (Todas as Chácaras)',
        descricao_padrao: descricaoPadrao.trim() || 'Serviço Operacional',
        categoria: categoria,
        valor_padrao: Number(valorPadrao),
        regra_vencimento: regraVencimento,
        dias_apos_servico: regraVencimento === 'DAYS_AFTER' ? Number(diasAposServico) : undefined,
        dia_fixo_mes: regraVencimento === 'FIXED_DAY_MONTH' ? Number(diaFixoMes) : undefined,
        event_type_code: eventTypeCode || null,
        ativo: ativo,
        observacao: observacao.trim() || null
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar regra de cobrança.');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredRules = rules.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (r.prestador_nome && r.prestador_nome.toLowerCase().includes(q)) ||
      (r.descricao_padrao && r.descricao_padrao.toLowerCase().includes(q)) ||
      (r.chacara_nome && r.chacara_nome.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Explanatory Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-400" />
            Regras de Cobrança por Prestador
          </h3>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
            Configure quanto cada prestador de serviço recebe por prestação (diária, faxina, piscina, poda).
            Sempre que um novo serviço for agendado no calendário para esse prestador, uma <strong>Conta a Pagar</strong> é gerada automaticamente.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="bg-cyan-500 hover:bg-cyan-400 text-[#0A0F2C] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>Nova Regra de Prestador</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          placeholder="Pesquisar por prestador, serviço ou chácara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-cyan-400 outline-none"
        />
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="p-12 text-center text-white/40 text-sm animate-pulse">
          Carregando regras de cobrança...
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="p-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
          <Users size={36} className="mx-auto text-white/20 mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">Nenhuma regra de cobrança cadastrada</h4>
          <p className="text-xs text-white/50 max-w-md mx-auto mb-4">
            Cadastre uma regra vinculando o prestador de serviço (ex: João Limpeza), o valor por serviço e a regra de vencimento.
          </p>
          <button
            onClick={handleOpenNew}
            className="bg-cyan-500 hover:bg-cyan-400 text-[#0A0F2C] font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} />
            <span>Criar Primeira Regra</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map(rule => {
            return (
              <div 
                key={rule.id}
                className="bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Provider & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {rule.prestador_nome || 'Prestador'}
                      </h4>
                      <p className="text-[11px] text-white/50 flex items-center gap-1.5 mt-0.5">
                        <Building2 size={12} className="text-cyan-400" />
                        <span>{rule.chacara_nome || 'Todas as Chácaras'}</span>
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      rule.ativo ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/40'
                    }`}>
                      {rule.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  {/* Value & Description */}
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-white/60">Valor por Serviço:</span>
                      <span className="text-base font-black text-emerald-400">
                        R$ {Number(rule.valor_padrao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-xs text-white/80 font-medium">
                      {rule.descricao_padrao}
                    </div>

                    {rule.event_type_code && (
                      <span className="inline-block text-[10px] bg-cyan-400/10 text-cyan-300 font-bold px-2 py-0.5 rounded-md border border-cyan-400/20">
                        Tipo: {rule.event_type_code}
                      </span>
                    )}
                  </div>

                  {/* Due date rule info */}
                  <div className="text-[11px] text-white/60 flex items-center gap-2">
                    <Calendar size={13} className="text-cyan-400 shrink-0" />
                    <span>
                      Vencimento: {
                        rule.regra_vencimento === 'SAME_DAY' 
                          ? 'No mesmo dia do serviço' 
                          : rule.regra_vencimento === 'DAYS_AFTER'
                          ? `${rule.dias_apos_servico || 0} dias após o serviço`
                          : `Dia ${rule.dia_fixo_mes || 5} do mês seguinte`
                      }
                    </span>
                  </div>

                  {rule.prestador_pix && (
                    <div className="text-[10px] text-white/40 truncate">
                      PIX: <span className="text-white/70 font-mono">{rule.prestador_pix}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 mt-4 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="p-1.5 text-white/60 hover:text-cyan-400 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                    title="Editar Regra"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    title="Excluir Regra"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar/Editar Regra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500 p-2.5 rounded-2xl text-[#0A0F2C]">
                  <DollarSign size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingRule ? 'Editar Regra de Cobrança' : 'Nova Regra de Prestador'}
                  </h3>
                  <p className="text-xs text-white/50">Automação de Contas a Pagar por Serviço</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {formError && (
                <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Prestador */}
              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Prestador de Serviço *</label>
                <select
                  required
                  value={prestadorId}
                  onChange={(e) => setPrestadorId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                >
                  <option value="" disabled className="bg-[#0A0F2C]">Selecione um prestador...</option>
                  {crewMembers.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0A0F2C]">
                      {c.nome} ({c.roles?.[0]?.nome || c.funcao || 'Equipe'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chácara & Tipo de Evento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Chácara Aplicável</label>
                  <select
                    value={chacaraId}
                    onChange={(e) => setChacaraId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    <option value="" className="bg-[#0A0F2C]">Geral (Todas as Chácaras)</option>
                    {chacaras.map(ch => (
                      <option key={ch.id} value={ch.id} className="bg-[#0A0F2C]">{ch.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Tipo de Serviço</label>
                  <select
                    value={eventTypeCode}
                    onChange={(e) => setEventTypeCode(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    <option value="" className="bg-[#0A0F2C]">Qualquer Serviço do Prestador</option>
                    {eventTypes.map(t => (
                      <option key={t.id} value={t.code} className="bg-[#0A0F2C]">{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição & Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Descrição Padrão *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Serviço de Limpeza Pós-Check-out"
                    value={descricaoPadrao}
                    onChange={(e) => setDescricaoPadrao(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Categoria Contábil *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    {ACCOUNT_PAYABLE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value} className="bg-[#0A0F2C]">{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor Padrão */}
              <div>
                <label className="text-[11px] font-bold text-white/60 uppercase block mb-1">Valor por Prestação (R$) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="300.00"
                    value={valorPadrao}
                    onChange={(e) => setValorPadrao(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-2.5 text-sm font-black text-emerald-400 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Regra de Vencimento */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <label className="text-[11px] font-bold text-cyan-400 uppercase block">Regra de Data de Vencimento</label>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegraVencimento('SAME_DAY')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      regraVencimento === 'SAME_DAY'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    Mesmo Dia
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegraVencimento('DAYS_AFTER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      regraVencimento === 'DAYS_AFTER'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    X Dias Após
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegraVencimento('FIXED_DAY_MONTH')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      regraVencimento === 'FIXED_DAY_MONTH'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    Dia Fixo do Mês
                  </button>
                </div>

                {regraVencimento === 'DAYS_AFTER' && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-xs text-white/70">Vencer</span>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={diasAposServico}
                      onChange={(e) => setDiasAposServico(e.target.value)}
                      className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white text-center font-bold outline-none focus:border-cyan-400"
                    />
                    <span className="text-xs text-white/70">dias após a data do serviço</span>
                  </div>
                )}

                {regraVencimento === 'FIXED_DAY_MONTH' && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-xs text-white/70">Vencer todo dia</span>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={diaFixoMes}
                      onChange={(e) => setDiaFixoMes(e.target.value)}
                      className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white text-center font-bold outline-none focus:border-cyan-400"
                    />
                    <span className="text-xs text-white/70">do mês seguinte</span>
                  </div>
                )}
              </div>

              {/* Status Ativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ruleActiveCheck"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-cyan-400 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="ruleActiveCheck" className="text-xs text-white/80 cursor-pointer">
                  Regra ativa (gera contas a pagar automaticamente)
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-[#0A0F2C] font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {modalLoading ? 'Salvando...' : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Salvar Regra</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
