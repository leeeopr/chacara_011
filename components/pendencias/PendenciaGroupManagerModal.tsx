'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, Palette, Tag } from 'lucide-react';
import { PendenciaGrupo } from '@/lib/pendenciasTypes';
import {
  getPendenciaGrupos,
  createPendenciaGrupo,
  updatePendenciaGrupo,
  deletePendenciaGrupo
} from '@/services/pendenciasService';

interface PendenciaGroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupsUpdated: () => void;
}

const PRESET_COLORS = [
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#0EA5E9', // Sky Blue
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#3B82F6', // Blue
  '#84CC16', // Lime
  '#D97706', // Warm Yellow
  '#6366F1'  // Indigo
];

export default function PendenciaGroupManagerModal({
  isOpen,
  onClose,
  onGroupsUpdated
}: PendenciaGroupManagerModalProps) {
  const [groups, setGroups] = useState<PendenciaGrupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PendenciaGrupo | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const [ativo, setAtivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen]);

  const loadGroups = async () => {
    setLoading(true);
    const data = await getPendenciaGrupos();
    setGroups(data);
    setLoading(false);
  };

  const handleStartCreate = () => {
    setEditingGroup(null);
    setNome('');
    setCor('#3B82F6');
    setAtivo(true);
    setErrorMsg('');
  };

  const handleStartEdit = (g: PendenciaGrupo) => {
    setEditingGroup(g);
    setNome(g.nome);
    setCor(g.cor || '#3B82F6');
    setAtivo(g.ativo !== false);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome do grupo.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (editingGroup) {
        await updatePendenciaGrupo(editingGroup.id, {
          nome: nome.trim(),
          cor,
          ativo
        });
      } else {
        await createPendenciaGrupo({
          nome: nome.trim(),
          cor,
          ativo,
          ordem_exibicao: groups.length + 1
        });
      }

      await loadGroups();
      onGroupsUpdated();
      handleStartCreate();
    } catch (err: any) {
      setErrorMsg('Erro ao salvar grupo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deletePendenciaGrupo(id);
    await loadGroups();
    onGroupsUpdated();
    if (editingGroup?.id === id) {
      handleStartCreate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0A0F2C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-xl text-[#FFD600]">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Grupos de Pendências</h2>
              <p className="text-xs text-white/50">Gerencie as categorias operacionais e suas cores organizacionais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Form */}
          <div className="md:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-[#FFD600] tracking-wider">
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
              </span>
              {editingGroup && (
                <button
                  onClick={handleStartCreate}
                  className="text-[11px] font-bold text-white/60 hover:text-white underline"
                >
                  Cancelar
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Limpeza, Financeiro..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/20 text-xs font-bold focus:outline-none focus:border-[#FFD600]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">
                  Cor do Grupo
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-xl border border-white/20 shrink-0 shadow-inner"
                    style={{ backgroundColor: cor }}
                  />
                  <input
                    type="text"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-black/20 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#FFD600]"
                  />
                </div>
                {/* Palette presets */}
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCor(c)}
                      className={`h-6 rounded-lg border transition-transform ${
                        cor.toLowerCase() === c.toLowerCase()
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-white/10 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-bold text-white/70">Ativo</label>
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 rounded bg-black/30 border-white/20 text-[#FFD600] focus:ring-0 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#FFD600] hover:bg-[#FFE033] text-[#0A0F2C] font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={16} />
                {editingGroup ? 'Salvar Alterações' : 'Criar Grupo'}
              </button>
            </form>
          </div>

          {/* Right: Existing Groups List */}
          <div className="md:col-span-7 flex flex-col min-h-0 space-y-3">
            <span className="text-xs font-black uppercase text-white/60 tracking-wider">
              Grupos Cadastrados ({groups.length})
            </span>

            {loading ? (
              <div className="py-12 text-center text-xs text-white/40 font-bold">
                Carregando grupos...
              </div>
            ) : groups.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/40 font-bold bg-white/5 rounded-2xl border border-white/10">
                Nenhum grupo cadastrado.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      editingGroup?.id === g.id
                        ? 'bg-[#FFD600]/10 border-[#FFD600]/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                        style={{ backgroundColor: g.cor || '#3B82F6' }}
                      />
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                          {g.nome}
                          {!g.ativo && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-semibold">
                              Inativo
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(g)}
                        className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="p-1.5 text-white/40 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
