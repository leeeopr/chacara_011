'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  User, 
  DollarSign, 
  Repeat, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Upload, 
  Image as ImageIcon,
  ShoppingCart,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  MaintenanceRecord, 
  PropertyRoom, 
  MaintenanceImage, 
  MaintenanceStatus,
  MAINTENANCE_PRIORITY_META, 
  MAINTENANCE_STATUS_META 
} from '@/lib/roomsMaintenanceTypes';
import { 
  updateMaintenanceRecord, 
  deleteMaintenanceRecord, 
  uploadMaintenanceImage, 
  deleteMaintenanceImage,
  getMaintenanceRecords
} from '@/services/roomsMaintenanceService';
import RoomIcon from './RoomIcon';

interface MaintenanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  maintenanceId: string;
  room?: PropertyRoom;
  onEdit: (maint: MaintenanceRecord) => void;
}

export default function MaintenanceDetailModal({
  isOpen,
  onClose,
  onSuccess,
  maintenanceId,
  room,
  onEdit
}: MaintenanceDetailModalProps) {
  const [maintenance, setMaintenance] = useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageStage, setActiveImageStage] = useState<'TODAS' | 'ANTES' | 'DURANTE' | 'DEPOIS'>('TODAS');
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && maintenanceId) {
      loadMaintenance();
    }
  }, [isOpen, maintenanceId]);

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const records = await getMaintenanceRecords();
      const found = records.find(r => r.id === maintenanceId);
      setMaintenance(found || null);
    } catch (e) {
      console.warn('Erro ao carregar detalhes da manutenção:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !maintenance) return null;

  const priorityMeta = MAINTENANCE_PRIORITY_META[maintenance.priority] || MAINTENANCE_PRIORITY_META.MEDIA;
  const statusMeta = MAINTENANCE_STATUS_META[maintenance.status] || MAINTENANCE_STATUS_META.IDENTIFICADA;

  const handleStatusChange = async (newStatus: MaintenanceStatus) => {
    try {
      await updateMaintenanceRecord(maintenance.id, { status: newStatus });
      await loadMaintenance();
      onSuccess();
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a manutenção "${maintenance.title}"?`)) return;
    try {
      await deleteMaintenanceRecord(maintenance.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erro ao excluir manutenção: ' + err.message);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, stage: 'ANTES' | 'DURANTE' | 'DEPOIS') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingStage(stage);
    try {
      await uploadMaintenanceImage(file, maintenance.id, stage);
      await loadMaintenance();
      onSuccess();
    } catch (err: any) {
      alert('Erro no upload da imagem: ' + (err.message || 'Falha'));
    } finally {
      setUploadingStage(null);
    }
  };

  const handleDeleteImage = async (imgId: string) => {
    if (!confirm('Deseja excluir esta foto?')) return;
    try {
      await deleteMaintenanceImage(imgId);
      await loadMaintenance();
      onSuccess();
    } catch (err: any) {
      alert('Erro ao remover foto: ' + err.message);
    }
  };

  const images = maintenance.images || [];
  const filteredImages = activeImageStage === 'TODAS'
    ? images
    : images.filter(img => img.stage === activeImageStage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${priorityMeta.badgeBg}`}>
              <Wrench size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${priorityMeta.badgeBg}`}>
                  {priorityMeta.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusMeta.badgeBg}`}>
                  {statusMeta.label}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">{maintenance.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(maintenance)}
              className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10"
              title="Editar manutenção"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/10"
              title="Excluir manutenção"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Status Bar */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Alterar Status Rápido</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(['IDENTIFICADA', 'PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] as MaintenanceStatus[]).map((st) => {
                  const meta = MAINTENANCE_STATUS_META[st];
                  const isCurrent = maintenance.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-[#FFD600] text-[#0A0F2C] shadow-lg shadow-[#FFD600]/20 font-black'
                          : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11px] text-white/50">Ambiente Vinculado</p>
              <p className="text-sm font-black text-[#FFD600]">{maintenance.room_name || room?.name || 'Geral'}</p>
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Responsável */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <User size={14} className="text-[#FFD600]" />
                <span>Responsável</span>
              </div>
              <p className="text-sm font-bold text-white">
                {maintenance.assigned_crew_name || 'Não atribuído'}
              </p>
            </div>

            {/* Prazo */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Calendar size={14} className="text-cyan-400" />
                <span>Prazo / Identificado</span>
              </div>
              <p className="text-sm font-bold text-white">
                {maintenance.due_date ? new Date(maintenance.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}
              </p>
              <p className="text-[10px] text-white/40">
                Criada em: {new Date(maintenance.identified_at + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>

            {/* Financeiro */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <DollarSign size={14} className="text-emerald-400" />
                <span>Custos</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-emerald-400">
                  R$ {(maintenance.actual_cost || 0).toFixed(2)}
                </span>
                {maintenance.estimated_cost > 0 && (
                  <span className="text-[11px] text-white/40 line-through">
                    Est: R$ {maintenance.estimated_cost.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {maintenance.description && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Descrição do Problema / Reparo</h3>
              <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">
                {maintenance.description}
              </p>
            </div>
          )}

          {/* Recurrence Details */}
          {maintenance.is_recurring && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Repeat size={20} className="text-cyan-400" />
                <div>
                  <p className="text-xs font-bold text-cyan-300">Manutenção Recorrente Programada</p>
                  <p className="text-[11px] text-white/60">
                    Periodicidade: <span className="font-bold text-white">{maintenance.recurrence_period}</span>
                    {maintenance.next_occurrence_date && ` • Próxima execução: ${new Date(maintenance.next_occurrence_date + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Linked Purchases & Materials */}
          {maintenance.purchases && maintenance.purchases.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-amber-400" />
                  <span>Materiais e Insumos Utilizados ({maintenance.purchases.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {maintenance.purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{purchase.product_name}</p>
                      <p className="text-[10px] text-white/40">{purchase.quantity} {purchase.unit} • {purchase.status}</p>
                    </div>
                    <span className="font-mono font-bold text-amber-300">
                      R$ {(purchase.paid_price || purchase.estimated_price || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Gallery (Antes / Durante / Depois) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#FFD600]" />
                  <span>Galeria de Fotos ({images.length})</span>
                </h3>
                <p className="text-[11px] text-white/40">Evidências organizadas por etapa do reparo</p>
              </div>

              {/* Upload buttons for each stage */}
              <div className="flex flex-wrap gap-2">
                {(['ANTES', 'DURANTE', 'DEPOIS'] as ('ANTES' | 'DURANTE' | 'DEPOIS')[]).map((stg) => (
                  <label
                    key={stg}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer transition-all border border-white/10 flex items-center gap-1"
                  >
                    <Upload size={11} className="text-[#FFD600]" />
                    <span>{uploadingStage === stg ? 'Enviando...' : `+ ${stg}`}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!!uploadingStage}
                      onChange={(e) => handleUploadImage(e, stg)}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Stage filter tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
              {(['TODAS', 'ANTES', 'DURANTE', 'DEPOIS'] as const).map((stageKey) => (
                <button
                  key={stageKey}
                  onClick={() => setActiveImageStage(stageKey)}
                  className={`text-xs font-bold pb-1 transition-all border-b-2 ${
                    activeImageStage === stageKey
                      ? 'text-[#FFD600] border-[#FFD600]'
                      : 'text-white/40 border-transparent hover:text-white'
                  }`}
                >
                  {stageKey} ({stageKey === 'TODAS' ? images.length : images.filter(i => i.stage === stageKey).length})
                </button>
              ))}
            </div>

            {/* Images Grid */}
            {filteredImages.length === 0 ? (
              <div className="text-center py-6 text-white/30 text-xs">
                Nenhuma foto cadastrada nesta categoria.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filteredImages.map((img) => (
                  <div key={img.id} className="relative rounded-xl overflow-hidden border border-white/10 group aspect-video bg-black/40">
                    <img src={img.photo_url} alt="Evidência" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="self-end p-1 bg-rose-600/90 text-white rounded-md hover:bg-rose-600"
                        title="Excluir foto"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span className="text-[10px] font-black text-[#FFD600] uppercase">
                        {img.stage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
