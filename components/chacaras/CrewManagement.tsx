'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Sparkles, 
  TreePine, 
  Phone, 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  LayoutGrid, 
  List, 
  Tag, 
  ChevronRight, 
  ExternalLink,
  ShieldAlert,
  Edit3,
  QrCode,
  Calendar
} from 'lucide-react';
import { CrewMember, CrewRole, Chacara } from '@/lib/chacaraTypes';
import { getCrewMembers, getCrewRoles } from '@/services/crewService';
import { getChacaras } from '@/services/chacarasService';
import CrewMemberModal from './CrewMemberModal';
import CrewMemberDetailModal from './CrewMemberDetailModal';

export default function CrewManagement() {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [roles, setRoles] = useState<CrewRole[]>([]);
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('TODAS');
  const [selectedChacaraId, setSelectedChacaraId] = useState('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modals
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<CrewMember | null>(null);

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedRoleId, selectedChacaraId, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedChacaras] = await Promise.all([
        getCrewRoles(true),
        getChacaras()
      ]);
      setRoles(fetchedRoles);
      setChacaras(fetchedChacaras);

      const fetchedMembers = await getCrewMembers({
        search: searchTerm,
        roleId: selectedRoleId,
        chacaraId: selectedChacaraId,
        activeOnly: statusFilter === 'ATIVO' ? true : undefined
      });

      let filtered = fetchedMembers;
      if (statusFilter === 'INATIVO') {
        filtered = filtered.filter(m => !m.ativo);
      }

      setMembers(filtered);

      // Keep detail modal updated if open
      if (selectedMemberDetail) {
        const updatedDetail = fetchedMembers.find(m => m.id === selectedMemberDetail.id);
        if (updatedDetail) setSelectedMemberDetail(updatedDetail);
      }
    } catch (e) {
      console.error('Erro ao carregar módulo de equipes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateMember = () => {
    setEditingMember(null);
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (member: CrewMember) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  const handleOpenDetail = (member: CrewMember) => {
    setSelectedMemberDetail(member);
    setIsDetailModalOpen(true);
  };

  // Metrics
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.ativo).length;
  const totalRoles = roles.filter(r => r.ativo).length;
  const avgProperties = totalMembers > 0 
    ? (members.reduce((acc, m) => acc + (m.chacara_ids?.length || 0), 0) / totalMembers).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#0A0F2C] border border-white/10 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] text-[10px] font-black uppercase">
              Fase 5 • Gestão Escalável N:N
            </span>
            <span className="text-xs text-white/40">• Módulo de Equipes</span>
          </div>
          <h1 className="text-xl font-black text-white mt-1 flex items-center gap-2.5">
            <Users size={24} className="text-[#FFD600]" />
            Equipe e Colaboradores
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Gerencie os funcionários, atribua múltiplas funções e vincule-os a várias chácaras simultaneamente.
          </p>
        </div>

        <button
          onClick={handleOpenCreateMember}
          className="px-5 py-3 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <UserPlus size={18} />
          <span>Novo Funcionário</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0A0F2C] border border-white/10 rounded-2xl space-y-1">
          <span className="text-[10px] text-white/40 uppercase font-bold block">Total de Colaboradores</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-white">{totalMembers}</span>
            <Users size={20} className="text-[#FFD600]" />
          </div>
        </div>

        <div className="p-4 bg-[#0A0F2C] border border-white/10 rounded-2xl space-y-1">
          <span className="text-[10px] text-white/40 uppercase font-bold block">Ativos no Sistema</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-400">{activeMembers}</span>
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
        </div>

        <div className="p-4 bg-[#0A0F2C] border border-white/10 rounded-2xl space-y-1">
          <span className="text-[10px] text-white/40 uppercase font-bold block">Funções Cadastradas</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-cyan-400">{totalRoles}</span>
            <Sparkles size={20} className="text-cyan-400" />
          </div>
        </div>

        <div className="p-4 bg-[#0A0F2C] border border-white/10 rounded-2xl space-y-1">
          <span className="text-[10px] text-white/40 uppercase font-bold block">Média Chácaras / Membro</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-purple-400">{avgProperties}</span>
            <TreePine size={20} className="text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-[#0A0F2C] border border-white/10 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-[#FFD600]"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODAS" className="bg-[#0A0F2C]">Todas as Funções</option>
              {roles.map(r => (
                <option key={r.id} value={r.id} className="bg-[#0A0F2C]">
                  {r.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Chácara Filter */}
          <div>
            <select
              value={selectedChacaraId}
              onChange={(e) => setSelectedChacaraId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODAS" className="bg-[#0A0F2C]">Todas as Chácaras</option>
              {chacaras.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0A0F2C]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter & View Toggle */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#FFD600]"
            >
              <option value="TODOS" className="bg-[#0A0F2C]">Todos os Status</option>
              <option value="ATIVO" className="bg-[#0A0F2C]">Apenas Ativos</option>
              <option value="INATIVO" className="bg-[#0A0F2C]">Apenas Inativos</option>
            </select>

            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('CARDS')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'CARDS' ? 'bg-[#FFD600] text-[#0A0F2C]' : 'text-white/60 hover:text-white'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'TABLE' ? 'bg-[#FFD600] text-[#0A0F2C]' : 'text-white/60 hover:text-white'
                }`}
                title="Visualização em Tabela"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-16 text-center text-white/50 text-xs">
          Carregando colaboradores da equipe...
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 bg-[#0A0F2C] border border-white/10 rounded-3xl text-center space-y-3">
          <Users size={36} className="mx-auto text-white/30" />
          <h3 className="text-base font-bold text-white">Nenhum funcionário encontrado</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            Não foram encontrados colaboradores com os filtros aplicados. Altere os filtros ou cadastre um novo funcionário.
          </p>
          <button
            onClick={handleOpenCreateMember}
            className="px-4 py-2 bg-[#FFD600] text-[#0A0F2C] font-black text-xs rounded-xl inline-flex items-center gap-2"
          >
            <UserPlus size={16} />
            <span>Cadastrar Funcionário</span>
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const formattedWhatsAppUrl = m.whatsapp || m.telefone
              ? `https://wa.me/55${(m.whatsapp || m.telefone || '').replace(/\D/g, '')}`
              : null;

            return (
              <div
                key={m.id}
                className={`p-5 bg-[#0A0F2C] border rounded-2xl space-y-4 transition-all hover:border-white/20 relative ${
                  m.ativo ? 'border-white/10' : 'border-white/5 opacity-65'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFD600] text-[#0A0F2C] font-black text-base flex items-center justify-center shrink-0 shadow-md">
                      {m.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 
                        onClick={() => handleOpenDetail(m)}
                        className="font-black text-sm text-white hover:text-[#FFD600] cursor-pointer transition-colors"
                      >
                        {m.nome}
                      </h3>
                      <span className="text-[11px] text-white/50 block font-mono">
                        {m.telefone || 'Sem telefone'}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    m.ativo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {m.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Roles Badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-white/40 font-bold uppercase block">Funções ({m.roles?.length || 0}):</span>
                  {!m.roles || m.roles.length === 0 ? (
                    <span className="text-xs text-white/30 italic">Nenhuma função associada</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {m.roles.map(role => {
                        const color = role.cor || '#10B981';
                        return (
                          <span
                            key={role.id}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                            style={{
                              backgroundColor: `${color}25`,
                              color: color,
                              border: `1px solid ${color}50`
                            }}
                          >
                            {role.nome}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chácaras Badges */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-white/40 font-bold uppercase block">Chácaras Vinculadas ({m.chacaras?.length || 0}):</span>
                  {!m.chacaras || m.chacaras.length === 0 ? (
                    <span className="text-xs text-white/30 italic">Nenhuma chácara vinculada</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {m.chacaras.map(chacara => (
                        <span
                          key={chacara.id}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-[10px] font-bold flex items-center gap-1"
                        >
                          <TreePine size={11} className="text-[#FFD600]" />
                          <span>{chacara.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financeiro / PIX Tag */}
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <QrCode size={14} className="text-emerald-400 shrink-0" />
                    <span className="font-mono text-white/90 truncate">
                      {m.pix_key || <span className="text-white/30 italic font-sans">Sem PIX</span>}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold text-[9px] uppercase shrink-0 border border-emerald-500/20">
                    {m.payment_frequency === 'WEEKLY' ? 'Semanal' : m.payment_frequency === 'PER_RESERVATION' ? 'Reserva (-1d)' : 'Mensal'}
                  </span>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {formattedWhatsAppUrl && (
                      <a
                        href={formattedWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold"
                      >
                        <MessageSquare size={14} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditMember(m)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <Edit3 size={13} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleOpenDetail(m)}
                      className="px-3 py-1.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow transition-all flex items-center gap-1"
                    >
                      <span>Perfil</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-[#0A0F2C] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="bg-[#070A1E] text-white/50 text-[10px] uppercase font-bold border-b border-white/10">
                <tr>
                  <th className="p-4">Funcionário</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4">Financeiro / PIX</th>
                  <th className="p-4">Funções</th>
                  <th className="p-4">Chácaras</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#FFD600] text-[#0A0F2C] font-black text-xs flex items-center justify-center shrink-0">
                          {m.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span 
                            onClick={() => handleOpenDetail(m)}
                            className="font-bold text-white hover:text-[#FFD600] cursor-pointer block"
                          >
                            {m.nome}
                          </span>
                          <span className="text-[10px] text-white/40">{m.email || 'Sem email'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-xs">
                      {m.telefone || m.whatsapp || '—'}
                    </td>

                    <td className="p-4 font-mono text-xs">
                      <div className="space-y-0.5">
                        <span className="text-white font-bold block truncate max-w-[140px]">
                          {m.pix_key || <span className="text-white/30 italic font-sans font-normal">Sem PIX</span>}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-sans font-bold uppercase block">
                          {m.payment_frequency === 'WEEKLY' ? 'Semanal' : m.payment_frequency === 'PER_RESERVATION' ? 'Reserva (-1d)' : 'Mensal'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {m.roles?.map(role => {
                          const color = role.cor || '#10B981';
                          return (
                            <span
                              key={role.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: `${color}25`,
                                color: color,
                                border: `1px solid ${color}40`
                              }}
                            >
                              {role.nome}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {m.chacaras?.map(c => (
                          <span key={c.id} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/80 border border-white/10">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        m.ativo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditMember(m)}
                          className="p-1.5 hover:bg-white/10 text-[#FFD600] rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenDetail(m)}
                          className="px-2.5 py-1 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-[11px] rounded-lg transition-all"
                        >
                          Ver Perfil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CrewMemberModal
        isOpen={isMemberModalOpen}
        member={editingMember}
        onClose={() => setIsMemberModalOpen(false)}
        onSaveSuccess={loadData}
      />

      <CrewMemberDetailModal
        isOpen={isDetailModalOpen}
        member={selectedMemberDetail}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={(m) => {
          setIsDetailModalOpen(false);
          handleOpenEditMember(m);
        }}
        onRefresh={loadData}
      />
    </div>
  );
}
