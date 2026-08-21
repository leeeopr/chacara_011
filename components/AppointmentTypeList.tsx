'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Clock, Hash, Edit2, Archive, ArchiveRestore, Layers, AlertCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppointmentType } from '@/lib/types';
import AppointmentTypeModal from './AppointmentTypeModal';
import { useAuth } from '@/contexts/AuthContext';

export default function AppointmentTypeList() {
  const { profile } = useAuth();
  const [types, setTypes] = useState<(AppointmentType & { is_active: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<(AppointmentType & { is_active: boolean }) | undefined>();

  const canManage = profile?.role === 'DONA' || profile?.role === 'admin' || profile?.role === 'SECRETARIA';

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointment_types')
        .select('*')
        .order('is_active', { ascending: false })
        .order('name');

      if (error) throw error;
      setTypes(data || []);
    } catch (err: any) {
      console.error('Error fetching types:', err);
      // Better error message for the user
      const message = err.message || err.details || 'Erro desconhecido ao carregar tipos';
      console.log('Detailed error:', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const filteredTypes = types.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (type: AppointmentType & { is_active: boolean }) => {
    if (!canManage) return;
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    if (!canManage) return;
    setSelectedType(undefined);
    setIsModalOpen(true);
  };

  const toggleStatus = async (type: AppointmentType & { is_active: boolean }) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('appointment_types')
        .update({ is_active: !type.is_active })
        .eq('id', type.id);
      
      if (error) throw error;
      fetchTypes();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {canManage && (
          <button
            onClick={handleNew}
            className="w-full sm:w-auto bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-3.5 px-8 rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.2)] hover:shadow-[0_0_30px_rgba(255,214,0,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
          >
            <Plus size={18} />
            Novo Tipo
          </button>
        )}
      </div>

      {!canManage && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-400 text-[10px] font-black uppercase tracking-widest">
          <AlertCircle size={16} />
          Visualização apenas. Alterações restritas a administradores.
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-[24px] bg-white/5 border border-white/10 animate-pulse" />
          ))
        ) : filteredTypes.length > 0 ? (
          filteredTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group glass glass-reflection rounded-[24px] p-5 border transition-all hover:scale-[1.02] ${
                type.is_active ? 'border-white/10' : 'border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0"
                    style={{ backgroundColor: `${type.color}22`, borderColor: `${type.color}44` }}
                  >
                    <Layers size={24} style={{ color: type.color }} />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-black text-white text-lg truncate uppercase tracking-tight">
                      {type.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        <Clock size={12} className="text-[#FFD600]" />
                        {type.duration_minutes} MIN
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        <DollarSign size={12} className="text-[#FFD600]" />
                        R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(type.default_price || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(type)}
                      className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all shadow-xl"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => toggleStatus(type)}
                      className={`p-2 hover:bg-white/10 rounded-lg transition-all shadow-xl ${
                        type.is_active ? 'text-rose-500/40 hover:text-rose-500' : 'text-emerald-500/40 hover:text-emerald-500'
                      }`}
                      title={type.is_active ? 'Arquivar' : 'Reativar'}
                    >
                      {type.is_active ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                    </button>
                  </div>
                )}
              </div>

              {!type.is_active && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded bg-white/5 text-[8px] font-black text-white/40 uppercase tracking-[0.2em] border border-white/10">
                    INATIVO
                  </div>
                  <span className="text-[9px] font-bold text-white/20 italic truncate">
                    Não aparecerá em novos agendamentos
                  </span>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/20 space-y-4">
            <Layers size={48} className="opacity-20" />
            <p className="font-black uppercase tracking-widest text-sm">Nenhum tipo encontrado</p>
          </div>
        )}
      </div>

      <AppointmentTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTypes}
        appointmentType={selectedType}
      />
    </div>
  );
}
