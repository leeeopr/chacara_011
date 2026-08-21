'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  DoorClosed, 
  Upload, 
  Sparkles, 
  Plus, 
  Save, 
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { PropertyRoom, RoomType, RoomStatus } from '@/lib/roomsMaintenanceTypes';
import { 
  getRoomTypes, 
  createPropertyRoom, 
  updatePropertyRoom, 
  uploadRoomPhoto 
} from '@/services/roomsMaintenanceService';
import RoomIcon from './RoomIcon';

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chacaraId: string;
  roomToEdit?: PropertyRoom | null;
  onOpenRoomTypesManager: () => void;
}

export default function RoomFormModal({
  isOpen,
  onClose,
  onSuccess,
  chacaraId,
  roomToEdit,
  onOpenRoomTypesManager
}: RoomFormModalProps) {
  const [types, setTypes] = useState<RoomType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('DoorClosed');
  const [photoUrl, setPhotoUrl] = useState('');
  const [status, setStatus] = useState<RoomStatus>('OPERACIONAL');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
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

      if (roomToEdit) {
        setName(roomToEdit.name || '');
        setDescription(roomToEdit.description || '');
        setIcon(roomToEdit.icon || 'DoorClosed');
        setPhotoUrl(roomToEdit.photo_url || '');
        setStatus(roomToEdit.status || 'OPERACIONAL');
        setSelectedTypeId(roomToEdit.room_type_id || (data.find(t => t.name === roomToEdit.room_type_name)?.id || ''));
      } else {
        // Default to first type (Quarto)
        const defaultType = data[0];
        if (defaultType) {
          setSelectedTypeId(defaultType.id);
          setIcon(defaultType.default_icon);
          setName(defaultType.name);
        }
        setDescription('');
        setPhotoUrl('');
        setStatus('OPERACIONAL');
      }
    } catch (e) {
      console.warn('Erro ao carregar tipos de ambiente:', e);
    }
  };

  if (!isOpen) return null;

  const handleTypeSelect = (t: RoomType) => {
    setSelectedTypeId(t.id);
    setIcon(t.default_icon);
    // If creating new and name matches another standard type or is empty, auto-fill with selected type name
    if (!roomToEdit || !name.trim() || types.some(tp => tp.name === name)) {
      setName(t.name);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const url = await uploadRoomPhoto(file, chacaraId);
      setPhotoUrl(url);
    } catch (err: any) {
      alert('Erro ao enviar foto: ' + (err.message || 'Falha no upload'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor, informe o nome do ambiente.');
      return;
    }

    setSaving(true);
    try {
      const selectedType = types.find(t => t.id === selectedTypeId);

      if (roomToEdit) {
        await updatePropertyRoom(roomToEdit.id, {
          name: name.trim(),
          room_type_id: selectedTypeId || undefined,
          room_type_name: selectedType?.name || roomToEdit.room_type_name || 'Outro',
          description: description.trim(),
          icon: icon || selectedType?.default_icon || 'DoorClosed',
          photo_url: photoUrl,
          status: status
        });
      } else {
        await createPropertyRoom({
          chacara_id: chacaraId,
          name: name.trim(),
          room_type_id: selectedTypeId || undefined,
          room_type_name: selectedType?.name || 'Outro',
          description: description.trim(),
          icon: icon || selectedType?.default_icon || 'DoorClosed',
          photo_url: photoUrl,
          status: status
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cômodo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD600] p-2.5 rounded-xl text-[#0A0F2C]">
              <RoomIcon name={icon} size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {roomToEdit ? 'Editar Ambiente' : 'Novo Ambiente'}
              </h2>
              <p className="text-xs text-white/50">
                Cadastre cômodos ou espaços como quartos, piscina, cozinha, área externa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          {/* 1. Escolher Tipo do Ambiente (Visual Airbnb Grid) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                1. Escolha o Tipo de Espaço
              </label>
              <button
                type="button"
                onClick={onOpenRoomTypesManager}
                className="text-[11px] font-bold text-[#FFD600] hover:underline flex items-center gap-1"
              >
                <Plus size={12} />
                <span>+ Criar tipo personalizado</span>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 bg-black/20 rounded-2xl border border-white/10">
              {types.map((t) => {
                const isSelected = selectedTypeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeSelect(t)}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-[#FFD600] text-[#0A0F2C] font-black shadow-lg shadow-[#FFD600]/20 ring-2 ring-[#FFD600]'
                        : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <RoomIcon name={t.default_icon} size={20} className={isSelected ? 'text-[#0A0F2C]' : 'text-[#FFD600]'} />
                    <span className="text-[11px] line-clamp-1">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Nome do Cômodo */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              2. Nome do Ambiente <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Quarto 1, Suíte Master, Piscina Aquecida..."
              className="w-full bg-white/5 border border-white/15 focus:border-[#FFD600] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-white/30"
            />
          </div>

          {/* 3. Foto Real (Opcional - Supabase Storage) */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              3. Foto Real do Espaço (Opcional)
            </label>
            
            <div className="flex items-center gap-4">
              <div className="w-24 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white/30 flex flex-col items-center">
                    <ImageIcon size={24} />
                    <span className="text-[9px] mt-1">Sem foto</span>
                  </div>
                )}
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 rounded-md text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer transition-all border border-white/15">
                  <Upload size={14} className="text-[#FFD600]" />
                  <span>{isUploadingPhoto ? 'Enviando foto...' : 'Enviar Foto do Ambiente'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-white/40">
                  Fotos reais trazem maior clareza para a equipe e manutenções da chácara.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Descrição Opcional */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Descrição ou Características (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Cama king, ar-condicionado 12000 BTUs, banheiro com chuveiro elétrico duplo..."
              className="w-full bg-white/5 border border-white/15 focus:border-[#FFD600] rounded-xl px-4 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-white/30 resize-none"
            />
          </div>

          {/* 5. Status do Ambiente */}
          {roomToEdit && (
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Condição do Ambiente
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
                className="w-full bg-[#0D153A] border border-white/15 focus:border-[#FFD600] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
              >
                <option value="OPERACIONAL">Operacional / Liberado</option>
                <option value="MANUTENCAO_NECESSARIA">Manutenção Necessária</option>
                <option value="INTERDITADO">Interditado</option>
                <option value="EM_REFORMA">Em Reforma</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || isUploadingPhoto}
              className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-[#FFD600]/20 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? 'Salvando...' : roomToEdit ? 'Atualizar Ambiente' : 'Salvar Ambiente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
