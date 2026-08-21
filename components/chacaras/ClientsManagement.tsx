'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  FileText, 
  Edit, 
  Trash2, 
  MessageSquare, 
  CalendarCheck,
  Building2,
  Clock,
  Sparkles,
  X
} from 'lucide-react';
import { Client, Reservation } from '@/lib/chacaraTypes';
import { getClients, deleteClient } from '@/services/clientsService';
import { getReservations } from '@/services/reservationsService';
import ClientFormModal from './ClientFormModal';

interface ClientsManagementProps {
  onNewReservationForClient: (clientId: string) => void;
}

export default function ClientsManagement({
  onNewReservationForClient
}: ClientsManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Delete modal
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // History modal
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);
  const [clientReservations, setClientReservations] = useState<Reservation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadClients();
  }, [searchTerm]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getClients({ search: searchTerm });
      setClients(data);
    } catch (e) {
      console.warn('Erro ao carregar clientes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setClientToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setClientToEdit(client);
    setIsFormOpen(true);
  };

  const handlePromptDelete = (client: Client) => {
    setDeleteError('');
    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteClient(clientToDelete.id);
      setClientToDelete(null);
      await loadClients();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao remover cliente.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenHistory = async (client: Client) => {
    setSelectedClientHistory(client);
    setLoadingHistory(true);
    try {
      const res = await getReservations({ client_id: client.id });
      setClientReservations(res);
    } catch (e) {
      console.warn('Erro ao carregar histórico do cliente:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Total Clientes</p>
            <p className="text-xl font-black text-white">{clients.length}</p>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CalendarCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Com Reservas</p>
            <p className="text-xl font-black text-emerald-400">
              {clients.filter(c => (c.total_reservations || 0) > 0).length}
            </p>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FFD600]/10 text-[#FFD600]">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">Recorrentes (+1 reserva)</p>
            <p className="text-xl font-black text-[#FFD600]">
              {clients.filter(c => (c.total_reservations || 0) > 1).length}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Pesquisar por nome, WhatsApp, CPF ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:border-[#FFD600] outline-none"
          />
        </div>

        <button
          onClick={handleOpenNew}
          className="w-full sm:w-auto bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2.5 px-5 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-white/5 animate-pulse rounded-2xl" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="glass p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
          <Users size={48} className="text-white/20 mb-3" />
          <h3 className="text-base font-bold text-white">Nenhum cliente cadastrado</h3>
          <p className="text-xs text-white/50 mt-1 max-w-sm">
            Nenhum registro encontrado. Clique abaixo para cadastrar o primeiro cliente do sistema.
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 px-4 py-2 bg-[#FFD600] text-[#0A0F2C] font-black text-xs rounded-xl uppercase"
          >
            + Cadastrar Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const cleanPhone = client.phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/55${cleanPhone}`;

            return (
              <div
                key={client.id}
                className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-white">{client.full_name}</h3>
                      {client.document_number && (
                        <p className="text-[11px] text-white/40 mt-0.5">CPF/CNPJ: {client.document_number}</p>
                      )}
                    </div>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all shrink-0"
                      title="Abrir WhatsApp"
                    >
                      <MessageSquare size={16} />
                    </a>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-white/70">
                    <p className="flex items-center gap-2">
                      <Phone size={14} className="text-[#FFD600]" />
                      <span>{client.phone}</span>
                    </p>
                    {client.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail size={14} className="text-blue-400" />
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {(client.city || client.neighborhood) && (
                      <p className="text-[11px] text-white/40 truncate">
                        {client.city} - {client.neighborhood}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleOpenHistory(client)}
                    className="text-white/60 hover:text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    <Clock size={14} className="text-[#FFD600]" />
                    <span>Histórico</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNewReservationForClient(client.id)}
                      className="px-2.5 py-1 bg-[#FFD600]/10 hover:bg-[#FFD600]/20 text-[#FFD600] font-bold text-[11px] rounded-lg"
                      title="Nova Reserva para este cliente"
                    >
                      + Reserva
                    </button>

                    <button
                      onClick={() => handleOpenEdit(client)}
                      className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg"
                      title="Editar Cliente"
                    >
                      <Edit size={14} />
                    </button>

                    <button
                      onClick={() => handlePromptDelete(client)}
                      className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        clientToEdit={clientToEdit}
        onSuccess={loadClients}
      />

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Excluir Cliente</h3>
                <p className="text-xs text-white/50 mt-0.5">Esta ação não poderá ser desfeita</p>
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Tem certeza que deseja excluir o cliente <strong className="text-white">{clientToDelete.full_name}</strong>?
            </p>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setClientToDelete(null);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs rounded-xl uppercase transition-all disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDeleteClient}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl uppercase shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0A0F2C] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black text-white">{selectedClientHistory.full_name}</h3>
                <p className="text-xs text-white/50">Histórico de Reservas Cadastradas</p>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="p-2 text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-white/40">Carregando histórico...</div>
              ) : clientReservations.length === 0 ? (
                <div className="p-8 text-center glass rounded-2xl text-xs text-white/50">
                  Nenhuma reserva registrada para este cliente.
                </div>
              ) : (
                clientReservations.map(res => (
                  <div key={res.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-[#FFD600]">{res.code}</span>
                      <p className="font-bold text-white mt-0.5">{res.chacara?.name || 'Chácara N/A'}</p>
                      <p className="text-white/50 text-[11px]">{res.checkin_date} até {res.checkout_date}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      res.status === 'CONFIRMADA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
