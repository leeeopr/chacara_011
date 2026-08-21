'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, User, Phone, Edit3, Trash2, Search, History, Clock4, CalendarCheck, Database, XCircle, AlertCircle, UserRound, MapPin, CheckCircle2, UserX, Repeat, Sparkles, Check, CalendarDays, Ban, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Appointment, AppointmentStatus } from '@/lib/types';
import AppointmentModal from './AppointmentModal';
import CancelModal from './CancelModal';
import DeleteModal from './DeleteModal';
import ProlongarModal from './ProlongarModal';
import { useAuth } from '@/contexts/AuthContext';
import { formatReminderMessage } from '@/lib/utils';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

export default function AppointmentManagement({ refreshKey }: { refreshKey: number }) {
  const { profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<AppointmentStatus | 'REPOSICAO_PENDENTE' | 'PROLONGADA'>('PENDENTE');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Reposição tracking states
  const [confirmingDispenseId, setConfirmingDispenseId] = useState<string | null>(null);
  const [reposingId, setReposingId] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<{ date: string; time: string; priority: number; label: string }[]>([]);
  
  // Custom form override fallbacks for reposing
  const [selectedFonoId, setSelectedFonoId] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [professorsList, setProfessorsList] = useState<{ id: string; full_name: string }[]>([]);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Prolongar states
  const [isProlongarModalOpen, setIsProlongarModalOpen] = useState(false);
  const [appointmentToProlong, setAppointmentToProlong] = useState<Appointment | null>(null);
  const [isProlongarSchemaMissing, setIsProlongarSchemaMissing] = useState(false);
  const [prolongedRequestTemplate, setProlongedRequestTemplate] = useState<string | null>(null);
  const [prolongedConfirmedTemplate, setProlongedConfirmedTemplate] = useState<string | null>(null);
  const [continuations, setContinuations] = useState<Appointment[]>([]);
  const [requestedMap, setRequestedMap] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMakeupSchemaMissing, setIsMakeupSchemaMissing] = useState<boolean>(false);

  // Safety timeout for loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        console.warn('AppointmentManagement: Loading safety timeout reached. Forcing loading to false.');
        setLoading(false);
      }, 15000); // 15 seconds safety net
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [whatsappTemplate, setWhatsappTemplate] = useState<string | null>(null);
  const [whatsappConfirmedTemplate, setWhatsappConfirmedTemplate] = useState<string | null>(null);

  const DEFAULT_TEMPLATE = `Olá, tudo bem? ☺️

Estamos entrando em contato para confirmarmos a consulta de {name} com {professional_name}, amanhã dia {date}, às {time}.  
Podemos confirmar?

⚠️ Caso a consulta não seja confirmada, o horário será disponibilizado para outro paciente.`;

  const FINAL_CONFIRMATION_TEMPLATE = `Olá, {name}! 😊

📌 Sua consulta foi confirmada!

🗓 Data: {date}  
⏰ Horário: {time}  

📍 Endereço:
Centro Auditivo Efatah - Rua João Leite, 220 - Jardim Oreana - Boituva/SP.

⏳ Tolerância de atraso: 5 minutos.`;

  const handleRefresh = () => setLocalRefreshKey(prev => prev + 1);

  const [copied, setCopied] = useState(false);
  const handleCopySQL = () => {
    const sql = `-- Adiciona colunas para controle de reposição de faltas
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS makeup_status TEXT DEFAULT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS linked_to_absence_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_makeup_status ON public.appointments (makeup_status) WHERE makeup_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_linked_to_absence_id ON public.appointments (linked_to_absence_id) WHERE linked_to_absence_id IS NOT NULL;

COMMENT ON COLUMN public.appointments.makeup_status IS 'Status da reposição de falta: PENDENTE, REPOSTA, DISPENSADA';
COMMENT ON COLUMN public.appointments.linked_to_absence_id IS 'ID da consulta original de falta que originou esta reposição';`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status handler with immediate local state synchronization
  const handleStatusUpdate = async (id: string, newStatus: AppointmentStatus) => {
    // 1. Update local state immediately for instant feedback
    setAppointments(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ));

    try {
      // 2. Persist in Supabase
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // 3. Dispatch global sync event and local refresh
      window.dispatchEvent(new CustomEvent('appointment-updated'));
      handleRefresh();
    } catch (error: any) {
      console.error(`Erro ao alterar status para ${newStatus}:`, error);
      if (error.code === '42703' || error.code === 'PGRST204') {
        alert('Erro de banco de dados: A coluna "status" não foi encontrada. Por favor, execute o SQL de migração nas Configurações.');
      } else {
        alert('Erro ao alterar status da consulta: ' + error.message);
      }
      // Revert if error
      handleRefresh();
    }
  };

  // Dispensar Reposição (Não Repor)
  const handleDispenseMakeup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ makeup_status: 'DISPENSADA' })
        .eq('id', id);
      
      if (error) throw error;
      
      setConfirmingDispenseId(null);
      setDeleteStatus({ message: 'Reposição dispensada com sucesso.', type: 'success' });
      setTimeout(() => setDeleteStatus(null), 3000);
      window.dispatchEvent(new CustomEvent('appointment-updated'));
      handleRefresh();
    } catch (err: any) {
      console.error('Erro ao dispensar reposição:', err);
      alert('Erro ao dispensar reposição: ' + err.message);
    }
  };

  // Reagendamento Inteligente e Criação de Consulta de Reposição
  const handleScheduleMakeup = async (app: Appointment, date: string, time: string, fonoId: string) => {
    setIsSubmittingReschedule(true);
    try {
      // Create the new makeup appointment (CONFIRMADO)
      const cleanPhone = (app.patients?.whatsapp || app.whatsapp || '').replace(/\D/g, '');
      const payload = {
        patient_id: app.patient_id,
        patient_name: app.patients?.full_name || app.patient_name,
        whatsapp: cleanPhone,
        birth_date: app.patients?.birth_date || app.birth_date || null,
        fono_id: fonoId,
        appointment_date: date,
        start_time: time,
        appointment_type_id: app.appointment_type_id,
        status: 'CONFIRMADO',
        treatment_enabled: app.treatment_enabled || false,
        treatment_total_sessions: app.treatment_total_sessions || null,
        treatment_session_number: app.treatment_session_number || null,
        recurring_schedule_id: app.recurring_schedule_id || null,
        linked_to_absence_id: app.id,
        makeup_status: null // The new rescheduled appointment is not a pending makeup
      };

      const { error: insertError } = await supabase
        .from('appointments')
        .insert([payload]);

      if (insertError) throw insertError;

      // Update original missed appointment's makeup_status as 'REPOSTA'
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ makeup_status: 'REPOSTA' })
        .eq('id', app.id);

      if (updateError) throw updateError;

      // Reset states
      setReposingId(null);
      setCustomDate('');
      setCustomTime('');
      setSuggestedSlots([]);
      setDeleteStatus({ message: 'Reposição de consulta agendada com sucesso!', type: 'success' });
      setTimeout(() => setDeleteStatus(null), 3000);
      window.dispatchEvent(new CustomEvent('appointment-updated'));
      handleRefresh();
    } catch (err: any) {
      console.error('Erro ao agendar reposição:', err);
      alert('Erro ao agendar reposição: ' + err.message);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Busca e gera sugestões inteligentes de horários de acordo com critérios de priorização
  const loadSuggestionsForAppointment = async (app: Appointment) => {
    setLoadingSuggestions(true);
    setSuggestedSlots([]);
    try {
      const duration = (app.appointment_types as any)?.duration_minutes || 30;
      const fonoId = app.fono_id;

      if (!fonoId) {
        setLoadingSuggestions(false);
        return;
      }

      // Pre-populate manual fallback fields
      setSelectedFonoId(fonoId);
      
      const todayDate = new Date();
      const tomorrow = new Date(todayDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCustomDate(tomorrow.toISOString().split('T')[0]);
      setCustomTime((app.start_time || '14:30').substring(0, 5));

      // 1. Fetch upcoming appointments for the professional for the next 8 calendar days
      const startDateStr = todayDate.toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(todayDate.getDate() + 10);
      const endDateStr = endDate.toISOString().split('T')[0];

      const [apptRes, blockRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('appointment_date, start_time, end_time, appointment_type_id, appointment_types(duration_minutes)')
          .eq('fono_id', fonoId)
          .gte('appointment_date', startDateStr)
          .lte('appointment_date', endDateStr)
          .neq('status', 'CANCELADO'),
        supabase
          .from('schedule_blocks')
          .select('*')
          .eq('fono_id', fonoId)
      ]);

      const existingApps = apptRes.data || [];
      const blocks = blockRes.data || [];

      // 2. Generate candidates
      const candidates: { date: string; time: string; priority: number; label: string }[] = [];
      const originalTime = (app.start_time || '').substring(0, 5);

      const testTimesSet = new Set<string>();
      if (originalTime) {
        testTimesSet.add(originalTime);

        // Generate shifts around it (-1h, +1h, -2h, +2h, -30m, +30m)
        const [origH, origM] = originalTime.split(':').map(Number);
        const origMins = origH * 60 + origM;

        const offsets = [-60, 60, -120, 120, -30, 30];
        offsets.forEach(offset => {
          const m = origMins + offset;
          if (m >= 480 && m <= 1080) { // between 08:00 and 18:00
            const hStr = String(Math.floor(m / 60)).padStart(2, '0');
            const mStr = String(m % 60).padStart(2, '0');
            testTimesSet.add(`${hStr}:${mStr}`);
          }
        });
      }

      // Add common standard times
      ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].forEach(t => testTimesSet.add(t));
      const testTimes = Array.from(testTimesSet);

      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      // Check the next 10 calendar days starting from tomorrow
      for (let i = 1; i <= 10; i++) {
        const scanDate = new Date();
        scanDate.setDate(todayDate.getDate() + i);
        const dayOfWeek = scanDate.getDay();

        if (dayOfWeek === 0) continue; // Skip Sunday

        const dateStr = scanDate.toISOString().split('T')[0];
        const dayApps = existingApps.filter(a => a.appointment_date === dateStr);

        for (const testTime of testTimes) {
          const startMin = timeToMinutes(testTime);
          const endMin = startMin + duration;

          // Overlap with existing appointments
          const overlap = dayApps.some(a => {
            const appStart = timeToMinutes(a.start_time);
            const appType = Array.isArray(a.appointment_types) ? a.appointment_types[0] : a.appointment_types;
            const appDur = appType?.duration_minutes || 30;
            const appEnd = a.end_time ? timeToMinutes(a.end_time) : (appStart + appDur);
            return (startMin < appEnd) && (endMin > appStart);
          });

          if (overlap) continue;

          // Overlap with schedule blocks
          const blocked = blocks.some(block => {
            const blockStart = timeToMinutes(block.start_time);
            const blockEnd = timeToMinutes(block.end_time);
            const timeOverlap = (startMin < blockEnd) && (endMin > blockStart);
            if (!timeOverlap) return false;

            const mode = block.block_mode || 'single_day';
            switch (mode) {
              case 'single_day':
                return (block.start_date || block.block_date) === dateStr;
              case 'continuous_period':
                return block.start_date && block.end_date && dateStr >= block.start_date && dateStr <= block.end_date;
              case 'weekly_recurring':
                return block.weekdays && block.weekdays.includes(dayOfWeek);
              case 'weekly_within_period':
                return block.start_date && block.end_date && block.weekdays && 
                       dateStr >= block.start_date && dateStr <= block.end_date && block.weekdays.includes(dayOfWeek);
              default:
                return false;
            }
          });

          if (blocked) continue;

          // Calculate score
          let score = 10 - i; // Date proximity
          let label = 'Data Mais Próxima';

          if (testTime === originalTime) {
            score += 20; // High priority matching same hour
            label = 'Mesmo Horário (Recomendado)';
          } else {
            const [testH] = testTime.split(':').map(Number);
            const [origH] = originalTime.split(':').map(Number);
            if (Math.abs(testH - origH) <= 1) {
              score += 10;
              label = 'Mesmo Turno';
            }
          }

          candidates.push({
            date: dateStr,
            time: testTime,
            priority: score,
            label
          });
        }
      }

      candidates.sort((a, b) => b.priority - a.priority);
      setSuggestedSlots(candidates.slice(0, 4));
    } catch (err) {
      console.error('Error generating suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    // Load local storage fallbacks first
    const localReq = localStorage.getItem('prolonged_request_template');
    const localConf = localStorage.getItem('prolonged_confirmed_template');
    if (localReq) setProlongedRequestTemplate(localReq);
    if (localConf) setProlongedConfirmedTemplate(localConf);

    const storedMap = localStorage.getItem('prolonged_requested_map');
    if (storedMap) {
      try {
        setRequestedMap(JSON.parse(storedMap));
      } catch (e) {
        console.error('Error parsing prolonged requested map:', e);
      }
    }

    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('whatsapp_template, whatsapp_confirmed_template, prolonged_request_template, prolonged_confirmed_template')
          .eq('id', 1)
          .limit(1);
        
        if (data && data.length > 0) {
          const settings = data[0];
          setWhatsappTemplate(settings.whatsapp_template);
          setWhatsappConfirmedTemplate(settings.whatsapp_confirmed_template);
          if (settings.prolonged_request_template) setProlongedRequestTemplate(settings.prolonged_request_template);
          if (settings.prolonged_confirmed_template) setProlongedConfirmedTemplate(settings.prolonged_confirmed_template);
        }
      } catch (err) {
        console.warn('Error fetching settings for templates, using defaults:', err);
      }
    };

    fetchSettings();
  }, []);

  const fetchAppointments = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let hasSchemaError = isMakeupSchemaMissing;
      let hasProlongarError = isProlongarSchemaMissing;
      
      let selectString = `
        id,
        patient_id,
        patient_name,
        appointment_date,
        start_time,
        whatsapp,
        fono_id,
        status,
        cancel_reason,
        makeup_status,
        linked_to_absence_id,
        treatment_enabled,
        treatment_session_number,
        treatment_total_sessions,
        birth_date,
        appointment_type_id,
        is_prolonged,
        is_continuation,
        parent_appointment_id,
        continuation_notes,
        patients (id, full_name, whatsapp, birth_date),
        appointment_types (id, name, duration_minutes)
      `;

      if (hasSchemaError || hasProlongarError) {
        selectString = `
          id,
          patient_id,
          patient_name,
          appointment_date,
          start_time,
          whatsapp,
          fono_id,
          status,
          cancel_reason,
          treatment_enabled,
          treatment_session_number,
          treatment_total_sessions,
          birth_date,
          appointment_type_id,
          patients (id, full_name, whatsapp, birth_date),
          appointment_types (id, name, duration_minutes)
        `;
      }

      let query = supabase
        .from('appointments')
        .select(selectString);

      if (activeSubTab === 'REPOSICAO_PENDENTE') {
        if (hasSchemaError) {
          query = query.eq('status', 'FALTOU');
        } else {
          query = query.eq('status', 'FALTOU').or('makeup_status.eq.PENDENTE,makeup_status.is.null');
        }
      } else if (activeSubTab === 'PROLONGADA') {
        if (hasProlongarError) {
          query = query.eq('status', 'CONFIRMADO'); // dummy fallback to avoid crash
        } else {
          query = query.eq('is_prolonged', true);
        }
      } else {
        query = query.eq('status', activeSubTab);
      }

      // Remove from normal flow if prolonged and schema is present
      if (activeSubTab !== 'PROLONGADA' && !hasProlongarError) {
        query = query.or('is_prolonged.eq.false,is_prolonged.is.null');
      }

      query = query.order('appointment_date', { ascending: activeSubTab !== 'CANCELADO' });

      if (profile?.role === 'FONO') {
        query = query.eq('fono_id', profile.id);
      }

      const profilesQuery = supabase.from('profiles').select('id, full_name').in('role', ['FONO', 'DONA']);

      let queryResult: any;
      let profilesResult: any;

      try {
        const [qRes, pRes] = await Promise.all([
          query,
          profilesQuery
        ]);
        queryResult = qRes;
        profilesResult = pRes;
      } catch (innerErr) {
        console.error("Query Promise.all rejected:", innerErr);
        throw innerErr;
      }

      if (queryResult.error) {
        const err = queryResult.error;
        
        // Check for prolongar schema missing first
        if ((err.code === '42703' || err.message?.includes('is_prolonged') || err.message?.includes('parent_appointment_id') || err.message?.includes('is_continuation')) && !hasProlongarError) {
          console.warn('prolongar columns missing on appointments table. Retrying with fallback...');
          setIsProlongarSchemaMissing(true);
          hasProlongarError = true;
          
          selectString = `
            id,
            patient_id,
            patient_name,
            appointment_date,
            start_time,
            whatsapp,
            fono_id,
            status,
            cancel_reason,
            treatment_enabled,
            treatment_session_number,
            treatment_total_sessions,
            birth_date,
            appointment_type_id,
            patients (id, full_name, whatsapp, birth_date),
            appointment_types (id, name, duration_minutes)
          `;

          let retryQuery = supabase
            .from('appointments')
            .select(selectString);

          if (activeSubTab === 'REPOSICAO_PENDENTE') {
            retryQuery = retryQuery.eq('status', 'FALTOU');
          } else if (activeSubTab === 'PROLONGADA') {
            retryQuery = retryQuery.eq('status', 'CONFIRMADO');
          } else {
            retryQuery = retryQuery.eq('status', activeSubTab);
          }

          retryQuery = retryQuery.order('appointment_date', { ascending: activeSubTab !== 'CANCELADO' });

          if (profile?.role === 'FONO') {
            retryQuery = retryQuery.eq('fono_id', profile.id);
          }

          const [retryRes, resProfilesRetry] = await Promise.all([
            retryQuery,
            supabase.from('profiles').select('id, full_name').in('role', ['FONO', 'DONA'])
          ]);

          queryResult = retryRes;
          profilesResult = resProfilesRetry;
        } else if ((err.code === '42703' || err.message?.includes('makeup_status') || err.message?.includes('linked_to_absence_id')) && !hasSchemaError) {
          console.warn('makeup_status columns missing on appointments table. Retrying with fallback query...');
          setIsMakeupSchemaMissing(true);
          hasSchemaError = true;

          selectString = `
            id,
            patient_id,
            patient_name,
            appointment_date,
            start_time,
            whatsapp,
            fono_id,
            status,
            cancel_reason,
            treatment_enabled,
            treatment_session_number,
            treatment_total_sessions,
            birth_date,
            appointment_type_id,
            patients (id, full_name, whatsapp, birth_date),
            appointment_types (id, name, duration_minutes)
          `;

          let retryQuery = supabase
            .from('appointments')
            .select(selectString);

          if (activeSubTab === 'REPOSICAO_PENDENTE') {
            retryQuery = retryQuery.eq('status', 'FALTOU');
          } else if (activeSubTab === 'PROLONGADA') {
            if (hasProlongarError) {
              retryQuery = retryQuery.eq('status', 'CONFIRMADO');
            } else {
              retryQuery = retryQuery.eq('is_prolonged', true);
            }
          } else {
            retryQuery = retryQuery.eq('status', activeSubTab);
          }

          retryQuery = retryQuery.order('appointment_date', { ascending: activeSubTab !== 'CANCELADO' });

          if (profile?.role === 'FONO') {
            retryQuery = retryQuery.eq('fono_id', profile.id);
          }

          const [retryRes, resProfilesRetry] = await Promise.all([
            retryQuery,
            supabase.from('profiles').select('id, full_name').in('role', ['FONO', 'DONA'])
          ]);

          queryResult = retryRes;
          profilesResult = resProfilesRetry;
        }
      }

      if (queryResult.error) throw queryResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const data = queryResult.data;
      const profilesData = profilesResult.data;

      if (profilesData) {
        setProfessorsList(profilesData);
      }

      if (data) {
        const profilesMap = new Map(profilesData?.map((u: any) => [u.id, u]) || []);
        const formattedData = data.map((item: any) => ({
          ...item,
          patients: Array.isArray(item.patients) ? item.patients[0] : item.patients,
          appointment_types: Array.isArray(item.appointment_types) ? item.appointment_types[0] : item.appointment_types,
          profiles: profilesMap.get(item.fono_id) || { full_name: 'Desconhecido' }
        }));
        setAppointments(formattedData as Appointment[]);
        setDbError(null);

        // If tab is PROLONGADA and schema is present, fetch the continuations too
        if (activeSubTab === 'PROLONGADA' && !hasProlongarError) {
          const { data: continuationsData } = await supabase
            .from('appointments')
            .select('id, parent_appointment_id, appointment_date, start_time')
            .eq('is_continuation', true);
            
          if (continuationsData) {
            setContinuations(continuationsData as Appointment[]);
          }
        }
      }
    } catch (error: any) {
      console.warn('Busca de consultas finalizada:', error?.message || error);
      if (error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || String(error?.message || '').includes('Could not find the table')) {
        setDbError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, profile, isMakeupSchemaMissing]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, refreshKey, localRefreshKey]);

  // Handle auto-refetch on window focus with session validation
  useRefetchOnFocus(useCallback(async () => {
    console.log('[AppointmentManagement] Focus detected, starting session validation and refresh...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[AppointmentManagement] Session validation failed on focus:', error);
        return;
      }
      if (session) {
        console.log('[AppointmentManagement] Session valid, auto-refetching appointments in background.');
        await fetchAppointments(true);
      } else {
        console.warn('[AppointmentManagement] No active session found on focus.');
      }
    } catch (err) {
      console.error('[AppointmentManagement] Error validating session on focus:', err);
    }
  }, [fetchAppointments]));

  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    const searchLow = searchTerm.toLowerCase();
    return appointments.filter(app => {
      const pName = app.patients?.full_name || app.patient_name || '';
      const typeName = app.appointment_types?.name || '';
      return pName.toLowerCase().includes(searchLow) || 
             typeName.toLowerCase().includes(searchLow) ||
             app.whatsapp?.includes(searchTerm);
    });
  }, [appointments, searchTerm]);

  const handleDeleteClick = (id: string) => {
    setSelectedAppointmentId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteStatus({ message: 'Consulta excluída com sucesso!', type: 'success' });
    setTimeout(() => setDeleteStatus(null), 3000);
    handleRefresh();
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Mensagens de Status */}
      <AnimatePresence>
        {deleteStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-5 rounded-2xl flex items-center gap-4 border shadow-xl backdrop-blur-xl ${
              deleteStatus.type === 'error' 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}
          >
            {deleteStatus.type === 'error' ? <AlertCircle size={20} /> : <CalendarCheck size={20} />}
            <span className="font-black uppercase tracking-widest text-xs">{deleteStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1 glass rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab('PENDENTE')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeSubTab === 'PENDENTE' 
                ? 'bg-white/10 text-white shadow-inner border border-white/10' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Clock4 size={14} />
            <span>Pendentes</span>
          </button>
          <button
            onClick={() => setActiveSubTab('CONFIRMADO')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeSubTab === 'CONFIRMADO' 
                ? 'bg-emerald-500/20 text-emerald-400 shadow-inner border border-emerald-500/20' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <CalendarCheck size={14} />
            <span>Confirmados</span>
          </button>
          <button
            onClick={() => setActiveSubTab('ATENDIDO')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeSubTab === 'ATENDIDO' 
                ? 'bg-sky-500/20 text-sky-400 shadow-inner border border-sky-500/20' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Atendidos</span>
          </button>
          <button
            onClick={() => setActiveSubTab('FALTOU')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeSubTab === 'FALTOU' 
                ? 'bg-amber-500/20 text-amber-400 shadow-inner border border-amber-500/20' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <UserX size={14} />
            <span>Faltas</span>
          </button>
          <button
            onClick={() => setActiveSubTab('REPOSICAO_PENDENTE')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeSubTab === 'REPOSICAO_PENDENTE' 
                ? 'bg-violet-500/30 text-violet-300 shadow-inner border border-violet-500/30 ring-1 ring-violet-400/20' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Repeat size={14} className="text-violet-400" />
            <span>Reposições Pendentes</span>
          </button>
          <button
            onClick={() => setActiveSubTab('PROLONGADA')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeSubTab === 'PROLONGADA' 
                ? 'bg-sky-500/30 text-sky-300 shadow-inner border border-sky-500/30 ring-1 ring-sky-400/20' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Repeat size={14} className="text-sky-400" />
            <span>Prolongadas</span>
          </button>
          <button
            onClick={() => setActiveSubTab('CANCELADO')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              activeSubTab === 'CANCELADO' 
                ? 'bg-rose-500/20 text-rose-400 shadow-inner border border-rose-500/20' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <XCircle size={14} />
            <span>Cancelados</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-[400px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            placeholder="Buscar paciente, ficha ou tipo..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FFD600]/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)]"></div>
        </div>
      ) : dbError ? (
        <div className="text-center py-12 px-6 glass rounded-3xl border border-rose-500/20 max-w-lg mx-auto">
          <Database className="mx-auto text-rose-400 mb-4 animate-pulse" size={48} />
          <h3 className="text-white font-black text-lg mb-2 uppercase tracking-wider">Erro no Banco de Dados</h3>
          <p className="text-white/80 text-sm mb-4">
            Ocorreu um erro ao consultar as tabelas. Verifique sua estrutura no Supabase.
          </p>
          <div className="bg-black/40 text-left p-4 rounded-xl font-mono text-[11px] text-rose-300 border border-white/5 space-y-1 mb-6 max-h-[150px] overflow-auto">
            <div><strong className="text-white/60">Erro:</strong> {dbError?.message || 'Erro de esquema no banco de dados'}</div>
            <div><strong className="text-white/60">Código:</strong> {dbError?.code || 'Desconhecido'}</div>
            {dbError?.hint && <div><strong className="text-white/60">Dica:</strong> {dbError.hint}</div>}
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-sql-modal'))}
            className="bg-rose-600 hover:bg-rose-700 text-white font-black py-3 px-8 rounded-2xl shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            Abrir Setup
          </button>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl border border-white/5">
          <Calendar className="mx-auto text-white/10 mb-4" size={48} />
          <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-sm">
            {searchTerm ? 'Nenhum resultado para sua busca' : `Nenhuma consulta ${activeSubTab.toLowerCase()} encontrada.`}
          </p>
        </div>
      ) : activeSubTab === 'PROLONGADA' ? (
        isProlongarSchemaMissing ? (
          <div className="glass p-8 md:p-10 rounded-[32px] border border-sky-500/20 max-w-3xl mx-auto space-y-6 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-40 h-40 bg-sky-600/10 rounded-full blur-3xl -z-10" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Ativação Necessária</h3>
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Configuração de Banco de Dados</p>
              </div>
            </div>

            <p className="text-white/70 text-sm leading-relaxed">
              O recurso de <strong>Consultas Prolongadas</strong> necessita de algumas colunas adicionais na tabela de consultas para rastrear o fluxo clínico e o vínculo entre as consultas originais e suas continuações.
            </p>

            <div className="space-y-3">
              <h4 className="text-white/90 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <span>Passo a Passo para Ativação:</span>
              </h4>
              <ol className="list-decimal list-inside text-white/50 text-xs space-y-2 pl-1 leading-relaxed">
                <li>Copie o script SQL abaixo clicando no botão de copiar.</li>
                <li>Abra o **Painel do Supabase** do seu projeto.</li>
                <li>Clique em **SQL Editor** no menu esquerdo e crie uma nova query (**New query**).</li>
                <li>Cole o código SQL e clique em **Run** no topo direito.</li>
                <li>Recarregue esta página após aplicar a alteração!</li>
              </ol>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Script SQL de Migração (Consultas Prolongadas)</span>
                <button
                  type="button"
                  onClick={() => {
                    const sql = `-- 1. Add prolonged status columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_continuation BOOLEAN DEFAULT FALSE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS continuation_notes TEXT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_prolonged BOOLEAN DEFAULT FALSE;

-- 2. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_appointments_parent_appointment_id ON public.appointments (parent_appointment_id) WHERE parent_appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_is_continuation ON public.appointments (is_continuation) WHERE is_continuation = TRUE;
CREATE INDEX IF NOT EXISTS idx_appointments_is_prolonged ON public.appointments (is_prolonged) WHERE is_prolonged = TRUE;`;
                    navigator.clipboard.writeText(sql);
                    alert('SQL copiado para a área de transferência!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Copy size={12} />
                  <span>Copiar SQL</span>
                </button>
              </div>
              <pre className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-x-auto text-[10px] font-mono text-sky-300 leading-relaxed max-h-40">
{`-- 1. Add prolonged status columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_continuation BOOLEAN DEFAULT FALSE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS continuation_notes TEXT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_prolonged BOOLEAN DEFAULT FALSE;

-- 2. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_appointments_parent_appointment_id ON public.appointments (parent_appointment_id) WHERE parent_appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_is_continuation ON public.appointments (is_continuation) WHERE is_continuation = TRUE;
CREATE INDEX IF NOT EXISTS idx_appointments_is_prolonged ON public.appointments (is_prolonged) WHERE is_prolonged = TRUE;`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 text-left">
            {filteredAppointments.map((app, index) => {
              const appContinuation = continuations.find(c => c.parent_appointment_id === app.id);
              const isRequested = requestedMap[app.id] === true;

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass glass-reflection p-6 rounded-[24px] border border-sky-500/10 hover:border-sky-500/20 flex flex-col gap-6 relative overflow-visible group"
                >
                  {/* Background accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-600/5 rounded-full blur-3xl -z-10 group-hover:bg-sky-600/10 transition-colors pointer-events-none" />

                  {/* Main Card Content */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-inner">
                          <UserRound size={28} />
                        </div>
                        <div>
                          <h3 className="font-black text-white text-xl tracking-tight group-hover:text-sky-300 transition-colors flex items-center flex-wrap gap-2">
                            <span>{app.patients?.full_name || app.patient_name || 'Paciente'}</span>
                          </h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <div className="flex items-center gap-2 text-white/40 text-xs font-bold">
                              <Phone size={14} className="text-sky-400 font-bold" />
                              <span className="tracking-wider">{app.patients?.whatsapp || app.whatsapp || 'N/A'}</span>
                            </div>
                            <span className="text-white/20 text-[10px]">•</span>
                            <span className={`font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              appContinuation
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                            }`}>
                              {appContinuation ? 'Continuação Agendada' : 'Aguardando contato com o paciente'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-10 border-t border-white/5 pt-4 md:pt-0 md:border-t-0">
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Data Original</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <Calendar size={14} className="text-sky-400" />
                          {app.appointment_date ? new Date(app.appointment_date).toLocaleDateString('pt-BR') : 'Data Indefinida'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Hora Original</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <Clock size={14} className="text-sky-400" />
                          {(app.start_time || '').substring(0, 5) || '--:--'}
                        </div>
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Profissional</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <UserRound size={14} className="text-sky-400" />
                          <span className="uppercase tracking-wider text-[11px]">{app.profiles?.full_name || 'Não definida'}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Tipo</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <Clock4 size={14} className="text-sky-400" />
                          <span className="uppercase tracking-wider text-[11px]">{app.appointment_types?.name || 'Não definido'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {appContinuation && (
                    <div className="mt-2 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-3 max-w-md">
                      <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-emerald-300 leading-relaxed">
                        <span className="font-black uppercase tracking-widest text-[9px] text-emerald-400 mr-2">Continuação agendada para:</span>
                        {new Date(appContinuation.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR')} às {(appContinuation.start_time || '').substring(0, 5)}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4 lg:mt-0 justify-end">
                    {appContinuation ? (
                      // Stage 6 - Informar nova data
                      <button
                        onClick={() => {
                          const patientPhone = app.patients?.whatsapp || app.whatsapp || '';
                          if (!patientPhone) {
                            alert('Paciente sem número de WhatsApp cadastrado.');
                            return;
                          }
                          const cleaned = patientPhone.replace(/\D/g, '');
                          const finalPhone = (cleaned.length === 10 || cleaned.length === 11) ? `55${cleaned}` : cleaned;
                          
                          const patientName = app.patients?.full_name || app.patient_name || 'Paciente';
                          const [contYear, contMonth, contDay] = (appContinuation.appointment_date || '').split('-').map(Number);
                          const formattedDate = contDay && contMonth ? `${String(contDay).padStart(2, '0')}/${String(contMonth).padStart(2, '0')}` : 'Data Indefinida';
                          const formattedTime = (appContinuation.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';

                          const rawDate = contYear && contMonth && contDay ? new Date(contYear, contMonth - 1, contDay) : undefined;

                          const template = prolongedConfirmedTemplate || `Olá, {name}! 😊\n\nSeu horário de continuação de atendimento com fonoaudiólogo foi agendado!\n\n🗓 Data: {date}\n⏰ Horário: {time}\n\nAté breve!`;
                          const message = formatReminderMessage(template, {
                            patientName,
                            professionalName: app.profiles?.full_name || 'Profissional',
                            date: formattedDate,
                            time: formattedTime,
                            rawDate
                          });

                          const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
                          window.open(url, '_blank');
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        <Phone size={14} />
                        <span>Informar Nova Data</span>
                      </button>
                    ) : (
                      <>
                        {/* Stage 3 - Solicitar Disponibilidade */}
                        <button
                          onClick={() => {
                            // Save to state and storage
                            const newMap = { ...requestedMap, [app.id]: true };
                            setRequestedMap(newMap);
                            localStorage.setItem('prolonged_requested_map', JSON.stringify(newMap));

                            const patientPhone = app.patients?.whatsapp || app.whatsapp || '';
                            if (!patientPhone) {
                              alert('Paciente sem número de WhatsApp cadastrado.');
                              return;
                            }
                            const cleaned = patientPhone.replace(/\D/g, '');
                            const finalPhone = (cleaned.length === 10 || cleaned.length === 11) ? `55${cleaned}` : cleaned;
                            
                            const patientName = app.patients?.full_name || app.patient_name || 'Paciente';
                            const [origYear, origMonth, origDay] = (app.appointment_date || '').split('-').map(Number);
                            const formattedDate = origDay && origMonth ? `${String(origDay).padStart(2, '0')}/${String(origMonth).padStart(2, '0')}` : 'Data Indefinida';
                            const formattedTime = (app.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';

                            const rawDate = origYear && origMonth && origDay ? new Date(origYear, origMonth - 1, origDay) : undefined;

                            const template = prolongedRequestTemplate || `Olá, {name}! 😊\n\nPara darmos continuidade ao seu atendimento, precisamos agendar uma nova data.\n\nPor favor, nos informe quais são os seus melhores dias e horários disponíveis. Obrigado!`;
                            const message = formatReminderMessage(template, {
                              patientName,
                              professionalName: app.profiles?.full_name || 'Profissional',
                              date: formattedDate,
                              time: formattedTime,
                              rawDate
                            });

                            const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
                            window.open(url, '_blank');
                          }}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                            isRequested
                              ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                              : 'bg-sky-500/20 hover:bg-sky-500 border-sky-500/30 text-sky-400 hover:text-white'
                          }`}
                        >
                          <Phone size={14} />
                          <span>{isRequested ? 'Solicitado (Reenviar)' : 'Solicitar Disponibilidade'}</span>
                        </button>

                        {/* Stage 4 - Colocar Data */}
                        <button
                          onClick={() => {
                            setAppointmentToProlong(app);
                            setIsProlongarModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-sky-500/20"
                        >
                          <CalendarDays size={14} />
                          <span>Colocar Data</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : activeSubTab === 'REPOSICAO_PENDENTE' ? (
        isMakeupSchemaMissing ? (
          <div className="glass p-8 md:p-10 rounded-[32px] border border-violet-500/20 max-w-3xl mx-auto space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600/10 rounded-full blur-3xl -z-10" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Ativação Necessária</h3>
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Configuração de Banco de Dados</p>
              </div>
            </div>

            <p className="text-white/70 text-sm leading-relaxed text-left">
              O recurso de <strong>Reposições de Faltas</strong> necessita de algumas colunas adicionais na tabela de consultas para rastrear a situação das reposições de forma inteligente.
            </p>

            <div className="space-y-3 text-left">
              <h4 className="text-white/90 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <span>Passo a Passo para Ativação:</span>
              </h4>
              <ol className="list-decimal list-inside text-white/50 text-xs space-y-2 pl-1 leading-relaxed">
                <li>Copie o script SQL abaixo clicando no botão de copiar.</li>
                <li>Abra o **Painel do Supabase** do seu projeto.</li>
                <li>Clique em **SQL Editor** no menu esquerdo e crie uma nova query (**New query**).</li>
                <li>Cole o código SQL e clique em **Run** no topo direito.</li>
                <li>Recarregue esta página após aplicar a alteração!</li>
              </ol>
            </div>

            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Script SQL de Migração</span>
                <button
                  type="button"
                  onClick={handleCopySQL}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>
              <pre className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-x-auto text-[10px] font-mono text-violet-300 leading-relaxed max-h-40">
{`-- 1. Add makeup status column
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS makeup_status TEXT DEFAULT NULL;

-- 2. Add linked_to_absence_id column 
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS linked_to_absence_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_appointments_makeup_status 
ON public.appointments (makeup_status) 
WHERE makeup_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_linked_to_absence_id 
ON public.appointments (linked_to_absence_id) 
WHERE linked_to_absence_id IS NOT NULL;`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAppointments.map((app, index) => {
            const daysSinceAndLabel = (() => {
              if (!app.appointment_date) return '';
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const [year, month, day] = app.appointment_date.split('-').map(Number);
              const absenceDate = new Date(year, month - 1, day);
              const diffTime = today.getTime() - absenceDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 0) return 'Faltou hoje';
              if (diffDays === 1) return 'Faltou ontem (1 dia pendente)';
              return `Pendente há ${diffDays} dias`;
            })();

            const isReposing = reposingId === app.id;
            const isConfirmingDispense = confirmingDispenseId === app.id;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass glass-reflection p-6 rounded-[24px] border border-violet-500/10 hover:border-violet-500/20 flex flex-col gap-6 relative overflow-visible group"
              >
                {/* Background accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl -z-10 group-hover:bg-violet-600/10 transition-colors pointer-events-none" />

                {/* Main Card Content */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20 text-violet-400 shadow-inner">
                        <UserRound size={28} />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-xl tracking-tight group-hover:text-violet-300 transition-colors flex items-center flex-wrap gap-2">
                          <span>{app.patients?.full_name || app.patient_name || 'Paciente'}</span>
                          {app.treatment_enabled && app.treatment_session_number && app.treatment_total_sessions && (
                            <span className="text-[10px] text-[#FFD600] font-black bg-[#FFD600]/10 px-2.5 py-1 rounded-full border border-[#FFD600]/25 tracking-widest uppercase">
                              Sessão {app.treatment_session_number}/{app.treatment_total_sessions}
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-2 text-white/40 text-xs font-bold">
                            <Phone size={14} className="text-violet-400 font-bold" />
                            <span className="tracking-wider">{app.patients?.whatsapp || app.whatsapp || 'N/A'}</span>
                          </div>
                          <span className="text-white/20 text-[10px]">•</span>
                          <span className="text-violet-400 font-black text-[10px] uppercase tracking-wider bg-violet-500/5 border border-violet-500/10 px-2.5 py-0.5 rounded-full">
                            {daysSinceAndLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-10 border-t border-white/5 pt-4 md:pt-0 md:border-t-0">
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Data da Falta</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <Calendar size={14} className="text-amber-500" />
                          {app.appointment_date ? new Date(app.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data Indefinida'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Hora Original</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <Clock size={14} className="text-amber-500" />
                          {(app.start_time || '').substring(0, 5) || '--:--'}
                        </div>
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Profissional</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <User size={14} className="text-violet-400" />
                          <span className="uppercase tracking-wider text-[11px]">{app.profiles?.full_name || 'Não definida'}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Tipo Consulta</p>
                        <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                          <Clock4 size={14} className="text-violet-400" />
                          <span className="uppercase tracking-wider text-[11px]">{app.appointment_types?.name || 'Não definido'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Quick buttons ([Repor] / [Não Repor]) */}
                  <div className="flex items-center justify-end gap-3 self-stretch lg:self-auto border-t border-white/5 pt-4 lg:pt-0 lg:border-t-0">
                    <AnimatePresence mode="wait">
                      {isConfirmingDispense ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 p-2 rounded-2xl shrink-0 w-full lg:w-auto justify-between lg:justify-start"
                        >
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider px-2">Dispensar?</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDispenseMakeup(app.id)}
                              className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmingDispenseId(null)}
                              className="bg-white/5 hover:bg-white/10 text-white/60 font-black text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-2.5 w-full lg:w-auto">
                          <button
                            onClick={() => {
                              if (isReposing) {
                                setReposingId(null);
                                setSuggestedSlots([]);
                              } else {
                                setReposingId(app.id);
                                loadSuggestionsForAppointment(app);
                              }
                            }}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer ${
                              isReposing 
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' 
                                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
                            }`}
                          >
                            <CalendarDays size={14} />
                            <span>{isReposing ? 'Fechar' : 'Repor'}</span>
                          </button>
                          
                          {!isReposing && (
                            <button
                              onClick={() => setConfirmingDispenseId(app.id)}
                              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/10 hover:border-rose-500/25 text-rose-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer"
                            >
                              <Ban size={14} />
                              <span>Não Repor</span>
                            </button>
                          )}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Expanded Smart Rescheduling Drawer */}
                {isReposing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-white/5 pt-6 mt-2 space-y-6 overflow-visible"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles size={16} className="text-violet-400 animate-pulse" />
                        <h4 className="text-white font-black text-sm uppercase tracking-widest">Reagendamento Inteligente</h4>
                      </div>
                      <p className="text-white/50 text-[11px] leading-relaxed max-w-2xl">
                        Sugerimos abaixo horários livres que respeitam a profissional original, tempo de duração da consulta ({ app.appointment_types?.duration_minutes || 30 }m) e evitam conflitos ou bloqueios de agenda.
                      </p>
                    </div>

                    {/* Suggestions Section */}
                    {loadingSuggestions ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-3 bg-white/5 rounded-3xl border border-white/5">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-400" />
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Analisando grades de horários...</span>
                      </div>
                    ) : suggestedSlots.length === 0 ? (
                      <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 text-center">
                        <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">Nenhum horário livre encontrado nos próximos 10 dias de forma automática.</p>
                        <p className="text-white/40 text-[10px] mt-1">Utilize o formulário de reagendamento manual abaixo para escolher um horário customizado.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {suggestedSlots.map((slot, sIdx) => {
                          const [y, m, d] = slot.date.split('-');
                          const formattedDateObj = new Date(Number(y), Number(m)-1, Number(d));
                          const weekDay = formattedDateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                          const dateDisplay = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
                          
                          return (
                            <div 
                              key={sIdx}
                              className="bg-white/[0.02] hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/20 p-4 rounded-2xl flex flex-col justify-between gap-4 transition-all relative group/slot overflow-visible"
                            >
                              <div className="space-y-1">
                                <span className="absolute top-3 right-3 text-[8px] font-black text-violet-300 uppercase tracking-widest bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full pointer-events-none">
                                  {slot.label === 'Mesmo Horário (Recomendado)' ? 'Mesmo Horário' : slot.label}
                                </span>
                                <div className="text-[11px] font-black text-white/40 uppercase tracking-wider capitalize">
                                  {weekDay}
                                </div>
                                <div className="text-white font-black text-xl tracking-tight flex items-baseline gap-1.5 flex-wrap">
                                  <span>{dateDisplay}</span>
                                  <span className="text-xs text-violet-400 font-bold">às {slot.time}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleScheduleMakeup(app, slot.date, slot.time, app.fono_id || '')}
                                disabled={isSubmittingReschedule}
                                className="w-full bg-violet-600/20 hover:bg-violet-600 border border-violet-500/20 hover:border-violet-500 text-violet-300 hover:text-white font-black text-[10px] py-2.5 px-3 rounded-xl uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check size={12} />
                                <span>Agendar</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Manual Fallback Section */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 md:p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-white/40" />
                        <h5 className="text-white/70 font-black text-[10px] uppercase tracking-widest">Reagendamento Manual (Alternativo)</h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block">Fonoaudióloga</label>
                          <select
                            value={selectedFonoId}
                            onChange={(e) => setSelectedFonoId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white/80 font-bold text-xs focus:border-violet-500 outline-none uppercase tracking-wider"
                          >
                            <option value="" disabled className="bg-zinc-900">Selecione...</option>
                            {professorsList.map((prof) => (
                              <option key={prof.id} value={prof.id} className="bg-zinc-900">{prof.full_name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block">Data</label>
                            <input
                              type="date"
                              value={customDate}
                              onChange={(e) => setCustomDate(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/80 font-bold text-xs focus:border-violet-500 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block">Horário</label>
                            <input
                              type="time"
                              value={customTime}
                              onChange={(e) => setCustomTime(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/80 font-bold text-xs focus:border-violet-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            if (!selectedFonoId || !customDate || !customTime) {
                              alert('Por favor, preencha todos os campos do agendamento manual.');
                              return;
                            }
                            handleScheduleMakeup(app, customDate, customTime, selectedFonoId);
                          }}
                          disabled={isSubmittingReschedule || !selectedFonoId || !customDate || !customTime}
                          className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] px-6 py-3 rounded-xl uppercase tracking-widest transition-all disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmittingReschedule ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          <span>Agendar Reposição Manual</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
        )
      ) : (
        <div className="grid gap-4">
          {filteredAppointments.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass glass-reflection p-6 rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-6 group relative"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 relative z-10">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                    app.status === 'CONFIRMADO' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                    app.status === 'CANCELADO' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                    'bg-white/5 border-white/10 text-white/60'
                  }`}>
                    <User size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-xl tracking-tight group-hover:text-[#FFD600] transition-colors flex items-center flex-wrap gap-2">
                      <span>{app.patients?.full_name || app.patient_name || 'Paciente'}</span>
                      {app.treatment_enabled && app.treatment_session_number && app.treatment_total_sessions && (
                        <span className="text-[10px] text-[#FFD600] font-black bg-[#FFD600]/10 px-2.5 py-1 rounded-full border border-[#FFD600]/25 tracking-widest uppercase">
                          Sessão {app.treatment_session_number}/{app.treatment_total_sessions}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-white/40 text-xs font-bold mt-1">
                      <Phone size={14} className="text-[#FFD600]" />
                      <span className="tracking-wider">{app.patients?.whatsapp || app.whatsapp || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-10">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Data</p>
                    <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                      <Calendar size={14} className="text-[#FFD600]" />
                      {app.appointment_date ? new Date(app.appointment_date).toLocaleDateString('pt-BR') : 'Data Indefinida'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Hora</p>
                    <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                      <Clock size={14} className="text-[#FFD600]" />
                      {(app.start_time || '').substring(0, 5) || '--:--'}
                    </div>
                  </div>
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Profissional</p>
                    <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                      <UserRound size={14} className="text-[#FFD600]" />
                      <span className="uppercase tracking-wider text-[11px]">{app.profiles?.full_name || 'Não definida'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Tipo</p>
                    <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                      <Clock4 size={14} className="text-[#FFD600]" />
                      <span className="uppercase tracking-wider text-[11px]">{app.appointment_types?.name || 'Não definido'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Status</p>
                    <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit border ${
                      app.status === 'CONFIRMADO' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : app.status === 'CANCELADO'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      {app.status}
                    </div>
                  </div>
                </div>
                
                {app.status === 'CANCELADO' && app.cancel_reason && (
                  <div className="mt-2 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 flex items-start gap-3 max-w-md">
                    <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-rose-300/80 leading-relaxed">
                      <span className="font-black uppercase tracking-widest text-[9px] text-rose-400 mr-2">Motivo:</span> {app.cancel_reason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 relative z-10 md:opacity-0 group-hover:opacity-100 transition-all self-end md:self-auto">
                {/* Ações de WhatsApp */}
                <div className="flex items-center gap-2 pr-2 border-r border-white/5 mr-2">
                  <button
                    onClick={() => {
                      const patientPhone = app.patients?.whatsapp || app.whatsapp || '';
                      if (!patientPhone) {
                        alert('Paciente sem número de WhatsApp cadastrado.');
                        return;
                      }
                      const cleaned = patientPhone.replace(/\D/g, '');
                      const finalPhone = (cleaned.length === 10 || cleaned.length === 11) ? `55${cleaned}` : cleaned;
                      
                      const patientName = app.patients?.full_name || app.patient_name || 'Paciente';
                      const [year, month, day] = (app.appointment_date || '').split('-').map(Number);
                      const formattedDate = day && month ? `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}` : 'Data Indefinida';
                      const formattedTime = (app.start_time || '').substring(0, 5).replace(':', 'h') || '--h--';

                      const rawDate = year && month && day ? new Date(year, month - 1, day) : undefined;

                      let message = '';
                      if (app.status === 'CONFIRMADO') {
                        const template = whatsappConfirmedTemplate || FINAL_CONFIRMATION_TEMPLATE;
                        message = formatReminderMessage(template, {
                          patientName,
                          professionalName: app.profiles?.full_name || 'Profissional',
                          date: formattedDate,
                          time: formattedTime,
                          rawDate
                        });
                      } else {
                        const template = whatsappTemplate || DEFAULT_TEMPLATE;
                        message = formatReminderMessage(template, {
                          patientName,
                          professionalName: app.profiles?.full_name || 'Profissional',
                          date: formattedDate,
                          time: formattedTime,
                          rawDate
                        });
                      }

                      const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
                      window.open(url, '_blank');
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all border border-transparent text-[#FFD600] hover:bg-[#FFD600]/10 hover:border-[#FFD600]/20"
                    title={app.status === 'CONFIRMADO' ? "Informar Confirmação" : "Enviar Lembrete"}
                  >
                    {app.status === 'CONFIRMADO' ? <CheckCircle2 size={18} /> : <Phone size={18} />}
                  </button>
                </div>

                {/* Ações de Status (Confirmar/Cancelar) */}
                <div className="flex items-center gap-2 pr-2 border-r border-white/5 mr-2">
                  {app.status === 'PENDENTE' && (
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'CONFIRMADO')}
                      className="w-10 h-10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all border border-transparent hover:border-emerald-500/30"
                      title="Confirmar"
                    >
                      <CalendarCheck size={18} />
                    </button>
                  )}
                  {app.status !== 'CANCELADO' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(app.id, 'ATENDIDO')}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border border-transparent ${
                          app.status === 'ATENDIDO'
                            ? 'text-sky-400 bg-sky-500/20 border-sky-500/30'
                            : 'text-sky-400 hover:bg-sky-500/20 hover:border-sky-500/30'
                        }`}
                        title="Marcar como Atendido"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(app.id, 'FALTOU')}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border border-transparent ${
                          app.status === 'FALTOU'
                            ? 'text-amber-400 bg-amber-500/20 border-amber-500/30'
                            : 'text-amber-500 hover:bg-amber-500/20 hover:border-amber-500/30'
                        }`}
                        title="Marcar como Falta"
                      >
                        <UserX size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointmentId(app.id);
                          setIsCancelModalOpen(true);
                        }}
                        className="w-10 h-10 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                        title="Cancelar"
                      >
                        <XCircle size={18} />
                      </button>
                    </>
                  )}
                </div>

                {/* Ações Gerais (Editar/Excluir) */}
                <button
                  onClick={() => handleEdit(app)}
                  className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-[#FFD600] hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
                  title="Editar"
                >
                  <Edit3 size={18} />
                </button>
                {profile?.role !== 'FONO' && (
                  <button
                    onClick={() => handleDeleteClick(app.id)}
                    className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AppointmentModal
        key={isModalOpen ? `edit-${editingAppointment?.id || 'new'}` : 'closed'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
        }}
        onSuccess={handleRefresh}
        appointment={editingAppointment || undefined}
      />

      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedAppointmentId(null);
        }}
        onSuccess={handleRefresh}
        appointmentId={selectedAppointmentId?.toString() || ''}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedAppointmentId(null);
        }}
        onSuccess={handleDeleteSuccess}
        id={selectedAppointmentId || ''}
        title="Excluir Consulta"
        description="Tem certeza que deseja excluir esta consulta? Esta ação é irreversível e removerá todos os dados vinculados a este agendamento."
        table="appointments"
      />

      <ProlongarModal
        isOpen={isProlongarModalOpen}
        onClose={() => {
          setIsProlongarModalOpen(false);
          setAppointmentToProlong(null);
        }}
        onSuccess={handleRefresh}
        appointment={appointmentToProlong}
      />
    </div>
  );
}
