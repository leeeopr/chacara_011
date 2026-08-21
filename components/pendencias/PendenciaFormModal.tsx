'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Trash2, Calendar, Clock, AlertCircle, CheckCircle2,
  ChevronRight, ChevronLeft, Search, Check, Tag, Sparkles, ListTodo, Send, User
} from 'lucide-react';
import {
  PendenciaGrupo,
  PendenciaPrioridade,
  UserProfileOption,
  CreatePendenciaInput,
  PendenciaBlock
} from '@/lib/pendenciasTypes';
import {
  getPendenciaGrupos,
  getUserProfilesForAutocomplete,
  createPendencia,
  saveTaskBlocks
} from '@/services/pendenciasService';
import { useAuth } from '@/contexts/AuthContext';
import TaskDocumentEditor from './TaskDocumentEditor';

interface PendenciaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PendenciaFormModal({
  isOpen,
  onClose,
  onSuccess
}: PendenciaFormModalProps) {
  const { user, profile } = useAuth();

  // Wizard Step State (1, 2, 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [groups, setGroups] = useState<PendenciaGrupo[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Form Fields
  const [grupoId, setGrupoId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [prazoHora, setPrazoHora] = useState('18:00');
  const [prioridade, setPrioridade] = useState<PendenciaPrioridade>('Média');

  // Destinatário Autocomplete
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientOptions, setRecipientOptions] = useState<UserProfileOption[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfileOption | null>(null);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState<number>(0);

  // Subitens / Checklist
  const [subitens, setSubitens] = useState<string[]>([]);
  const [newSubitemText, setNewSubitemText] = useState('');

  // Document Editor State
  const [documentBlocks, setDocumentBlocks] = useState<PendenciaBlock[]>([
    {
      id: 'blk-init-text',
      task_id: 'draft',
      order_index: 0,
      type: 'TEXT',
      content: { text: '' }
    }
  ]);

  // Status/Errors
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      loadInitialData();
      resetForm();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoadingGroups(true);
    const grps = await getPendenciaGrupos();
    const activeGrps = grps.filter(g => g.ativo !== false);
    setGroups(activeGrps);
    if (activeGrps.length > 0 && !grupoId) {
      setGrupoId(activeGrps[0].id);
    }
    setLoadingGroups(false);

    // Initial recipient search
    const users = await getUserProfilesForAutocomplete('');
    setRecipientOptions(users);
    setFocusedOptionIndex(0);
  };

  const resetForm = () => {
    setStep(1);
    setTitulo('');
    setDescricao('');
    setPrioridade('Média');
    setSubitens([]);
    setNewSubitemText('');
    setDocumentBlocks([
      {
        id: `blk-${Date.now()}`,
        task_id: 'draft',
        order_index: 0,
        type: 'TEXT',
        content: { text: '' }
      }
    ]);
    setSelectedRecipient(null);
    setRecipientQuery('');
    setErrorMsg('');
    setFocusedOptionIndex(0);
  };

  // User search debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      const res = await getUserProfilesForAutocomplete(recipientQuery);
      setRecipientOptions(res);
      setFocusedOptionIndex(0);
      setSearchingUsers(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [recipientQuery, isOpen]);

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showRecipientDropdown || recipientOptions.length === 0) {
      if (e.key === 'ArrowDown') {
        setShowRecipientDropdown(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedOptionIndex((prev) => (prev + 1) % recipientOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedOptionIndex((prev) => (prev - 1 + recipientOptions.length) % recipientOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (recipientOptions[focusedOptionIndex]) {
        setSelectedRecipient(recipientOptions[focusedOptionIndex]);
        setShowRecipientDropdown(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowRecipientDropdown(false);
    }
  };

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecipientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddSubitem = () => {
    if (newSubitemText.trim()) {
      setSubitens([...subitens, newSubitemText.trim()]);
      setNewSubitemText('');
    }
  };

  const handleRemoveSubitem = (index: number) => {
    setSubitens(subitens.filter((_, i) => i !== index));
  };

  const selectedGroup = groups.find(g => g.id === grupoId);

  // Validation per step
  const handleNextStep = () => {
    setErrorMsg('');

    if (step === 1) {
      if (!selectedRecipient) {
        setErrorMsg('Por favor, selecione quem receberá a pendência.');
        return;
      }
      if (!grupoId) {
        setErrorMsg('Por favor, selecione um grupo para a pendência.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!titulo.trim()) {
        setErrorMsg('Por favor, informe o título da pendência.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async () => {
    if (!grupoId || !titulo.trim() || !selectedRecipient) {
      setErrorMsg('Preencha os campos obrigatórios antes de enviar.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const currentUser = {
        id: user?.id || 'usr-atual',
        email: user?.email || profile?.email || 'admin@chacaras.com.br',
        full_name: profile?.full_name || 'Administrador'
      };

      // Extract text and subitems from documentBlocks for compatibility
      let extractedDesc = '';
      const extractedSubitems: string[] = [];

      documentBlocks.forEach((blk) => {
        if (blk.type === 'TEXT' || blk.type === 'HEADING') {
          const txt = (blk.content as any)?.text;
          if (txt) extractedDesc += (extractedDesc ? '\n' : '') + txt;
        } else if (blk.type === 'CHECKLIST') {
          const items = (blk.content as any)?.items || [];
          items.forEach((item: any) => {
            if (item.text?.trim()) {
              extractedSubitems.push(item.text.trim());
            }
          });
        }
      });

      const inputPayload: CreatePendenciaInput = {
        grupo_id: grupoId,
        titulo: titulo.trim(),
        descricao: extractedDesc.trim() || 'Documento com anexo/tabela',
        prazo,
        prazo_hora: prazoHora,
        prioridade,
        responsavel_atual_id: selectedRecipient.id,
        responsavel_atual_nome: selectedRecipient.full_name,
        responsavel_atual_email: selectedRecipient.email,
        subitens: extractedSubitems
      };

      const newPendencia = await createPendencia(inputPayload, currentUser);
      if (newPendencia && newPendencia.id) {
        await saveTaskBlocks(newPendencia.id, documentBlocks);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Ocorreu um erro ao criar a pendência.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper date presets
  const setPresetDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setPrazo(d.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] bg-[#0A0F2C] text-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-300">
        
        {/* BARRA SUPERIOR (HEADER) */}
        <div className="px-6 pt-5 pb-4 bg-white/[0.03] border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-xl text-[#FFD600]">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD600]">
                  Assistente de Pendências
                </span>
                <h2 className="text-xl font-black text-white">Nova Pendência</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Stepper Progress & Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-white/70">
              <span>
                Etapa {step} de 3:{' '}
                <strong className="text-[#FFD600]">
                  {step === 1 && 'Quem receberá?'}
                  {step === 2 && 'Detalhes da Pendência'}
                  {step === 3 && 'Resumo e Confirmação'}
                </strong>
              </span>
              <span className="text-[11px] text-[#FFD600] font-black">
                {step === 1 ? '33%' : step === 2 ? '66%' : '100%'}
              </span>
            </div>

            {/* Thin Progress Bar in System Accent (#FFD600) */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFD600] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,214,0,0.5)]"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ERRO BANNER */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2.5 shrink-0 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* CONTEÚDO DO WIZARD (SCROLLABLE BODY) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">

          {/* ========================================================
              ETAPA 1: QUEM RECEBERÁ? (DESTINATÁRIO + GRUPO)
             ======================================================== */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
              
              {/* 1. DESTINATÁRIO MAIS INTELIGENTE */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-white/80">
                  1. Destinatário <span className="text-[#FFD600]">*</span>
                </label>

                {selectedRecipient ? (
                  /* Card do Destinatário Selecionado (Largura Total) */
                  <div className="w-full p-4 bg-[#FFD600]/10 border-2 border-[#FFD600] rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(255,214,0,0.1)]">
                    <div className="flex items-center gap-3.5">
                      {selectedRecipient.avatar_url ? (
                        <img
                          src={selectedRecipient.avatar_url}
                          alt={selectedRecipient.full_name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-[#FFD600] shadow-md"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#FFD600] text-[#0A0F2C] flex items-center justify-center font-black text-sm shadow-md">
                          {selectedRecipient.full_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-white">{selectedRecipient.full_name}</p>
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <Check size={12} /> Selecionado
                          </span>
                        </div>
                        <p className="text-xs text-white/60">{selectedRecipient.email || 'Sem e-mail cadastrado'}</p>
                        {(selectedRecipient.cargo || selectedRecipient.role) && (
                          <p className="text-[10px] text-[#FFD600] font-bold mt-0.5 uppercase">
                            {selectedRecipient.cargo || selectedRecipient.role}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(null);
                        setRecipientQuery('');
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  /* Autocomplete Search Input (Largura Total) */
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative flex items-center">
                      <Search size={18} className="absolute left-3.5 text-white/40" />
                      <input
                        type="text"
                        value={recipientQuery}
                        onChange={(e) => {
                          setRecipientQuery(e.target.value);
                          setShowRecipientDropdown(true);
                        }}
                        onFocus={() => setShowRecipientDropdown(true)}
                        onKeyDown={handleKeyDownInput}
                        placeholder="Pesquise por nome, e-mail ou cargo..."
                        className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-[#FFD600] focus:ring-1 focus:ring-[#FFD600]/30 transition-all placeholder-white/30"
                      />
                      {searchingUsers && (
                        <span className="absolute right-3.5 text-xs text-amber-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Buscando...
                        </span>
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showRecipientDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#0F143C] border border-white/20 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                        {recipientOptions.length === 0 ? (
                          <div className="p-4 text-xs text-white/50 text-center font-bold">
                            {searchingUsers ? 'Pesquisando na base do Supabase...' : `Nenhum usuário ativo encontrado com "${recipientQuery}"`}
                          </div>
                        ) : (
                          recipientOptions.map((opt, idx) => {
                            const isFocused = idx === focusedOptionIndex;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSelectedRecipient(opt);
                                  setShowRecipientDropdown(false);
                                }}
                                onMouseEnter={() => setFocusedOptionIndex(idx)}
                                className={`w-full p-3.5 text-left flex items-center justify-between transition-colors group ${
                                  isFocused ? 'bg-white/15 border-l-4 border-[#FFD600]' : 'hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {opt.avatar_url ? (
                                    <img
                                      src={opt.avatar_url}
                                      alt={opt.full_name}
                                      className="w-8 h-8 rounded-full object-cover border border-white/20"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#FFD600]/20 text-[#FFD600] flex items-center justify-center font-black text-xs group-hover:bg-[#FFD600] group-hover:text-[#0A0F2C] transition-colors">
                                      {opt.full_name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-bold text-white">{opt.full_name}</p>
                                    <p className="text-[11px] text-white/50">{opt.email}</p>
                                  </div>
                                </div>
                                {(opt.cargo || opt.role) && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#FFD600] font-bold uppercase">
                                    {opt.cargo || opt.role}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. GRUPOS COMO CARDS (LARGURA TOTAL) */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-white/80">
                  2. Grupo / Categoria <span className="text-[#FFD600]">*</span>
                </label>

                {loadingGroups ? (
                  <div className="py-6 text-center text-xs text-white/40 font-bold">
                    Carregando grupos do Supabase...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {groups.map((g) => {
                      const isSelected = grupoId === g.id;
                      const groupColor = g.cor || '#FFD600';

                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGrupoId(g.id)}
                          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#FFD600]/10 border-[#FFD600] text-white shadow-[0_0_15px_rgba(255,214,0,0.15)]'
                              : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: groupColor }}
                            />
                            <span className="text-xs font-black">
                              {g.nome}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="p-1 rounded-full bg-[#FFD600] text-[#0A0F2C] shrink-0">
                              <Check size={12} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 2: DETALHES DA PENDÊNCIA (TÍTULO, DESC, PRAZO, CHECKLIST)
             ======================================================== */}
          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
              
              {/* Título da Pendência (Largura Total) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-white/80">
                  Título da Pendência <span className="text-[#FFD600]">*</span>
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Conferir extintores, manutenção da piscina ou renovação..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-[#FFD600] focus:ring-1 focus:ring-[#FFD600]/30 transition-all placeholder-white/30"
                  autoFocus
                />
              </div>

              {/* Editor Unificado do Documento da Pendência */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#FFD600] flex items-center gap-1.5">
                  <Sparkles size={14} /> Conteúdo do Documento da Pendência
                </label>
                <p className="text-[11px] text-white/50">
                  Misture texto, checkboxes, tabelas, títulos e divisores em uma única área contínua. Digite <code className="text-[#FFD600] bg-black/40 px-1 py-0.5 rounded">/checkbox</code> ou <code className="text-[#FFD600] bg-black/40 px-1 py-0.5 rounded">/table</code> para inserir comandos.
                </p>
                <TaskDocumentEditor
                  value={documentBlocks}
                  onChange={setDocumentBlocks}
                />
              </div>

              {/* Escolher Prazo (Com Mini Calendário e Presets) */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-white/80">
                  Prazo Limite e Horário
                </label>

                {/* Date Presets */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  <span className="text-[10px] font-bold text-white/40 shrink-0">Atalhos:</span>
                  <button
                    type="button"
                    onClick={() => setPresetDate(1)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/5 border border-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] transition-colors"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(3)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/5 border border-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] transition-colors"
                  >
                    Em 3 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(7)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/5 border border-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] transition-colors"
                  >
                    Em 1 semana
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="date"
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFD600]"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={prazoHora}
                      onChange={(e) => setPrazoHora(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFD600]"
                    />
                  </div>
                </div>
              </div>

              {/* Prioridade */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-white/80">
                  Prioridade
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Baixa', 'Média', 'Alta', 'Urgente'] as PendenciaPrioridade[]).map((p) => {
                    const isSelected = prioridade === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPrioridade(p)}
                        className={`py-2 px-1 text-xs font-black rounded-xl border text-center transition-all ${
                          isSelected
                            ? p === 'Urgente'
                              ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                              : p === 'Alta'
                              ? 'bg-amber-500 text-[#0A0F2C] border-amber-400'
                              : p === 'Média'
                              ? 'bg-sky-500 text-[#0A0F2C] border-sky-400'
                              : 'bg-emerald-500 text-[#0A0F2C] border-emerald-400'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 3: RESUMO E CONFIRMAÇÃO
             ======================================================== */}
          {step === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
              <div className="p-4 rounded-2xl bg-[#FFD600]/10 border border-[#FFD600]/30 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FFD600] text-[#0A0F2C] shrink-0 font-black">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-[#FFD600]">Tudo pronto para enviar!</p>
                  <p className="text-[11px] text-white/70">
                    Confira o resumo das informações abaixo e confirme para notificar o responsável.
                  </p>
                </div>
              </div>

              {/* Resumo Card (Largura Total) */}
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                
                {/* Destinatário & Grupo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-1">
                      Responsável / Destinatário
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#FFD600] text-[#0A0F2C] font-black text-xs flex items-center justify-center">
                        {selectedRecipient?.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{selectedRecipient?.full_name}</p>
                        <p className="text-[10px] text-white/50">{selectedRecipient?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-1">
                      Grupo & Prioridade
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black text-[#0A0F2C]"
                        style={{ backgroundColor: selectedGroup?.cor || '#FFD600' }}
                      >
                        {selectedGroup?.nome || 'Geral'}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-black border border-white/10">
                        {prioridade}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Título e Descrição */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block">
                    Título
                  </span>
                  <p className="text-sm font-black text-white">{titulo}</p>
                  {descricao && (
                    <p className="text-xs text-white/70 mt-1 bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {descricao}
                    </p>
                  )}
                </div>

                {/* Prazo */}
                <div>
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-1">
                    Prazo Limite
                  </span>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/30 border border-white/10 rounded-xl text-xs font-bold text-white">
                    <Calendar size={14} className="text-[#FFD600]" />
                    <span>{prazo.split('-').reverse().join('/')}</span>
                    <Clock size={14} className="text-[#FFD600] ml-1" />
                    <span>{prazoHora}</span>
                  </div>
                </div>

                {/* Subitens / Checklist Summary */}
                {subitens.length > 0 && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-1">
                      Checklist ({subitens.length} itens)
                    </span>
                    <ul className="space-y-1">
                      {subitens.map((sub, i) => (
                        <li key={i} className="text-xs text-white/70 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* BOTÕES FIXOS (STICKY FOOTER) */}
        <div className="px-6 py-4 bg-white/[0.03] border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
          
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(255,214,0,0.2)] flex items-center gap-1.5"
            >
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-7 py-2.5 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(255,214,0,0.3)]"
            >
              <Send size={16} />
              {submitting ? 'Enviando...' : 'Enviar Pendência'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
