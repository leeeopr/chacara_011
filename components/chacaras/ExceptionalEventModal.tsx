'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  AlertTriangle, 
  Building2, 
  Check, 
  Trash2, 
  Flag, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import { 
  ExceptionalEvent, 
  createExceptionalEvent, 
  updateExceptionalEvent, 
  deleteExceptionalEvent 
} from '@/services/exceptionalEventsService';
import { getChacaras } from '@/services/chacarasService';
import { getCrewMembers } from '@/services/crewService';
import { Chacara, CrewMember } from '@/lib/chacaraTypes';

interface ExceptionalEventModalProps {
  isOpen: boolean;
  eventToEdit?: ExceptionalEvent | null;
  initialDate?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExceptionalEventModal({
  isOpen,
  eventToEdit,
  initialDate,
  onClose,
  onSuccess
}: ExceptionalEventModalProps) {
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [allDay, setAllDay] = useState(false);
  const [chacaraId, setChacaraId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [priority, setPriority] = useState<'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');
  const [status, setStatus] = useState<'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'>('PENDENTE');

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      setShowConfirmDelete(false);
      setErrorMsg(null);

      if (eventToEdit) {
        setTitle(eventToEdit.title || '');
        setDescription(eventToEdit.description || '');
        setEventDate(eventToEdit.event_date || initialDate || new Date().toISOString().split('T')[0]);
        setStartTime(eventToEdit.start_time || '08:00');
        setEndTime(eventToEdit.end_time || '09:00');
        setAllDay(Boolean(eventToEdit.all_day));
        setChacaraId(eventToEdit.chacara_id || '');
        setResponsibleId(eventToEdit.responsible_id || '');
        setPriority(eventToEdit.priority || 'NORMAL');
        setStatus(eventToEdit.status || 'PENDENTE');
      } else {
        setTitle('');
        setDescription('');
        setEventDate(initialDate || new Date().toISOString().split('T')[0]);
        setStartTime('08:00');
        setEndTime('09:00');
        setAllDay(false);
        setChacaraId('');
        setResponsibleId('');
        setPriority('NORMAL');
        setStatus('PENDENTE');
      }
    }
  }, [isOpen, eventToEdit, initialDate]);

  const loadDependencies = async () => {
    try {
      const [cList, mList] = await Promise.all([
        getChacaras(),
        getCrewMembers()
      ]);
      setChacaras(cList || []);
      setCrewMembers(mList || []);
    } catch (err) {
      console.warn('Erro ao carregar lista de chácaras ou responsáveis:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Informe o título do evento.');
      return;
    }
    if (!eventDate) {
      setErrorMsg('Informe a data do evento.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const selChacara = chacaras.find(c => c.id === chacaraId);
    const selCrew = crewMembers.find(m => m.id === responsibleId);

    const crewName = selCrew?.nome || selCrew?.name || '';
    const cleanRespName = crewName ? crewName.replace(/\s*\([^)]*\)/, '').trim() : '';

    const payload = {
      title: title.trim(),
      description: description.trim(),
      event_date: eventDate,
      start_time: allDay ? '00:00' : startTime,
      end_time: allDay ? '23:59' : endTime,
      all_day: allDay,
      chacara_id: chacaraId || null,
      chacara_nome: selChacara?.name || '',
      responsible_id: responsibleId || null,
      responsible_name: cleanRespName,
      priority,
      status
    };

    try {
      if (eventToEdit) {
        await updateExceptionalEvent(eventToEdit.id, payload);
      } else {
        await createExceptionalEvent(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar evento excepcional.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit) return;
    setLoading(true);
    try {
      await deleteExceptionalEvent(eventToEdit.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao excluir evento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0B0F19] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-950/40 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {eventToEdit ? 'Editar Evento Excepcional' : 'Novo Evento Excepcional'}
              </h3>
              <p className="text-xs text-red-300/70">
                Aviso importante fora da rotina do sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-500/20 border border-red-500/40 text-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Título do Evento *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Dedetização da chácara, Visita do proprietário..."
              className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder:text-white/30"
            />
          </div>

          {/* Data e Dia Inteiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-red-400" /> Data *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={e => setAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-zinc-900 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                />
                <span className="text-xs font-medium text-white/90">Evento de Dia Inteiro</span>
              </label>
            </div>
          </div>

          {/* Horários (se não for dia inteiro) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
              <div>
                <label className="block text-[11px] text-white/70 mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-cyan-400" /> Horário Inicial
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/70 mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-cyan-400" /> Horário Final
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}

          {/* Chácara & Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                <Building2 size={13} className="text-emerald-400" /> Chácara Relacionada
              </label>
              <select
                value={chacaraId}
                onChange={e => setChacaraId(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
              >
                <option value="">Nenhuma / Geral (Todas)</option>
                {chacaras.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                <User size={13} className="text-sky-400" /> Responsável (Usuário Real)
              </label>
              <select
                value={responsibleId}
                onChange={e => setResponsibleId(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
              >
                <option value="">Selecione um responsável...</option>
                {crewMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome || m.name} {m.role ? `(${m.role})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prioridade & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                <Flag size={13} className="text-amber-400" /> Prioridade
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
              >
                <option value="BAIXA">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-purple-400" /> Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
              >
                <option value="PENDENTE">Pendente</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Descrição / Observações */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-white/60" /> Descrição e Observações
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes sobre a visita, instruções adicionais, equipamentos, etc."
              className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-red-500 transition-colors placeholder:text-white/30 resize-none"
            />
          </div>

          {/* Delete confirmation box if user clicks Excluir */}
          {showConfirmDelete && (
            <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-2xl space-y-3 animate-fadeIn">
              <p className="text-xs font-bold text-red-200">
                Tem certeza que deseja excluir este evento?
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  {loading ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div>
              {eventToEdit && !showConfirmDelete && (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} /> Excluir Evento
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-colors"
              >
                <Check size={15} />
                <span>{loading ? 'Salvando...' : 'Salvar Evento'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
