'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Building2,
  Calendar,
  FileCheck,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Plus,
  ChevronRight,
  ExternalLink,
  DollarSign,
  FileText,
  HelpCircle,
  RefreshCw,
  User,
  Info
} from 'lucide-react';
import {
  FiscalCompetenceSummary,
  FiscalReservationItem,
  FiscalChacaraGroup
} from '@/lib/fiscalTypes';
import { getFiscalSummaryData } from '@/services/fiscalService';
import UploadPaymentDocumentModal from './UploadPaymentDocumentModal';

export default function FiscalManagement() {
  const [competenceSummary, setCompetenceSummary] = useState<FiscalCompetenceSummary | null>(null);
  const [availableCompetencias, setAvailableCompetencias] = useState<{ value: string; label: string; count: number }[]>([]);
  const [selectedCompetencia, setSelectedCompetencia] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const lastFetchedCompRef = React.useRef<string | null>(null);

  // Sub-tabs & Filters
  const [activeSubTab, setActiveSubTab] = useState<'byChacara' | 'carneLeaoTable'>('byChacara');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'SEM_COMPROVANTE' | 'COM_COMPROVANTE' | 'MULTIPLOS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chacaraFilter, setChacaraFilter] = useState<string>('TODAS');

  // Modal State
  const [selectedReservationForModal, setSelectedReservationForModal] = useState<FiscalReservationItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    // Avoid double fetch if already loaded this exact competencia
    if (lastFetchedCompRef.current && lastFetchedCompRef.current === selectedCompetencia) {
      return;
    }
    loadFiscalData(selectedCompetencia);
  }, [selectedCompetencia]);

  const loadFiscalData = async (compVal?: string) => {
    setLoading(true);
    try {
      const res = await getFiscalSummaryData(compVal);
      lastFetchedCompRef.current = res.currentCompetenceData.competencia;
      setAvailableCompetencias(res.allCompetencias);
      setCompetenceSummary(res.currentCompetenceData);

      if (!compVal && res.allCompetencias.length > 0) {
        setSelectedCompetencia(res.currentCompetenceData.competencia);
      }
    } catch (err) {
      console.error('Erro ao carregar dados fiscais:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUploadModal = (res: FiscalReservationItem) => {
    setSelectedReservationForModal(res);
    setIsUploadModalOpen(true);
  };

  // Export CSV for Carnê-Leão
  const handleExportCarneLeaoCSV = () => {
    if (!competenceSummary) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Competencia;Chacara;Reserva;Data_Checkin;Data_Checkout;Hospede_Pagador;CPF_CNPJ;Valor_Estadia_R$;Valor_Comprovado_R$;Qtd_Comprovantes;Status_Documental\n';

    competenceSummary.chacaras.forEach(chacaraGroup => {
      chacaraGroup.reservas.forEach(res => {
        const line = [
          competenceSummary.competencia,
          `"${res.chacara_nome}"`,
          res.code,
          res.checkin_date,
          res.checkout_date,
          `"${res.client_nome}"`,
          `"${res.client_document}"`,
          res.total_price.toFixed(2),
          res.total_proven_amount.toFixed(2),
          res.documents.length,
          res.has_documents ? (res.has_multiple_documents ? 'Multiplos Comprovantes' : 'Comprovado') : 'Pendente'
        ].join(';');

        csvContent += line + '\n';
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Carne_Leao_${competenceSummary.competencia}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Chacaras & Reservations based on user filters
  const filteredChacaraGroups = useMemo(() => {
    if (!competenceSummary) return [];

    return competenceSummary.chacaras
      .map(group => {
        if (chacaraFilter !== 'TODAS' && group.chacara_id !== chacaraFilter) {
          return null;
        }

        const filteredReservas = group.reservas.filter(res => {
          // Status Filter
          if (statusFilter === 'SEM_COMPROVANTE' && res.has_documents) return false;
          if (statusFilter === 'COM_COMPROVANTE' && !res.has_documents) return false;
          if (statusFilter === 'MULTIPLOS' && !res.has_multiple_documents) return false;

          // Search query
          if (searchQuery.trim() !== '') {
            const term = searchQuery.toLowerCase();
            const matchCode = res.code.toLowerCase().includes(term);
            const matchGuest = res.client_nome.toLowerCase().includes(term);
            const matchDoc = res.client_document?.toLowerCase().includes(term);
            const matchChacara = res.chacara_nome.toLowerCase().includes(term);
            return matchCode || matchGuest || matchDoc || matchChacara;
          }

          return true;
        });

        if (filteredReservas.length === 0 && searchQuery) return null;

        return {
          ...group,
          reservas: filteredReservas
        };
      })
      .filter((g): g is FiscalChacaraGroup => g !== null);
  }, [competenceSummary, chacaraFilter, statusFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto">
      {/* Module Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0A0F2C] via-[#12193E] to-[#0A0F2C] p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#FFD600] text-[#0A0F2C] rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.3)] shrink-0 font-black">
            <Receipt size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Gestão Fiscal & Carnê-Leão
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] font-black uppercase tracking-wider border border-[#FFD600]/30">
                Impostos de Estadias
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Organização de comprovantes de pagamento das estadias por competência para declaração no Carnê-Leão
            </p>
          </div>
        </div>

        {/* Header Right Actions & Competence Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1.5 rounded-2xl">
            <Calendar size={16} className="text-[#FFD600] ml-2" />
            <select
              value={selectedCompetencia}
              onChange={(e) => setSelectedCompetencia(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none pr-3 cursor-pointer"
            >
              {availableCompetencias.map(c => (
                <option key={c.value} value={c.value} className="bg-[#0A0F2C]">
                  {c.label} ({c.count} estadias)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadFiscalData(selectedCompetencia)}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#FFD600]' : 'text-white/70'} />
          </button>

          <button
            onClick={handleExportCarneLeaoCSV}
            className="px-4 py-3 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,214,0,0.2)] cursor-pointer"
          >
            <Download size={16} />
            <span>Exportar Carnê-Leão</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {competenceSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-black uppercase tracking-wider">Recebido na Competência</span>
              <DollarSign size={16} className="text-[#FFD600]" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#FFD600]">
              R$ {competenceSummary.total_recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-white/40">Competência {competenceSummary.label}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Total Comprovado</span>
              <FileCheck size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-400">
              R$ {competenceSummary.total_comprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-white/40">Via recibos/comprovantes anexados</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-black uppercase tracking-wider">Estadias no Mês</span>
              <Building2 size={16} className="text-sky-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">{competenceSummary.total_estadias}</p>
            <p className="text-[10px] text-white/40">Total de reservas vinculadas</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Sem Comprovante</span>
              <AlertTriangle size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-400">{competenceSummary.estadias_sem_comprovante}</p>
            <p className="text-[10px] text-white/40">Pendências de anexo fiscal</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Múltiplos Comprovantes</span>
              <FileText size={16} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-400">{competenceSummary.estadias_com_multiplos}</p>
            <p className="text-[10px] text-white/40">2 ou mais anexos na mesma estadia</p>
          </div>
        </div>
      )}

      {/* Sub-Tabs & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          <button
            onClick={() => setActiveSubTab('byChacara')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'byChacara'
                ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <Building2 size={16} />
            <span>Agrupado por Chácara</span>
          </button>

          <button
            onClick={() => setActiveSubTab('carneLeaoTable')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'carneLeaoTable'
                ? 'bg-[#FFD600] text-[#0A0F2C] shadow-md'
                : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span>Tabela Carnê-Leão (Unificada)</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFD600]"
          >
            <option value="TODOS" className="bg-[#0A0F2C]">Status: Todos</option>
            <option value="SEM_COMPROVANTE" className="bg-[#0A0F2C]">Sem Comprovante (Pendente)</option>
            <option value="COM_COMPROVANTE" className="bg-[#0A0F2C]">Com Comprovante</option>
            <option value="MULTIPLOS" className="bg-[#0A0F2C]">Com Múltiplos Comprovantes</option>
          </select>

          {/* Search Bar */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar reserva, hóspede, CPF..."
              className="w-full pl-8 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-bold outline-none focus:border-[#FFD600] placeholder-white/20"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: AGRUPADO POR CHÁCARA */}
      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-white/40 flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#FFD600]" />
          <span>Consolidando dados das chácaras e comprovantes fiscais...</span>
        </div>
      ) : activeSubTab === 'byChacara' ? (
        <div className="space-y-6">
          {filteredChacaraGroups.length === 0 ? (
            <div className="py-16 px-6 text-center bg-white/5 border border-white/10 rounded-3xl space-y-3">
              <Building2 size={36} className="mx-auto text-white/30" />
              <h3 className="text-base font-black text-white">Nenhuma estadia encontrada para esta competência</h3>
              <p className="text-xs text-white/50 max-w-md mx-auto">
                Altere a competência no topo ou limpe os filtros para visualizar estadias e comprovantes.
              </p>
            </div>
          ) : (
            filteredChacaraGroups.map((group) => (
              <div
                key={group.chacara_id}
                className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden space-y-4 p-5 sm:p-6"
              >
                {/* Chácara Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/10 text-[#FFD600] rounded-2xl border border-white/10">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white tracking-tight">
                        {group.chacara_nome}
                      </h3>
                      <p className="text-xs text-white/50">
                        {group.total_estadias} {group.total_estadias === 1 ? 'estadia' : 'estadias'} na competência {competenceSummary?.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase font-black block">Recebido na Chácara</span>
                      <p className="font-black text-[#FFD600] text-sm">
                        R$ {group.total_recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="border-l border-white/10 pl-4">
                      <span className="text-[10px] text-white/40 uppercase font-black block">Comprovado</span>
                      <p className="font-bold text-emerald-400 text-sm">
                        R$ {group.total_comprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stays Cards / List inside Chácara */}
                <div className="space-y-3">
                  {group.reservas.map((res) => (
                    <div
                      key={res.reservation_id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        !res.has_documents
                          ? 'bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/40'
                          : res.has_multiple_documents
                          ? 'bg-purple-500/[0.03] border-purple-500/20 hover:border-purple-500/40'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Stay main details */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white text-[11px] font-black">
                            {res.code}
                          </span>

                          <span className="text-xs text-white/60 flex items-center gap-1 font-semibold">
                            <Calendar size={13} className="text-[#FFD600]" />
                            {res.checkin_date} a {res.checkout_date}
                          </span>

                          {!res.has_documents ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase flex items-center gap-1">
                              <AlertTriangle size={12} />
                              Sem Comprovante
                            </span>
                          ) : res.has_multiple_documents ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase flex items-center gap-1">
                              <FileCheck size={12} />
                              {res.documents.length} Comprovantes
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Comprovado
                            </span>
                          )}
                        </div>

                        <div className="text-xs">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <User size={13} className="text-white/40" />
                            {res.client_nome}
                            <span className="text-white/40 font-normal">({res.client_document})</span>
                          </p>
                        </div>

                        {/* Attached Files Pills */}
                        {res.documents.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[10px] text-white/40 uppercase font-black">Anexos:</span>
                            {res.documents.map((doc) => (
                              <a
                                key={doc.id}
                                href={doc.public_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white text-[10px] font-bold transition-all flex items-center gap-1 border border-white/10"
                              >
                                <FileText size={12} />
                                <span className="truncate max-w-[140px]">{doc.file_name}</span>
                                <span className="opacity-60">(R$ {Number(doc.amount).toFixed(0)})</span>
                                <ExternalLink size={10} />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Amounts & Quick Upload button */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/10 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-white/40 uppercase font-black block">Valor da Estadia</span>
                          <p className="font-black text-[#FFD600] text-sm">
                            R$ {res.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-emerald-400 font-bold">
                            Comprovado: R$ {res.total_proven_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <button
                          onClick={() => handleOpenUploadModal(res)}
                          className="px-4 py-2.5 bg-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
                        >
                          <UploadCloud size={16} />
                          <span>{res.documents.length > 0 ? 'Gerenciar Comprovantes' : 'Anexar Comprovante'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* VIEW 2: UNIFIED TABLE FOR CARNÊ-LEÃO */
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 custom-scrollbar">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-black/40 text-[10px] font-black uppercase text-white/50 border-b border-white/10">
              <tr>
                <th className="p-4">Chácara / Reserva</th>
                <th className="p-4">Período Estadia</th>
                <th className="p-4">Hóspede / Pagador</th>
                <th className="p-4">CPF / CNPJ</th>
                <th className="p-4 text-right">Valor Estadia</th>
                <th className="p-4 text-right">Valor Comprovado</th>
                <th className="p-4 text-center">Comprovantes</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredChacaraGroups.flatMap(g => g.reservas).map((res) => (
                <tr key={res.reservation_id} className="hover:bg-white/10 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-white">{res.chacara_nome}</p>
                    <p className="text-[10px] text-[#FFD600] font-black">{res.code}</p>
                  </td>

                  <td className="p-4 font-semibold text-white/70">
                    {res.checkin_date} a {res.checkout_date}
                  </td>

                  <td className="p-4 font-bold text-white">
                    {res.client_nome}
                  </td>

                  <td className="p-4 font-mono text-white/60">
                    {res.client_document}
                  </td>

                  <td className="p-4 text-right font-black text-[#FFD600]">
                    R$ {res.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-right font-bold text-emerald-400">
                    R$ {res.total_proven_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-center">
                    {res.documents.length === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-black">
                        Pendente (0)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black">
                        {res.documents.length} {res.documents.length === 1 ? 'Anexo' : 'Anexos'}
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenUploadModal(res)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-[#FFD600] hover:text-[#0A0F2C] text-white font-bold text-[11px] rounded-lg transition-all"
                    >
                      Anexar / Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Carnê-Leão Help / Informational Card */}
      <div className="p-5 rounded-3xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs flex items-start gap-3">
        <Info size={20} className="text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">Dica para Preenchimento do Carnê-Leão (Recebimento de Aluguel/Temporada):</p>
          <p className="text-sky-200/80 leading-relaxed">
            Os comprovantes armazenados aqui servem como lastro documental oficial perante a Receita Federal. Na escrituração do Carnê-Leão, os rendimentos de aluguéis de imóvel residencial/temporada devem ser declarados no mês do recebimento do valor pelo locador. Você pode anexar quantos comprovantes forem necessários para cada reserva (ex: Pix do sinal + Pix do saldo final).
          </p>
        </div>
      </div>

      {/* Upload Payment Document Modal */}
      <UploadPaymentDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        reservation={selectedReservationForModal}
        onSuccess={() => loadFiscalData(selectedCompetencia)}
      />
    </div>
  );
}
