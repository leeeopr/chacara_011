'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserRound, Save, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ProfessionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  professional?: { id: string; full_name: string; email: string; role: string } | null;
}

export default function ProfessionalModal({ isOpen, onClose, onSuccess, professional }: ProfessionalModalProps) {
  const { profile } = useAuth();
  const [full_name, setFullName] = useState('');
  const [role, setRole] = useState('SECRETARIA');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (professional) {
      setFullName(professional.full_name || '');
      setRole(professional.role || 'SECRETARIA');
    } else {
      setFullName('');
      setRole('SECRETARIA');
    }
  }, [professional, isOpen]);

  const roles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'DONA', label: 'Dona' },
    { value: 'FONO', label: 'Fonoaudiólogo(a)' },
    { value: 'SECRETARIA', label: 'Secretária' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!full_name.trim()) return;

    setLoading(true);
    try {
      if (professional) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ full_name, role })
          .eq('id', professional.id)
          .select();
          
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Sem permissão para atualizar este perfil ou perfil não encontrado.');
        }
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro detalhado ao salvar usuário:', error);
      const errorMessage = error.message || error.details || 'Erro desconhecido';
      alert(`Erro ao salvar usuário: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#0A0F2C]/60 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-md overflow-hidden border border-black/5 dark:border-white/10 shadow-2xl relative"
          >
            <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
                  <UserRound size={20} className="text-[#FFD600]" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Editar Usuário
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em] ml-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={full_name}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Dra. Maria Silva"
                  className="w-full px-5 py-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em] ml-1">
                  Cargo / Função
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={profile?.role !== 'DONA' && profile?.role !== 'admin' && profile?.role !== 'SECRETARIA'}
                    className="w-full px-5 py-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none disabled:opacity-50 cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-white/20">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.2)] hover:shadow-[0_0_30px_rgba(255,214,0,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-[#0A0F2C]/30 border-t-[#0A0F2C] rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Atualizar</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
