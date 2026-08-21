'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  DoorClosed, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  Calendar,
  User,
  ArrowUpRight
} from 'lucide-react';
import { MaintenanceRecord, MAINTENANCE_PRIORITY_META, MAINTENANCE_STATUS_META } from '@/lib/roomsMaintenanceTypes';
import { getMaintenanceRecords } from '@/services/roomsMaintenanceService';
import { TabType } from '../ChacarasSidebar';

interface DashboardMaintenanceWidgetProps {
  onNavigateToChacaras: (tab: TabType) => void;
}

export default function DashboardMaintenanceWidget({
  onNavigateToChacaras
}: DashboardMaintenanceWidgetProps) {
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const records = await getMaintenanceRecords();
      setMaintenances(records);
    } catch (e) {
      console.warn('Erro ao carregar manutenções no dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const activeMaints = maintenances.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'CANCELADA' && !m.is_deleted);
  const urgentMaints = activeMaints.filter(m => m.priority === 'URGENTE');
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueMaints = activeMaints.filter(m => m.due_date && m.due_date < todayStr);

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Wrench size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Manutenções nos Cômodos</span>
              {urgentMaints.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase animate-pulse">
                  {urgentMaints.length} Urgente{urgentMaints.length > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <p className="text-xs text-white/50">Reparos ativos nos ambientes das propriedades</p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToChacaras('chacaras')}
          className="text-xs font-bold text-[#FFD600] hover:underline flex items-center gap-1"
        >
          <span>Ver Chácaras</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Quick Summary Pill Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
          <p className="text-[10px] uppercase font-bold text-white/40">Total Abertas</p>
          <p className="text-base font-black text-white">{activeMaints.length}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
          <p className="text-[10px] uppercase font-bold text-rose-300">Urgentes</p>
          <p className="text-base font-black text-rose-400">{urgentMaints.length}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-[10px] uppercase font-bold text-amber-300">Atrasadas</p>
          <p className="text-base font-black text-amber-400">{overdueMaints.length}</p>
        </div>
      </div>

      {/* Maintenances List */}
      {loading ? (
        <div className="space-y-2 py-4">
          {[1, 2].map(i => <div key={i} className="h-14 bg-white/5 animate-pulse rounded-xl" />)}
        </div>
      ) : activeMaints.length === 0 ? (
        <div className="text-center py-6 bg-white/[0.02] rounded-2xl border border-white/5">
          <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-white">Todos os ambientes 100% operacionais!</p>
          <p className="text-[11px] text-white/40 mt-0.5">Nenhuma manutenção pendente nas chácaras.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {activeMaints.slice(0, 5).map((m) => {
            const pMeta = MAINTENANCE_PRIORITY_META[m.priority] || MAINTENANCE_PRIORITY_META.MEDIA;
            const sMeta = MAINTENANCE_STATUS_META[m.status] || MAINTENANCE_STATUS_META.IDENTIFICADA;

            return (
              <div
                key={m.id}
                onClick={() => onNavigateToChacaras('chacaras')}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFD600]/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${pMeta.badgeBg}`}>
                    <Wrench size={14} />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${pMeta.badgeBg}`}>
                        {pMeta.label}
                      </span>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#FFD600] transition-colors truncate">
                        {m.title}
                      </h4>
                    </div>
                    <p className="text-[10px] text-white/50 truncate mt-0.5">
                      {m.chacara_name || 'Chácara'} • <span className="text-white/80">{m.room_name || 'Cômodo'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sMeta.badgeBg}`}>
                    {sMeta.label}
                  </span>
                  {m.due_date && (
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {new Date(m.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
