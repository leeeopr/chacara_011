'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gift, Phone, Loader } from 'lucide-react';
import { formatBirthdayMessage } from '@/lib/utils';

interface PatientBirthday {
  id: string;
  full_name: string;
  whatsapp: string;
  birth_date: string;
}

interface UnifiedBirthday {
  patient: PatientBirthday;
  period: 'today' | 'tomorrow' | 'weekend';
  label: string;
  badgeClass: string;
  hoverClass: string;
}

export default function BirthdayCard() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientBirthday[]>([]);
  const [birthdayTemplate, setBirthdayTemplate] = useState('');

  // Default Birthday Template
  const DEFAULT_BIRTHDAY_TEMPLATE = `Olá {primeiro_nome}! 🎉

Toda a equipe da clínica deseja um feliz aniversário!

Que seu novo ciclo seja repleto de saúde, felicidade e realizações.

Parabéns pelo seu dia! 🎂`;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch template
        const local = localStorage.getItem('birthday_template');
        let temp = local || DEFAULT_BIRTHDAY_TEMPLATE;

        const { data: settingsData } = await supabase
          .from('settings')
          .select('birthday_template')
          .eq('id', 1)
          .limit(1);

        if (settingsData && settingsData.length > 0 && settingsData[0].birthday_template) {
          temp = settingsData[0].birthday_template;
        }
        setBirthdayTemplate(temp);

        // 2. Fetch all patients with birth_date
        const { data: patientsData, error } = await supabase
          .from('patients')
          .select('id, full_name, whatsapp, birth_date')
          .eq('status', 'ATIVO')
          .not('birth_date', 'is', null);

        if (error) throw error;
        setPatients(patientsData || []);
      } catch (err: any) {
        console.warn('Busca de aniversariantes finalizada:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen to profile/patient updates to refresh list
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('patient-updated', handleUpdate);
    window.addEventListener('appointment-updated', handleUpdate);
    return () => {
      window.removeEventListener('patient-updated', handleUpdate);
      window.removeEventListener('appointment-updated', handleUpdate);
    };
  }, []);

  // Filter birthdays
  const getPeriods = () => {
    const today = new Date();
    
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    // Saturday and Sunday closest upcoming
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...

    const satDate = new Date(today);
    const daysToSaturday = (6 - currentDayOfWeek + 7) % 7;
    satDate.setDate(today.getDate() + daysToSaturday);

    const sunDate = new Date(today);
    const daysToSunday = (0 - currentDayOfWeek + 7) % 7;
    sunDate.setDate(today.getDate() + daysToSunday);

    const formatMMDD = (d: Date) => {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${m}-${day}`;
    };

    return {
      todayKey: formatMMDD(today),
      tomorrowKey: formatMMDD(tomorrow),
      satKey: formatMMDD(satDate),
      sunKey: formatMMDD(sunDate)
    };
  };

  const { todayKey, tomorrowKey, satKey, sunKey } = getPeriods();

  const getPatientMMDD = (birthDateStr: string) => {
    if (!birthDateStr) return '';
    const parts = birthDateStr.split('-');
    if (parts.length >= 3) {
      const month = parts[1].padStart(2, '0');
      const day = parts[2].substring(0, 2).padStart(2, '0');
      return `${month}-${day}`;
    }
    return '';
  };

  const todayBirthdays: PatientBirthday[] = [];
  const tomorrowBirthdays: PatientBirthday[] = [];
  const weekendBirthdays: PatientBirthday[] = [];

  patients.forEach((p) => {
    if (!p.birth_date) return;
    const pKey = getPatientMMDD(p.birth_date);
    if (!pKey) return;

    if (pKey === todayKey) {
      todayBirthdays.push(p);
    } else if (pKey === tomorrowKey) {
      tomorrowBirthdays.push(p);
    } else if ((pKey === satKey || pKey === sunKey) && pKey !== todayKey && pKey !== tomorrowKey) {
      weekendBirthdays.push(p);
    }
  });

  const handleSendWhatsApp = (p: PatientBirthday) => {
    if (!p.whatsapp) return;
    const cleaned = p.whatsapp.replace(/\D/g, '');
    const finalPhone = (cleaned.length === 10 || cleaned.length === 11) ? `55${cleaned}` : cleaned;
    
    const message = formatBirthdayMessage(birthdayTemplate || DEFAULT_BIRTHDAY_TEMPLATE, p.full_name);
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const formatBirthDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const day = parts[2].substring(0, 2).padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      return `${day}/${month}`;
    }
    return '';
  };

  // Build unified compact flat list
  const unifiedList: UnifiedBirthday[] = [];
  
  todayBirthdays.forEach(p => unifiedList.push({
    patient: p,
    period: 'today',
    label: 'Hoje',
    badgeClass: 'bg-pink-500/15 text-pink-400 border border-pink-500/20',
    hoverClass: 'hover:border-pink-500/20'
  }));

  tomorrowBirthdays.forEach(p => unifiedList.push({
    patient: p,
    period: 'tomorrow',
    label: 'Amanhã',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    hoverClass: 'hover:border-amber-500/20'
  }));

  weekendBirthdays.forEach(p => unifiedList.push({
    patient: p,
    period: 'weekend',
    label: 'Fim de Semana',
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20',
    hoverClass: 'hover:border-indigo-500/20'
  }));

  const totalCount = unifiedList.length;

  return (
    <div className="glass glass-reflection p-4 rounded-[24px] border border-white/5 relative overflow-hidden flex flex-col h-full min-h-0 bg-white/[0.01]">
      <div className="absolute -right-10 -top-10 w-24 h-24 blur-[40px] opacity-10 bg-pink-500" />
      
      {/* Card Header (highly compact) */}
      <div className="flex items-center justify-between mb-3 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
            <Gift size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">🎂 Aniversariantes</h3>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">
              {totalCount === 0 ? 'Nenhum próximo' : `${totalCount} ${totalCount === 1 ? 'próximo' : 'próximos'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Birthday Content List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 z-10 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-white/40">
            <Loader className="animate-spin" size={16} />
            <span className="text-[9px] font-black uppercase tracking-widest">Carregando...</span>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-white/40 text-[11px] font-bold">Nenhum aniversariante próximo.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {unifiedList.map(({ patient: p, label, badgeClass, hoverClass }) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-2.5 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-all group ${hoverClass}`}
              >
                <div className="min-w-0 pr-2 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[120px]">{p.full_name}</p>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 tracking-wider ${badgeClass}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[9px] text-white/40 font-bold mt-0.5">
                    Data: {formatBirthDateDisplay(p.birth_date)}
                  </p>
                </div>
                
                {p.whatsapp ? (
                  <button
                    onClick={() => handleSendWhatsApp(p)}
                    className="p-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-[#0A0F2C] transition-all border border-pink-500/10 cursor-pointer flex-shrink-0"
                    title="Enviar WhatsApp"
                  >
                    <Phone size={12} />
                  </button>
                ) : (
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-wider">Sem Tel</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

