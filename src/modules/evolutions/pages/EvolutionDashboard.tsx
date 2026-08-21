'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutGrid, ShieldAlert, Sliders, RefreshCw, Layers } from 'lucide-react';
import { useEvolutions } from '../hooks/useEvolutions';
import { useEvolutionPacks } from '../hooks/useEvolutionPacks';
import { useEvolutionCapacity } from '../hooks/useEvolutionCapacity';
import { useEvolutionPermissions } from '../hooks/useEvolutionPermissions';
import { Evolution } from '../types';
import { techLog } from '../utils/calculations';

import EvolutionHeader from '../components/EvolutionHeader';
import EvolutionPackCard from '../components/EvolutionPackCard';
import CreateEditModal from '../components/CreateEditModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function EvolutionDashboard() {
  const { canView, canCreate, canUpdate, canDelete, loading: permissionsLoading } = useEvolutionPermissions();
  
  const { 
    evolutions, 
    loading: evolutionsLoading, 
    actionLoading, 
    createEvolution, 
    updateEvolution, 
    deleteEvolution, 
    refreshEvolutions 
  } = useEvolutions();

  const { 
    packs, 
    loading: packsLoading, 
    refreshPacks 
  } = useEvolutionPacks();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvo, setEditingEvo] = useState<Evolution | null>(null);
  const [deletingEvo, setDeletingEvo] = useState<Evolution | null>(null);
  const [syncKey, setSyncKey] = useState(0);

  // Read-only calculations derived on-the-fly
  const stats = useEvolutionCapacity(packs, evolutions);

  // Trigger parallel load
  useEffect(() => {
    if (canView) {
      techLog('General', 'Initiating parallel fetch pipeline [packs, evolutions]');
      Promise.all([refreshPacks(), refreshEvolutions()]).catch(err => {
        console.error('Erro na revalidação dabase (pipeline de fetch):', err);
        alert('Erro ao carregar os dados de evolução: ' + (err?.message || 'Falha de conexão.'));
      });
    }
  }, [canView, refreshPacks, refreshEvolutions, syncKey]);

  const handleSaveEvo = async (data: {
    title: string;
    description: string | null;
    weight: number;
    category: string;
    status: any;
    implementation_notes: string | null;
  }) => {
    try {
      if (editingEvo) {
        techLog('General', `Submitting updates on evolution technical records id ${editingEvo.id}`);
        await updateEvolution(editingEvo.id, data);
      } else {
        techLog('General', 'Submitting creation payload with rollover query check');
        await createEvolution(data);
      }
      setSyncKey(prev => prev + 1);
      setIsCreateOpen(false);
      setEditingEvo(null);
    } catch (err: any) {
      console.error('Error implementing change:', err);
      alert('Erro ao salvar evolução: ' + (err?.message || 'Falha na persistência de dados.'));
    }
  };

  const handleDeleteTrigger = (evo: Evolution) => {
    setDeletingEvo(evo);
    setIsCreateOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEvo) return;
    try {
      techLog('General', `Submitting permanent technical record deletion on id ${deletingEvo.id}`);
      await deleteEvolution(deletingEvo.id);
      setSyncKey(prev => prev + 1);
      setDeletingEvo(null);
      setEditingEvo(null);
    } catch (err: any) {
      console.error('Error executing deletion:', err);
      alert('Erro ao excluir evolução: ' + (err?.message || 'Falha na persistência de dados.'));
    }
  };

  const handleManualSync = () => {
    techLog('General', 'Manual synchronization trigger received');
    setSyncKey(prev => prev + 1);
  };

  const screenLoading = permissionsLoading || ((evolutionsLoading || packsLoading) && packs.length === 0);

  // 1. Loading Overlay Skeletons
  if (screenLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
        {/* Skeleton Header */}
        <div className="glass rounded-[40px] border border-white/5 p-12 space-y-6 animate-pulse">
          <div className="w-36 h-6 bg-white/5 rounded-full" />
          <div className="w-2/3 h-12 bg-white/5 rounded-2xl" />
          <div className="w-1/2 h-4 bg-white/5 rounded-lg" />
        </div>

        {/* Skeleton Grid */}
        <div className="space-y-6 animate-pulse">
          <div className="w-48 h-8 bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 glass rounded-[30px] border border-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Permission Lock Fallback
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-44 px-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-lg">
          <ShieldAlert size={36} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Acesso Privilegiado</h3>
          <p className="text-white/40 text-sm mt-2 max-w-md mx-auto">
            Seu perfil atual não possui permissões operacionais para auditar ou interagir com o roadmap estratégico do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Active Pack telemetry banner */}
      <EvolutionHeader
        pack={stats.activePack}
        consumedWeight={stats.consumed_weight}
        remainingWeight={stats.remaining_weight}
        percentage={stats.completion_percentage}
        evolutionCount={stats.evolution_count}
        canCreate={canCreate}
        onNewClick={() => {
          setEditingEvo(null);
          setIsCreateOpen(true);
        }}
      />

      {/* Grid List Header Selector */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
            <Layers size={18} />
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Histórico de Linha de Evolução</h3>
        </div>

        <button
          onClick={handleManualSync}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 hover:border-white/15 text-white/50 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider bg-white/[0.005] active:scale-95 cursor-pointer"
        >
          <RefreshCw size={12} className={evolutionsLoading || packsLoading ? 'animate-spin' : ''} />
          Revalidar Database
        </button>
      </div>

      {/* Roadmap List & Detail Blocks */}
      {packs.length === 0 ? (
        <div className="py-24 glass rounded-[40px] border border-white/5 text-center space-y-4">
          <LayoutGrid size={48} className="mx-auto text-white/10" />
          <h4 className="text-base font-black text-white uppercase tracking-wider">Nenhum Pack Expandido</h4>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            Crie sua primeira evolução para inicializar automaticamente o Pack #1 e colocar o Roadmap do Ecosystem online.
          </p>
          {canCreate && (
            <button
              onClick={() => {
                setEditingEvo(null);
                setIsCreateOpen(true);
              }}
              className="px-6 py-3 bg-[#FF6F00] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer"
            >
              Iniciar Ecosystem
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {packs.map(pack => (
            <EvolutionPackCard
              key={pack.id}
              pack={pack}
              evolutions={evolutions.filter(evo => evo.pack_id === pack.id)}
              onEditEvolution={(evo) => {
                setEditingEvo(evo);
                setIsCreateOpen(true);
              }}
              canEdit={canUpdate}
            />
          ))}
        </div>
      )}

      {/* Dynamic Modal Panels */}
      <AnimatePresence mode="wait">
        {isCreateOpen && (
          <CreateEditModal
            isOpen={isCreateOpen}
            onClose={() => {
              setIsCreateOpen(false);
              setEditingEvo(null);
            }}
            onSave={handleSaveEvo}
            evolution={editingEvo}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {editingEvo && canDelete && (
          <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-5">
            <button
              type="button"
              onClick={() => handleDeleteTrigger(editingEvo)}
              className="flex items-center gap-2 px-6 py-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 shadow-lg cursor-pointer"
            >
              Remover Registro Selecionado
            </button>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {deletingEvo && (
          <DeleteConfirmationModal
            isOpen={!!deletingEvo}
            onClose={() => setDeletingEvo(null)}
            onConfirm={handleDeleteConfirm}
            title={deletingEvo.title}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
