'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Appointment, ScheduleBlock } from '@/lib/types';
import { motion } from 'motion/react';
import { isToday, format } from 'date-fns';
import { Clock, UserRound, Repeat, Check, UserX } from 'lucide-react';

interface DayViewGridProps {
  appointments: Appointment[];
  currentDate: Date;
  onAppointmentClick: (appointment: Appointment) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scheduleBlocks?: ScheduleBlock[];
  onBlockClick?: (block: ScheduleBlock) => void;
  onStatusUpdate?: (id: string, newStatus: any) => Promise<void> | void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const PIXELS_PER_MINUTE = 2.2;
const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;

export default function DayViewGrid({ 
  appointments, 
  currentDate, 
  onAppointmentClick,
  scrollRef,
  onScroll,
  scheduleBlocks = [],
  onBlockClick,
  onStatusUpdate
}: DayViewGridProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollRef || internalRef;
  const lastScrolledDateRef = useRef<string>('');

  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Filter blocks that correspond to the current shown date or its recurring configurations
  const activeBlocks = useMemo(() => {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const appDayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    return scheduleBlocks.filter(block => {
      const mode = block.block_mode || 'single_day';

      switch (mode) {
        case 'single_day': {
          const targetDate = block.start_date || block.block_date;
          return targetDate === formattedDate;
        }
        case 'continuous_period': {
          if (!block.start_date || !block.end_date) return false;
          return formattedDate >= block.start_date && formattedDate <= block.end_date;
        }
        case 'weekly_recurring': {
          if (!block.weekdays || !Array.isArray(block.weekdays)) return false;
          return block.weekdays.includes(appDayOfWeek);
        }
        case 'weekly_within_period': {
          if (!block.start_date || !block.end_date || !block.weekdays || !Array.isArray(block.weekdays)) return false;
          const dateInRange = formattedDate >= block.start_date && formattedDate <= block.end_date;
          return dateInRange && block.weekdays.includes(appDayOfWeek);
        }
        default:
          return false;
      }
    });
  }, [scheduleBlocks, currentDate]);

  // Initial scroll logic
  useEffect(() => {
    const dateKey = currentDate.toDateString();
    if (containerRef.current && lastScrolledDateRef.current !== dateKey && appointments.length >= 0) {
      let targetMinutes = 0;
      
      if (isToday(currentDate)) {
        const now = new Date();
        targetMinutes = now.getHours() * 60 + now.getMinutes() - 60; // Scroll to 1 hour before current time
      } else if (appointments.length > 0) {
        const firstApp = [...appointments].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))[0];
        targetMinutes = timeToMinutes(firstApp.start_time) - 30; // Scroll to 30 mins before first app
      } else {
        targetMinutes = 8 * 60; // Default to 08:00
      }

      const scrollPos = Math.max(0, (targetMinutes - START_HOUR * 60) * PIXELS_PER_MINUTE);
      containerRef.current.scrollTop = scrollPos;
      lastScrolledDateRef.current = dateKey;
    }
  }, [currentDate, appointments, containerRef]);

  const processedAppointments = useMemo(() => {
    if (!appointments.length) return [];

    // Sort by start time
    const sorted = [...appointments].sort((a, b) => {
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });

    // Overlap detection
    const groups: Appointment[][] = [];
    let currentGroup: Appointment[] = [];
    let groupEndTime = 0;

    sorted.forEach(app => {
      const start = timeToMinutes(app.start_time);
      const duration = app.appointment_types?.duration_minutes || 30;
      const end = start + duration;

      if (start < groupEndTime) {
        currentGroup.push(app);
        groupEndTime = Math.max(groupEndTime, end);
      } else {
        if (currentGroup.length > 0) groups.push(currentGroup);
        currentGroup = [app];
        groupEndTime = end;
      }
    });
    if (currentGroup.length > 0) groups.push(currentGroup);

    // Assign columns within groups
    const positioned = groups.flatMap(group => {
      const columns: Appointment[][] = [];
      
      group.forEach(app => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const lastInCol = columns[i][columns[i].length - 1];
          const lastEnd = timeToMinutes(lastInCol.start_time) + (lastInCol.appointment_types?.duration_minutes || 30);
          if (timeToMinutes(app.start_time) >= lastEnd) {
            columns[i].push(app);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([app]);
        }
      });

      return group.map(app => {
        const colIndex = columns.findIndex(col => col.includes(app));
        return {
          ...app,
          colIndex,
          totalCols: columns.length
        };
      });
    });

    return positioned;
  }, [appointments]);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div 
      className="flex-1 overflow-y-auto relative custom-scrollbar bg-black/20 rounded-2xl border border-white/5 scroll-smooth h-full" 
      ref={containerRef}
      onScroll={onScroll}
    >
      <div className="flex relative" style={{ height: hours.length * HOUR_HEIGHT }}>
        {/* Time Column (Sticky) */}
        <div className="w-16 sm:w-20 sticky left-0 z-30 bg-[#0A0F2C]/95 backdrop-blur-sm border-r border-white/5 flex flex-col shrink-0">
          {hours.map(hour => (
            <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute -top-2 right-3 text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Grid Lines & Appointments */}
        <div className="flex-1 relative bg-white/[0.01]">
          {/* Horizontal Grid Lines */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              {/* Hour Line */}
              <div 
                className="absolute left-0 right-0 border-t border-white/10" 
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
              />
              {/* 15-min lines */}
              {[15, 30, 45].map(min => (
                <div 
                  key={min}
                  className="absolute left-0 right-0 border-t border-white/5 border-dashed" 
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + (min * PIXELS_PER_MINUTE) }}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Appointments */}
          <div className="absolute inset-0 ml-1 sm:ml-2 mr-1 sm:mr-4">
            {/* Visual Schedule Block Overlays */}
            {activeBlocks.map((block) => {
              const startMinutes = timeToMinutes(block.start_time);
              const endMinutes = timeToMinutes(block.end_time);
              const top = (startMinutes - START_HOUR * 60) * PIXELS_PER_MINUTE;
              const height = (endMinutes - startMinutes) * PIXELS_PER_MINUTE;

              if (startMinutes < START_HOUR * 60 || endMinutes > END_HOUR * 60 + 60) {
                return null;
              }

              return (
                <div
                  key={block.id}
                  onClick={() => onBlockClick?.(block)}
                  className="absolute right-0 left-0 border border-rose-500/20 rounded-xl cursor-pointer transition-all flex flex-col justify-center p-3 select-none hover:border-rose-500/40 opacity-80 hover:opacity-100"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundImage: 'repeating-linear-gradient(-45deg, rgba(244, 63, 94, 0.05) 0px, rgba(244, 63, 94, 0.05) 10px, rgba(244, 63, 94, 0.12) 10px, rgba(244, 63, 94, 0.12) 20px)',
                    borderLeft: '4px solid #f43f5e',
                    zIndex: 5
                  }}
                  title={`Bloqueado: ${block.reason || 'Bloqueio de Agenda'}`}
                >
                  <div className="flex items-center gap-1.5 text-rose-400 font-extrabold uppercase tracking-widest text-[8px] sm:text-[9px]">
                    <Clock size={11} className="shrink-0 text-rose-400" />
                    <span className="truncate">Bloqueado • {block.reason || 'Bloqueio de Agenda'}</span>
                  </div>
                  <div className="text-[8px] text-rose-350 font-bold mt-0.5 truncate uppercase tracking-wider">
                    {block.profiles?.full_name?.split(' ')[0]} ({block.start_time?.substring(0, 5)} - {block.end_time?.substring(0, 5)})
                  </div>
                </div>
              );
            })}

            {processedAppointments.map((app: any) => {
              const startMinutes = timeToMinutes(app.start_time);
              const appTypeData = Array.isArray(app.appointment_types) 
                ? app.appointment_types[0] 
                : app.appointment_types;
              
              const duration = appTypeData?.duration_minutes || 30;
              const top = (startMinutes - START_HOUR * 60) * PIXELS_PER_MINUTE;
              const height = duration * PIXELS_PER_MINUTE;
              const width = 100 / app.totalCols;
              const left = app.colIndex * width;

              const isCancelled = app.status === 'CANCELADO';
              const isAtendido = app.status === 'ATENDIDO';
              const isFaltou = app.status === 'FALTOU';
              const typeColor = appTypeData?.color || '#3b82f6';

              // Determine dynamic backgrounds and borders satisfying the visual instructions
              let cardBg = `${typeColor}22`;
              let cardBorder = `${typeColor}44`;
              let cardOpacity = 1;

              if (isCancelled) {
                cardBg = 'rgba(244, 63, 94, 0.1)';
                cardBorder = 'rgba(244, 63, 94, 0.3)';
                cardOpacity = 0.4;
              } else if (isAtendido) {
                cardBg = 'rgba(14, 165, 233, 0.12)';
                cardBorder = 'rgba(14, 165, 233, 0.45)';
                cardOpacity = 1;
              } else if (isFaltou) {
                cardBg = 'rgba(245, 158, 11, 0.04)';
                cardBorder = 'rgba(245, 158, 11, 0.35)';
                cardOpacity = 0.75;
              }

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: cardOpacity, scale: 1 }}
                  whileHover={{ scale: 1.01, zIndex: 30 }}
                  onClick={() => onAppointmentClick(app)}
                  className={`absolute rounded-xl border p-1.5 sm:p-2 cursor-pointer transition-all overflow-hidden shadow-lg group`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    zIndex: 10 + app.colIndex
                  }}
                >
                  <div className="flex flex-col h-full relative">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-black uppercase tracking-tight truncate flex items-center gap-1 ${
                        height < 40 ? 'text-[9px]' : 'text-[11px] sm:text-xs'
                      }`} style={{ 
                        color: isCancelled 
                          ? '#fb7185' 
                          : isAtendido 
                          ? '#38bdf8' 
                          : isFaltou 
                          ? '#fbbf24' 
                          : typeColor 
                      }}>
                        {app.recurring_schedule_id && (
                          <Repeat size={11} className="text-[#FFD600] shrink-0 inline" />
                        )}
                        <span>{app.patients?.full_name || app.patient_name}</span>
                        {app.treatment_enabled && app.treatment_session_number && app.treatment_total_sessions && (
                          <span className="text-[9px] text-[#FFD600] font-black shrink-0 px-1 bg-[#FFD600]/10 rounded border border-[#FFD600]/20">
                            {app.treatment_session_number}/{app.treatment_total_sessions}
                          </span>
                        )}
                        {app.is_continuation && (
                          <span 
                            className="text-[8px] sm:text-[9px] text-sky-400 font-black shrink-0 px-1 bg-sky-500/10 rounded border border-sky-500/20 uppercase tracking-wider"
                            title="Continuação de Atendimento"
                          >
                            Cont.
                          </span>
                        )}
                        {app.is_prolonged && (
                          <span 
                            className="text-[8px] sm:text-[9px] text-[#FFD600] font-black shrink-0 px-1 bg-[#FFD600]/10 rounded border border-[#FFD600]/20 uppercase tracking-wider"
                            title="Consulta Prolongada"
                          >
                            PROLONGADA
                          </span>
                        )}
                      </span>
                      {height >= 30 && (
                        <span className="text-[8px] sm:text-[9px] font-black text-white/40 whitespace-nowrap">
                          {app.start_time?.substring(0, 5)}
                        </span>
                      )}
                    </div>
                    
                    {height >= 45 && (
                      <div className="mt-0.5 sm:mt-1 flex items-center gap-1 text-[9px] sm:text-[10px] text-white/60 font-bold truncate">
                        <UserRound size={10} className="shrink-0" />
                        <span className="truncate">{app.profiles?.full_name || 'Não definida'}</span>
                      </div>
                    )}

                    {height >= 60 && app.treatment_enabled && app.treatment_session_number && app.treatment_total_sessions && (
                      <div className="mt-1 flex items-center gap-1 text-[8px] sm:text-[9px] text-[#FFD600]/80 font-black uppercase tracking-wider">
                        <span>● Sessão {app.treatment_session_number} de {app.treatment_total_sessions}</span>
                      </div>
                    )}

                    {height >= 60 && (
                      <div className="mt-auto flex items-center gap-1 text-[8px] sm:text-[9px] text-white/40 font-black uppercase tracking-widest">
                        <Clock size={10} />
                        <span>{duration} min</span>
                      </div>
                    )}

                    {/* Quick Access Status toggles directly in the card corner */}
                    {height >= 40 && !isCancelled && (
                      <div 
                        className="absolute right-0 bottom-0 flex items-center gap-1 z-30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onStatusUpdate?.(app.id, 'ATENDIDO')}
                          className={`rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                            isAtendido
                              ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                              : 'bg-[#151D42]/90 border-white/10 text-white/40 hover:bg-sky-500/15 hover:border-sky-500/20 hover:text-sky-300'
                          }`}
                          title="Marcar como Atendido"
                          style={{ width: '21px', height: '21px' }}
                        >
                          <Check size={11} className="stroke-[3]" />
                        </button>
                        <button
                          onClick={() => onStatusUpdate?.(app.id, 'FALTOU')}
                          className={`rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                            isFaltou
                              ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/30'
                              : 'bg-[#151D42]/90 border-white/10 text-white/40 hover:bg-amber-500/15 hover:border-amber-500/20 hover:text-amber-300'
                          }`}
                          title="Marcar Falta"
                          style={{ width: '21px', height: '21px' }}
                        >
                          <UserX size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Left accent bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 rounded-l-xl"
                    style={{ 
                      backgroundColor: isCancelled 
                        ? '#f43f5e' 
                        : isAtendido 
                        ? '#0ea5e9' 
                        : isFaltou 
                        ? '#f59e0b' 
                        : typeColor 
                    }}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Current Time Indicator */}
          {isToday(currentDate) && (
            <CurrentTimeIndicator startHour={START_HOUR} />
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator({ startHour }: { startHour: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const minutesFromStart = (now.getHours() * 60 + now.getMinutes()) - (startHour * 60);
  const top = minutesFromStart * PIXELS_PER_MINUTE;

  if (now.getHours() < startHour || now.getHours() >= END_HOUR) return null;

  return (
    <div 
      className="absolute left-0 right-0 z-40 pointer-events-none flex items-center"
      style={{ top: `${top}px` }}
    >
      <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
      <div className="flex-1 h-px bg-rose-500/60 shadow-[0_0_5px_rgba(244,63,94,0.3)]" />
      <div className="px-1.5 py-0.5 bg-rose-500 text-[8px] font-black text-white rounded-full ml-1 shadow-lg">
        {format(now, 'HH:mm')}
      </div>
    </div>
  );
}
