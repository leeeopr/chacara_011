'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  X, ChevronDown, CalendarDays 
} from 'lucide-react';
import { 
  format, addDays, subDays, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, isSameMonth, isToday, 
  startOfWeek, endOfWeek, addMonths, subMonths, setMonth, setYear 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Portal from './Portal';

interface DateNavigatorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  viewMode?: 'day' | 'week' | 'month'; // Used to customize prev/next incremental jumps
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function DateNavigator({ 
  selectedDate, 
  onChange,
  viewMode = 'day'
}: DateNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState(selectedDate);
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);

  // Sync currentViewDate with selectedDate when the selectedDate changes
  if (selectedDate.getTime() !== prevSelectedDate.getTime()) {
    setPrevSelectedDate(selectedDate);
    setCurrentViewDate(selectedDate);
  }

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const handlePrev = () => {
    if (viewMode === 'day') {
      onChange(subDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      onChange(subDays(selectedDate, 7));
    } else if (viewMode === 'month') {
      onChange(subMonths(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      onChange(addDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      onChange(addDays(selectedDate, 7));
    } else if (viewMode === 'month') {
      onChange(addMonths(selectedDate, 1));
    }
  };

  const handleToday = () => {
    onChange(new Date());
  };

  const handleMonthChange = (monthIndex: number) => {
    const updated = setMonth(currentViewDate, monthIndex);
    setCurrentViewDate(updated);
  };

  const handleYearChange = (year: number) => {
    const updated = setYear(currentViewDate, year);
    setCurrentViewDate(updated);
  };

  const handleSelectDay = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentViewDate(subMonths(currentViewDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentViewDate(addMonths(currentViewDate, 1));
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentViewDate);
  const monthEnd = endOfMonth(currentViewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const daysGrid = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Generate Year range (currentYear - 15 to currentYear + 15)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - 15 + i);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-white relative w-full sm:w-auto" id="date-navigator-container">
      {/* Quick navigation controls */}
      <div className="flex items-center gap-1.5 bg-white/5 rounded-2xl p-1.5 border border-white/10 w-full sm:w-auto justify-between sm:justify-start" id="date-navigator-buttons">
        <button 
          onClick={handlePrev} 
          className="p-3.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white flex-1 sm:flex-initial flex justify-center items-center h-12 sm:h-9 cursor-pointer animate-press"
          style={{ minWidth: '44px', minHeight: '44px' }}
          title={viewMode === 'day' ? 'Dia anterior' : viewMode === 'week' ? 'Semana anterior' : 'Mês anterior'}
          id="date-navigator-prev-btn"
        >
          <ChevronLeft size={22} className="sm:w-[18px] sm:h-[18px]" />
        </button>
        <button 
          onClick={handleToday} 
          className="px-5 py-2.5 sm:px-3 sm:py-1.5 text-xs font-black uppercase tracking-widest text-[#FFD600] border border-[#FFD600]/20 hover:bg-[#FFD600]/10 rounded-xl transition-all h-12 sm:h-9 flex-1 sm:flex-initial flex items-center justify-center min-w-[80px] sm:min-w-0 cursor-pointer"
          style={{ minHeight: '44px' }}
          title="Ir para hoje"
          id="date-navigator-today-btn"
        >
          Hoje
        </button>
        <button 
          onClick={handleNext} 
          className="p-3.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white flex-1 sm:flex-initial flex justify-center items-center h-12 sm:h-9 cursor-pointer animate-press"
          style={{ minWidth: '44px', minHeight: '44px' }}
          title={viewMode === 'day' ? 'Próximo dia' : viewMode === 'week' ? 'Próxima semana' : 'Próximo mês'}
          id="date-navigator-next-btn"
        >
          <ChevronRight size={22} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>

      {/* Date picker display trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center sm:justify-start gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 py-3 sm:py-2 text-xs font-bold text-white hover:text-[#FFD600] transition-all shadow-md active:scale-[0.98] w-full sm:w-auto h-12 sm:h-9 min-h-[44px] cursor-pointer"
        title="Abrir seletor de calendário"
        id="date-navigator-picker-trigger"
      >
        <CalendarIcon size={16} className="text-[#FFD600]" />
        <span className="capitalize">{format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
        <ChevronDown size={14} className="opacity-60" />
      </button>

      {/* Portal-rendered Calendar Modal */}
      {isOpen && (
        <Portal>
          <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0A0F2C]/65 backdrop-blur-xl animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            id="date-navigator-backdrop"
          >
            {/* Modal Box */}
            <div 
              className="glass glass-reflection rounded-[32px] border border-white/10 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col gap-4 bg-[#0A0F2C] p-6 text-white animate-in scale-in duration-200"
              onClick={(e) => e.stopPropagation()}
              id="date-navigator-modal-box"
            >
              {/* Header / Title */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
                    <CalendarIcon size={16} className="text-[#FFD600]" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#FFD600] text-stroke-sm select-none">
                    Selecionar Data
                  </h2>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white cursor-pointer"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  title="Fechar"
                  id="date-navigator-close-btn"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Month & Year Selectors */}
              <div className="grid grid-cols-12 gap-2 mt-1">
                <div className="col-span-8 relative">
                  <select 
                    value={currentViewDate.getMonth()}
                    onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#FFD600] rounded-xl pl-3 pr-8 py-2.5 text-xs text-white appearance-none focus:outline-none font-bold h-11 cursor-pointer"
                    style={{ minHeight: '44px' }}
                    id="date-navigator-month-select"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx} className="bg-[#0A0F2C] text-white font-bold">{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>

                <div className="col-span-4 relative">
                  <select
                    value={currentViewDate.getFullYear()}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#FFD600] rounded-xl pl-3 pr-8 py-2.5 text-xs text-white appearance-none focus:outline-none font-bold h-11 cursor-pointer"
                    style={{ minHeight: '44px' }}
                    id="date-navigator-year-select"
                  >
                    {years.map(y => (
                      <option key={y} value={y} className="bg-[#0A0F2C] text-white font-bold">{y}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* Month-by-Month back & forth navigation cards */}
              <div className="flex items-center justify-between text-xs font-bold text-white/70 bg-white/5 p-1 rounded-xl mt-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors hover:text-white cursor-pointer"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  title="Mês anterior"
                  type="button"
                  id="date-navigator-prev-month"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="capitalize font-black tracking-wide text-xs">{format(currentViewDate, 'MMMM yyyy', { locale: ptBR })}</span>
                <button 
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors hover:text-white cursor-pointer"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  title="Próximo mês"
                  type="button"
                  id="date-navigator-next-month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Weekdays row */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-[#FFD600]/40 mt-1 select-none">
                <span>D</span>
                <span>S</span>
                <span>T</span>
                <span>Q</span>
                <span>Q</span>
                <span>S</span>
                <span>S</span>
              </div>

              {/* Active days grid layout */}
              <div className="grid grid-cols-7 gap-1 mt-1" id="date-navigator-days-grid">
                {daysGrid.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const currentMonth = isSameMonth(day, currentViewDate);
                  const isTodayDay = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleSelectDay(day)}
                      type="button"
                      className={`
                        aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all relative w-full cursor-pointer
                        ${!currentMonth ? 'text-white/20 hover:bg-white/5' : ''}
                        ${currentMonth && !isSelected ? 'text-white/85 hover:bg-white/10' : ''}
                        ${isSelected ? 'bg-[#FFD600] text-[#0A0F2C] font-black shadow-lg shadow-[#FFD600]/30 scale-105 z-10' : ''}
                      `}
                      id={`date-navigator-day-${format(day, 'yyyy-MM-dd')}`}
                      style={{ minWidth: '38px', minHeight: '38px' }}
                    >
                      <span className="relative z-10">{format(day, 'd')}</span>
                      {isTodayDay && !isSelected && (
                        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer action links / quick links */}
              <div className="border-t border-white/5 pt-4 mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-3 px-4 rounded-xl border border-white/10 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] cursor-pointer"
                  style={{ minHeight: '44px' }}
                  id="date-navigator-cancel-btn"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDay(new Date())}
                  className="flex-1 bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-3 px-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#FFD600]/10"
                  style={{ minHeight: '44px' }}
                  id="date-navigator-today-shortcut"
                >
                  <CalendarDays size={13} />
                  <span>Hoje</span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
