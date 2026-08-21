import { supabase } from './supabase';
import { 
  RecurringSchedule, 
  ScheduleOccurrence, 
  Appointment, 
  FrequencyType, 
  ScheduleBlock 
} from './types';
import { 
  addDays, 
  format, 
  parseISO, 
  differenceInCalendarDays, 
  differenceInCalendarWeeks,
  isBefore,
  isAfter,
  isEqual,
  parse
} from 'date-fns';

/**
 * Utility to calculate end time string ("HH:mm") based on start time and duration.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  try {
    const [hoursStr, minutesStr] = startTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return startTime;
    
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  } catch (e) {
    return startTime;
  }
}

/**
 * Check if two time periods overlap. Time is in format "HH:mm".
 */
export function isTimeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Generate all expected dates for a recurring schedule in a given window.
 */
export function calculateExpectedDates(
  schedule: {
    frequency_type: FrequencyType;
    interval_value: number;
    weekdays: number[];
    starts_at: string;
    ends_at?: string | null;
    effective_from: string;
    effective_until?: string | null;
  },
  horizonDays = 90
): string[] {
  const dates: string[] = [];
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Parse chronological boundaries
  const startsAt = parseISO(schedule.starts_at);
  const effectiveFrom = parseISO(schedule.effective_from);
  
  // Start of generation is the maximum of (starts_at, today, effective_from)
  let scanStart = startsAt;
  if (isBefore(scanStart, effectiveFrom)) {
    scanStart = effectiveFrom;
  }
  
  // Capped at horizonDays in the future
  const horizonEnd = addDays(new Date(), horizonDays);
  
  let scanEnd = horizonEnd;
  if (schedule.ends_at) {
    const endsAt = parseISO(schedule.ends_at);
    if (isBefore(endsAt, scanEnd)) {
      scanEnd = endsAt;
    }
  }
  
  if (schedule.effective_until) {
    const effectiveUntil = parseISO(schedule.effective_until);
    if (isBefore(effectiveUntil, scanEnd)) {
      scanEnd = effectiveUntil;
    }
  }

  // If scanStart is already after scanEnd, no dates can be generated
  if (isBefore(scanEnd, scanStart)) {
    return [];
  }

  // Iterate daily to check matches
  let current = scanStart;
  while (!isAfter(current, scanEnd)) {
    const currentStr = format(current, 'yyyy-MM-dd');
    const isoDay = current.getDay(); // 0=Sunday, 1=Monday, etc.
    
    let isMatch = false;

    if (schedule.frequency_type === 'WEEKLY') {
      if (schedule.weekdays.includes(isoDay)) {
        isMatch = true;
      }
    } else if (schedule.frequency_type === 'BIWEEKLY') {
      // Calculate week difference from the absolute rule start date
      const weeksDiff = Math.abs(differenceInCalendarWeeks(current, startsAt, { weekStartsOn: 0 }));
      if (weeksDiff % 2 === 0 && schedule.weekdays.includes(isoDay)) {
        isMatch = true;
      }
    } else if (schedule.frequency_type === 'CUSTOM_INTERVAL') {
      const daysDiff = differenceInCalendarDays(current, startsAt);
      if (daysDiff >= 0 && daysDiff % (schedule.interval_value || 1) === 0) {
        isMatch = true;
      }
    }

    if (isMatch) {
      dates.push(currentStr);
    }
    
    current = addDays(current, 1);
  }

  return dates;
}

interface ConflictResult {
  hasConflict: boolean;
  reason?: string;
  type?: 'BLOCK' | 'APPOINTMENT';
}

/**
 * Check if the professional has conflicts (schedule blocks or clashing appointments)
 * on a given date and time range.
 */
export async function checkConflicts(
  professionalId: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): Promise<ConflictResult> {
  try {
    // 1. Fetch blocks for that professional
    const { data: blocks, error: blocksError } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('fono_id', professionalId);

    if (!blocksError && blocks) {
      for (const block of (blocks as ScheduleBlock[])) {
        const blockDate = block.start_date || block.block_date;
        
        // Single Day Block check
        if (block.block_mode === 'single_day' && blockDate === dateStr) {
          if (isTimeOverlapping(startTime, endTime, block.start_time, block.end_time)) {
            return {
              hasConflict: true,
              reason: `Bloqueio: ${block.reason || 'Bloqueio de Agenda'}`,
              type: 'BLOCK'
            };
          }
        }
        
        // Continuous Period check
        if (block.block_mode === 'continuous_period' && block.start_date && block.end_date) {
          if (dateStr >= block.start_date && dateStr <= block.end_date) {
            if (isTimeOverlapping(startTime, endTime, block.start_time, block.end_time)) {
              return {
                hasConflict: true,
                reason: `Bloqueio Período: ${block.reason || 'Bloqueio'}`,
                type: 'BLOCK'
              };
            }
          }
        }

        // Weekly Recurring block check
        if (block.block_mode === 'weekly_recurring' && block.weekdays) {
          const dayOfOccur = parseISO(dateStr).getDay();
          if (block.weekdays.includes(dayOfOccur)) {
            if (isTimeOverlapping(startTime, endTime, block.start_time, block.end_time)) {
              return {
                hasConflict: true,
                reason: `Bloqueio Semanal: ${block.reason || 'Bloqueio'}`,
                type: 'BLOCK'
              };
            }
          }
        }

        // Weekly within period
        if (block.block_mode === 'weekly_within_period' && block.start_date && block.end_date && block.weekdays) {
          if (dateStr >= block.start_date && dateStr <= block.end_date) {
            const dayOfOccur = parseISO(dateStr).getDay();
            if (block.weekdays.includes(dayOfOccur)) {
              if (isTimeOverlapping(startTime, endTime, block.start_time, block.end_time)) {
                return {
                  hasConflict: true,
                  reason: `Bloqueio Recorrente em Período: ${block.reason || 'Bloqueio'}`,
                  type: 'BLOCK'
                };
              }
            }
          }
        }
      }
    }

    // 2. Fetch overlapping appointments
    let apptQuery = supabase
      .from('appointments')
      .select('id, start_time, appointment_date, patients(full_name), appointment_types(duration_minutes)')
      .eq('fono_id', professionalId)
      .eq('appointment_date', dateStr)
      .neq('status', 'CANCELADO');

    if (excludeAppointmentId) {
      apptQuery = apptQuery.neq('id', excludeAppointmentId);
    }

    const { data: appointments, error: apptError } = await apptQuery;

    if (!apptError && appointments) {
      for (const app of appointments) {
        // Find duration from join
        const appType = Array.isArray(app.appointment_types)
          ? app.appointment_types[0]
          : (app.appointment_types as any);
        const appDuration = appType?.duration_minutes || 50; // standard default
        const appEndTime = calculateEndTime(app.start_time, appDuration);

        if (isTimeOverlapping(startTime, endTime, app.start_time, appEndTime)) {
          const pName = Array.isArray((app as any).patients) ? (app as any).patients[0]?.full_name : (app as any).patients?.full_name;
          return {
            hasConflict: true,
            reason: `Disputa com consulta de ${pName || 'outro paciente'} às ${app.start_time}`,
            type: 'APPOINTMENT'
          };
        }
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return { hasConflict: false };
  }
}

/**
 * Generate concretely future occurrences and appointments for a specific recurring schedule rule.
 * Avoids duplicating generated dates.
 */
export async function generateOccurrencesForSchedule(
  scheduleId: string,
  horizonDays = 90,
  ignoreConflicts = false
): Promise<{ success: boolean; generatedCount: number; conflicts: string[] }> {
  const conflictsList: string[] = [];
  try {
    // 1. Fetch parent schedule
    const { data: schedule, error: schedError } = await supabase
      .from('recurring_schedules')
      .select(`
        *,
        patients(*),
        appointment_types(*)
      `)
      .eq('id', scheduleId)
      .single();

    if (schedError || !schedule) {
      throw new Error(`Schedule not found: ${schedError?.message}`);
    }

    if (schedule.status !== 'ACTIVE') {
      return { success: true, generatedCount: 0, conflicts: [] };
    }

    let generatedCount = 0;
    let nextSession = schedule.next_session_number || 1;
    const treatmentEnabled = schedule.treatment_enabled || false;
    const totalSessions = schedule.treatment_total_sessions || 0;

    // --- CASE A: Treatment-Enabled Recurring Schedule (SESSIONS DRIVEN) ---
    if (treatmentEnabled) {
      // 1. If we are already beyond the limits, stop generating
      if (nextSession > totalSessions) {
        return { success: true, generatedCount: 0, conflicts: [] };
      }

      // 2. Fetch all active appointments to check which sessions and dates already exist
      const { data: activeAppts, error: apptsError } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, treatment_session_number')
        .eq('recurring_schedule_id', scheduleId)
        .neq('status', 'CANCELADO');

      if (apptsError) {
        throw new Error(`Failed to fetch active appointments: ${apptsError.message}`);
      }

      const existingSessionNumbers = new Set<number>();
      const occupiedDates = new Set<string>();

      if (activeAppts) {
        activeAppts.forEach(app => {
          if (app.treatment_session_number) {
            existingSessionNumbers.add(app.treatment_session_number);
          }
          if (app.appointment_date) {
            occupiedDates.add(app.appointment_date);
          }
        });
      }

      // Also retrieve existing occurrences to block duplicated dates
      const { data: existingOccur } = await supabase
        .from('schedule_occurrences')
        .select('occurrence_date, status')
        .eq('recurring_schedule_id', scheduleId)
        .neq('status', 'CANCELLED');

      if (existingOccur) {
        existingOccur.forEach(occ => {
          if (occ.occurrence_date) {
            occupiedDates.add(occ.occurrence_date);
          }
        });
      }

      // 3. Scan for recurring dates and generate manquantes/remaining sessions
      let currentScanDate = parseISO(schedule.starts_at);
      const effectiveFrom = parseISO(schedule.effective_from);
      if (isBefore(currentScanDate, effectiveFrom)) {
        currentScanDate = effectiveFrom;
      }

      // Cap scanning window to 365 days ahead to avoid potential infinite loops
      const scanEndDate = addDays(new Date(), 365);

      for (let session = nextSession; session <= totalSessions; session++) {
        // If the session number is already created and active, skip it
        if (existingSessionNumbers.has(session)) {
          continue;
        }

        let foundDateStr: string | null = null;
        while (!isAfter(currentScanDate, scanEndDate)) {
          const dateStr = format(currentScanDate, 'yyyy-MM-dd');
          const isoDay = currentScanDate.getDay();

          let isMatch = false;
          if (schedule.frequency_type === 'WEEKLY') {
            if (schedule.weekdays.includes(isoDay)) {
              isMatch = true;
            }
          } else if (schedule.frequency_type === 'BIWEEKLY') {
            const weeksDiff = Math.abs(differenceInCalendarWeeks(currentScanDate, parseISO(schedule.starts_at), { weekStartsOn: 0 }));
            if (weeksDiff % 2 === 0 && schedule.weekdays.includes(isoDay)) {
              isMatch = true;
            }
          } else if (schedule.frequency_type === 'CUSTOM_INTERVAL') {
            const daysDiff = differenceInCalendarDays(currentScanDate, parseISO(schedule.starts_at));
            if (daysDiff >= 0 && daysDiff % (schedule.interval_value || 1) === 0) {
              isMatch = true;
            }
          }

          if (isMatch && !occupiedDates.has(dateStr)) {
            foundDateStr = dateStr;
            currentScanDate = addDays(currentScanDate, 1);
            break;
          }

          currentScanDate = addDays(currentScanDate, 1);
        }

        // If no more valid dates are found within 365 days, stop generation
        if (!foundDateStr) {
          break;
        }

        // Check scheduling conflicts
        const endTime = calculateEndTime(schedule.start_time, schedule.duration);
        const conflict = await checkConflicts(
          schedule.professional_id,
          foundDateStr,
          schedule.start_time,
          endTime
        );

        if (conflict.hasConflict) {
          conflictsList.push(`Data ${format(parseISO(foundDateStr), 'dd/MM')}: ${conflict.reason}`);
          if (!ignoreConflicts) {
            // Keep the current session for retry on the next available date, do not consume it here
            session--;
            continue;
          }
        }

        // Double check we aren't exceeding limites
        if (session > totalSessions) {
          break;
        }

        // Try inserting the appointment
        const patientData = Array.isArray(schedule.patients) ? schedule.patients[0] : schedule.patients;
        const patientName = patientData?.full_name || 'Paciente Recorrente';
        const whatsapp = patientData?.whatsapp || '';

        const { data: appt, error: apptError } = await supabase
          .from('appointments')
          .insert({
            patient_id: schedule.patient_id,
            patient_name: patientName,
            whatsapp: whatsapp,
            fono_id: schedule.professional_id,
            appointment_date: foundDateStr,
            start_time: schedule.start_time,
            status: 'PENDENTE',
            recurring_schedule_id: schedule.id,
            appointment_type_id: schedule.appointment_type_id || null,
            treatment_enabled: true,
            treatment_total_sessions: totalSessions,
            treatment_session_number: session
          })
          .select('id')
          .single();

        if (apptError) {
          console.error(`Error inserting recurrenced appointment for session ${session}:`, apptError);
          session--; // retry
          continue;
        }

        // Create occurrence
        const { error: occurError } = await supabase
          .from('schedule_occurrences')
          .insert({
            recurring_schedule_id: schedule.id,
            appointment_id: appt.id,
            occurrence_date: foundDateStr,
            status: 'GENERATED'
          });

        if (occurError) {
          console.error('Error inserting schedule occurrence:', occurError);
          await supabase.from('appointments').delete().eq('id', appt.id);
          session--; // retry
          continue;
        }

        occupiedDates.add(foundDateStr);
        generatedCount++;
        nextSession = session + 1;
      }

      // Update next_session_number
      if (nextSession !== schedule.next_session_number) {
        await supabase
          .from('recurring_schedules')
          .update({
            next_session_number: nextSession,
            updated_at: new Date().toISOString()
          })
          .eq('id', scheduleId);
      }

      return {
        success: true,
        generatedCount,
        conflicts: conflictsList
      };
    }

    // --- CASE B: Regular Recurring Schedule (DATE DRIVEN / OLD LOGIC) ---
    // 2. Calculate expected future dates
    const expectedDates = calculateExpectedDates(schedule, horizonDays);
    if (expectedDates.length === 0) {
      return { success: true, generatedCount: 0, conflicts: [] };
    }

    // 3. Fetch existing occurrences for this schedule in the window
    const { data: existing, error: existError } = await supabase
      .from('schedule_occurrences')
      .select('*')
      .eq('recurring_schedule_id', scheduleId);

    const existOccurrenceDates = new Set(existing?.map(e => e.occurrence_date) || []);

    // Get any exceptions
    const existOccurIds = existing?.map(e => e.id) || [];
    let exceptionsMap = new Map<string, any>();
    if (existOccurIds.length > 0) {
      const { data: exceptions } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .in('occurrence_id', existOccurIds);
      if (exceptions) {
        exceptions.forEach(ex => {
          exceptionsMap.set(ex.occurrence_id, ex);
        });
      }
    }

    // 4. Generate missing occurrences
    for (const dateStr of expectedDates) {
      // Check if it already exists or was cancelled
      if (existOccurrenceDates.has(dateStr)) {
        // If it exists, let's see if it's cancelled in schedule_occurrences
        const matchingOccur = existing?.find(e => e.occurrence_date === dateStr);
        if (matchingOccur && (matchingOccur.status === 'CANCELLED' || exceptionsMap.get(matchingOccur.id)?.status === 'CANCELLED')) {
          // Explicit exception or occurrence cancel - don't re-generate
          continue;
        }
        continue;
      }

      // Check conflicts
      const endTime = calculateEndTime(schedule.start_time, schedule.duration);
      const conflict = await checkConflicts(
        schedule.professional_id,
        dateStr,
        schedule.start_time,
        endTime
      );

      if (conflict.hasConflict) {
        conflictsList.push(`Data ${format(parseISO(dateStr), 'dd/MM')}: ${conflict.reason}`);
        if (!ignoreConflicts) {
          // Skip creation due to block if we don't choose to override
          continue;
        }
      }

      // We have a match! Write occurrence and appointment in Supabase
      // First, insert appointment
      const patientData = Array.isArray(schedule.patients) ? schedule.patients[0] : schedule.patients;
      const patientName = patientData?.full_name || 'Paciente Recorrente';
      const whatsapp = patientData?.whatsapp || '';

      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .insert({
          patient_id: schedule.patient_id,
          patient_name: patientName,
          whatsapp: whatsapp,
          fono_id: schedule.professional_id,
          appointment_date: dateStr,
          start_time: schedule.start_time,
          status: 'PENDENTE',
          recurring_schedule_id: schedule.id,
          appointment_type_id: schedule.appointment_type_id || null,
          treatment_enabled: false,
          treatment_total_sessions: null,
          treatment_session_number: null
        })
        .select('id')
        .single();

      if (apptError) {
        console.error('Error inserting recurrenced appointment:', apptError);
        continue;
      }

      // Create occurrence
      const { error: occurError } = await supabase
        .from('schedule_occurrences')
        .insert({
          recurring_schedule_id: schedule.id,
          appointment_id: appt.id,
          occurrence_date: dateStr,
          status: 'GENERATED'
        });

      if (occurError) {
        console.error('Error inserting schedule occurrence:', occurError);
        // clean up appointment
        await supabase.from('appointments').delete().eq('id', appt.id);
        continue;
      }

      generatedCount++;
    }

    return { 
      success: true, 
      generatedCount, 
      conflicts: conflictsList 
    };

  } catch (error: any) {
    console.error('Error generating occurrences:', error);
    return { success: false, generatedCount: 0, conflicts: [error.message] };
  }
}

/**
 * Reconciliation Engine (Algorithm section 6)
 * Compares current future generated occurrences against expected dates for a new rule,
 * returning KEEP, CREATE, and CANCEL rosters.
 */
export interface ReconciliationItem {
  date: string;
  action: 'KEEP' | 'CREATE' | 'CANCEL';
  occurrenceId?: string;
  appointmentId?: string;
}

export async function reconcileSchedules(
  scheduleId: string,
  newWeekdays: number[],
  newFrequencyType: FrequencyType,
  newIntervalValue: number,
  newStartsAt: string,
  newStartTime: string,
  startsFromDateStr: string, // Specific date starting from which changes apply
  horizonDays = 90
): Promise<ReconciliationItem[]> {
  // 1. Fetch current active occurrences on or after change startsFromDateStr
  const { data: occurrences } = await supabase
    .from('schedule_occurrences')
    .select('id, occurrence_date, appointment_id, status')
    .eq('recurring_schedule_id', scheduleId)
    .gte('occurrence_date', startsFromDateStr)
    .neq('status', 'CANCELLED');

  const oldFutureOccur = occurrences || [];
  const oldDates = oldFutureOccur.map(o => o.occurrence_date);

  // 2. Draft new temporary template to calculate expected dates
  const mockSchedule = {
    frequency_type: newFrequencyType,
    interval_value: newIntervalValue,
    weekdays: newWeekdays,
    starts_at: newStartsAt,
    effective_from: startsFromDateStr,
    effective_until: null,
  };

  const expectedNewDates = calculateExpectedDates(mockSchedule, horizonDays);

  const allDates = Array.from(new Set([...oldDates, ...expectedNewDates])).sort();
  const reconciliation: ReconciliationItem[] = [];

  for (const dt of allDates) {
    const isOld = oldDates.includes(dt);
    const isNew = expectedNewDates.includes(dt);
    const matchingOccur = oldFutureOccur.find(o => o.occurrence_date === dt);

    if (isOld && isNew) {
      reconciliation.push({
        date: dt,
        action: 'KEEP',
        occurrenceId: matchingOccur?.id,
        appointmentId: matchingOccur?.appointment_id || undefined
      });
    } else if (isNew && !isOld) {
      reconciliation.push({
        date: dt,
        action: 'CREATE'
      });
    } else if (isOld && !isNew) {
      reconciliation.push({
        date: dt,
        action: 'CANCEL',
        occurrenceId: matchingOccur?.id,
        appointmentId: matchingOccur?.appointment_id || undefined
      });
    }
  }

  return reconciliation;
}

/**
 * Handle fully versioned edits (Rule 5: Alteração de Frequência)
 */
export async function updateRecurringScheduleVersioned(
  scheduleId: string,
  updatedData: {
    weekdays: number[];
    frequency_type: FrequencyType;
    interval_value: number;
    start_time: string;
    duration: number;
    starts_at: string;
    ends_at?: string | null;
    appointment_type_id?: string | null;
  },
  applyFromDate: string, // date starting from which changes apply
  userId: string,
  ignoreConflicts = false
): Promise<{ success: boolean; newScheduleId?: string; conflicts: string[] }> {
  try {
    // 1. Fetch current active schedule
    const { data: schedule, error: fetchErr } = await supabase
      .from('recurring_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (fetchErr || !schedule) throw new Error('Original schedule not found');

    // Date calculations
    const prevDayStr = format(addDays(parseISO(applyFromDate), -1), 'yyyy-MM-dd');

    // 2. Step 1: Encerrar regra atual (set effective_until to the day before change)
    const { error: endError } = await supabase
      .from('recurring_schedules')
      .update({
        effective_until: prevDayStr,
        status: isBefore(parseISO(prevDayStr), parseISO(schedule.starts_at)) ? 'ENDED' : 'ACTIVE',
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (endError) throw new Error(`Failed to terminate previous rule: ${endError.message}`);

    // If terminated before it ever started, change status to ENDED
    const finalPrevDay = parseISO(prevDayStr);
    const originStarts = parseISO(schedule.starts_at);

    // 3. Step 2: Criar nova versão (version + 1, effective_from = applyFromDate)
    const { data: newSchedule, error: insertError } = await supabase
      .from('recurring_schedules')
      .insert({
        patient_id: schedule.patient_id,
        professional_id: schedule.professional_id,
        clinic_id: schedule.clinic_id,
        frequency_type: updatedData.frequency_type,
        interval_value: updatedData.interval_value,
        weekdays: updatedData.weekdays,
        start_time: updatedData.start_time,
        duration: updatedData.duration,
        starts_at: updatedData.starts_at,
        ends_at: updatedData.ends_at,
        effective_from: applyFromDate,
        effective_until: null,
        status: 'ACTIVE',
        parent_schedule_id: scheduleId,
        version: schedule.version + 1,
        appointment_type_id: updatedData.appointment_type_id,
        created_by: userId
      })
      .select('*')
      .single();

    if (insertError || !newSchedule) {
      // rollback previous rule effective_until
      await supabase.from('recurring_schedules').update({ effective_until: null }).eq('id', scheduleId);
      throw new Error(`Failed to insert new version: ${insertError?.message}`);
    }

    // 4. Step 3: Run reconciliation on future occurrences starting from applyFromDate
    const reconcItem = await reconcileSchedules(
      scheduleId,
      updatedData.weekdays,
      updatedData.frequency_type,
      updatedData.interval_value,
      updatedData.starts_at,
      updatedData.start_time,
      applyFromDate
    );

    const conflicts: string[] = [];

    for (const item of reconcItem) {
      if (item.action === 'CANCEL' && item.occurrenceId) {
        // Cancel occurrences & appointments
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'CANCELLED' })
          .eq('id', item.occurrenceId);

        if (item.appointmentId) {
          await supabase
            .from('appointments')
            .update({ 
               status: 'CANCELADO',
               cancel_reason: 'Alteração na regra de frequência recorrente'
            })
            .eq('id', item.appointmentId);
        }
      } else if (item.action === 'KEEP' && item.occurrenceId) {
        // Transfer custody: update schedule_occurrences to refer to new_schedule
        await supabase
          .from('schedule_occurrences')
          .update({ recurring_schedule_id: newSchedule.id })
          .eq('id', item.occurrenceId);

        if (item.appointmentId) {
          await supabase
            .from('appointments')
            .update({ recurring_schedule_id: newSchedule.id })
            .eq('id', item.appointmentId);
        }
      }
    }

    // 5. Step 4: Generate new occurrences for the brand new schedule!
    const genResult = await generateOccurrencesForSchedule(newSchedule.id, 90, ignoreConflicts);
    conflicts.push(...genResult.conflicts);

    return { 
      success: true, 
      newScheduleId: newSchedule.id, 
      conflicts 
    };

  } catch (error: any) {
    console.error('Error during versioned update:', error);
    return { success: false, conflicts: [error.message] };
  }
}

/**
 * Simple Direct Update of Recurring Schedule (Edit Mode - No Version Splitting)
 */
export async function updateRecurringScheduleSimple(
  scheduleId: string,
  updatedData: {
    weekdays: number[];
    frequency_type: FrequencyType;
    interval_value: number;
    start_time: string;
    duration: number;
    starts_at: string;
    ends_at?: string | null;
    appointment_type_id?: string | null;
    professional_id: string;
    treatment_enabled?: boolean;
    treatment_total_sessions?: number | null;
    next_session_number?: number | null;
  }
): Promise<{ success: boolean; error?: string; conflicts: string[] }> {
  try {
    const { data: currentSched } = await supabase
      .from('recurring_schedules')
      .select('status')
      .eq('id', scheduleId)
      .single();

    const existingStatus = currentSched?.status || 'ACTIVE';

    // 1. UPDATE standard fields in recurring_schedules directly
    const { error: updateError } = await supabase
      .from('recurring_schedules')
      .update({
        frequency_type: updatedData.frequency_type,
        interval_value: updatedData.interval_value,
        weekdays: updatedData.weekdays,
        start_time: updatedData.start_time,
        duration: updatedData.duration,
        starts_at: updatedData.starts_at,
        ends_at: updatedData.ends_at || null,
        appointment_type_id: updatedData.appointment_type_id || null,
        professional_id: updatedData.professional_id,
        treatment_enabled: updatedData.treatment_enabled || false,
        treatment_total_sessions: updatedData.treatment_total_sessions || null,
        next_session_number: updatedData.next_session_number || null,
        status: existingStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (updateError) {
      throw new Error(`Failed to update recurring schedule: ${updateError.message}`);
    }

    // 2. Clean up future occurrences & PENDENTE appointments of this schedule starting from today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { data: upcomingOccurrences, error: fetchOccurError } = await supabase
      .from('schedule_occurrences')
      .select('id, appointment_id')
      .eq('recurring_schedule_id', scheduleId)
      .gte('occurrence_date', todayStr);

    if (!fetchOccurError && upcomingOccurrences && upcomingOccurrences.length > 0) {
      const apptIds = upcomingOccurrences.map(o => o.appointment_id).filter(Boolean);
      if (apptIds.length > 0) {
        // Delete pending appointments to recreate fresh ones with the new rule properties (like time/duration/type)
        await supabase
          .from('appointments')
          .delete()
          .in('id', apptIds)
          .eq('status', 'PENDENTE');
      }

      const occurIds = upcomingOccurrences.map(o => o.id);
      await supabase
        .from('schedule_occurrences')
        .delete()
        .in('id', occurIds);
    }

    // 3. Re-generate occurrences for the updated schedule!
    const genResult = await generateOccurrencesForSchedule(scheduleId, 90, true);

    return {
      success: true,
      conflicts: genResult.conflicts
    };
  } catch (error: any) {
    console.error('Error in simple direct update:', error);
    return { success: false, error: error.message, conflicts: [] };
  }
}

