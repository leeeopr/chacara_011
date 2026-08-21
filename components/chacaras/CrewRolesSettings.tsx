'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Power, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Palette, 
  HelpCircle, 
  Check, 
  AlertTriangle,
  Info,
  ShieldAlert,
  Search,
  Tag
} from 'lucide-react';
import { CrewRole } from '@/lib/chacaraTypes';
import { 
  getCrewRoles, 
  createCrewRole, 
  updateCrewRole, 
  deleteCrewRole, 
  getCrewMembers 
} from '@/services/crewService';

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Green
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export default function CrewRolesSettings() {
  const [roles, setRoles] = useState<CrewRole[]>([]);
  const [roleMemberCounts, setRoleMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CrewRole | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cor: '#10B981',
    icone: 'Sparkles',
    descricao: '',
    ativo: true,
    ordem_exibicao: 1
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedRoles, members] = await Promise.all([
        getCrewRoles(true),
        getCrewMembers()
      ]);

      setRoles(fetchedRoles);

      // Compute member counts per role
      const counts: Record<string, number> = {};
      members.forEach(m => {
        m.role_ids?.forEach(rid => {
          counts[rid] = (counts[rid] || 0) + 1;
        });
      });
      setRoleMemberCounts(counts);
    } catch (e) {
      console.error('Erro ao carregar funções:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({
      nome: '',
      cor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      icone: 'Sparkles',
      descricao: '',
      ativo: true,
      ordem_exibicao: roles.length + 1
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: CrewRole) => {
    setEditingRole(role);
    setFormData({
      nome: role.nome,
      cor: role.cor || '#10B981',
      icone: role.icone || 'Sparkles',
      descricao: role.descricao || '',
      ativo: role.ativo,
      ordem_exibicao: role.ordem_exibicao || 1
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleDuplicate = (role: CrewRole) => {
    setEditingRole(null);
    setFormData({
      nome: `${role.nome} (Cópia)`,
      cor: role.cor,
      icone: role.icone || 'Sparkles',
      descricao: role.descricao || '',
      ativo: true,
      ordem_exibicao: roles.length + 1
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (role: CrewRole) => {
    try {
      await updateCrewRole(role.id, { ativo: !role.ativo });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao alterar status da função');
    }
  };

  const handleDelete = async (roleId: string) => {
    setSaving(true);
    try {
      await deleteCrewRole(roleId);
      setDeletingRoleId(null);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir função');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setErrorMessage('O nome da função é obrigatório.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      if (editingRole) {
        await updateCrewRole(editingRole.id, formData);
      } else {
        await createCrewRole(formData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar função');
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = roles.filter(r => 
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.descricao && r.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#0A0F2C] border border-white/10 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
              Tabela Administrável
            </span>
            <span className="text-xs text-white/40">• Fonte Única de Funções</span>
          </div>
          <h2 className="text-lg font-black text-white mt-1 flex items-center gap-2">
            <Tag size={20} className="text-[#FFD600]" />
            Funções e Especialidades da Equipe
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            Cadastre as atribuições de trabalho. As cores cadastradas aqui serão refletidas em todas as badges e relatórios do sistema.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={16} />
          <span>Nova Função</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar função por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[#FFD600]"
          />
        </div>
        <span className="text-xs text-white/50">{filteredRoles.length} função(ões) cadastrada(s)</span>
      </div>

      {/* Roles Grid / Table */}
      {loading ? (
        <div className="py-12 text-center text-white/50 text-xs">
          Carregando funções cadastradas...
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center text-white/40 text-xs">
          Nenhuma função encontrada. Clique em &quot;Nova Função&quot; para cadastrar a primeira.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => {
            const count = roleMemberCounts[role.id] || 0;
            const roleColor = role.cor || '#10B981';

            return (
              <div 
                key={role.id}
                className={`p-5 bg-[#0A0F2C] border rounded-2xl space-y-4 transition-all relative overflow-hidden ${
                  role.ativo ? 'border-white/10 hover:border-white/20' : 'border-white/5 opacity-60'
                }`}
              >
                {/* Top Strip with color */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5" 
                  style={{ backgroundColor: roleColor }}
                />

                {/* Header */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-md shrink-0"
                      style={{ backgroundColor: `${roleColor}25`, color: roleColor, border: `1px solid ${roleColor}50` }}
                    >
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        {role.nome}
                      </h3>
                      <span className="text-[10px] text-white/40 uppercase font-mono">HEX: {roleColor}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    role.ativo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {role.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-white/60 min-h-[32px] line-clamp-2">
                  {role.descricao || 'Sem descrição informada.'}
                </p>

                {/* Footer details & member count */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-white/50 text-[11px] flex items-center gap-1.5 font-bold">
                    <Users size={14} className="text-[#FFD600]" />
                    {count} funcionário(s)
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(role)}
                      title={role.ativo ? 'Desativar função' : 'Ativar função'}
                      className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all"
                    >
                      <Power size={14} className={role.ativo ? 'text-emerald-400' : 'text-rose-400'} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(role)}
                      title="Duplicar função"
                      className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(role)}
                      title="Editar função"
                      className="p-1.5 hover:bg-white/10 text-[#FFD600] rounded-lg transition-all"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingRoleId(role.id)}
                      title="Excluir função"
                      className="p-1.5 hover:bg-white/10 text-rose-400 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Confirm Delete Banner */}
                {deletingRoleId === role.id && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 mt-2">
                    <p className="text-[11px] text-rose-300 font-bold flex items-center gap-1">
                      <AlertTriangle size={14} /> Confirma a exclusão da função &quot;{role.nome}&quot;?
                    </p>
                    {count > 0 && (
                      <p className="text-[10px] text-amber-300 font-semibold">
                        Aviso: Esta função possui {count} funcionário(s) associado(s). O sistema impedirá a exclusão física para preservar a integridade.
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setDeletingRoleId(null)}
                        className="px-2.5 py-1 bg-white/10 text-white text-[10px] font-bold rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        disabled={saving}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black rounded-lg shadow"
                      >
                        {saving ? 'Excluindo...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Role Form Overlapped Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0A0F2C] border border-white/20 rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-[#FFD600] font-black uppercase tracking-widest block">
                  {editingRole ? 'Editar Registro' : 'Novo Cadastro'}
                </span>
                <h3 className="text-base font-black text-white">
                  {editingRole ? 'Editar Função da Equipe' : 'Cadastrar Nova Função'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Nome da Função */}
              <div>
                <label className="text-[11px] font-bold text-white/70 uppercase block mb-1">
                  Nome da Função *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Manutenção Elétrica, Limpeza, Caseiro..."
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#FFD600]"
                  required
                />
              </div>

              {/* Cor da Badge */}
              <div>
                <label className="text-[11px] font-bold text-white/70 uppercase block mb-1 flex items-center justify-between">
                  <span>Cor de Identificação *</span>
                  <span className="font-mono text-[10px] text-white/40">{formData.cor}</span>
                </label>

                {/* Swatches */}
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {PRESET_COLORS.map(hex => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, cor: hex })}
                      className="h-8 rounded-xl transition-all border flex items-center justify-center relative"
                      style={{ 
                        backgroundColor: hex, 
                        borderColor: formData.cor === hex ? '#FFFFFF' : 'transparent',
                        transform: formData.cor === hex ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      {formData.cor === hex && <Check size={14} className="text-white drop-shadow" />}
                    </button>
                  ))}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
                  <input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs text-white/60">Selecione uma cor personalizada se desejar</span>
                </div>
              </div>

              {/* Preview Badge */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-bold block">Visualização no Sistema:</span>
                <span 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-sm"
                  style={{ backgroundColor: `${formData.cor}30`, color: formData.cor, border: `1px solid ${formData.cor}60` }}
                >
                  <Sparkles size={13} />
                  <span>{formData.nome || 'Nome da Função'}</span>
                </span>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[11px] font-bold text-white/70 uppercase block mb-1">
                  Descrição das Atribuições
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhamento do que esta função abrange..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FFD600]"
                />
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <span className="font-bold text-white block">Status Ativo</span>
                  <span className="text-[10px] text-white/50">Disponível para seleção nos cadastros de funcionários</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                  className={`w-12 h-6 rounded-full transition-colors p-1 relative ${
                    formData.ativo ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    formData.ativo ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Submit Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>{saving ? 'Salvando...' : 'Salvar Função'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
