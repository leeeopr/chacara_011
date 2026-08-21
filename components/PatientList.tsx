'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, UserRound, Edit3, Trash2, Search, Filter, Users, UserX, AlertCircle, Calendar, FileDown, UserMinus, UserCheck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Patient, UserProfile } from '@/lib/types';
import PatientModal from './PatientModal';
import DeleteModal from './DeleteModal';
import PatientImport from './PatientImport';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientList({ 
  refreshKey,
  scrollRef 
}: { 
  refreshKey: number,
  scrollRef?: React.RefObject<HTMLDivElement | null>
}) {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Safety timeout for loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        console.warn('PatientList: Loading safety timeout reached. Forcing loading to false.');
        setLoading(false);
      }, 15000); // 15 seconds safety net
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  const [filter, setFilter] = useState<'all' | 'mine' | 'none'>('all');
  const [statusFilter, setStatusFilter] = useState<'ATIVO' | 'INATIVO' | 'ALL'>('ATIVO');
  const [confirmStatusChange, setConfirmStatusChange] = useState<{ patient: any; newStatus: 'ATIVO' | 'INATIVO' } | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Enforce FONO filter
  useEffect(() => {
    if (profile?.role === 'FONO') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilter('mine');
      setSelectedProfessionalId(profile.id);
    }
  }, [profile]);

  const handleDeleteClick = async (id: string) => {
    try {
      setLoading(true);
      // Check if patient has any appointment history in the appointments table
      const { count, error } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', id);

      if (error) throw error;

      if (count && count > 0) {
        setDeleteStatus({
          message: 'Não é possível excluir: paciente possui histórico de consultas. Use "Marcar como Inativo".',
          type: 'error'
        });
        setTimeout(() => setDeleteStatus(null), 5000);
        return;
      }

      setSelectedPatientId(id);
      setIsDeleteModalOpen(true);
    } catch (err: any) {
      console.error('Erro ao verificar histórico do paciente:', err);
      // Fallback: allow open
      setSelectedPatientId(id);
      setIsDeleteModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (patient: any, newStatus: 'ATIVO' | 'INATIVO') => {
    if (newStatus === 'INATIVO') {
      setConfirmStatusChange({ patient, newStatus });
    } else {
      executeStatusChange(patient.id, 'ATIVO');
    }
  };

  const executeStatusChange = async (patientId: string, newStatus: 'ATIVO' | 'INATIVO') => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({ status: newStatus })
        .eq('id', patientId);

      if (error) throw error;

      setDeleteStatus({
        message: newStatus === 'ATIVO' ? 'Paciente reativado com sucesso!' : 'Paciente marcado como Inativo.',
        type: 'success'
      });
      setTimeout(() => setDeleteStatus(null), 3000);
      setLocalRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status: ' + error.message);
    } finally {
      setConfirmStatusChange(null);
    }
  };

  const handleDeleteSuccess = () => {
    setDeleteStatus({ message: 'Paciente excluído com sucesso!', type: 'success' });
    setTimeout(() => setDeleteStatus(null), 3000);
    setLocalRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const fetchProfessionals = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['FONO', 'DONA'])
        .order('full_name', { ascending: true });
      if (data) setProfessionals(data as UserProfile[]);
    };
    fetchProfessionals();
  }, []);

  useEffect(() => {
    const fetchPatients = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setIsRefreshing(true);
      
      try {
        let query = supabase
          .from('patients')
          .select(`
            id,
            full_name,
            whatsapp,
            fono_id,
            birth_date,
            status
          `)
          .order('full_name', { ascending: true });

        if (filter === 'none') {
          query = query.is('fono_id', null);
        } else if (filter === 'mine' && selectedProfessionalId) {
          query = query.eq('fono_id', selectedProfessionalId);
        }

        if (statusFilter === 'ATIVO') {
          query = query.eq('status', 'ATIVO');
        } else if (statusFilter === 'INATIVO') {
          query = query.eq('status', 'INATIVO');
        }

        const [{ data, error }, { data: profilesData }] = await Promise.all([
          query,
          supabase.from('profiles').select('id, full_name').in('role', ['FONO', 'DONA'])
        ]);

        if (error) throw error;

        if (data) {
          const profilesMap = new Map(profilesData?.map(u => [u.id, u]) || []);
          const formattedData = data.map((item: any) => ({
            ...item,
            professional_name: profilesMap.get(item.fono_id)?.full_name || 'Sem profissional definido'
          }));
          setPatients(formattedData);
        }
      } catch (error: any) {
        console.warn('Busca de pacientes finalizada:', error?.message || error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchPatients(patients.length > 0);

    // Preserve scroll position if we have a scrollRef
    const currentScroll = scrollRef?.current?.scrollTop;

    // Restore scroll after a tick
    if (currentScroll !== undefined && scrollRef?.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = currentScroll;
        }
      }, 50);
    }
  }, [filter, selectedProfessionalId, statusFilter, refreshKey, localRefreshKey]);

  const handleEdit = (patient: any) => {
    setEditingPatient({
      id: patient.id,
      full_name: patient.full_name,
      whatsapp: patient.whatsapp,
      fono_id: patient.fono_id,
      birth_date: patient.birth_date,
      status: patient.status
    });
    setIsModalOpen(true);
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.whatsapp.includes(searchTerm) ||
      p.professional_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

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
            {deleteStatus.type === 'error' ? <AlertCircle size={20} className="text-rose-400" /> : <Users size={20} className="text-emerald-400" />}
            <span className="font-black uppercase tracking-widest text-xs">{deleteStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Section */}
      <div className="glass glass-reflection rounded-[32px] border border-white/5 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
              <FileDown size={20} className="text-[#FFD600]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Importação de Dados</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Sincronize pacientes via Excel (.xlsx)</p>
            </div>
          </div>
          <button 
            onClick={() => setShowImport(!showImport)}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              showImport 
                ? 'bg-white/10 text-white border border-white/20' 
                : 'bg-white/5 text-white/60 hover:text-white border border-transparent hover:border-white/10'
            }`}
          >
            {showImport ? 'Ocultar' : 'Configurar'}
          </button>
        </div>

        <AnimatePresence>
          {showImport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-white/5">
                <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
                  <p className="text-[10px] font-bold text-white/60 leading-relaxed">
                    Instruções: O arquivo deve conter o <span className="text-[#FFD600]">Nome</span> (A), <span className="text-[#FFD600]">Data de Nasc.</span> (B) e <span className="text-[#FFD600]">Nº Registro</span> (C). O sistema gerará automaticamente o nome formatado (Ex: João Silva - 123) e importará a data.
                  </p>
                </div>
                <PatientImport onSuccess={() => setLocalRefreshKey(prev => prev + 1)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Filters and Search */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between relative">
          {isRefreshing && (
            <div className="absolute -top-10 right-0 z-20">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#FFD600]"></div>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-4">
            {profile?.role !== 'FONO' && (
              <div className="flex flex-wrap items-center gap-2 p-1 glass rounded-2xl w-fit">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                    filter === 'all' 
                      ? 'bg-white/10 text-white shadow-inner border border-white/10' 
                      : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  <Users size={14} />
                  <span>Todos</span>
                </button>
                <button
                  onClick={() => setFilter('mine')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                    filter === 'mine' 
                      ? 'bg-[#FFD600]/20 text-[#FFD600] shadow-inner border border-[#FFD600]/20' 
                      : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  <UserRound size={14} />
                  <span>Por Profissional</span>
                </button>
                <button
                  onClick={() => setFilter('none')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                    filter === 'none' 
                      ? 'bg-rose-500/20 text-rose-400 shadow-inner border border-rose-500/20' 
                      : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  <UserX size={14} />
                  <span>Sem Profissional</span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 p-1 glass rounded-2xl w-fit">
              <button
                onClick={() => setStatusFilter('ATIVO')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                  statusFilter === 'ATIVO' 
                    ? 'bg-[#FFD600]/20 text-[#FFD600] shadow-inner border border-[#FFD600]/20' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <span>Ativos</span>
              </button>
              <button
                onClick={() => setStatusFilter('INATIVO')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                  statusFilter === 'INATIVO' 
                    ? 'bg-white/10 text-white shadow-inner border border-white/10' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <span>Inativos</span>
              </button>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
                  statusFilter === 'ALL' 
                    ? 'bg-white/10 text-white shadow-inner border border-white/10' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <span>Todos</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            {filter === 'mine' && profile?.role !== 'FONO' && (
              <div className="relative min-w-[200px]">
                <select
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-[#FFD600]/50 appearance-none cursor-pointer"
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                >
                  <option value="" className="bg-[#0A0F2C]">Selecionar Profissional</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0A0F2C]">{p.full_name}</option>
                  ))}
                </select>
                <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FFD600]" />
              </div>
            )}
            
            <div className="relative flex-1 sm:min-w-[300px]">
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
        </div>
      </div>
 
       {/* List */}
       {(loading && patients.length === 0) ? (
         <div className="flex justify-center py-12">
           <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FFD600]"></div>
         </div>
       ) : filteredPatients.length === 0 ? (
         <div className="text-center py-20 glass rounded-3xl border border-white/5">
           <User className="mx-auto text-white/10 mb-4" size={48} />
           <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-sm">Nenhum paciente encontrado.</p>
         </div>
       ) : (
         <div className="grid gap-4">
           {filteredPatients.map((patient, index) => (
             <motion.div
               key={patient.id}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: index * 0.03 }}
               className="glass glass-reflection p-6 rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-6 group relative"
             >
               <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 relative z-10">
                 <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 flex items-center justify-center shadow-inner group-hover:border-[#FFD600]/20 group-hover:text-[#FFD600] transition-all">
                     <User size={28} />
                   </div>
                   <div>
                     <h3 className="font-black text-white text-xl tracking-tight group-hover:text-[#FFD600] transition-colors flex items-center gap-2 flex-wrap">
                       {patient.full_name}
                       {patient.status === 'INATIVO' && (
                         <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/40 border border-white/5">
                           Inativo
                         </span>
                       )}
                     </h3>
                     <div className="flex flex-wrap items-center gap-4 text-white/40 text-xs font-bold mt-1">
                       <div className="flex items-center gap-2">
                         <Phone size={14} className="text-[#FFD600]" />
                         <span className="tracking-wider">{patient.whatsapp}</span>
                       </div>
                       {patient.birth_date && (
                         <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-[#FFD600]" />
                           <span className="tracking-wider">
                             {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                             {(() => {
                               const birth = new Date(patient.birth_date);
                               const today = new Date();
                               let age = today.getFullYear() - birth.getFullYear();
                               const m = today.getMonth() - birth.getMonth();
                               if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                                 age--;
                               }
                               return ` (${age} anos)`;
                             })()}
                           </span>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
 
                 <div className="space-y-1.5">
                   <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Profissional Responsável</p>
                   <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                     <UserRound size={14} className="text-[#FFD600]" />
                     <span className={`uppercase tracking-wider text-[11px] ${!patient.fono_id ? 'text-white/20' : ''}`}>
                       {patient.professional_name}
                     </span>
                   </div>
                 </div>
               </div>
 
               <div className="flex items-center gap-2 relative z-10 md:opacity-0 group-hover:opacity-100 transition-all self-end md:self-auto">
                 <button
                   onClick={() => handleEdit(patient)}
                   className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-[#FFD600] hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
                   title="Editar"
                 >
                   <Edit3 size={18} />
                 </button>
                 {patient.status === 'INATIVO' ? (
                   <button
                     onClick={() => handleToggleStatus(patient, 'ATIVO')}
                     className="w-10 h-10 flex items-center justify-center text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20"
                     title="Reativar Paciente"
                   >
                     <UserCheck size={18} />
                   </button>
                 ) : (
                   <button
                     onClick={() => handleToggleStatus(patient, 'INATIVO')}
                     className="w-10 h-10 flex items-center justify-center text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                     title="Marcar como Inativo"
                   >
                     <UserMinus size={18} />
                   </button>
                 )}
                 {profile?.role !== 'FONO' && (
                   <button
                     onClick={() => handleDeleteClick(patient.id)}
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
 
       <PatientModal
         key={editingPatient ? `edit-${editingPatient.id}` : 'new'}
         isOpen={isModalOpen}
         onClose={() => {
           setIsModalOpen(false);
           setEditingPatient(null);
         }}
         onSuccess={() => setLocalRefreshKey(prev => prev + 1)}
         patient={editingPatient || undefined}
       />
 
       <DeleteModal
         isOpen={isDeleteModalOpen}
         onClose={() => {
           setIsDeleteModalOpen(false);
           setSelectedPatientId(null);
         }}
         onSuccess={handleDeleteSuccess}
         id={selectedPatientId || ''}
         title="Excluir Paciente"
         description="Tem certeza que deseja excluir este paciente? Esta ação é irreversível e removerá todos os dados vinculados a este paciente."
         table="patients"
       />

      {/* Confirmation Modal for status change */}
      <AnimatePresence>
        {confirmStatusChange && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="glass glass-reflection rounded-[32px] w-full max-w-md overflow-hidden border border-white/10 shadow-2xl relative"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3 text-[#FFD600]">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
                    <UserX size={20} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-white">Inativar Paciente</h2>
                </div>
                <button
                  onClick={() => setConfirmStatusChange(null)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FFD600]/5 border border-[#FFD600]/10">
                  <AlertCircle size={20} className="text-[#FFD600] shrink-0 mt-0.5" />
                  <p className="text-white/80 text-sm font-medium leading-relaxed">
                    Este paciente será marcado como <strong>Inativo</strong>.
                    <br /><br />
                    Todo o histórico permanecerá salvo, porém ele deixará de aparecer nas listas operacionais.
                  </p>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setConfirmStatusChange(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 px-6 rounded-2xl border border-white/10 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => executeStatusChange(confirmStatusChange.patient.id, 'INATIVO')}
                    className="flex-1 bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-4 px-6 rounded-2xl shadow-lg shadow-[#FFD600]/10 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
                  >
                    Inativar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
