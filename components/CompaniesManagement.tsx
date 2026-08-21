'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Search, Filter, Plus, Edit3, CheckCircle2, 
  X, Save, RotateCw, Phone, Mail, FileText, Calendar, 
  AlertTriangle, DollarSign, Ban, ChevronRight, Briefcase
} from 'lucide-react';
import { Company, CompanyFormData, CompanyStatus, CompanyLimitType } from '@/lib/types';
import { companiesService } from '@/services/companiesService';

interface CompaniesManagementProps {
  refreshKey?: number;
}

export default function CompaniesManagement({ refreshKey: propRefreshKey }: CompaniesManagementProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'ALL'>('ALL');
  const [localRefresh, setLocalRefresh] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    status: 'ACTIVE',
    limit_value: 0,
    limit_type: 'NONE',
    block_on_limit: true,
    document_number: '',
    phone: '',
    email: '',
    billing_day: 5,
    notes: ''
  });

  // Load Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const data = await companiesService.getCompanies();
        setCompanies(data);
      } catch (err: any) {
        console.warn('Busca de empresas finalizada:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, [localRefresh, propRefreshKey]);

  // Open Modal for Create or Edit
  const handleOpenModal = (company: Company | null = null) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        status: company.status,
        limit_value: Number(company.limit_value || 0),
        limit_type: company.limit_type,
        block_on_limit: company.block_on_limit,
        document_number: company.document_number || '',
        phone: company.phone || '',
        email: company.email || '',
        billing_day: company.billing_day || 5,
        notes: company.notes || ''
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: '',
        status: 'ACTIVE',
        limit_value: 0,
        limit_type: 'NONE',
        block_on_limit: true,
        document_number: '',
        phone: '',
        email: '',
        billing_day: 5,
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  // Toggle company status
  const handleToggleStatus = async (company: Company) => {
    try {
      await companiesService.toggleCompanyStatus(company.id, company.status);
      setLocalRefresh(prev => prev + 1);
    } catch (err) {
      console.error('Erro ao alternar status da empresa:', err);
      alert('Erro ao alternar status da empresa.');
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('O nome da empresa é obrigatório.');
      return;
    }

    setModalLoading(true);
    try {
      if (editingCompany) {
        await companiesService.updateCompany(editingCompany.id, formData);
      } else {
        await companiesService.createCompany(formData);
      }
      setIsModalOpen(false);
      setLocalRefresh(prev => prev + 1);
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err);
      if (err.message && err.message.includes('unique_name')) {
        alert('Já existe uma empresa cadastrada com este nome.');
      } else {
        alert('Erro ao salvar empresa: ' + (err.message || 'Erro inesperado.'));
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered Companies
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (company.document_number && company.document_number.includes(searchTerm)) ||
                          (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" id="companies-management-tab">
      {/* Top Controls Bar */}
      <div className="shrink-0 flex flex-col md:flex-row gap-4 justify-between items-center py-4 border-b border-white/5 bg-[#0A0F2C]/40 backdrop-blur-md rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/25 flex items-center justify-center">
            <Briefcase className="text-[#FFD600]" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Empresas e Convênios</h2>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-0.5">Gestão de limites de faturamento e faturas corporativas</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto justify-end">
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              className="w-full bg-[#0A0F2C]/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#FFD600]/60 transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Dropdown Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <select
              className="pl-9 pr-8 py-2.5 text-xs bg-[#0A0F2C]/50 border border-white/10 rounded-xl text-white outline-none appearance-none font-bold cursor-pointer hover:bg-white/5 transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | 'ALL')}
            >
              <option value="ALL" className="bg-[#0A0F2C] text-white">Todos os Status</option>
              <option value="ACTIVE" className="bg-[#0A0F2C] text-white">Ativas</option>
              <option value="INACTIVE" className="bg-[#0A0F2C] text-white">Inativas</option>
            </select>
          </div>

          {/* Add Company Button */}
          <button
            onClick={() => handleOpenModal(null)}
            className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-5 rounded-xl shadow-lg shadow-[#FFD600]/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
          >
            <Plus size={16} />
            <span>Cadastrar Empresa</span>
          </button>
        </div>
      </div>

      {/* Main Companies Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RotateCw className="text-[#FFD600] animate-spin" size={32} />
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Carregando dados das empresas...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="glass glass-reflection rounded-[32px] p-12 text-center border border-white/5 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/20">
              <Building2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white/80">Nenhuma empresa encontrada</h3>
              <p className="text-sm text-white/40 mt-1 max-w-sm mx-auto font-bold">Não existem empresas registradas que atendam aos filtros ou critérios de busca.</p>
            </div>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
              className="mt-2 text-xs font-black text-[#FFD600] hover:underline"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="companies-list-grid">
            {filteredCompanies.map((company) => (
              <motion.div
                key={company.id}
                layoutId={`company-card-${company.id}`}
                className="glass rounded-[24px] border border-white/10 overflow-hidden flex flex-col h-full hover:border-[#FFD600]/30 transition-all relative group"
              >
                {/* Visual Accent Bar */}
                <div className={`h-1.5 w-full ${company.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-white/10'}`} />

                {/* Card Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black text-white tracking-tight group-hover:text-[#FFD600] transition-colors line-clamp-1">
                        {company.name}
                      </h3>
                      <button
                        onClick={() => handleToggleStatus(company)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border cursor-pointer active:scale-95 transition-all
                          ${company.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20' 
                            : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                        title={company.status === 'ACTIVE' ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        {company.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 mt-4 text-xs font-bold text-white/60">
                      {company.document_number && (
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-white/20" />
                          <span>CNPJ: {company.document_number}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-white/20" />
                          <span>Fone: {company.phone}</span>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-white/20" />
                          <span className="line-clamp-1">Email: {company.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial configuration sub-box */}
                  <div className="mt-5 pt-4 border-t border-white/5 bg-white/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Modalidade Limite</span>
                      <span className="text-[10px] font-black text-[#FFD600] uppercase tracking-wider">
                        {company.limit_type === 'NONE' ? 'Sem Limite' : 
                         company.limit_type === 'WEEKLY' ? 'Semanal' : 
                         company.limit_type === 'MONTHLY' ? 'Mensal' : 'Anual'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Teto Financeiro</span>
                      <span className="text-sm font-black text-white">
                        {company.limit_type === 'NONE' ? '—' : 
                         new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(company.limit_value || 0))}
                      </span>
                    </div>

                    {company.limit_type !== 'NONE' && (
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">Bloqueio imediato</span>
                        <span className={`text-[10px] font-black ${company.block_on_limit ? 'text-[#FFD600]' : 'text-white/40'}`}>
                          {company.block_on_limit ? 'Sim (Bloquear agendamentos)' : 'Não (Apenas aviso)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                    <Calendar size={12} />
                    <span>Faturamento dia {company.billing_day || 5}</span>
                  </div>

                  <button
                    onClick={() => handleOpenModal(company)}
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
              className="glass glass-reflection rounded-[32px] w-full max-w-2xl overflow-hidden border border-white/10 shadow-3xl bg-[#0A0F2C] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/25">
                    <Briefcase size={20} className="text-[#FFD600]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">
                      {editingCompany ? 'Editar Informações' : 'Cadastrar Nova Empresa'}
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-0.5">Defina todos os limites e faturamento</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpenModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Basic Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      Nome da Empresa / Convênio *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Melos, Zanchetta, Unimed..."
                      className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      CNPJ / Documento
                    </label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs"
                      value={formData.document_number || ''}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      Telefone de Contato
                    </label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      Email de Faturamento
                    </label>
                    <input
                      type="email"
                      placeholder="financeiro@empresa.com.br"
                      className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      Dia de Faturamento Mensal (Vencimento)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="Ex: 5"
                      className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs"
                      value={formData.billing_day || ''}
                      onChange={(e) => setFormData({ ...formData, billing_day: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                    />
                  </div>
                </div>

                {/* Limits section (Visual card) */}
                <div className="glass bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={16} className="text-[#FFD600]" /> Configurações de Limites Financeiros
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                        Tipo de Teto / Limite
                      </label>
                      <select
                        className="w-full px-5 py-3 rounded-xl bg-[#0A0F2C]/50 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs appearance-none cursor-pointer"
                        value={formData.limit_type}
                        onChange={(e) => {
                          const val = e.target.value as CompanyLimitType;
                          setFormData({ 
                            ...formData, 
                            limit_type: val,
                            // clear limit_value to 0 if limit_type is NONE
                            limit_value: val === 'NONE' ? 0 : formData.limit_value
                          });
                        }}
                      >
                        <option value="NONE" className="bg-[#0A0F2C] text-white">Sem Limite Financeiro</option>
                        <option value="WEEKLY" className="bg-[#0A0F2C] text-white">Limite Recorrente Semanal</option>
                        <option value="MONTHLY" className="bg-[#0A0F2C] text-white">Limite Recorrente Mensal</option>
                        <option value="YEARLY" className="bg-[#0A0F2C] text-white">Limite Recorrente Anual</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                        Valor Limite Total (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={formData.limit_type === 'NONE'}
                        placeholder="Ex: 5000.00"
                        className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        value={formData.limit_value || ''}
                        onChange={(e) => setFormData({ ...formData, limit_value: e.target.value ? parseFloat(e.target.value) : 0 })}
                      />
                    </div>
                  </div>

                  {formData.limit_type !== 'NONE' && (
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="block_on_limit"
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#FFD600] focus:ring-[#FFD600]/50 outline-none cursor-pointer"
                        checked={formData.block_on_limit}
                        onChange={(e) => setFormData({ ...formData, block_on_limit: e.target.checked })}
                      />
                      <label htmlFor="block_on_limit" className="text-xs font-bold text-white/80 cursor-pointer select-none">
                        Bloquear novos agendamentos se o limite for atingido
                      </label>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Observações / Anotações Internas
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contratos particulares, detalhes da NF, contatos específicos..."
                    className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold text-xs resize-none"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsOpenModal(false)}
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

  // Helper inside click handlers to easily close/open state
  function setIsOpenModal(isOpen: boolean) {
    setIsModalOpen(isOpen);
  }
}
