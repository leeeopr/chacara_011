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
  Save, 
  Upload, 
  Sparkles, 
  Plus, 
  Trash2, 
  ShoppingCart,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  MaintenanceRecord, 
  PropertyRoom, 
  MaintenancePriority, 
  MaintenanceStatus, 
  RecurrencePeriod,
  MAINTENANCE_PRIORITY_META,
  MAINTENANCE_STATUS_META
} from '@/lib/roomsMaintenanceTypes';
import { getCrewMembers } from '@/services/crewService';
import { getHousePurchases } from '@/services/purchasesService';
import { 
  createMaintenanceRecord, 
  updateMaintenanceRecord, 
  uploadMaintenanceImage 
} from '@/services/roomsMaintenanceService';
import { CrewMember } from '@/lib/chacaraTypes';
import { HousePurchase } from '@/lib/purchasesTypes';

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chacaraId: string;
  room: PropertyRoom;
  allRooms?: PropertyRoom[];
  maintenanceToEdit?: MaintenanceRecord | null;
}

export default function MaintenanceFormModal({
  isOpen,
  onClose,
  onSuccess,
  chacaraId,
  room,
  allRooms = [],
  maintenanceToEdit
}: MaintenanceFormModalProps) {
  const [selectedRoomId, setSelectedRoomId] = useState(room.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIA');
  const [status, setStatus] = useState<MaintenanceStatus>('IDENTIFICADA');
  const [dueDate, setDueDate] = useState('');
  const [assignedCrewId, setAssignedCrewId] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number>(0);
  
  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('MENSAL');
  const [customIntervalDays, setCustomIntervalDays] = useState<number>(30);
  
  // Integrations
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [availablePurchases, setAvailablePurchases] = useState<HousePurchase[]>([]);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  
  // Photos upload directly during creation/edit
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; stage: 'ANTES' | 'DURANTE' | 'DEPOIS'; preview: string }[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen, room, maintenanceToEdit]);

  const loadDependencies = async () => {
    try {
      const crew = await getCrewMembers();
      setCrewList(crew);

      const purchases = await getHousePurchases();
      setAvailablePurchases(purchases.filter(p => !p.chacara_id || p.chacara_id === chacaraId));

      if (maintenanceToEdit) {
        setSelectedRoomId(maintenanceToEdit.room_id || room.id);
        setTitle(maintenanceToEdit.title || '');
        setDescription(maintenanceToEdit.description || '');
        setPriority(maintenanceToEdit.priority || 'MEDIA');
        setStatus(maintenanceToEdit.status || 'IDENTIFICADA');
        setDueDate(maintenanceToEdit.due_date || '');
        setAssignedCrewId(maintenanceToEdit.assigned_crew_member_id || '');
        setEstimatedCost(maintenanceToEdit.estimated_cost || 0);
        setActualCost(maintenanceToEdit.actual_cost || 0);
        setIsRecurring(maintenanceToEdit.is_recurring || false);
        setRecurrencePeriod(maintenanceToEdit.recurrence_period || 'MENSAL');
        setCustomIntervalDays(maintenanceToEdit.recurrence_interval_days || 30);
        setSelectedPurchaseIds(maintenanceToEdit.purchase_ids || []);
      } else {
        setSelectedRoomId(room.id);
        setTitle('');
        setDescription('');
        setPriority('MEDIA');
        setStatus('IDENTIFICADA');
        setDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]); // 3 days default
        setAssignedCrewId('');
        setEstimatedCost(0);
        setActualCost(0);
        setIsRecurring(false);
        setRecurrencePeriod('MENSAL');
        setSelectedPurchaseIds([]);
        setPendingPhotos([]);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do formulário de manutenção:', e);
    }
  };

  if (!isOpen) return null;

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>, stage: 'ANTES' | 'DURANTE' | 'DEPOIS') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setPendingPhotos(prev => [...prev, { file, stage, preview }]);
  };

  const handleRemovePendingPhoto = (idx: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const togglePurchaseSelection = (purchaseId: string) => {
    setSelectedPurchaseIds(prev => 
      prev.includes(purchaseId) 
        ? prev.filter(id => id !== purchaseId)
        : [...prev, purchaseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe o título da manutenção.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const assignedCrew = crewList.find(c => c.id === assignedCrewId);

      let recordId = maintenanceToEdit?.id;

      if (maintenanceToEdit) {
        await updateMaintenanceRecord(maintenanceToEdit.id, {
          room_id: selectedRoomId,
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          due_date: dueDate || undefined,
          assigned_crew_member_id: assignedCrewId || undefined,
          assigned_crew_name: assignedCrew?.name || undefined,
          estimated_cost: Number(estimatedCost) || 0,
          actual_cost: Number(actualCost) || 0,
          is_recurring: isRecurring,
          recurrence_period: isRecurring ? recurrencePeriod : undefined,
          recurrence_interval_days: isRecurring && recurrencePeriod === 'PERSONALIZADA' ? customIntervalDays : undefined,
          sync_calendar: syncCalendar,
          purchase_ids: selectedPurchaseIds
        });
      } else {
        const created = await createMaintenanceRecord({
          chacara_id: chacaraId,
          room_id: selectedRoomId,
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          due_date: dueDate || undefined,
          assigned_crew_member_id: assignedCrewId || undefined,
          assigned_crew_name: assignedCrew?.name || undefined,
          estimated_cost: Number(estimatedCost) || 0,
          actual_cost: Number(actualCost) || 0,
          is_recurring: isRecurring,
          recurrence_period: isRecurring ? recurrencePeriod : undefined,
          recurrence_interval_days: isRecurring && recurrencePeriod === 'PERSONALIZADA' ? customIntervalDays : undefined,
          sync_calendar: syncCalendar,
          purchase_ids: selectedPurchaseIds
        });
        recordId = created.id;
      }

      // Upload any pending photos for this record
      if (recordId && pendingPhotos.length > 0) {
        for (const p of pendingPhotos) {
          try {
            await uploadMaintenanceImage(p.file, recordId, p.stage);
          } catch (imgErr) {
            console.warn('Erro ao salvar foto:', imgErr);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar manutenção.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${MAINTENANCE_PRIORITY_META[priority].badgeBg}`}>
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {maintenanceToEdit ? 'Editar Manutenção' : 'Nova Manutenção'}
              </h2>
              <p className="text-xs text-white/50">
                Ambiente: <span className="text-[#FFD600] font-bold">{room.name}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          {/* 1. Título & Ambiente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Título da Manutenção <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Trocar lâmpada LED, Limpar filtro da piscina, Trocar reparo da torneira..."
                className="w-full bg-white/5 border border-white/15 focus:border-[#FFD600] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder:text-white/30"
              />
            </div>

            {allRooms.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                  Ambiente
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-[#0D153A] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  {allRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.room_type_name})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Prioridade & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Prioridade
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as MaintenancePriority[]).map((p) => {
                  const meta = MAINTENANCE_PRIORITY_META[p];
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl text-[11px] font-black transition-all border ${
                        isSelected
                          ? `${meta.badgeBg} border-current ring-1 ring-white/20 shadow-md`
                          : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Status Atual
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#0D153A] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                {(['IDENTIFICADA', 'PLANEJADA', 'AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] as MaintenanceStatus[]).map((s) => (
                  <option key={s} value={s}>{MAINTENANCE_STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Responsável da Equipe & Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-[#FFD600]" />
                <span>Responsável da Equipe</span>
              </label>
              <select
                value={assignedCrewId}
                onChange={(e) => setAssignedCrewId(e.target.value)}
                className="w-full bg-[#0D153A] border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="">-- Não atribuído / Externo --</option>
                {crewList.map((crew) => (
                  <option key={crew.id} value={crew.id}>
                    {crew.name} ({crew.role || 'Equipe'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#FFD600]" />
                <span>Prazo / Data Prevista</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white/5 border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Descrição detalhada */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Descrição do Problema / Instruções
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes do reparo, ferramentas necessárias ou observações importantes..."
              className="w-full bg-white/5 border border-white/15 focus:border-[#FFD600] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none placeholder:text-white/30 resize-none"
            />
          </div>

          {/* 5. Custos (Estimado e Real) */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-400" />
              <span>Controle Financeiro</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Custo Estimado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedCost || ''}
                  onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-black/30 border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Custo Real Executado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualCost || ''}
                  onChange={(e) => setActualCost(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-black/30 border border-white/15 focus:border-[#FFD600] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 6. Recorrência Idempotente */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={16} className="text-cyan-400" />
                <label className="text-xs font-bold text-white/90 cursor-pointer" htmlFor="recurring-toggle">
                  Manutenção Recorrente / Preventiva
                </label>
              </div>
              <input
                id="recurring-toggle"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-[#FFD600] focus:ring-0 focus:ring-offset-0 bg-white/10 border-white/20"
              />
            </div>

            {isRecurring && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-white/60 mb-1">Periodicidade</label>
                  <select
                    value={recurrencePeriod}
                    onChange={(e) => setRecurrencePeriod(e.target.value as any)}
                    className="w-full bg-[#0D153A] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="SEMANAL">Semanal (a cada 7 dias)</option>
                    <option value="QUINZENAL">Quinzenal (a cada 15 dias)</option>
                    <option value="MENSAL">Mensal (a cada 30 dias)</option>
                    <option value="BIMESTRAL">Bimestral (a cada 2 meses)</option>
                    <option value="TRIMESTRAL">Trimestral (a cada 3 meses)</option>
                    <option value="SEMESTRAL">Semestral (a cada 6 meses)</option>
                    <option value="ANUAL">Anual (a cada 1 ano)</option>
                    <option value="PERSONALIZADA">Personalizada (dias customizados)</option>
                  </select>
                </div>

                {recurrencePeriod === 'PERSONALIZADA' && (
                  <div>
                    <label className="block text-[11px] font-bold text-white/60 mb-1">Intervalo em Dias</label>
                    <input
                      type="number"
                      min="1"
                      value={customIntervalDays}
                      onChange={(e) => setCustomIntervalDays(parseInt(e.target.value) || 30)}
                      className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7. Vínculo de Compras & Materiais */}
          {availablePurchases.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <h3 className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart size={14} className="text-amber-400" />
                <span>Materiais e Insumos Vinculados ({selectedPurchaseIds.length})</span>
              </h3>
              <p className="text-[11px] text-white/40">
                Selecione compras já cadastradas na chácara que pertencem a este reparo:
              </p>

              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {availablePurchases.map((purchase) => {
                  const isSelected = selectedPurchaseIds.includes(purchase.id);
                  return (
                    <div
                      key={purchase.id}
                      onClick={() => togglePurchaseSelection(purchase.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/50 text-white'
                          : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-amber-500 bg-black/40 border-white/20"
                        />
                        <span className="font-bold">{purchase.product_name}</span>
                        {purchase.quantity && <span className="text-[10px] text-white/40">({purchase.quantity} {purchase.unit || 'un'})</span>}
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        R$ {(purchase.paid_price || purchase.estimated_price || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. Fotos e Evidências (Antes, Durante, Depois) */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} className="text-[#FFD600]" />
              <span>Fotos da Manutenção (Antes / Durante / Depois)</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {(['ANTES', 'DURANTE', 'DEPOIS'] as ('ANTES' | 'DURANTE' | 'DEPOIS')[]).map((stg) => (
                <label
                  key={stg}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer transition-all border border-white/15 flex items-center gap-1.5"
                >
                  <Plus size={13} className="text-[#FFD600]" />
                  <span>+ Foto {stg}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAddPhoto(e, stg)}
                    className="hidden"
                  />
                </label>
              ))}
            </div>

            {pendingPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {pendingPhotos.map((p, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 group">
                    <img src={p.preview} alt="Foto" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-bold text-center py-0.5 text-[#FFD600]">
                      {p.stage}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingPhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 9. Opção Sincronizar com Calendário Operacional */}
          <div className="flex items-center gap-2 text-xs text-white/80">
            <input
              id="sync-calendar"
              type="checkbox"
              checked={syncCalendar}
              onChange={(e) => setSyncCalendar(e.target.checked)}
              className="w-4 h-4 rounded text-[#FFD600] focus:ring-0 bg-white/10 border-white/20"
            />
            <label htmlFor="sync-calendar" className="cursor-pointer">
              Sincronizar automaticamente no Calendário Operacional de Serviços da Chácara
            </label>
          </div>

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
              disabled={saving}
              className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-[#FFD600]/20 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? 'Salvando...' : maintenanceToEdit ? 'Atualizar Manutenção' : 'Salvar Manutenção'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
