'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, ShieldAlert, Sparkles, Check, Settings2, Palette } from 'lucide-react';
import { OperationalEventType } from '@/lib/chacaraTypes';
import { getOperationalEventTypes, saveOperationalEventType, deleteOperationalEventType } from '@/services/operationalCalendarService';
import ConfirmActionModal from './ConfirmActionModal';

interface EventTypesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const PRESET_COLORS = [
  '#10B981', '#3B82F6', '#0EA5E9', '#06B6D4', '#8B5CF6', 
  '#A855F7', '#EC4899', '#EF4444', '#F59E0B', '#84CC16', '#6B7280'
];

export default function EventTypesManagementModal({
  isOpen,
  onClose,
  onRefresh
}: EventTypesManagementModalProps) {
  const [types, setTypes] = useState<OperationalEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<Partial<OperationalEventType> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Delete confirm state
  const [typeToDeleteId, setTypeToDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTypes();
    }
  }, [isOpen]);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await getOperationalEventTypes();
      setTypes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType?.name?.trim()) {
      setError('Informe o nome do tipo de evento.');
      return;
    }

    try {
      setError(null);
      await saveOperationalEventType({
        ...editingType,
        code: editingType.code || editingType.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_")
      });
      setEditingType(null);
      await loadTypes();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar tipo de evento.');
    }
  };

  const handleDelete = (id: string, isSystem?: boolean) => {
    if (isSystem) {
      setError('Tipos de sistema padrão não podem ser excluídos.');
      return;
    }
    setTypeToDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!typeToDeleteId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteOperationalEventType(typeToDeleteId);
      setTypeToDeleteId(null);
      await loadTypes();
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir tipo de evento.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A0F2C] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFD600]/10 border border-[#FFD600]/30 rounded-xl text-[#FFD600]">
              <Settings2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Configurar Tipos de Eventos</h3>
              <p className="text-xs text-white/50">Personalize cores, ícones, prioridades e comportamentos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs font-medium flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form when editing/creating */}
          {editingType && (
            <form onSubmit={handleSave} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-[#FFD600] uppercase tracking-wider">
                {editingType.id ? 'Editar Tipo de Evento' : 'Novo Tipo de Evento'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Nome do Tipo</label>
                  <input
                    type="text"
                    value={editingType.name || ''}
                    onChange={e => setEditingType({ ...editingType, name: e.target.value })}
                    placeholder="Ex: Inspeção de Incêndio"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#FFD600]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1">Prioridade (Exibição/Conflitos)</label>
                  <input
                    type="number"
                    value={editingType.priority || 1}
                    onChange={e => setEditingType({ ...editingType, priority: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#FFD600]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Cor do Marcador</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingType({ ...editingType, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform border-2 ${
                        editingType.color === c ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editingType.color || '#3B82F6'}
                    onChange={e => setEditingType({ ...editingType, color: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingType.description || ''}
                  onChange={e => setEditingType({ ...editingType, description: e.target.value })}
                  placeholder="Descrição das regras e diretrizes..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#FFD600]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FFD600] text-[#0A0F2C] text-xs font-black rounded-xl hover:bg-[#FFE500]"
                >
                  Salvar Tipo
                </button>
              </div>
            </form>
          )}

          {/* List of event types */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60 font-bold uppercase tracking-wider">
                Tipos Cadastrados ({types.length})
              </span>
              {!editingType && (
                <button
                  onClick={() => setEditingType({ name: '', color: '#3B82F6', priority: 5, icon: 'Calendar' })}
                  className="px-3 py-1.5 bg-[#FFD600]/10 hover:bg-[#FFD600]/20 border border-[#FFD600]/30 text-[#FFD600] text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Novo Tipo</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {types.map(t => (
                <div
                  key={t.id}
                  className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3 hover:bg-white/[0.07] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: t.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{t.name}</span>
                        {t.is_system && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded font-mono">
                            Sistema
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 truncate max-w-[180px]">
                        {t.description || `Prioridade ${t.priority}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingType(t)}
                      className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!t.is_system && (
                      <button
                        onClick={() => handleDelete(t.id, t.is_system)}
                        className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={!!typeToDeleteId}
        title="Excluir Tipo de Evento"
        message="Tem certeza que deseja excluir este tipo de evento? Esta ação removerá o tipo cadastrado."
        confirmText="Excluir Definitivamente"
        variant="danger"
        loading={deleteLoading}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => setTypeToDeleteId(null)}
      />
    </div>
  );
}
