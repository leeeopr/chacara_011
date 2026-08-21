'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign, Search, Filter, Plus, Edit3, CheckCircle2,
  X, Save, RotateCw, Calendar, Tag, Briefcase, Activity
} from 'lucide-react';
import { CompanyPrice, CompanyPriceFormData, Company, AppointmentType } from '@/lib/types';
import { companyPricesService } from '@/services/companyPricesService';
import { companiesService } from '@/services/companiesService';
import { supabase } from '@/lib/supabase';

interface CompanyPricesManagementProps {
  refreshKey?: number;
}

export default function CompanyPricesManagement({ refreshKey: propRefreshKey }: CompanyPricesManagementProps) {
  const [prices, setPrices] = useState<CompanyPrice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [localRefresh, setLocalRefresh] = useState(0);

  // Filters State
  const [filterCompany, setFilterCompany] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<CompanyPrice | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CompanyPriceFormData>({
    company_id: null,
    appointment_type_id: '',
    price: 0,
    is_active: true
  });

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [pricesList, companiesList, typesRes] = await Promise.all([
          companyPricesService.getPrices(),
          companiesService.getCompanies(),
          supabase
            .from('appointment_types')
            .select('*')
            .or('is_active.eq.true')
            .order('name')
        ]);

        setPrices(pricesList);
        setCompanies(companiesList);
        if (typesRes.data) {
          setAppointmentTypes(typesRes.data as AppointmentType[]);
        }
      } catch (err) {
        console.error('Erro ao buscar dados de precificação:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [localRefresh, propRefreshKey]);

  // Open modal
  const handleOpenModal = (priceEntry: CompanyPrice | null = null) => {
    if (priceEntry) {
      setEditingPrice(priceEntry);
      setFormData({
        company_id: priceEntry.company_id || null,
        appointment_type_id: priceEntry.appointment_type_id,
        price: Number(priceEntry.price || 0),
        is_active: priceEntry.is_active
      });
    } else {
      setEditingPrice(null);
      setFormData({
        company_id: null,
        appointment_type_id: appointmentTypes[0]?.id || '',
        price: 0,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  // Toggle price active state
  const handleToggleActive = async (priceEntry: CompanyPrice) => {
    try {
      await companyPricesService.togglePrice(priceEntry.id, priceEntry.is_active);
      setLocalRefresh(prev => prev + 1);
    } catch (err) {
      console.error('Erro ao alternar status do preço:', err);
      alert('Erro ao alternar status do preço.');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.appointment_type_id) {
      alert('O tipo de consulta é obrigatório.');
      return;
    }
    if (formData.price < 0) {
      alert('O valor da consulta não pode ser negativo.');
      return;
    }

    setModalLoading(true);
    try {
      if (editingPrice) {
        await companyPricesService.updatePrice(editingPrice.id, formData);
      } else {
        await companyPricesService.createPrice(formData);
      }
      setIsModalOpen(false);
      setLocalRefresh(prev => prev + 1);
    } catch (err: any) {
      console.error('Erro ao salvar precificação:', err);
      if (err.message && (err.message.includes('unique_name') || err.message.includes('company_prices_company_type_idx') || err.message.includes('company_prices_particular_type_idx') || err.message.includes('duplicate key value'))) {
        alert('Já existe um preço configurado para esta combinação de Empresa e Tipo de Consulta.');
      } else {
        alert('Erro ao salvar precificação: ' + (err.message || 'Erro inesperado.'));
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered lists
  const filteredPrices = prices.filter(priceEntry => {
    // Company match
    let matchesCompany = true;
    if (filterCompany === 'PARTICULAR') {
      matchesCompany = priceEntry.company_id === null;
    } else if (filterCompany !== 'ALL') {
      matchesCompany = priceEntry.company_id === filterCompany;
    }

    // Type match
    const matchesType = filterType === 'ALL' || priceEntry.appointment_type_id === filterType;

    // Status match
    const matchesStatus = filterStatus === 'ALL' || 
      (filterStatus === 'ACTIVE' && priceEntry.is_active) || 
      (filterStatus === 'INACTIVE' && !priceEntry.is_active);

    return matchesCompany && matchesType && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" id="company-prices-management-tab">
      {/* Top Controls Bar */}
      <div className="shrink-0 flex flex-col md:flex-row gap-4 justify-between items-center py-4 border-b border-white/5 bg-[#0A0F2C]/40 backdrop-blur-md rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/25 flex items-center justify-center">
            <DollarSign className="text-[#FFD600]" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Tabela de Preços</h2>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-0.5">Matriz de precificação por Empresa / Convênio e Tipo de Consulta</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto justify-end">
          {/* Company Filter Dropdown */}
          <div className="relative">
            <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <select
              className="pl-9 pr-8 py-2.5 text-xs bg-[#0A0F2C]/50 border border-white/10 rounded-xl text-white outline-none appearance-none font-bold cursor-pointer hover:bg-white/5 transition-all"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="ALL" className="bg-[#0A0F2C] text-white">Todas as Empresas</option>
              <option value="PARTICULAR" className="bg-[#0A0F2C] text-white">Particular (Geral)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0A0F2C] text-white">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Type Filter Dropdown */}
          <div className="relative">
            <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <select
              className="pl-9 pr-8 py-2.5 text-xs bg-[#0A0F2C]/50 border border-white/10 rounded-xl text-white outline-none appearance-none font-bold cursor-pointer hover:bg-white/5 transition-all"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL" className="bg-[#0A0F2C] text-white">Todos os Tipos</option>
              {appointmentTypes.map(t => (
                <option key={t.id} value={t.id} className="bg-[#0A0F2C] text-white">{t.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <select
              className="pl-9 pr-8 py-2.5 text-xs bg-[#0A0F2C]/50 border border-white/10 rounded-xl text-white outline-none appearance-none font-bold cursor-pointer hover:bg-white/5 transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="ALL" className="bg-[#0A0F2C] text-white">Todos os Status</option>
              <option value="ACTIVE" className="bg-[#0A0F2C] text-white">Ativos</option>
              <option value="INACTIVE" className="bg-[#0A0F2C] text-white">Inativos</option>
            </select>
          </div>

          {/* Add Price Button */}
          <button
            onClick={() => handleOpenModal(null)}
            className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-5 rounded-xl shadow-lg shadow-[#FFD600]/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
          >
            <Plus size={16} />
            <span>Definir Preço</span>
          </button>
        </div>
      </div>

      {/* Main Prices Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RotateCw className="text-[#FFD600] animate-spin" size={32} />
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Carregando tabela de preços...</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="glass glass-reflection rounded-[32px] p-12 text-center border border-white/5 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/20">
              <DollarSign size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white/80">Nenhum preço configurado</h3>
              <p className="text-sm text-white/40 mt-1 max-w-sm mx-auto font-bold">Não existem lançamentos que correspondam aos filtros definidos.</p>
            </div>
            <button
              onClick={() => { setFilterCompany('ALL'); setFilterType('ALL'); setFilterStatus('ALL'); }}
              className="mt-2 text-xs font-black text-[#FFD600] hover:underline"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="company-prices-grid">
            {filteredPrices.map((priceEntry) => (
              <motion.div
                key={priceEntry.id}
                layoutId={`price-card-${priceEntry.id}`}
                className="glass rounded-[24px] border border-white/10 overflow-hidden flex flex-col h-full hover:border-[#FFD600]/30 transition-all relative group"
              >
                {/* Visual accent bar */}
                <div className={`h-1.5 w-full ${priceEntry.is_active ? 'bg-[#FFD600]' : 'bg-white/10'}`} />

                {/* Card Header & Content */}
                <div className="p-6 pb-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {/* Company label tag */}
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/40">
                          <Briefcase size={10} />
                          <span>{priceEntry.companies?.name || 'Particular / Padrão'}</span>
                        </div>
                        {/* Appointment type */}
                        <h3 className="text-base font-black text-white mt-1 group-hover:text-[#FFD600] transition-colors">
                          {priceEntry.appointment_types?.name || 'Consulta'}
                        </h3>
                      </div>

                      <button
                        onClick={() => handleToggleActive(priceEntry)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border cursor-pointer active:scale-95 transition-all
                          ${priceEntry.is_active 
                            ? 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/25 hover:bg-[#FFD600]/20' 
                            : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                      >
                        {priceEntry.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-xs font-black text-[#FFD600]">R$</span>
                      <span className="text-3xl font-black text-white tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(priceEntry.price || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                    <Calendar size={12} />
                    <span>Lançado em {priceEntry.created_at ? new Date(priceEntry.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>

                  <button
                    onClick={() => handleOpenModal(priceEntry)}
                    className="flex items-center gap-1.5 text-xs font-black text-white hover:text-[#FFD600] transition-colors cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Editar</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE & EDIT FORM MODAL CONTAINER */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0F2C]/65 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-lg overflow-hidden border border-white/10 shadow-3xl bg-[#0A0F2C] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/25">
                    <DollarSign size={20} className="text-[#FFD600]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">
                      {editingPrice ? 'Editar Preço' : 'Definir Novo Preço'}
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-0.5">Associe um preço a um tipo de consulta</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Company select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    Empresa / Convênio
                  </label>
                  <select
                    className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs appearance-none cursor-pointer"
                    value={formData.company_id || ''}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value || null })}
                  >
                    <option value="" className="bg-[#0A0F2C] text-white">Particular (Preço Geral)</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0A0F2C] text-white">{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Appointment Type select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    Tipo de Consulta *
                  </label>
                  <select
                    required
                    className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs appearance-none cursor-pointer"
                    value={formData.appointment_type_id}
                    onChange={(e) => setFormData({ ...formData, appointment_type_id: e.target.value })}
                  >
                    <option value="" disabled className="bg-[#0A0F2C]">Selecione o tipo de consulta</option>
                    {appointmentTypes.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#0A0F2C] text-white">{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Price input & Active status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                      Preço / Valor (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-white/40">R$</span>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs"
                        value={formData.price !== undefined && formData.price !== null ? formData.price : ''}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                      Status do Preço
                    </label>
                    <select
                      className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs appearance-none cursor-pointer"
                      value={formData.is_active ? 'ACTIVE' : 'INACTIVE'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'ACTIVE' })}
                    >
                      <option value="ACTIVE" className="bg-[#0A0F2C]">Ativo</option>
                      <option value="INACTIVE" className="bg-[#0A0F2C]">Inativo</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-3 px-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex-1 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-3 px-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#FFD600]/10 disabled:opacity-50"
                  >
                    {modalLoading ? (
                      <RotateCw className="animate-spin text-[#0A0F2C]" size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
