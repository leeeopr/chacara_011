'use client';

import React, { useState, useEffect } from 'react';
import { 
  TreePine, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  Users, 
  MapPin, 
  CheckCircle2, 
  Wrench, 
  Ban,
  Sparkles
} from 'lucide-react';
import { Chacara, ChacaraStatus } from '@/lib/chacaraTypes';
import { getChacaras, deleteChacara, duplicateChacara } from '@/services/chacarasService';
import ChacaraFormModal from './ChacaraFormModal';
import ChacaraDetailModal from './ChacaraDetailModal';

interface ChacarasManagementProps {
  onNewReservationForChacara: (chacaraId: string) => void;
}

export default function ChacarasManagement({
  onNewReservationForChacara
}: ChacarasManagementProps) {
  const [chacaras, setChacaras] = useState<Chacara[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chacaraToEdit, setChacaraToEdit] = useState<Chacara | null>(null);
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedChacara, setSelectedChacara] = useState<Chacara | null>(null);

  useEffect(() => {
    loadChacaras();
  }, [searchTerm, statusFilter]);

  const loadChacaras = async () => {
    setLoading(true);
    try {
      const data = await getChacaras({
        search: searchTerm,
        status: statusFilter
      });
      setChacaras(data);
    } catch (e) {
      console.warn('Erro ao carregar chácaras:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setChacaraToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (chacara: Chacara) => {
    setChacaraToEdit(chacara);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (chacara: Chacara) => {
    setSelectedChacara(chacara);
    setIsDetailOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    if (!confirm('Deseja duplicar esta chácara?')) return;
    try {
      await duplicateChacara(id);
      loadChacaras();
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar chácara.');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar/remover esta chácara?')) return;
    try {
      await deleteChacara(id);
      loadChacaras();
    } catch (err: any) {
      alert(err.message || 'Erro ao desativar chácara.');
    }
  };

  // Metrics
  const totalCount = chacaras.length;
  const activeCount = chacaras.filter(c => c.status === 'ATIVA').length;
  const maintenanceCount = chacaras.filter(c => c.status === 'EM_MANUTENCAO').length;
  const inactiveCount = chacaras.filter(c => c.status === 'INATIVA' || c.status === 'INTERDITADA').length;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-white">
            <TreePine size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Total Chácaras</p>
            <p className="text-xl font-black text-white">{totalCount}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Ativas</p>
            <p className="text-xl font-black text-emerald-400">{activeCount}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Wrench size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Em Manutenção</p>
            <p className="text-xl font-black text-amber-400">{maintenanceCount}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400">
            <Ban size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Inativas</p>
            <p className="text-xl font-black text-red-400">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Pesquisar por nome, cidade ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:border-[#FFD600] outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0A0F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD600] outline-none"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVA">Ativa</option>
            <option value="EM_MANUTENCAO">Em Manutenção</option>
            <option value="INATIVA">Inativa</option>
            <option value="INTERDITADA">Interditada</option>
          </select>
        </div>

        <button
          onClick={handleOpenNew}
          className="w-full sm:w-auto bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-5 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Nova Chácara</span>
        </button>
      </div>

      {/* Grid of Chácara Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-80 bg-white/5 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : chacaras.length === 0 ? (
        <div className="glass p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
          <TreePine size={48} className="text-white/20 mb-3" />
          <h3 className="text-base font-bold text-white">Nenhuma chácara encontrada</h3>
          <p className="text-xs text-white/50 mt-1 max-w-sm">
            Nenhuma propriedade atende aos critérios de pesquisa atuaes. Tente limpar os filtros ou cadastre uma nova.
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 px-4 py-2 bg-[#FFD600] text-[#0A0F2C] font-black text-xs rounded-xl uppercase"
          >
            + Cadastrar Chácara
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {chacaras.map((chacara) => (
            <div
              key={chacara.id}
              className="glass rounded-3xl border border-white/10 overflow-hidden flex flex-col group hover:border-[#FFD600]/40 transition-all shadow-xl"
            >
              {/* Photo Banner */}
              <div className="h-48 bg-white/5 relative overflow-hidden">
                {chacara.main_photo_url ? (
                  <img
                    src={chacara.main_photo_url}
                    alt={chacara.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                    <TreePine size={40} />
                  </div>
                )}

                {/* Status Badge */}
                <span className={`absolute top-3 right-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full backdrop-blur-md shadow-md ${
                  chacara.status === 'ATIVA' ? 'bg-emerald-500/90 text-white' :
                  chacara.status === 'EM_MANUTENCAO' ? 'bg-amber-500/90 text-white' :
                  'bg-red-500/90 text-white'
                }`}>
                  {chacara.status}
                </span>

                {/* Capacity Overlay Badge */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10">
                  <Users size={12} className="text-[#FFD600]" />
                  <span>Até {chacara.capacity_people} pessoas</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-black text-white truncate">{chacara.name}</h3>
                  <p className="text-xs text-white/50 truncate flex items-center gap-1 mt-1">
                    <MapPin size={12} className="text-[#FFD600]" />
                    <span>{chacara.city || 'Cidade N/A'} • {chacara.neighborhood || 'Bairro N/A'}</span>
                  </p>
                </div>

                {/* Rates */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] uppercase text-white/40 font-bold">Diária Padrão</p>
                    <p className="font-black text-white">R$ {(chacara.daily_rate_standard || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-white/40 font-bold">Fim de Semana</p>
                    <p className="font-black text-[#FFD600]">R$ {(chacara.daily_rate_weekend || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/10 grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleOpenDetail(chacara)}
                    className="p-2 bg-white/5 hover:bg-white/15 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Visualizar Chácara"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(chacara)}
                    className="p-2 bg-white/5 hover:bg-white/15 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Editar Chácara"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => handleDuplicate(chacara.id)}
                    className="p-2 bg-white/5 hover:bg-white/15 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Duplicar Chácara"
                  >
                    <Copy size={16} />
                  </button>

                  <button
                    onClick={() => handleDeactivate(chacara.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center transition-all"
                    title="Desativar / Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal (Create/Edit) */}
      <ChacaraFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        chacaraToEdit={chacaraToEdit}
        onSuccess={loadChacaras}
      />

      {/* Detail Modal */}
      <ChacaraDetailModal
        chacara={selectedChacara}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onNewReservationForChacara={onNewReservationForChacara}
        onEditChacara={(chacara) => {
          setIsDetailOpen(false);
          handleOpenEdit(chacara);
        }}
      />
    </div>
  );
}
