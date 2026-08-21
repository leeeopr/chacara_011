/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Settings, Database, Server, Info, GitCommit, FileText } from 'lucide-react';
import { Evolution, EvolutionStatus } from '../types';
import { CATEGORIES, STATUS_STYLING } from '../constants';

interface CreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string | null;
    weight: number;
    category: string;
    status: EvolutionStatus;
    implementation_notes: string | null;
  }) => void;
  evolution: Evolution | null;
  loading: boolean;
}

export default function CreateEditModal({ isOpen, onClose, onSave, evolution, loading }: CreateEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(1);
  const [status, setStatus] = useState<EvolutionStatus>('BACKLOG');
  const [category, setCategory] = useState('Core');
  const [notes, setNotes] = useState('');

  // Sincronizar form ao abrir/mudar de item selecionado
  useEffect(() => {
    if (evolution) {
      setTitle(evolution.title || '');
      setDescription(evolution.description || '');
      setWeight(evolution.weight || 1);
      setStatus(evolution.status || 'BACKLOG');
      setCategory(evolution.category || 'Core');
      setNotes(evolution.implementation_notes || '');
    } else {
      setTitle('');
      setDescription('');
      setWeight(1);
      setStatus('BACKLOG');
      setCategory('Core');
      setNotes('');
    }
  }, [evolution, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Validate and clip weight to robust fallback limit
    const validatedWeight = Math.max(1, Math.min(10, weight));

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      weight: validatedWeight,
      category,
      status,
      implementation_notes: notes.trim() || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F2C]/85 backdrop-blur-2xl overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full max-w-4xl glass glass-reflection rounded-[40px] border border-white/10 overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.8)] max-h-[92vh] flex flex-col z-10"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6F00]/10 border border-[#FF6F00]/25 flex items-center justify-center text-[#FF6F00]">
              <Server size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">
                {evolution ? 'Parametria Técnica' : 'Cadastrar Expansão'}
              </h3>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.25em]">Módulo de Controle do Ecosystem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Column 1: Info */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <Database size={10} /> Título da Expansão *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Refatorar barramento de Mensageria"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold placeholder-white/20 outline-none focus:border-[#FF6F00]/50 focus:ring-1 focus:ring-[#FF6F00]/20 transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <FileText size={10} /> Descrição Detalhada
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qual o impacto e escopo técnico dessa implementação?"
                  className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#FF6F00]/50 focus:ring-1 focus:ring-[#FF6F00]/20 transition-all text-sm resize-none custom-scrollbar"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-1">
                    Custo Técnico (Peso)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={weight}
                    onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-black text-center focus:border-[#FF6F00]/50 focus:ring-1 focus:ring-[#FF6F00]/20 transition-all outline-none"
                  />
                  <p className="text-[8px] font-bold text-white/30 text-center uppercase tracking-widest leading-normal">
                    Máximo: 10 pts
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0E153E] border border-white/10 rounded-2xl px-4 py-[15px] text-white text-xs font-black uppercase tracking-wider outline-none focus:border-[#FF6F00]/50 cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#0A0F2C]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Column 2: Status & Specs */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <Settings size={10} /> Status de Atividade
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(STATUS_STYLING) as EvolutionStatus[]).map((st) => {
                    const style = STATUS_STYLING[st];
                    const active = status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`p-4 rounded-2xl border text-[9px] font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                          active
                            ? `text-white bg-white/10 border-[#FF6F00]/50 shadow-[0_0_15px_rgba(255,111,0,0.15)]`
                            : 'border-white/5 bg-white/[0.01] text-white/30 hover:bg-white/5 hover:text-white/60'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block mb-1"
                            style={{ backgroundColor: style.color }}
                          />
                          {style.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <GitCommit size={10} /> Notas Técnicas de Commit / Changelog
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione referências de hash de git, dependências ou segredos técnicos..."
                  className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-xs placeholder-white/20 outline-none focus:border-[#FF6F00]/50 focus:ring-1 focus:ring-[#FF6F00]/20 transition-all resize-none custom-scrollbar"
                />
              </div>

              <div className="p-4 rounded-xl border border-[#FF6F00]/10 bg-[#FF6F00]/5 flex items-start gap-3">
                <Info size={16} className="text-[#FF6F00] shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-white/50 leading-relaxed">
                  Ao criar registros com peso que exceda a capacidade residual do pack ativo, o sistema fechará o pack atual e abrirá um novo automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="border-t border-white/5 pt-8 flex items-center justify-end gap-4 bg-white/[0.01] -mx-10 -mb-10 p-10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-10 py-4.5 bg-[#FF6F00] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_10px_35px_rgba(255,111,0,0.3)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {evolution ? 'Salvar Alterações' : 'Efetivar Expansão'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
