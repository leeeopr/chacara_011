'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRound, Edit3, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ProfessionalModal from './ProfessionalModal';
import DeleteModal from './DeleteModal';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfessionalList({ refreshKey }: { refreshKey: number }) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Safety timeout for loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        console.warn('ProfessionalList: Loading safety timeout reached. Forcing loading to false.');
        setLoading(false);
      }, 15000); // 15 seconds safety net
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);
  const [editingProfessional, setEditingProfessional] = useState<{ id: string; full_name: string; email: string; role: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  const handleDeleteClick = async (id: string) => {
    try {
      // Verificar se o profissional está sendo usado em appointments
      const { count: appCount, error: appCheckError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('fono_id', id);

      if (appCheckError) throw appCheckError;

      // Verificar se o profissional está sendo usado em patients
      const { count: patientCount, error: patientCheckError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('fono_id', id);

      if (patientCheckError) throw patientCheckError;

      if ((appCount && appCount > 0) || (patientCount && patientCount > 0)) {
        setDeleteStatus({
          message: 'Este profissional possui consultas ou pacientes vinculados e não pode ser excluído.',
          type: 'error'
        });
        setTimeout(() => setDeleteStatus(null), 4000);
        return;
      }

      setSelectedProfessionalId(id);
      setIsDeleteModalOpen(true);
    } catch (error) {
      console.error('Erro ao verificar dependências:', error);
      setDeleteStatus({ message: 'Erro ao verificar dependências do profissional.', type: 'error' });
      setTimeout(() => setDeleteStatus(null), 4000);
    }
  };

  const handleDeleteSuccess = () => {
    setDeleteStatus({
      message: 'Profissional excluído com sucesso!',
      type: 'success'
    });
    setTimeout(() => setDeleteStatus(null), 3000);
    fetchProfessionals();
  };

  const fetchProfessionals = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      if (data) setProfessionals(data);
    } catch (error: any) {
      console.warn('Busca de profissionais finalizada:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfessionals();
  }, [refreshKey, fetchProfessionals]);

  const handleEdit = (professional: { id: string; full_name: string; email: string; role: string }) => {
    setEditingProfessional(professional);
    setIsModalOpen(true);
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    DONA: 'Dona',
    FONO: 'Fonoaudiólogo(a)',
    SECRETARIA: 'Secretária'
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
            {deleteStatus.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-black uppercase tracking-widest text-xs">{deleteStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {professionals.map((prof, index) => {
          const isAdmin = profile?.role === 'admin' || profile?.role === 'DONA' || profile?.role === 'SECRETARIA';
          const isSecretaria = profile?.role === 'SECRETARIA';
          const isFono = profile?.role === 'FONO';
          
          // Secretária cannot edit DONA or admin or other Secretária
          const isHigherRole = prof.role === 'DONA' || prof.role === 'admin';
          const isOtherSecretaria = isSecretaria && prof.role === 'SECRETARIA' && prof.id !== profile?.id;
          
          const canEdit = isAdmin ? true : (isFono ? prof.id === profile?.id : !(isOtherSecretaria || isHigherRole));

          return (
            <motion.div
              key={prof.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass glass-reflection p-6 rounded-[28px] flex items-center justify-between group relative border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40 group-hover:text-[#FFD600] group-hover:border-[#FFD600]/20 group-hover:bg-[#FFD600]/5 transition-all shadow-inner">
                  <UserRound size={28} />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight group-hover:text-[#FFD600] transition-colors uppercase tracking-wider">{prof.full_name || 'Sem Nome'}</h3>
                  <p className="text-white/40 text-xs font-bold">{prof.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black uppercase tracking-widest text-[#FFD600]">
                    {roleLabels[prof.role] || prof.role}
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleEdit(prof)}
                    className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-[#FFD600] hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
                    title="Editar"
                  >
                    <Edit3 size={18} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteClick(prof.id)}
                      className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <ProfessionalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfessional(null);
        }}
        onSuccess={fetchProfessionals}
        professional={editingProfessional}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProfessionalId(null);
        }}
        onSuccess={handleDeleteSuccess}
        id={selectedProfessionalId || ''}
        title="Excluir Profissional"
        description="Tem certeza que deseja excluir este profissional? Esta ação é irreversível e removerá todos os dados vinculados a este profissional."
        table="profiles"
      />
    </div>
  );
}
