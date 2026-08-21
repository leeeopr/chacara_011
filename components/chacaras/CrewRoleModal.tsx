'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Palette, FileText, AlertTriangle, Check, X } from 'lucide-react';
import { createCrewRole } from '@/services/crewService';

interface CrewRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CrewRoleModal({
  isOpen,
  onClose,
  onSuccess
}: CrewRoleModalProps) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const [descricao, setDescricao] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNome('');
      setCor('#3B82F6');
      setDescricao('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome da função.');
      return;
    }

    setLoading(true);

    try {
      await createCrewRole({
        nome: nome.trim(),
        cor: cor || '#3B82F6',
        icone: 'Tag',
        descricao: descricao.trim() || undefined,
        ativo: true,
        ordem_exibicao: 10
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[CrewRoleModal] Erro ao cadastrar função:', err);
      setErrorMessage(err.message || 'Erro ao criar função de equipe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0A0F2C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Nova Função de Equipe</h3>
              <p className="text-xs text-white/50">Cadastrar cargo ou especialidade operacional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nome da Função */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
              <Tag size={14} className="text-[#FFD600]" />
              Nome da Função
            </label>
            <input
              type="text"
              placeholder="Ex: Caseiro, Piscineiro, Faxineira"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD600]"
              required
            />
          </div>

          {/* Cor da Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
              <Palette size={14} className="text-[#FFD600]" />
              Cor da Tag de Exibição
            </label>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2.5 rounded-xl">
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer p-0"
              />
              <span className="text-xs font-mono font-bold text-white">{cor}</span>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
              <FileText size={14} className="text-[#FFD600]" />
              Descrição das Responsabilidades
            </label>
            <textarea
              rows={2}
              placeholder="Breve descrição dos deveres desta função..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD600] resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-fuchsia-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Cadastrar Função</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
