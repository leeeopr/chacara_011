'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, User, Phone, UserRound, CalendarCheck, RefreshCw, Users, UserPlus, Search, Building2, DollarSign, CornerDownRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { UserProfile, AppointmentStatus, Appointment, Patient, AppointmentType, Company } from '@/lib/types';
import { companiesService } from '@/services/companiesService';
import { companyPricesService } from '@/services/companyPricesService';
import { billingsService } from '@/services/billingsService';
import { useAuth } from '@/contexts/AuthContext';
import DeleteModal from './DeleteModal';
import PatientAutocomplete from './PatientAutocomplete';

const calculateEndTime = (startTime: string, durationMinutes: number) => {
  if (!startTime || !durationMinutes) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment?: Appointment; // Para edição
}

export default function AppointmentModal({ isOpen, onClose, onSuccess, appointment }: AppointmentModalProps) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [entryMode, setEntryMode] = useState<'existing' | 'manual'>(appointment?.patient_id ? 'existing' : 'manual');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(appointment?.patient_id?.toString() || '');
  
  const handleProlongar = async () => {
    if (!appointment) return;
    if (appointment.is_prolonged) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ is_prolonged: true })
        .eq('id', appointment.id);

      if (error) throw error;

      const pName = appointment.patients?.full_name || appointment.patient_name || 'Paciente';
      window.dispatchEvent(new CustomEvent('appointment-prolonged', { detail: { name: pName } }));
      window.dispatchEvent(new CustomEvent('appointment-updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao prolongar consulta:', err);
      alert('Erro ao marcar consulta como prolongada: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const [continuations, setContinuations] = useState<any[]>([]);
  const [cancelAllContinuations, setCancelAllContinuations] = useState(false);
  const [parentAppointment, setParentAppointment] = useState<any | null>(null);

  useEffect(() => {
    const fetchContinuations = async () => {
      if (!appointment?.id) {
        setContinuations([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, appointment_date, start_time, end_time, status, is_continuation, parent_appointment_id, continuation_notes')
          .eq('parent_appointment_id', appointment.id);
        
        if (error) {
          if (error.code === '42703' || error.message?.includes('parent_appointment_id')) {
            setContinuations([]);
            return;
          }
          throw error;
        }
        setContinuations(data || []);
      } catch (err) {
        console.error('Error fetching continuations:', err);
      }
    };

    fetchContinuations();
  }, [appointment]);

  useEffect(() => {
    const fetchParentAppointment = async () => {
      if (!appointment?.is_continuation || !appointment?.parent_appointment_id) {
        setParentAppointment(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, appointment_date, start_time')
          .eq('id', appointment.parent_appointment_id)
          .single();
        if (error) {
          console.warn('Error fetching parent appointment:', error);
          return;
        }
        setParentAppointment(data);
      } catch (err) {
        console.error('Error in fetchParentAppointment:', err);
      }
    };

    fetchParentAppointment();
  }, [appointment]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, typesRes, companiesData] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name')
            .in('role', ['FONO', 'DONA']),
          supabase
            .from('appointment_types')
            .select('*')
            // Show active types OR the current type if editing
            .or(`is_active.eq.true${appointment?.appointment_type_id ? `,id.eq.${appointment.appointment_type_id}` : ''}`)
            .order('name'),
          companiesService.getActiveCompanies()
        ]);
        
        if (profRes.data) setProfessionals(profRes.data as UserProfile[]);
        if (typesRes.data) setAppointmentTypes(typesRes.data as AppointmentType[]);
        if (companiesData) setCompanies(companiesData);
        
        if (profRes.error) console.warn('Busca de profissionais no modal finalizada:', profRes.error.message);
        if (typesRes.error) console.warn('Busca de tipos de consulta no modal finalizada:', typesRes.error.message);
      } catch (error: any) {
        console.warn('Busca de dados do modal finalizada:', error?.message || error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, appointment?.appointment_type_id]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  const getInitialState = useCallback(() => ({
    patient_id: appointment?.patient_id || null,
    patient_name: appointment?.patient_name || '',
    data_nascimento: appointment?.birth_date || appointment?.patients?.birth_date || '',
    whatsapp: appointment?.whatsapp || (appointment?.patients?.whatsapp) || '',
    fono_id: appointment?.fono_id?.toString() || (profile?.role === 'FONO' ? profile.id : ''),
    appointment_date: appointment?.appointment_date || '',
    start_time: appointment?.start_time || '',
    appointment_type_id: appointment?.appointment_type_id || '',
    status: appointment?.status || 'PENDENTE' as AppointmentStatus,
    patient_category: appointment?.patients?.category || '',
    treatment_enabled: appointment?.treatment_enabled || false,
    treatment_total_sessions: appointment?.treatment_total_sessions ?? null,
    treatment_session_number: appointment?.treatment_session_number ?? null,
    billing_company_id: appointment?.billing_company_id || null,
    agreed_price: appointment?.agreed_price ?? null,
    discount_value: appointment?.discount_value ?? 0,
    price_source: appointment?.price_source ?? null,
  }), [appointment, profile]);

  const [formData, setFormData] = useState(getInitialState());

  // Handle automatic type changes
  const handleTypeChange = (typeId: string) => {
    const type = appointmentTypes.find(t => t.id === typeId);
    setFormData(prev => ({
      ...prev,
      appointment_type_id: typeId,
      // Recalculate end_time logic happens in render for display, 
      // but if we had a field we would update it here.
    }));
  };

  // Reset form state when modal opens (using the "update state during render" pattern)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setFormData(getInitialState());
      setEntryMode(appointment?.patient_id ? 'existing' : 'manual');
      setSelectedPatientId(appointment?.patient_id?.toString() || '');
      setLoading(false);
    }
  }

  // ETAPA 6: Ao criar consulta, identificar de forma reativa a empresa e tipo, buscando o preço correspondente
  useEffect(() => {
    const fetchAndSetPrice = async () => {
      // If price has been overridden manually, do not overwrite it automatically
      if (formData.price_source === 'MANUAL_OVERRIDE') return;
      // Only auto-resolve for NEW appointments OR if agreed_price becomes null
      if (appointment && formData.agreed_price !== null && formData.price_source !== null) return;
      if (!formData.appointment_type_id) return;

      try {
        const result = await companyPricesService.getPriceForAppointment(
          formData.billing_company_id,
          formData.appointment_type_id
        );

        if (result) {
          setFormData(prev => ({
            ...prev,
            agreed_price: result.price,
            price_source: result.source
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            agreed_price: 0,
            price_source: 'DEFAULT_PRICE'
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar preço:', err);
      }
    };

    if (isOpen) {
      fetchAndSetPrice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.billing_company_id, formData.appointment_type_id, appointment, isOpen, formData.price_source]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canEdit = !appointment || profile?.role !== 'FONO' || appointment.fono_id === profile.id;

  const selectedType = appointmentTypes.find(t => t.id === formData.appointment_type_id);
  const calculatedEndTime = calculateEndTime(formData.start_time, selectedType?.duration_minutes || 0);

  const handleModeChange = (mode: 'existing' | 'manual') => {
    setEntryMode(mode);
    if (mode === 'manual') {
      setFormData(prev => ({
        ...prev,
        patient_id: null,
        patient_name: '',
        whatsapp: '',
        data_nascimento: '',
        fono_id: '',
        patient_category: ''
      }));
      setSelectedPatientId('');
    } else {
      setFormData(prev => ({
        ...prev,
        patient_id: null,
        patient_name: '',
        whatsapp: '',
        data_nascimento: '',
        fono_id: '',
        patient_category: ''
      }));
      setSelectedPatientId('');
    }
  };

  const handlePatientSelect = (patient: Patient | null) => {
    if (patient) {
      setSelectedPatientId(patient.id?.toString() || '');
      setFormData(prev => ({
        ...prev,
        patient_id: patient.id || null,
        patient_name: patient.full_name,
        whatsapp: patient.whatsapp,
        data_nascimento: patient.birth_date || '',
        fono_id: patient.fono_id?.toString() || prev.fono_id,
        patient_category: patient.category || '',
        billing_company_id: patient.company_id || null,
      }));
    } else {
      setSelectedPatientId('');
      setFormData(prev => ({
        ...prev,
        patient_id: null,
        patient_name: '',
        whatsapp: '',
        data_nascimento: '',
        fono_id: '',
        patient_category: '',
        billing_company_id: null,
      }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setFormData(prev => ({
      ...prev,
      appointment_date: newDate,
      status: appointment ? 'PENDENTE' : prev.status
    }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setFormData(prev => ({
      ...prev,
      start_time: newTime,
      status: appointment ? 'PENDENTE' : prev.status
    }));
  };

  const handleDelete = async () => {
    if (!appointment?.id) return;
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setIsDeleteModalOpen(false);
    onSuccess();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.treatment_enabled) {
        const total = formData.treatment_total_sessions;
        const current = formData.treatment_session_number;
        if (total === null || total === undefined || isNaN(total) || current === null || current === undefined || isNaN(current)) {
          alert('Por favor, preencha o número da sessão atual e o total de sessões.');
          setLoading(false);
          return;
        }
        if (current < 1) {
          alert('A sessão atual deve ser igual ou maior que 1.');
          setLoading(false);
          return;
        }
        if (total < 1) {
          alert('O total de sessões do tratamento deve ser igual ou maior que 1.');
          setLoading(false);
          return;
        }
        if (current > total) {
          alert('A sessão atual não pode ser maior que o total de sessões do tratamento.');
          setLoading(false);
          return;
        }
      }

      const cleanPhone = formData.whatsapp.replace(/\D/g, '');

      const payload = {
        patient_id: formData.patient_id,
        patient_name: formData.patient_name,
        whatsapp: cleanPhone,
        birth_date: formData.data_nascimento || null,
        fono_id: formData.fono_id || null,
        appointment_date: formData.appointment_date,
        start_time: formData.start_time,
        appointment_type_id: formData.appointment_type_id || null,
        status: formData.status,
        makeup_status: appointment?.makeup_status || (formData.status === 'FALTOU' ? 'PENDENTE' : null),
        linked_to_absence_id: appointment?.linked_to_absence_id || null,
        treatment_enabled: formData.treatment_enabled,
        treatment_total_sessions: formData.treatment_enabled ? Number(formData.treatment_total_sessions) : null,
        treatment_session_number: formData.treatment_enabled ? Number(formData.treatment_session_number) : null,
        billing_company_id: formData.billing_company_id,
        agreed_price: formData.agreed_price,
        discount_value: formData.discount_value,
        price_source: formData.price_source,
      };

      if (payload.fono_id) {
        // We need a time helper to convert HH:mm to minutes
        const timeToMinutes = (time: string) => {
          const [h, m] = time.split(':').map(Number);
          return h * 60 + m;
        };

        const selectedType = appointmentTypes.find(t => t.id === formData.appointment_type_id);
        const newStart = timeToMinutes(payload.start_time);
        const newDuration = selectedType?.duration_minutes || 30;
        const newEnd = newStart + newDuration;

        // 1. Check for professional Schedule Blocks (blocked hours - advanced rules)
        try {
          const { data: scheduleBlocks, error: blockErr } = await supabase
            .from('schedule_blocks')
            .select('*')
            .eq('fono_id', payload.fono_id);
          
          if (!blockErr && scheduleBlocks && scheduleBlocks.length > 0) {
            // Calculate app date and weekday (using local parsing T00:00:00 to keep same date offset)
            const appDateStr = payload.appointment_date;
            const parsedAppDate = new Date(`${appDateStr}T00:00:00`);
            const appDayOfWeek = parsedAppDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

            const blockedItem = scheduleBlocks.find(block => {
              const blockStart = timeToMinutes(block.start_time);
              const blockEnd = timeToMinutes(block.end_time);

              // Overlap condition checks block hours first
              const timeOverlap = (newStart < blockEnd) && (newEnd > blockStart);
              if (!timeOverlap) return false;

              const mode = block.block_mode || 'single_day';

              switch (mode) {
                case 'single_day': {
                  const targetDate = block.start_date || block.block_date;
                  return targetDate === appDateStr;
                }
                case 'continuous_period': {
                  if (!block.start_date || !block.end_date) return false;
                  return appDateStr >= block.start_date && appDateStr <= block.end_date;
                }
                case 'weekly_recurring': {
                  if (!block.weekdays || !Array.isArray(block.weekdays)) return false;
                  return block.weekdays.includes(appDayOfWeek);
                }
                case 'weekly_within_period': {
                  if (!block.start_date || !block.end_date || !block.weekdays || !Array.isArray(block.weekdays)) return false;
                  const dateInRange = appDateStr >= block.start_date && appDateStr <= block.end_date;
                  return dateInRange && block.weekdays.includes(appDayOfWeek);
                }
                default:
                  return false;
              }
            });

            if (blockedItem) {
              const blockExplanation = 
                blockedItem.block_mode === 'continuous_period' ? 'bloqueio de período contínuo' :
                blockedItem.block_mode === 'weekly_recurring' ? 'bloqueio recorrente de dia de semana' :
                blockedItem.block_mode === 'weekly_within_period' ? 'bloqueio semanal programado para este período' :
                'bloqueio de data pontual';

              alert(`Este horário está impedido para agendamento por um ${blockExplanation}. Motivo: "${blockedItem.reason || 'Bloqueio de Agenda'}"`);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Tabela schedule_blocks não encontrada ou erro ao consultar. Continuando agendamento...', err);
        }

        // 2. Fetch all appointments for the professional on this date to check for overlaps
        let query = supabase
          .from('appointments')
          .select('id, start_time, end_time, appointment_type_id, appointment_types(duration_minutes)')
          .eq('fono_id', payload.fono_id)
          .eq('appointment_date', payload.appointment_date)
          .neq('status', 'CANCELADO');

        if (appointment) {
          query = query.neq('id', appointment.id);
        }

        const { data: existingAppointments, error: conflictError } = await query;
        if (conflictError) throw conflictError;

        if (existingAppointments && existingAppointments.length > 0) {
          const hasOverlap = existingAppointments.some(app => {
            const appStart = timeToMinutes(app.start_time);
            // Handling appointment_types which might return as an array in Supabase joins
            const appTypeData = Array.isArray(app.appointment_types) 
              ? app.appointment_types[0] 
              : (app.appointment_types as any);
            
            const appDuration = appTypeData?.duration_minutes || 30;
            
            // Prefer stored end_time but fallback to calculated if needed
            // This ensures robustness even if DB trigger had issues
            const appEnd = app.end_time ? timeToMinutes(app.end_time) : (appStart + appDuration);
            
            // Overlap condition: (StartA < EndB) and (EndA > StartB)
            return (newStart < appEnd) && (newEnd > appStart);
          });

          if (hasOverlap) {
            alert("Já existe consulta que sobrepõe este horário para essa profissional");
            setLoading(false);
            return;
          }
        }
      }

      let error;
      let savedId = appointment?.id;
      if (appointment) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', appointment.id);
        error = updateError;
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('appointments')
          .insert([payload])
          .select();
        error = insertError;
        if (insertedData && insertedData[0]) {
          savedId = insertedData[0].id;
        }
      }

      if (error && (error.code === '42703' || error.message?.includes('makeup_status') || error.message?.includes('linked_to_absence_id'))) {
        console.warn('makeup_status or linked_to_absence_id missing on table appointments. Retrying without those columns...');
        const fallbackPayload = { ...payload };
        delete (fallbackPayload as any).makeup_status;
        delete (fallbackPayload as any).linked_to_absence_id;

        if (appointment) {
          const { error: retryUpdateError } = await supabase
            .from('appointments')
            .update(fallbackPayload)
            .eq('id', appointment.id);
          error = retryUpdateError;
        } else {
          const { data: insertedData2, error: retryInsertError } = await supabase
            .from('appointments')
            .insert([fallbackPayload])
            .select();
          error = retryInsertError;
          if (insertedData2 && insertedData2[0]) {
            savedId = insertedData2[0].id;
          }
        }
      }

      if (error) throw error;

      if (appointment && cancelAllContinuations && payload.status === 'CANCELADO') {
        try {
          const { error: cancelContError } = await supabase
            .from('appointments')
            .update({ status: 'CANCELADO' })
            .eq('parent_appointment_id', appointment.id);
          if (cancelContError) {
            console.error('Error cancelling continuations:', cancelContError);
          }
        } catch (err) {
          console.error('Error executing continuation cancel:', err);
        }
      }

      if (savedId) {
        try {
          await billingsService.syncBillingForAppointment(String(savedId));
        } catch (e) {
          console.error('Error syncing billing:', e);
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar consulta:', JSON.stringify(error, null, 2));
      if (error.code === '42703' || error.code === 'PGRST204') {
        alert('Erro de banco de dados: Algumas colunas não foram encontradas. Por favor, execute o SQL de migração (fix_tables_schema.sql).');
      } else {
        alert('Erro ao salvar consulta: ' + (error.message || 'Erro desconhecido. Verifique se o paciente e o profissional estão corretos.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl relative flex flex-col max-h-[90dvh]"
          >
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
                  {appointment && appointment.status === 'CANCELADO' ? (
                    <RefreshCw size={20} className="text-[#FFD600] animate-spin-slow" />
                  ) : (
                    <CalendarCheck size={20} className="text-[#FFD600]" />
                  )}
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {appointment ? (appointment.status === 'CANCELADO' ? 'Reagendar' : 'Editar') : 'Nova Consulta'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar min-h-0">
                {!canEdit && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold uppercase tracking-widest">
                    <X size={16} />
                    Somente a profissional responsável pode editar esta consulta.
                  </div>
                )}
                {/* Entry Mode Toggle */}
                {!appointment && (
                  <div className="flex items-center gap-2 p-1 glass rounded-2xl w-full">
                    <button
                      type="button"
                      onClick={() => handleModeChange('existing')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                        entryMode === 'existing' 
                          ? 'bg-[#FFD600] text-[#0A0F2C] shadow-inner' 
                          : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                      }`}
                    >
                      <Users size={14} />
                      <span>Paciente Existente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('manual')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                        entryMode === 'manual' 
                          ? 'bg-[#FFD600] text-[#0A0F2C] shadow-inner' 
                          : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                      }`}
                    >
                      <UserPlus size={14} />
                      <span>Inserir Manualmente</span>
                    </button>
                  </div>
                )}

                {entryMode === 'existing' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Search size={14} className="text-[#FFD600]" /> Buscar Paciente *
                    </label>
                    <PatientAutocomplete
                      onSelect={handlePatientSelect}
                      selectedPatientId={selectedPatientId}
                      disabled={!canEdit}
                    />
                    {formData.patient_category && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#FFD600]"></span>
                        Categoria: {formData.patient_category}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                      <User size={14} className="text-[#FFD600]" /> Nome do Paciente *
                    </label>
                    <input
                      required
                      type="text"
                      disabled={!canEdit}
                      placeholder="Nome completo"
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold disabled:opacity-50"
                      value={formData.patient_name}
                      onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Calendar size={14} className="text-[#FFD600]" /> Nascimento
                    </label>
                    <input
                      type="date"
                      disabled={!canEdit || (entryMode === 'existing' && !!selectedPatientId)}
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold [color-scheme:dark] disabled:opacity-50"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Phone size={14} className="text-[#FFD600]" /> Telefone *
                    </label>
                    <input
                      required
                      type="tel"
                      disabled={!canEdit || (entryMode === 'existing' && !!selectedPatientId)}
                      placeholder="(00) 00000-0000"
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold disabled:opacity-50"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                    <UserRound size={14} className="text-[#FFD600]" /> Fonoaudióloga
                  </label>
                  <select
                    disabled={!canEdit || profile?.role === 'FONO'}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer disabled:opacity-50"
                    value={formData.fono_id}
                    onChange={(e) => setFormData({ ...formData, fono_id: e.target.value })}
                  >
                    <option value="" className="bg-[#0A0F2C]">Selecione uma profissional</option>
                    {professionals.map((prof) => (
                      <option key={prof.id} value={prof.id} className="bg-[#0A0F2C]">
                        {prof.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                    <RefreshCw size={14} className="text-[#FFD600]" /> Tipo de Consulta *
                  </label>
                  <select
                    required
                    disabled={!canEdit}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer disabled:opacity-50"
                    value={formData.appointment_type_id}
                    onChange={(e) => setFormData({ ...formData, appointment_type_id: e.target.value })}
                  >
                    <option value="" className="bg-[#0A0F2C]">Selecione o tipo</option>
                    {appointmentTypes.map((type) => (
                      <option key={type.id} value={type.id} className="bg-[#0A0F2C]">
                        {type.color ? '● ' : ''}{type.name} ({type.duration_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Calendar size={14} className="text-[#FFD600]" /> Data *
                    </label>
                    <input
                      required
                      type="date"
                      disabled={!canEdit}
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold [color-scheme:dark] disabled:opacity-50"
                      value={formData.appointment_date}
                      onChange={handleDateChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Clock size={14} className="text-[#FFD600]" /> Hora *
                    </label>
                    <input
                      required
                      type="time"
                      disabled={!canEdit}
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold [color-scheme:dark] disabled:opacity-50"
                      value={formData.start_time}
                      onChange={handleTimeChange}
                    />
                    {calculatedEndTime && (
                      <div className="text-[10px] font-bold text-white/60 flex items-center gap-1.5 ml-1">
                        <Clock size={10} />
                        Término previsto: {calculatedEndTime}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 size={14} className="text-[#FFD600]" /> Empresa Responsável pelo Faturamento
                  </label>
                  <select
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                    value={formData.billing_company_id || ''}
                    onChange={(e) => setFormData({ ...formData, billing_company_id: e.target.value || null })}
                  >
                    <option value="" className="bg-[#0A0F2C]">Particular (Paciente Responsável)</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id} className="bg-[#0A0F2C]">
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ETAPA 8 & 9 — PARTE FINANCEIRA: VALOR DA CONSULTA */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5 font-sans">
                        <DollarSign size={14} className="text-[#FFD600]" /> Valores e Faturamento
                      </span>
                      <div className="mt-1 flex items-baseline gap-1.5 font-sans">
                        <span className="text-sm font-bold text-[#FFD600]">R$</span>
                        <span className="text-2xl font-black text-white tracking-tight">
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(
                            Number(formData.agreed_price || 0) - Number(formData.discount_value || 0)
                          )}
                        </span>
                        
                        {/* Origem do valor */}
                        <span className={`ml-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                          ${formData.price_source === 'COMPANY_PRICE'
                            ? 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/25'
                            : formData.price_source === 'MANUAL_OVERRIDE'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                            : 'bg-white/5 text-white/60 border-white/15'
                          }`}>
                          {formData.price_source === 'COMPANY_PRICE' 
                            ? (companies.find(c => c.id === formData.billing_company_id)?.name || 'Empresa') 
                            : formData.price_source === 'MANUAL_OVERRIDE' 
                            ? 'Valor Manual' 
                            : 'Particular'}
                        </span>
                      </div>
                      
                      {Number(formData.discount_value) > 0 && (
                        <div className="text-[10px] font-bold text-white/40 mt-1">
                          Preço base: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(formData.agreed_price || 0))} | Desconto: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(formData.discount_value || 0))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const isManual = formData.price_source === 'MANUAL_OVERRIDE';
                        if (isManual) {
                          // Reset back to automatic fetching
                          setFormData(prev => ({
                            ...prev,
                            price_source: null,
                            agreed_price: null,
                            discount_value: 0
                          }));
                        } else {
                          // Change to manual edit mode
                          setFormData(prev => ({
                            ...prev,
                            price_source: 'MANUAL_OVERRIDE'
                          }));
                        }
                      }}
                      className="text-[10px] font-black text-[#FFD600] hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      {formData.price_source === 'MANUAL_OVERRIDE' ? 'Restaurar Padrão' : 'Editar valor'}
                    </button>
                  </div>

                  {/* Manual editing inputs */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 font-sans">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                        {formData.price_source === 'MANUAL_OVERRIDE' ? 'Valor Cobrado (R$) *' : 'Valor Base (Auto, R$)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={formData.price_source !== 'MANUAL_OVERRIDE'}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none text-xs focus:ring-1 focus:ring-[#FFD600] disabled:opacity-50"
                        value={formData.agreed_price !== null ? formData.agreed_price : ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          agreed_price: e.target.value ? parseFloat(e.target.value) : 0,
                          price_source: 'MANUAL_OVERRIDE'
                        })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                        Desconto (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none text-xs focus:ring-1 focus:ring-[#FFD600]"
                        value={formData.discount_value || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          discount_value: e.target.value ? parseFloat(e.target.value) : 0 
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CalendarCheck size={14} className="text-[#FFD600]" /> Status
                  </label>
                  <select
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      if (newStatus === 'CANCELADO') {
                        if (continuations.length > 0) {
                          const confirmAll = window.confirm(
                            `Esta consulta possui ${continuations.length} continuação(ões) agendada(s). Deseja cancelar também todas as continuações de forma automatizada?`
                          );
                          setCancelAllContinuations(confirmAll);
                        } else if (appointment?.is_continuation) {
                          alert("Esta consulta é uma continuação de atendimento. O cancelamento será feito de forma independente.");
                        }
                      }
                      setFormData({ ...formData, status: newStatus });
                    }}
                  >
                    <option value="PENDENTE" className="bg-[#0A0F2C]">PENDENTE</option>
                    <option value="CONFIRMADO" className="bg-[#0A0F2C]">CONFIRMADO</option>
                    <option value="CANCELADO" className="bg-[#0A0F2C]">CANCELADO</option>
                    <option value="ATENDIDO" className="bg-[#0A0F2C]">ATENDIDO</option>
                    <option value="FALTOU" className="bg-[#0A0F2C]">FALTOU</option>
                  </select>
                </div>

                {/* HISTÓRICO DE CONTINUAÇÕES OU INFO DE PAI */}
                {appointment?.is_continuation && parentAppointment && (
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/15 flex gap-3 text-xs text-sky-300 font-semibold leading-relaxed">
                    <CornerDownRight size={18} className="shrink-0" />
                    <div>
                      <span>Este atendimento é uma <strong>continuidade</strong> da consulta original realizada em </span>
                      <span className="text-white font-bold">
                        {parentAppointment.appointment_date ? format(parseISO(parentAppointment.appointment_date), "dd/MM/yyyy") : ''} às {parentAppointment.start_time?.substring(0, 5)}
                      </span>.
                    </div>
                  </div>
                )}

                {continuations.length > 0 && (
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <CornerDownRight size={14} className="text-sky-400" /> Histórico de Continuações ({continuations.length})
                    </label>
                    <div className="space-y-2">
                      {continuations.map((cont) => (
                        <div key={cont.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <div className="text-white font-bold">
                              {cont.appointment_date ? format(parseISO(cont.appointment_date), "dd 'de' MMMM", { locale: ptBR }) : ''}
                            </div>
                            <div className="text-white/40 text-[10px] font-bold mt-0.5">
                              {cont.start_time?.substring(0, 5)} - {cont.end_time?.substring(0, 5)}
                            </div>
                            {cont.continuation_notes && (
                              <p className="text-[10px] text-sky-300 mt-1 italic">
                                &ldquo;{cont.continuation_notes}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border
                            ${cont.status === 'ATENDIDO' ? 'bg-sky-500/10 text-sky-400 border-sky-500/25' :
                              cont.status === 'CANCELADO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                              cont.status === 'FALTOU' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'}`}>
                            {cont.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seção Tratamento */}
                <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-bold text-sm">Vincular a tratamento</h4>
                      <p className="text-[10px] text-white/60 font-medium leading-relaxed">Define se esta consulta faz parte de um tratamento contínuo</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        treatment_enabled: !prev.treatment_enabled
                      }))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer outline-none shrink-0 ${
                        formData.treatment_enabled ? 'bg-[#FFD600]' : 'bg-white/10'
                      }`}
                    >
                      <motion.div
                        layout
                        className={`w-4 h-4 rounded-full bg-[#0A0F2C] absolute top-1 transition-all ${
                          formData.treatment_enabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <AnimatePresence>
                    {formData.treatment_enabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-4 pt-2"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em]">
                              Número desta sessão *
                            </label>
                            <input
                              type="number"
                              min="1"
                              disabled={!canEdit}
                              placeholder="Ex: 6"
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 outline-none transition-all font-bold text-sm"
                              value={formData.treatment_session_number || ''}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                treatment_session_number: e.target.value ? Number(e.target.value) : null 
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em]">
                              Total de sessões *
                            </label>
                            <input
                              type="number"
                              min="1"
                              disabled={!canEdit}
                              placeholder="Ex: 12"
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 outline-none transition-all font-bold text-sm"
                              value={formData.treatment_total_sessions || ''}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                treatment_total_sessions: e.target.value ? Number(e.target.value) : null 
                              })}
                            />
                          </div>
                        </div>
                        <div className="text-[10px] text-white/70 font-semibold bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                          Identificação: <span className="text-[#FFD600] font-black">
                            Sessão {formData.treatment_session_number || '?'} de {formData.treatment_total_sessions || '?'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-white/5 bg-white/5 flex flex-wrap sm:flex-nowrap gap-4 shrink-0">
                {appointment && appointment.status !== 'CANCELADO' && (
                  <button
                    type="button"
                    onClick={handleProlongar}
                    disabled={loading}
                    className="flex-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 font-black py-4 px-6 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 uppercase tracking-widest text-xs min-w-[120px]"
                  >
                    <CornerDownRight size={14} /> Prolongar
                  </button>
                )}
                {appointment && profile?.role !== 'FONO' && canEdit && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-black py-4 px-6 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    Excluir
                  </button>
                )}
                {canEdit && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.2)] hover:shadow-[0_0_30px_rgba(255,214,0,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs min-w-[150px]"
                  >
                    {loading ? 'Processando...' : 'Salvar Consulta'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
        id={appointment?.id || ''}
        title="Excluir Consulta"
        description="Tem certeza que deseja excluir esta consulta? Esta ação não pode ser desfeita."
        table="appointments"
      />
    </>
  );
}
