'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Trash2, Zap, Layout, FileText, Settings, Rocket } from 'lucide-react';
import Portal from './Portal';
import { Evolution, EvolutionStatus } from '@/lib/types';

interface EvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Evolution>) => void;
  onDelete?: (id: string) => void;
  evolution: Evolution | null;
  loading?: boolean;
}

const CATEGORIES = ['Core', 'UI/UX', 'Performance', 'Security', 'Integration', 'Automation'];
const STATUSES: { value: EvolutionStatus; label: string; color: string }[] = [
  { value: 'BACKLOG', label: 'Backlog', color: '#94a3b8' },
  { value: 'EM DESENVOLVIMENTO', label: 'Desenvolvimento', color: '#3b82f6' },
  { value: 'CONCLUÍDA', label: 'Concluída', color: '#10b981' },
  { value: 'CANCELADA', label: 'Cancelada', color: '#f43f5e' }
];

export default function EvolutionModal({ isOpen, onClose, onSave, onDelete, evolution, loading }: EvolutionModalProps) {
  const [formData, setFormData] = useState<Partial<Evolution>>({
    title: '',
    description: '',
    weight: 1,
    status: 'BACKLOG',
    category: 'Core',
    implementation_notes: ''
  });

  useEffect(() => {
    if (evolution) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(evolution);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: '',
        description: '',
        weight: 1,
        status: 'BACKLOG',
        category: 'Core',
        implementation_notes: ''
      });
    }
  }, [evolution, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F2C]/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl glass rounded-[40px] border border-white/10 overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]"
        >
          <div className="p-8 md:p-12">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FF6F00]/10 border border-[#FF6F00]/20 flex items-center justify-center text-[#FF6F00]">
                  <Rocket size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                    {evolution ? 'Parametria Técnica' : 'Nova Expansão'}
                  </h2>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Lifecycle de Evolução Estratégica</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Side: General Info */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Layout size={12} /> Título da Funcionalidade
                    </label>
                    <input
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-[#FF6F00]/50 transition-all"
                      placeholder="Ex: Refatoração do Motor de RLS..."
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <FileText size={12} /> Descrição Executiva
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-[#FF6F00]/50 min-h-[120px] transition-all"
                      placeholder="Qual o impacto desta evolução no core do sistema?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                         <Zap size={12} /> Peso (Tech Cost)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.weight}
                        onChange={e => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black text-xl outline-none focus:ring-2 focus:ring-[#FF6F00]/50 transition-all text-center"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                         Categoria
                      </label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-[18px] text-white font-black text-xs uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#FF6F00]/50 appearance-none cursor-pointer"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-[#0A0F2C]">{cat}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Side: Technical/Status */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Settings size={12} /> Status de Implementação
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {STATUSES.map(s => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s.value })}
                          className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            formData.status === s.value
                              ? `bg-[${s.color}]/10 border-[${s.color}]/30 text-[${s.color}]`
                              : 'bg-white/5 border-white/10 text-white/20 hover:bg-white/10'
                          }`}
                          style={formData.status === s.value ? { backgroundColor: `${s.color}15`, borderColor: `${s.color}40`, color: s.color } : {}}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                       Implementation Notes (Git/Changelog)
                    </label>
                    <textarea
                      value={formData.implementation_notes}
                      onChange={e => setFormData({ ...formData, implementation_notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[168px] transition-all"
                      placeholder="Notas técnicas de implementação, commits de referência ou dependências resolvidas..."
                    />
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                {evolution && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(evolution.id)}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={16} /> 
                    Remover do Sistema
                  </button>
                )}
                
                <div className="flex items-center gap-4 w-full md:w-auto ml-auto">
                   <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 md:flex-initial px-8 py-4 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-3 px-12 py-5 rounded-2xl bg-[#FF6F00] text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(255,111,0,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Efetivar Evolução
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
