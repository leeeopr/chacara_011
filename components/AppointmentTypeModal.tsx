'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Palette, Hash, Save, AlertCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppointmentType } from '@/lib/types';
import { createPortal } from 'react-dom';

interface AppointmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentType?: AppointmentType & { is_active?: boolean }; // Optional for edit
}

const PRESET_COLORS = [
  '#FFD600', // Amarelo
  '#3b82f6', // Azul
  '#10b981', // Verde
  '#f43f5e', // Rosa/Vermelho
  '#8b5cf6', // Roxo
  '#f59e0b', // Laranja
  '#06b6d4', // Ciano
  '#ec4899', // Pink
];

export default function AppointmentTypeModal({ isOpen, onClose, onSuccess, appointmentType }: AppointmentTypeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: 50,
    color: '#FFD600',
    is_active: true,
    default_price: 0,
  });

  useEffect(() => {
    setMounted(true);
    if (appointmentType) {
      setFormData({
        name: appointmentType.name,
        duration_minutes: appointmentType.duration_minutes,
        color: appointmentType.color || '#FFD600',
        is_active: appointmentType.is_active ?? true,
        default_price: appointmentType.default_price ?? 0,
      });
    } else {
      setFormData({
        name: '',
        duration_minutes: 50,
        color: '#FFD600',
        is_active: true,
        default_price: 0,
      });
    }
  }, [appointmentType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (appointmentType?.id) {
        const { error: updateError } = await supabase
          .from('appointment_types')
          .update(formData)
          .eq('id', appointmentType.id);
        
        if (updateError) {
          // Fallback if default_price column doesn't exist in Supabase yet
          if (updateError.message && (updateError.message.includes('default_price') || updateError.message.includes('column'))) {
            const { default_price, ...cleanData } = formData;
            const { error: retryError } = await supabase
              .from('appointment_types')
              .update(cleanData)
              .eq('id', appointmentType.id);
            if (retryError) throw retryError;
          } else {
            throw updateError;
          }
        }
      } else {
        const { error: insertError } = await supabase
          .from('appointment_types')
          .insert([formData]);
        
        if (insertError) {
          // Fallback if default_price column doesn't exist in Supabase yet
          if (insertError.message && (insertError.message.includes('default_price') || insertError.message.includes('column'))) {
            const { default_price, ...cleanData } = formData;
            const { error: retryError } = await supabase
              .from('appointment_types')
              .insert([cleanData]);
            if (retryError) throw retryError;
          } else {
            throw insertError;
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving appointment type:', err);
      const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0A0F2C]/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass glass-reflection rounded-[32px] w-full max-w-md overflow-hidden border border-white/10 shadow-2xl relative"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: `${formData.color}22`, borderColor: `${formData.color}44` }}
                >
                  <Hash size={20} style={{ color: formData.color }} />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {appointmentType ? 'Editar Tipo' : 'Novo Tipo'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold uppercase tracking-widest animate-shake">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  Nome do Tipo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Terapia, Avaliação..."
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Clock size={14} className="text-[#FFD600]" /> Duração (minutos) *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                />
              </div>

              {/* Default Price */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                   <DollarSign size={14} className="text-[#FFD600]" /> Preço Padrão (Particular)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#FFD600]/50 focus:border-[#FFD600]/50 outline-none transition-all font-bold"
                  value={formData.default_price !== undefined && formData.default_price !== null ? formData.default_price : ''}
                  onChange={(e) => setFormData({ ...formData, default_price: e.target.value ? parseFloat(e.target.value) : 0 })}
                />
              </div>

              {/* Color Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Palette size={14} className="text-[#FFD600]" /> Identidade Visual (Cor)
                </label>
                
                <div className="flex flex-wrap gap-3 p-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-10 h-10 rounded-xl border-2 transition-all active:scale-95 ${
                        formData.color === c ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  
                  {/* Custom Color Input */}
                  <div className="relative group">
                    <input
                      type="color"
                      className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                    <div 
                      className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                        !PRESET_COLORS.includes(formData.color) ? 'border-white scale-110' : 'border-white/10'
                      }`}
                      style={{ backgroundColor: formData.color }}
                    >
                      <Hash size={12} className="mix-blend-difference text-white" />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-2 p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center gap-4">
                  <div 
                    className="h-10 w-1 rounded-full" 
                    style={{ backgroundColor: formData.color }}
                  />
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Preview na Agenda</p>
                    <p className="text-sm font-bold text-white">Paciente Exemplo</p>
                    <p className="text-[10px] font-bold text-white/40">14:00 - {formData.duration_minutes} min</p>
                  </div>
                </div>
              </div>

              {/* is_active Toggle (Edit Only) */}
              {appointmentType && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Ativo / Em uso</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-[#FFD600]' : 'bg-white/10'}`}
                  >
                    <div 
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_active ? 'right-1' : 'left-1'}`}
                    />
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#0A0F2C] font-black py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(255,214,0,0.2)] hover:shadow-[0_0_30px_rgba(255,214,0,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#0A0F2C] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {loading ? 'Salvando...' : 'Salvar Tipo'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
