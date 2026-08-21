'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, UserRound, Save, Calendar, RefreshCw, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserProfile, Patient, Company } from '@/lib/types';
import { companiesService } from '@/services/companiesService';
import { useAuth } from '@/contexts/AuthContext';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient?: Patient;
}

export default function PatientModal({ isOpen, onClose, onSuccess, patient }: PatientModalProps) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: patient?.full_name || '',
    whatsapp: patient?.whatsapp || '',
    birth_date: patient?.birth_date || '',
    category: patient?.category || 'PARTICULAR',
    fono_id: patient?.fono_id?.toString() || (profile?.role === 'FONO' ? profile.id : ''),
    company_id: patient?.company_id || '',
    status: patient?.status || 'ATIVO',
  });

  // Keep state updated if patient changes
  useEffect(() => {
    if (patient) {
      setFormData({
        full_name: patient.full_name || '',
        whatsapp: patient.whatsapp || '',
        birth_date: patient.birth_date || '',
        category: patient.category || 'PARTICULAR',
        fono_id: patient.fono_id?.toString() || '',
        company_id: patient.company_id || '',
        status: patient.status || 'ATIVO',
      });
    }
  }, [patient]);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['FONO', 'DONA'])
          .order('full_name', { ascending: true });
        if (data) setProfessionals(data as UserProfile[]);
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
      }
    };

    const fetchCompanies = async () => {
      try {
        const data = await companiesService.getActiveCompanies();
        setCompanies(data);
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      }
    };

    if (isOpen) {
      fetchProfessionals();
      fetchCompanies();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhone = formData.whatsapp.replace(/\D/g, '');

      const payload = {
        full_name: formData.full_name,
        whatsapp: cleanPhone,
        birth_date: formData.birth_date || null,
        category: formData.category,
        fono_id: formData.fono_id || null,
        company_id: formData.company_id || null,
        status: formData.status,
      };

      let error;
      if (patient?.id) {
        const { error: updateError } = await supabase
          .from('patients')
          .update(payload)
          .eq('id', patient.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('patients')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar paciente:', JSON.stringify(error, null, 2));
      alert('Erro ao salvar paciente: ' + (error.message || 'Erro desconhecido. Verifique as permissões de banco de dados.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0F2C]/60 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl relative"
          >
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFD600]/10 flex items-center justify-center border border-[#FFD600]/20">
                  <User size={20} className="text-[#FFD600]" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {patient ? 'Editar Paciente' : 'Novo Paciente'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={14} className="text-[#FFD600]" /> Nome Completo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Nome completo do paciente"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Phone size={14} className="text-[#FFD600]" /> WhatsApp *
                </label>
                <input
                  required
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar size={14} className="text-[#FFD600]" /> Data de Nascimento
                </label>
                <input
                  type="date"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold [color-scheme:dark]"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <RefreshCw size={14} className="text-[#FFD600]" /> Categoria *
                </label>
                <select
                  required
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                  value={formData.category}
                  onChange={(e) => {
                    const category = e.target.value as any;
                    setFormData({
                      ...formData,
                      category,
                      // Clear company when category switches away from CONVENIO
                      company_id: category !== 'CONVENIO' ? '' : formData.company_id
                    });
                  }}
                >
                  <option value="PARTICULAR" className="bg-[#0A0F2C]">PARTICULAR</option>
                  <option value="SUS" className="bg-[#0A0F2C]">SUS</option>
                  <option value="CONVENIO" className="bg-[#0A0F2C]">CONVÊNIO</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Building2 size={14} className="text-[#FFD600]" /> Empresa / Convênio Corp.
                </label>
                <select
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                  value={formData.company_id || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ 
                      ...formData, 
                      company_id: val,
                      category: val ? 'CONVENIO' : formData.category
                    });
                  }}
                >
                  <option value="" className="bg-[#0A0F2C]">Particular (Nenhuma)</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id} className="bg-[#0A0F2C]">
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <UserRound size={14} className="text-[#FFD600]" /> Profissional Responsável
                </label>
                <select
                  disabled={profile?.role === 'FONO'}
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer disabled:opacity-50"
                  value={formData.fono_id}
                  onChange={(e) => setFormData({ ...formData, fono_id: e.target.value })}
                >
                  <option value="" className="bg-[#0A0F2C]">Sem profissional definido</option>
                  {professionals.map((prof) => (
                    <option key={prof.id} value={prof.id} className="bg-[#0A0F2C]">
                      {prof.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <RefreshCw size={14} className="text-[#FFD600]" /> Status *
                </label>
                <select
                  required
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ATIVO' | 'INATIVO' })}
                >
                  <option value="ATIVO" className="bg-[#0A0F2C]">ATIVO</option>
                  <option value="INATIVO" className="bg-[#0A0F2C]">INATIVO</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.2)] hover:shadow-[0_0_30px_rgba(255,214,0,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0A0F2C]/30 border-t-[#0A0F2C]"></div>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>Salvar Paciente</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
