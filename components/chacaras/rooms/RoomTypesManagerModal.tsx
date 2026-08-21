'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Sparkles, 
  Layers, 
  Check, 
  Save 
} from 'lucide-react';
import { RoomType, RoomCategory } from '@/lib/roomsMaintenanceTypes';
import { getRoomTypes, createRoomType } from '@/services/roomsMaintenanceService';
import RoomIcon from './RoomIcon';

interface RoomTypesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTypeCreated: (newType: RoomType) => void;
}

const AVAILABLE_ICONS = [
  'DoorClosed', 'BedDouble', 'Bed', 'Bath', 'UtensilsCrossed', 'Utensils', 
  'Sofa', 'Flame', 'Waves', 'Trees', 'Sun', 'Maximize2', 'Car', 
  'Shirt', 'Laptop', 'Boxes', 'Cog', 'Gamepad2', 'Dog', 'Warehouse', 
  'Tv', 'Wind', 'Wrench', 'Shield', 'Sparkles'
];

const CATEGORIES: { value: RoomCategory; label: string }[] = [
  { value: 'DORMITORIO', label: 'Dormitório' },
  { value: 'SOCIAL', label: 'Área Social' },
  { value: 'LAZER', label: 'Lazer & Relaxamento' },
  { value: 'SERVICO', label: 'Serviço & Utilidades' },
  { value: 'EXTERNO', label: 'Área Externa' },
  { value: 'TECNICO', label: 'Técnico / Máquinas' },
  { value: 'GERAL', label: 'Geral' }
];

export default function RoomTypesManagerModal({
  isOpen,
  onClose,
  onTypeCreated
}: RoomTypesManagerModalProps) {
  const [types, setTypes] = useState<RoomType[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<RoomCategory>('GERAL');
  const [selectedIcon, setSelectedIcon] = useState('DoorClosed');
  const [color, setColor] = useState('#3B82F6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTypes();
    }
  }, [isOpen]);

  const loadTypes = async () => {
    try {
      const data = await getRoomTypes();
      setTypes(data);
    } catch (e) {
      console.warn(e);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome do tipo de ambiente.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const newType = await createRoomType({
        name: name.trim(),
        default_icon: selectedIcon,
        category,
        color
      });

      onTypeCreated(newType);
      setName('');
      loadTypes();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar tipo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Tipos de Ambientes</h2>
              <p className="text-xs text-white/50">Gerencie e cadastre novos tipos de cômodos para suas chácaras</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* New Custom Type Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold text-[#FFD600] uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} />
              <span>Criar Novo Tipo</span>
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">Nome do Tipo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Salão de Festas, Sauna Úmida, Adega..."
                className="w-full bg-black/30 border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#0D153A] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">Ícone</label>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/10 text-[#FFD600] border border-white/10 flex items-center justify-center">
                    <RoomIcon name={selectedIcon} size={18} />
                  </div>
                  <span className="text-xs text-white/70">{selectedIcon}</span>
                </div>
              </div>
            </div>

            {/* Select icon from grid */}
            <div>
              <label className="block text-[11px] font-bold text-white/60 mb-1.5">Escolher Ícone:</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-black/40 rounded-xl border border-white/10">
                {AVAILABLE_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      selectedIcon === iconName
                        ? 'bg-[#FFD600] text-[#0A0F2C] border-[#FFD600] scale-110'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/15 border-transparent'
                    }`}
                  >
                    <RoomIcon name={iconName} size={16} />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#FFD600]/20 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Adicionando...' : 'Adicionar Tipo'}</span>
            </button>
          </form>

          {/* Existing types list */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
              Tipos Existentes ({types.length})
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {types.map((t) => (
                <div
                  key={t.id}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-xs text-white/90"
                >
                  <div className="p-1.5 rounded-lg bg-white/10 text-[#FFD600]">
                    <RoomIcon name={t.default_icon} size={14} />
                  </div>
                  <div className="truncate">
                    <p className="font-bold truncate">{t.name}</p>
                    <p className="text-[10px] text-white/40">{t.category}</p>
                  </div>
                  {t.is_custom && (
                    <span className="ml-auto text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                      Novo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
