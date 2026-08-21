'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, RefreshCw, Save, User, CalendarDays, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringSchedules } from '@/hooks/useRecurringSchedules';
import { calculateExpectedDates } from '@/lib/recurringService';
import { Patient, AppointmentType, FrequencyType, RecurringSchedule } from '@/lib/types';
import PatientAutocomplete from './PatientAutocomplete';

interface RecurringScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule?: RecurringSchedule; // Passed if in "Edit" mode
}

const WEEKDAYS_CONFIG = [
  { label: 'SEG', value: 1 },
  { label: 'TER', value: 2 },
  { label: 'QUA', value: 3 },
  { label: 'QUI', value: 4 },
  { label: 'SEX', value: 5 },
  { label: 'SÁB', value: 6 },
  { label: 'DOM', value: 0 },
];

export default function RecurringScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  schedule,
}: RecurringScheduleModalProps) {
  const { profile } = useAuth();
  const { createSchedule, updateScheduleVersionedAction } = useRecurringSchedules();

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; full_name: string }[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  
  // Form states
  const [patientId, setPatientId] = useState(schedule?.patient_id || '');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [professionalId, setProfessionalId] = useState(
    schedule?.professional_id || (profile?.role === 'FONO' ? profile.id : '')
  );
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    schedule?.frequency_type || 'WEEKLY'
  );
  const [intervalValue, setIntervalValue] = useState<number>(schedule?.interval_value || 1);
  const [weekdays, setWeekdays] = useState<number[]>(schedule?.weekdays || []);
  const [startTime, setStartTime] = useState(schedule?.start_time || '08:00');
  const [duration, setDuration] = useState<number>(schedule?.duration || 50);
  const [startsAt, setStartsAt] = useState(
    schedule?.starts_at || new Date().toISOString().split('T')[0]
  );
  const [endsAt, setEndsAt] = useState<string>(schedule?.ends_at || '');
  const [appointmentTypeId, setAppointmentTypeId] = useState<string>(
    schedule?.appointment_type_id || ''
  );

  // Treatment states
  const [treatmentEnabled, setTreatmentEnabled] = useState<boolean>(schedule?.treatment_enabled || false);
  const [treatmentTotalSessions, setTreatmentTotalSessions] = useState<number | ''>(
    schedule?.treatment_total_sessions || ''
  );
  const [nextSessionNumber, setNextSessionNumber] = useState<number | ''>(
    schedule?.next_session_number || ''
  );

  // Versioning option state for editing
  const [editOption, setEditOption] = useState<'immediate' | 'custom_date'>('immediate');
  const [applyFromDate, setApplyFromDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [conflictsWarning, setConflictsWarning] = useState<string[]>([]);

  // Hydrate form states on modal state change or schedule loading
  useEffect(() => {
    const handleHydration = async () => {
      if (!isOpen) return;

      setFormError(null);
      setFormSuccess(null);
      setConflictsWarning([]);

      if (schedule) {
        // Hydrate from existing schedule (Editing Mode)
        setPatientId(schedule.patient_id || '');
        setProfessionalId(schedule.professional_id || '');
        setFrequencyType(schedule.frequency_type || 'WEEKLY');
        setIntervalValue(schedule.interval_value || 1);
        setWeekdays(schedule.weekdays || []);
        setStartTime(schedule.start_time || '08:00');
        setDuration(schedule.duration || 50);

        // Safe substring extraction to avoid local timezone date shift
        const formatYMD = (val: string | null | undefined) => {
          if (!val) return '';
          return val.length >= 10 ? val.substring(0, 10) : val;
        };

        setStartsAt(formatYMD(schedule.starts_at));
        setEndsAt(formatYMD(schedule.ends_at));
        setAppointmentTypeId(schedule.appointment_type_id || '');
        setTreatmentEnabled(schedule.treatment_enabled || false);
        setTreatmentTotalSessions(schedule.treatment_total_sessions || '');
        setNextSessionNumber(schedule.next_session_number || '');
        setEditOption('immediate');
        setApplyFromDate(new Date().toISOString().split('T')[0]);

        // Explicit direct query for the editing patient name to avoid race conditions
        try {
          const { data, error } = await supabase
            .from('patients')
            .select('full_name')
            .eq('id', schedule.patient_id)
            .single();
          if (data && !error) {
            setSelectedPatientName(data.full_name);
          }
        } catch (err) {
          console.error('Error fetching patient name for modal:', err);
        }
      } else {
        // Reset to initial blank values (Creation Mode)
        setPatientId('');
        setSelectedPatientName('');
        setProfessionalId(profile?.role === 'FONO' ? profile.id : '');
        setFrequencyType('WEEKLY');
        setIntervalValue(1);
        setWeekdays([]);
        setStartTime('08:00');
        setDuration(50);
        setStartsAt(new Date().toISOString().split('T')[0]);
        setEndsAt('');
        setAppointmentTypeId('');
        setTreatmentEnabled(false);
        setTreatmentTotalSessions('');
        setNextSessionNumber('');
        setEditOption('immediate');
        setApplyFromDate(new Date().toISOString().split('T')[0]);
      }
    };

    handleHydration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Sync profile when loaded on creation mode
  useEffect(() => {
    if (isOpen && !schedule && profile?.role === 'FONO' && !professionalId) {
      setProfessionalId(profile.id);
    }
  }, [isOpen, profile, schedule, professionalId]);

  // Load selection datasets
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch patients for search fallback if needed, but autocomplete does this too
        const { data: pData } = await supabase.from('patients').select('id, full_name, whatsapp, category').eq('status', 'ATIVO');
        if (pData) setPatients(pData as Patient[]);

        // Fetch professionals
        const { data: uData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['FONO', 'DONA'])
          .order('full_name', { ascending: true });
        if (uData) setProfessionals(uData);

        // Fetch appointment types
        const { data: tData } = await supabase
          .from('appointment_types')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (tData) setAppointmentTypes(tData);

        // Map parent patient if editing
        if (schedule?.patient_id && pData) {
          const match = pData.find((p) => p.id === schedule.patient_id);
          if (match) setSelectedPatientName(match.full_name);
        }
      } catch (err) {
        console.error('Error loading modal lists:', err);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, schedule]);

  // Handle weekday selection button press
  const toggleWeekday = (val: number) => {
    if (weekdays.includes(val)) {
      setWeekdays(weekdays.filter((v) => v !== val));
    } else {
      setWeekdays([...weekdays, val]);
    }
  };

  // Preview expected occurrences
  const previewDates = useMemo(() => {
    if ((frequencyType === 'WEEKLY' || frequencyType === 'BIWEEKLY') && weekdays.length === 0) {
      return [];
    }
    return calculateExpectedDates(
      {
        frequency_type: frequencyType,
        interval_value: intervalValue,
        weekdays,
        starts_at: startsAt,
        ends_at: endsAt || null,
        effective_from: startsAt,
        effective_until: null,
      },
      90
    );
  }, [frequencyType, intervalValue, weekdays, startsAt, endsAt]);

  const remainingSessions = useMemo(() => {
    if (!treatmentEnabled || treatmentTotalSessions === '' || nextSessionNumber === '') return Infinity;
    return Math.max(0, (Number(treatmentTotalSessions) - Number(nextSessionNumber)) + 1);
  }, [treatmentEnabled, treatmentTotalSessions, nextSessionNumber]);

  const previewDatesToDisplay = useMemo(() => {
    return previewDates.slice(0, remainingSessions);
  }, [previewDates, remainingSessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!patientId) {
      setFormError('Selecione um paciente.');
      return;
    }
    if (!professionalId) {
      setFormError('Selecione um profissional responsável.');
      return;
    }
    if ((frequencyType === 'WEEKLY' || frequencyType === 'BIWEEKLY') && weekdays.length === 0) {
      setFormError('Selecione ao menos um dia da semana.');
      return;
    }

    if (treatmentEnabled) {
      if (!treatmentTotalSessions || Number(treatmentTotalSessions) < 1) {
        setFormError('Indique o total de sessões para o tratamento contínuo.');
        return;
      }
      if (!nextSessionNumber || Number(nextSessionNumber) < 1) {
        setFormError('Indique o número da próxima sessão a ser gerada.');
        return;
      }
      if (Number(nextSessionNumber) > Number(treatmentTotalSessions)) {
        setFormError('A próxima sessão não pode ser maior que o total de sessões do tratamento.');
        return;
      }
    }

    setLoading(true);

    try {
      if (schedule?.id) {
        // EDIT MODE: simple direct update
        const finalApplyDate = editOption === 'immediate' ? startsAt : applyFromDate;

        const result = await updateScheduleVersionedAction(
          schedule.id,
          {
            weekdays,
            frequency_type: frequencyType,
            interval_value: intervalValue,
            start_time: startTime,
            duration,
            starts_at: startsAt,
            ends_at: endsAt || null,
            appointment_type_id: appointmentTypeId || null,
            professional_id: professionalId,
            treatment_enabled: treatmentEnabled,
            treatment_total_sessions: treatmentEnabled ? Number(treatmentTotalSessions) : null,
            next_session_number: treatmentEnabled ? Number(nextSessionNumber) : null,
          },
          finalApplyDate,
          profile?.id || '',
          true // ignore conflicts during creation so doctor is saved and alerts can form
        );

        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setFormError('Erro ao atualizar: ' + (result.error || 'Erro desconhecido'));
        }
      } else {
        // CREATE MODE
        const result = await createSchedule(
          {
            patient_id: patientId,
            professional_id: professionalId,
            frequency_type: frequencyType,
            interval_value: intervalValue,
            weekdays,
            start_time: startTime,
            duration,
            starts_at: startsAt,
            ends_at: endsAt || null,
            effective_from: startsAt,
            appointment_type_id: appointmentTypeId || null,
            treatment_enabled: treatmentEnabled,
            treatment_total_sessions: treatmentEnabled ? Number(treatmentTotalSessions) : null,
            next_session_number: treatmentEnabled ? Number(nextSessionNumber) : null,
            created_by: profile?.id,
          },
          profile?.id || ''
        );

        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setFormError('Erro ao criar: ' + (result.error || 'Erro desconhecido'));
        }
      }
    } catch (err: any) {
      console.error(err);
      setFormError('Falha na operação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0F2C]/70 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600]">
                  <RefreshCw size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {schedule ? 'Editar Frequência Recorrente' : 'Cadastrar Frequência Recorrente'}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">Define o padrão de consultas recorrentes automáticas</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Body */}
              <div 
                className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-4 text-sm font-bold"
                  >
                    <AlertTriangle size={20} className="shrink-0 text-red-400" />
                    <div>
                      <h4 className="text-white">Ação recomendada</h4>
                      <p className="mt-1 text-xs opacity-80 leading-relaxed font-semibold">{formError}</p>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Patient Select */}
                  {!schedule ? (
                    <div className="space-y-2">
                       <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Paciente</label>
                       <PatientAutocomplete
                         onSelect={(p) => {
                           if (p) {
                             setPatientId(p.id!);
                             setSelectedPatientName(p.full_name);
                           } else {
                             setPatientId('');
                             setSelectedPatientName('');
                           }
                         }}
                         selectedPatientId={patientId}
                         noScroll={true}
                       />
                     </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-white/40 font-black">Paciente</label>
                      <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-white/50">
                        <User size={16} />
                        <span className="font-semibold">{selectedPatientName}</span>
                      </div>
                    </div>
                  )}

                  {/* Professional Select */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Profissional Responsável</label>
                    <select
                      value={professionalId}
                      onChange={(e) => setProfessionalId(e.target.value)}
                      className="w-full text-white bg-white/5 border border-[#FFD600]/20 p-3.5 rounded-xl focus:border-[#FFD600] outline-none font-medium custom-select"
                    >
                      <option value="" className="bg-[#0A0F2C]">Selecione</option>
                      {professionals.map((prof) => (
                        <option key={prof.id} value={prof.id} className="bg-[#0A0F2C]">
                          {prof.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Recurrence Type */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Tipo de Frequência</label>
                    <select
                      value={frequencyType}
                      onChange={(e) => setFrequencyType(e.target.value as FrequencyType)}
                      className="w-full text-white bg-white/5 border border-white/10 p-3.5 rounded-xl focus:border-[#FFD600] outline-none font-medium custom-select"
                    >
                      <option value="WEEKLY" className="bg-[#0A0F2C]">Semanal</option>
                      <option value="BIWEEKLY" className="bg-[#0A0F2C]">Quinzenal (A cada 14 dias)</option>
                      <option value="CUSTOM_INTERVAL" className="bg-[#0A0F2C]">Intervalo Customizado (X Dias)</option>
                    </select>
                  </div>

                  {/* Dynamic interval helper for CUSTOM_INTERVAL */}
                  {frequencyType === 'CUSTOM_INTERVAL' && (
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Dias de Intervalo</label>
                      <input
                        type="number"
                        min={1}
                        value={intervalValue}
                        onChange={(e) => setIntervalValue(parseInt(e.target.value, 10) || 1)}
                        className="w-full text-white bg-white/5 border border-white/10 p-3 rounded-xl focus:border-[#FFD600] outline-none"
                      />
                    </div>
                  )}

                  {/* Start Time */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Horário de Início</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full text-white bg-white/5 border border-white/10 p-3 pl-10 rounded-xl focus:border-[#FFD600] outline-none"
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black font-black">Duração (minutos)</label>
                    <input
                      type="number"
                      min={10}
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value, 10) || 50)}
                      className="w-full text-white bg-white/5 border border-white/10 p-3 rounded-xl focus:border-[#FFD600] outline-none"
                    />
                  </div>

                  {/* Appointment Procedure Type (Convenio etc) */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Procedimento / Tipo de Consulta</label>
                    <select
                      value={appointmentTypeId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAppointmentTypeId(val);
                        if (val) {
                          const match = appointmentTypes.find((type) => type.id === val);
                          if (match && match.duration_minutes) {
                            setDuration(match.duration_minutes);
                          }
                        }
                      }}
                      className="w-full text-white bg-white/5 border border-white/10 p-3.5 rounded-xl focus:border-[#FFD600] outline-none font-medium custom-select"
                    >
                      <option value="" className="bg-[#0A0F2C]">Nenhum (Terapia Padrão)</option>
                      {appointmentTypes.map((type) => (
                        <option key={type.id} value={type.id} className="bg-[#0A0F2C]">
                          {type.name} ({type.duration_minutes}m)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Starts At (Vigência) */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Vigência de Início</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="date"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full text-white bg-white/5 border border-white/10 p-3 pl-10 rounded-xl focus:border-[#FFD600] outline-none"
                      />
                    </div>
                  </div>

                  {/* Ends At (Ends Date) */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Término Opcional</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="date"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="w-full text-white bg-white/5 border border-white/10 p-3 pl-10 rounded-xl focus:border-[#FFD600] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Weekdays selection */}
                {(frequencyType === 'WEEKLY' || frequencyType === 'BIWEEKLY') && (
                  <div className="space-y-3">
                    <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Dias da Semana</label>
                    <div className="flex flex-wrap gap-2.5">
                      {WEEKDAYS_CONFIG.map((day) => {
                        const active = weekdays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleWeekday(day.value)}
                            className={`flex-1 min-w-[65px] h-12 flex items-center justify-center rounded-xl font-bold text-xs uppercase tracking-wider border transition-all ${
                              active
                                ? 'bg-[#FFD600] border-[#FFD600] text-[#0A0F2C] shadow-lg shadow-[#FFD600]/10 scale-[1.03]'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Treatment Control Section */}
                <div className="p-5.5 rounded-2xl bg-[#FFD600]/5 border border-[#FFD600]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#FFD600]/10 text-[#FFD600]">
                        <RefreshCw size={16} className="animate-spin-slow" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">Controle de Sessões de Tratamento</h4>
                        <p className="text-[11px] text-white/40 font-medium">Controle automatizado de limites para a terapia</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={treatmentEnabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setTreatmentEnabled(val);
                          if (val) {
                            if (!treatmentTotalSessions) setTreatmentTotalSessions(12);
                            if (!nextSessionNumber) setNextSessionNumber(1);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FFD600]"></div>
                    </label>
                  </div>

                  {treatmentEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5"
                    >
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-wider text-white/60 font-black">Total de Sessões</label>
                        <input
                          type="number"
                          min={1}
                          placeholder="Ex: 12"
                          value={treatmentTotalSessions}
                          onChange={(e) => setTreatmentTotalSessions(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          className="w-full text-white bg-white/5 border border-white/10 p-3 rounded-xl focus:border-[#FFD600] outline-none font-bold"
                        />
                        <span className="text-[10px] text-white/30 block">Total programado para o pacote</span>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-wider text-[#FFD600] font-black">Próxima Sessão</label>
                        <input
                          type="number"
                          min={1}
                          placeholder="Ex: 1"
                          value={nextSessionNumber}
                          onChange={(e) => setNextSessionNumber(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          className="w-full text-white bg-white/5 border border-[#FFD600]/20 p-3 rounded-xl focus:border-[#FFD600] outline-none font-bold text-[#FFD600]"
                        />
                        <span className="text-[10px] text-[#FFD600]/50 block">Sessão da próxima consulta gerada</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Versioning application for editing existing */}
                {schedule && (
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                      <AlertTriangle className="text-[#FFD600]" size={16} />
                      <span>Configuração de Versionamento Temporal</span>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">
                      A edição de frequência nunca modifica o histórico passado do paciente. Escolha quando a nova regra entrará em vigor.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setEditOption('immediate')}
                        className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all ${
                          editOption === 'immediate'
                            ? 'bg-[#FFD600]/10 border-[#FFD600] text-[#FFD600]'
                            : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-extrabold text-sm uppercase">Imediata</span>
                        <span className="text-[11px] opacity-60 mt-1">Aplica as mudanças desde a data de início ({startsAt})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditOption('custom_date')}
                        className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all ${
                          editOption === 'custom_date'
                            ? 'bg-[#FFD600]/10 border-[#FFD600] text-[#FFD600]'
                            : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-extrabold text-sm uppercase">Data Específica</span>
                        <span className="text-[11px] opacity-60 mt-1">Gera novas em data futura mantendo as anteriores intocadas</span>
                      </button>
                    </div>

                    {editOption === 'custom_date' && (
                      <div className="space-y-2 mt-3 block">
                        <label className="block text-xs uppercase tracking-wider text-[#FFD600] font-black">Data de início da nova regra</label>
                        <input
                          type="date"
                          value={applyFromDate}
                          onChange={(e) => setApplyFromDate(e.target.value)}
                          className="w-full text-white bg-white/10 border border-[#FFD600]/20 p-3 rounded-xl outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Preview banner */}
                <div className="flex items-center justify-between p-4.5 rounded-2xl bg-[#FFD600]/5 border border-[#FFD600]/10">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="text-[#FFD600]" size={18} />
                    <div>
                      <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider block">Visualização de Geração de Consultas</span>
                      <span className="text-sm text-white font-extrabold">
                        {previewDatesToDisplay.length > 0
                          ? `Serão geradas ${previewDatesToDisplay.length} consultas` + (treatmentEnabled ? ` (Limite de Tratamento)` : ` nos próximos 90 dias`)
                          : 'Preencha os campos para ver a simulação de consultas'}
                      </span>
                    </div>
                  </div>
                  {previewDatesToDisplay.length > 0 && (
                    <div className="flex -space-x-1">
                      {previewDatesToDisplay.slice(0, 3).map((dt, idx) => (
                        <span
                          key={idx}
                          className="h-7 px-2.5 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 text-[11px] font-mono text-[#FFD600]"
                        >
                          {dt.split('-')[2]}/{dt.split('-')[1]}
                        </span>
                      ))}
                      {previewDatesToDisplay.length > 3 && (
                        <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-white/40">
                          +{previewDatesToDisplay.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 px-8 flex items-center justify-end gap-3 border-t border-white/5 bg-white/[0.02] flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black px-8 py-3 rounded-xl shadow-lg shadow-[#FFD600]/10 transition-all active:scale-[0.98] flex items-center gap-2 text-sm uppercase tracking-wider leading-none disabled:opacity-55"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{schedule ? 'Salvar Edição' : 'Cadastrar Frequência'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
