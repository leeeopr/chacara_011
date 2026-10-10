'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Plus,
  Loader2,
  RefreshCw,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  UploadCloud,
  IdCard,
  Eye,
  ArrowUpDown,
  RotateCcw,
  Clock,
  BookmarkCheck
} from 'lucide-react';
import { CarneLeaoDocEntry } from '@/lib/fiscalTypes';
import { Chacara } from '@/lib/chacaraTypes';
import { 
  getCarneLeaoEntries, 
  updatePaymentDocumentCpf, 
  togglePaymentDocumentDeduction 
} from '@/services/fiscalService';
import { getChacaras } from '@/services/chacarasService';
import { formatCPF, cleanCPF, validateCPF } from '@/lib/cpfUtils';
import UploadPaymentDocumentModal from '../fiscal/UploadPaymentDocumentModal';

interface ReservationsCarneLeaoTabProps {
  onOpenReservationDetail?: (reservationId: string) => void;
}

export default function ReservationsCarneLeaoTab({
  onOpenReservationDetail
}: ReservationsCarneLeaoTabProps) {
  const [entries, setEntries] = useState<CarneLeaoDocEntry[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [chacaraFilter, setChacaraFilter] = useState('TODAS');
  const [statusCpfFilter, setStatusCpfFilter] = useState<'TODOS' | 'INFORMADO' | 'PENDENTE'>('TODOS');
  const [statusDeductionFilter, setStatusDeductionFilter] = useState<'TODOS' | 'DEDUZIDO' | 'NAO_DEDUZIDO'>('TODOS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'payment_date' | 'reservation_date'>('payment_date');

  // Deduction toggle state
  const [togglingDocId, setTogglingDocId] = useState<string | null>(null);

  // Copy feedback state: mapping of docId -> boolean
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  // Inline editing state: mapping of docId -> editing value
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingCpfValue, setEditingCpfValue] = useState<string>('');
  const [savingDocId, setSavingDocId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Upload/Manage Modal state for a selected reservation
  const [selectedReservationForModal, setSelectedReservationForModal] = useState<any | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    loadChacaras();
  }, []);

  useEffect(() => {
    loadData();
  }, [chacaraFilter, statusCpfFilter, startDate, endDate]);

  const loadChacaras = async () => {
    try {
      const data = await getChacaras();
      setChacaras(data);
    } catch (e) {
      console.warn('Erro ao carregar chácaras:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCarneLeaoEntries({
        chacara_id: chacaraFilter !== 'TODAS' ? chacaraFilter : undefined,
        cpf_status: statusCpfFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      const entriesList = Array.isArray(res?.entries) 
        ? res.entries 
        : (Array.isArray(res) ? res : []);
      setEntries(entriesList);
    } catch (err) {
      console.error('Erro ao carregar dados do Carnê-Leão:', err);
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Toggle Deduction Status for a Document
  const handleToggleDeduction = async (entry: CarneLeaoDocEntry) => {
    const nextStatus = !entry.is_deducted;
    setTogglingDocId(entry.id);

    // Optimistic UI update
    setEntries(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item.id === entry.id) {
        return {
          ...item,
          is_deducted: nextStatus,
          deducted_at: nextStatus ? new Date().toISOString() : undefined,
          document: {
            ...item.document,
            is_deducted: nextStatus,
            deducted_at: nextStatus ? new Date().toISOString() : undefined
          }
        };
      }
      return item;
    }));

    try {
      await togglePaymentDocumentDeduction(entry.id, nextStatus);
    } catch (err) {
      console.error('Erro ao atualizar status de dedução do comprovante:', err);
      // Revert in case of error
      await loadData();
    } finally {
      setTogglingDocId(null);
    }
  };

  // Client-side search & deduction filtering
  const filteredEntries = useMemo(() => {
    let list = Array.isArray(entries) ? entries : [];

    // Filter by Deduction Status
    if (statusDeductionFilter === 'DEDUZIDO') {
      list = list.filter(item => item.is_deducted);
    } else if (statusDeductionFilter === 'NAO_DEDUZIDO') {
      list = list.filter(item => !item.is_deducted);
    }

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    const cleanTermDigits = term.replace(/\D/g, '');

    return list.filter(item => {
      const matchCode = (item.reservation_code || '').toLowerCase().includes(term);
      const matchClient = (item.client_nome || '').toLowerCase().includes(term);
      const matchChacara = (item.chacara_nome || '').toLowerCase().includes(term);
      const matchFile = (item.file_name || '').toLowerCase().includes(term);
      const itemDigits = (item.cpf || '').replace(/\D/g, '');
      const matchCpf = cleanTermDigits && itemDigits ? itemDigits.includes(cleanTermDigits) : false;
      return matchCode || matchClient || matchChacara || matchFile || matchCpf;
    });
  }, [entries, searchTerm, statusDeductionFilter]);

  // KPIs
  const stats = useMemo(() => {
    const list = Array.isArray(entries) ? entries : [];
    const totalDocs = list.length;
    const informedDocs = list.filter(e => e.cpf_status === 'INFORMADO').length;
    const pendingDocs = list.filter(e => e.cpf_status === 'PENDENTE').length;
    const totalAmount = list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const deductedDocs = list.filter(e => e.is_deducted).length;
    const deductedAmount = list.filter(e => e.is_deducted).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const pendingDeductionDocs = list.filter(e => !e.is_deducted).length;
    const pendingDeductionAmount = list.filter(e => !e.is_deducted).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return { 
      totalDocs, 
      informedDocs, 
      pendingDocs, 
      totalAmount,
      deductedDocs,
      deductedAmount,
      pendingDeductionDocs,
      pendingDeductionAmount
    };
  }, [entries]);

  // 1-Click Copy CPF
  const handleCopyCpf = async (docId: string, rawCpf: string) => {
    const digits = cleanCPF(rawCpf);
    if (!digits) return;
    const formatted = formatCPF(digits);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formatted);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedDocId(docId);
      setTimeout(() => setCopiedDocId(null), 2500);
    } catch (err) {
      console.error('Falha ao copiar CPF:', err);
    }
  };

  // Inline Edit Start
  const handleStartEdit = (entry: CarneLeaoDocEntry) => {
    setEditingDocId(entry.id);
    setEditingCpfValue(entry.cpf ? formatCPF(entry.cpf) : '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingDocId(null);
    setEditingCpfValue('');
    setEditError(null);
  };

  // Inline Save CPF
  const handleSaveCpf = async (docId: string) => {
    const digits = cleanCPF(editingCpfValue);
    setEditError(null);

    if (editingCpfValue.trim()) {
      if (digits.length !== 11) {
        setEditError('O CPF precisa conter 11 dígitos numéricos.');
        return;
      }
      if (!validateCPF(editingCpfValue)) {
        setEditError('CPF inválido. Verifique os dígitos digitados.');
        return;
      }
    }

    setSavingDocId(docId);
    try {
      const formattedToSave = digits.length === 11 ? formatCPF(digits) : '';
      await updatePaymentDocumentCpf(docId, formattedToSave);

      // Update state locally for immediate feedback
      setEntries(prev => (Array.isArray(prev) ? prev : []).map(item => {
        if (item.id === docId) {
          const newStatus = digits.length === 11 ? 'INFORMADO' : 'PENDENTE';
          return {
            ...item,
            cpf: formattedToSave,
            cpf_status: newStatus
          };
        }
        return item;
      }));

      setEditingDocId(null);
      setEditingCpfValue('');
    } catch (err: any) {
      setEditError(err.message || 'Erro ao atualizar CPF');
    } finally {
      setSavingDocId(null);
    }
  };

  // Open Document Modal for that reservation
  const handleOpenDocModal = (entry: CarneLeaoDocEntry) => {
    setSelectedReservationForModal({
      reservation_id: entry.reservation_id,
      chacara_id: entry.chacara_id,
      chacara_nome: entry.chacara_nome,
      code: entry.reservation_code,
      checkin_date: entry.checkin_date,
      checkout_date: entry.checkout_date,
      client_nome: entry.client_nome,
      client_document: entry.client_document || 'Não informado',
      total_price: entry.amount,
      total_proven_amount: entry.amount,
      documents: [],
      has_documents: true,
      has_multiple_documents: false,
      status: 'CONFIRMADA'
    });
    setIsUploadModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="glass p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#FFD600]/10 text-[#FFD600] rounded-xl">
              <IdCard size={20} />
            </span>
            <h2 className="text-base font-bold text-white tracking-wide">
              Gestão de Comprovantes & Carnê-Leão
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Receita Federal
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Controle centralizado dos CPFs vinculados aos comprovantes de pagamento das reservas.
            Copie com 1 clique para colar no programa Carnê-Leão / e-CAC.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={loading || refreshing}
          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50 shrink-0"
          title="Recarregar dados"
        >
          <RefreshCw size={14} className={refreshing || loading ? 'animate-spin text-[#FFD600]' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Docs */}
        <div className="glass p-4 rounded-2xl border border-white/10">
          <span className="text-[10px] font-bold text-white/40 uppercase block">
            Total de Comprovantes
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-white">{stats.totalDocs}</span>
            <FileText size={16} className="text-white/30" />
          </div>
          <span className="text-[10px] text-white/50 mt-1 block">
            R$ {stats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} comprovados
          </span>
        </div>

        {/* Deduzidos no Carnê-Leão */}
        <div className="glass p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400/80 uppercase block">
              Deduzidos Carnê-Leão
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300">
              Escriturados
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-400">{stats.deductedDocs}</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <span className="text-[10px] text-emerald-400/70 mt-1 block font-semibold">
            R$ {stats.deductedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* A Lançar (Não Deduzidos) */}
        <div className="glass p-4 rounded-2xl border border-amber-500/20 bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400/80 uppercase block">
              A Lançar (Pendentes)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300">
              Não Deduzidos
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-400">{stats.pendingDeductionDocs}</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <span className="text-[10px] text-amber-400/70 mt-1 block font-semibold">
            R$ {stats.pendingDeductionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* CPFs do Pagador */}
        <div className="glass p-4 rounded-2xl border border-[#FFD600]/20 bg-[#FFD600]/5">
          <span className="text-[10px] font-bold text-[#FFD600]/80 uppercase block">
            Situação dos CPFs
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-[#FFD600]">
              {stats.informedDocs} <span className="text-xs font-normal text-white/50">/ {stats.totalDocs}</span>
            </span>
            <IdCard size={16} className="text-[#FFD600]" />
          </div>
          <span className="text-[10px] text-white/50 mt-1 block">
            {stats.pendingDocs > 0 ? (
              <span className="text-amber-400 font-semibold">{stats.pendingDocs} sem CPF cadastrado</span>
            ) : (
              <span className="text-emerald-400 font-semibold">Todos com CPF</span>
            )}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por código da reserva, hóspede, chácara ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/40 focus:border-[#FFD600] outline-none"
            />
          </div>

          {/* Quick Deduction Status Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl shrink-0 overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-white/40 px-2 flex items-center gap-1">
              <BookmarkCheck size={12} /> Carnê-Leão:
            </span>
            <button
              type="button"
              onClick={() => setStatusDeductionFilter('TODOS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusDeductionFilter === 'TODOS'
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Todos ({stats.totalDocs})
            </button>
            <button
              type="button"
              onClick={() => setStatusDeductionFilter('DEDUZIDO')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                statusDeductionFilter === 'DEDUZIDO'
                  ? 'bg-emerald-500 text-black shadow font-black'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 size={12} />
              <span>Deduzidos ({stats.deductedDocs})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusDeductionFilter('NAO_DEDUZIDO')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                statusDeductionFilter === 'NAO_DEDUZIDO'
                  ? 'bg-amber-500 text-black shadow font-black'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Clock size={12} />
              <span>A Lançar ({stats.pendingDeductionDocs})</span>
            </button>
          </div>

          {/* Quick CPF Status Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl shrink-0 overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-white/40 px-2 flex items-center gap-1">
              <IdCard size={12} /> CPF:
            </span>
            <button
              type="button"
              onClick={() => setStatusCpfFilter('TODOS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusCpfFilter === 'TODOS'
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusCpfFilter('INFORMADO')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                statusCpfFilter === 'INFORMADO'
                  ? 'bg-emerald-500 text-black shadow font-black'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 size={12} />
              <span>Com CPF ({stats.informedDocs})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusCpfFilter('PENDENTE')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                statusCpfFilter === 'PENDENTE'
                  ? 'bg-amber-500 text-black shadow font-black'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <AlertCircle size={12} />
              <span>Sem CPF ({stats.pendingDocs})</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters: Chácara and Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">
              Chácara
            </label>
            <select
              value={chacaraFilter}
              onChange={(e) => setChacaraFilter(e.target.value)}
              className="w-full bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODAS">Todas as Chácaras</option>
              {chacaras.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">
              Data de Pagamento (De)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#FFD600]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">
              Data de Pagamento (Até)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#FFD600]"
            />
          </div>
        </div>
      </div>

      {/* Main Table / List View */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="glass p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
          <FileText size={48} className="text-white/20 mb-3" />
          <h3 className="text-base font-bold text-white">Nenhum comprovante localizado</h3>
          <p className="text-xs text-white/50 mt-1 max-w-md">
            {entries.length === 0
              ? 'Não há comprovantes cadastrados no período selecionado. Anexe comprovantes dentro do detalhe da reserva ou aba financeira.'
              : 'Nenhum registro corresponde aos filtros selecionados. Tente limpar os filtros.'}
          </p>
          {(startDate || endDate || chacaraFilter !== 'TODAS' || statusCpfFilter !== 'TODOS' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setChacaraFilter('TODAS');
                setStatusCpfFilter('TODOS');
                setStartDate('');
                setEndDate('');
              }}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isEditing = editingDocId === entry.id;
            const isSaving = savingDocId === entry.id;
            const isCopied = copiedDocId === entry.id;
            const hasCpf = entry.cpf_status === 'INFORMADO' && entry.cpf;

            return (
              <div
                key={entry.id}
                className="glass rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Block 1: Reservation Context & Dates */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-[#FFD600] text-sm tracking-wide">
                      {entry.reservation_code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/80">
                      {entry.chacara_nome}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {entry.checkin_date} a {entry.checkout_date}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <User size={13} className="text-white/40 shrink-0" />
                    <span>Hóspede: {entry.client_nome}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-white/50 flex-wrap">
                    <span className="flex items-center gap-1">
                      <FileText size={12} className="text-[#FFD600]" />
                      <strong className="text-white/70">{entry.file_name}</strong>
                    </span>
                    <span>•</span>
                    <span>Pagamento: <strong className="text-white">{entry.payment_date}</strong></span>
                    {entry.competencia && (
                      <>
                        <span>•</span>
                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                          Comp: {entry.competencia}
                        </span>
                      </>
                    )}
                    {entry.description && (
                      <>
                        <span>•</span>
                        <span className="text-white/40 italic">{entry.description}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Block 2: Proven Amount & CPF Information */}
                <div className="flex flex-col sm:flex-row lg:items-center gap-4 shrink-0">
                  {/* Amount */}
                  <div className="sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-white/40 block">
                      Valor Comprovado
                    </span>
                    <span className="font-black text-[#FFD600] text-base">
                      R$ {Number(entry.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Carnê-Leão Deduction Status & 1-Click Toggle */}
                  <div className={`min-w-[190px] p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                    entry.is_deducted 
                      ? 'bg-emerald-950/20 border-emerald-500/30' 
                      : 'bg-black/30 border-white/10'
                  }`}>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1">
                        <BookmarkCheck size={12} className={entry.is_deducted ? 'text-emerald-400' : 'text-purple-400'} /> Carnê-Leão
                      </span>

                      {entry.is_deducted ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={10} /> DEDUZIDO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock size={10} /> A LANÇAR
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleDeduction(entry)}
                      disabled={togglingDocId === entry.id}
                      className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        entry.is_deducted
                          ? 'bg-white/10 hover:bg-rose-500/20 text-white/80 hover:text-rose-300 border border-white/10 hover:border-rose-500/30'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                      }`}
                      title={entry.is_deducted ? 'Clique para desmarcar como deduzido' : 'Marcar este comprovante como deduzido no Carnê-Leão'}
                    >
                      {togglingDocId === entry.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : entry.is_deducted ? (
                        <>
                          <RotateCcw size={11} />
                          <span>Desmarcar Dedução</span>
                        </>
                      ) : (
                        <>
                          <Check size={12} />
                          <span>Marcar como Deduzido</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* CPF Column / Box */}
                  <div className="min-w-[240px] p-2.5 bg-black/30 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1">
                        <IdCard size={12} className="text-[#FFD600]" /> CPF do Pagador
                      </span>

                      {entry.cpf_status === 'INFORMADO' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          INFORMADO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          PENDENTE
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          maxLength={14}
                          value={editingCpfValue}
                          onChange={(e) => setEditingCpfValue(formatCPF(e.target.value))}
                          className="w-full px-2.5 py-1 bg-black border border-white/20 rounded-lg text-xs text-white font-mono outline-none focus:border-[#FFD600]"
                          autoFocus
                        />
                        {editError && (
                          <p className="text-[10px] text-rose-400 leading-tight">{editError}</p>
                        )}
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveCpf(entry.id)}
                            disabled={isSaving}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            <span>Salvar</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : hasCpf ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-white text-xs tracking-wider">
                          {entry.cpf}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* 1-Click Copy CPF Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyCpf(entry.id, entry.cpf)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500 text-black font-black shadow-md'
                                : 'bg-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white'
                            }`}
                            title="Copiar CPF formatado para o Carnê-Leão"
                          >
                            {isCopied ? <Check size={11} /> : <Copy size={11} />}
                            <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                          </button>

                          {/* Inline Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry)}
                            className="p-1 text-white/50 hover:text-white rounded hover:bg-white/10 transition-all cursor-pointer"
                            title="Editar CPF"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-white/40 italic">
                          Sem CPF cadastrado
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(entry)}
                          className="px-2 py-1 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Plus size={11} />
                          <span>Cadastrar CPF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions: View Document & Manage Reservation */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {entry.public_url && (
                      <a
                        href={entry.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-white/10"
                        title="Abrir arquivo do comprovante em nova aba"
                      >
                        <ExternalLink size={13} />
                        <span>Ver Arquivo</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenDocModal(entry)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
                      title="Gerenciar comprovantes da reserva"
                    >
                      <FileText size={13} />
                      <span>Comprovantes</span>
                    </button>

                    {onOpenReservationDetail && (
                      <button
                        type="button"
                        onClick={() => onOpenReservationDetail(entry.reservation_id)}
                        className="p-2 bg-white/5 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white/70 hover:text-black font-bold text-xs rounded-xl transition-all border border-white/10 cursor-pointer"
                        title="Ver detalhes da reserva"
                      >
                        <Eye size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to view or add more documents to the selected reservation */}
      {selectedReservationForModal && (
        <UploadPaymentDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setSelectedReservationForModal(null);
          }}
          reservation={selectedReservationForModal}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
