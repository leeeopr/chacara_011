'use client';

import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  TreePine, 
  Plus, 
  Search, 
  CalendarCheck, 
  Users, 
  Sparkles,
  RotateCcw,
  LogOut,
  Landmark
} from 'lucide-react';
import { useAppMode } from '@/contexts/AppModeContext';
import { useAuth } from '@/contexts/AuthContext';
import ChacarasSidebar, { TabType } from './ChacarasSidebar';
import ChacarasDashboard from './ChacarasDashboard';
import ChacarasManagement from './ChacarasManagement';
import ClientsManagement from './ClientsManagement';
import ReservationsManagement from './ReservationsManagement';
import ReservationsCalendar from './ReservationsCalendar';
import FinancialManagement from './FinancialManagement';
import FiscalManagement from '../fiscal/FiscalManagement';
import CrewManagement from './CrewManagement';
import PendenciasManagement from '../pendencias/PendenciasManagement';
import PlanningManagement from './planning/PlanningManagement';
import AccountsPayableManagement from './accounts-payable/AccountsPayableManagement';
import ChacarasSettings from './ChacarasSettings';
import OpenFinanceModal from '../OpenFinanceModal';


import ChacaraFormModal from './ChacaraFormModal';
import ClientFormModal from './ClientFormModal';
import NewReservationModal from './NewReservationModal';
import ReservationDetailModal from './ReservationDetailModal';
import NewBlockModal from './NewBlockModal';
import OwnerFormModal from './OwnerFormModal';
import FinancialTransactionModal from './FinancialTransactionModal';
import CrewMemberModal from './CrewMemberModal';
import CrewRoleModal from './CrewRoleModal';
import FloatingActionCenter from './FloatingActionCenter';
import CentralActionSelectorModal from './CentralActionSelectorModal';
import NewOperationalEventModal from './NewOperationalEventModal';
import ExceptionalEventModal from './ExceptionalEventModal';
import PendenciaFormModal from '../pendencias/PendenciaFormModal';
import PendenciaGroupManagerModal from '../pendencias/PendenciaGroupManagerModal';
import DecisionFormModal from './planning/DecisionFormModal';
import AccountPayableFormModal from './accounts-payable/AccountPayableFormModal';
import NotificationBellDropdown from '../notifications/NotificationBellDropdown';
import { ActionTriggerId } from '@/lib/actionRegistry';
import { Reservation } from '@/lib/chacaraTypes';

export default function ChacarasApp() {
  const { isDemo, resetDemoData } = useAppMode();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Global Quick Action Modals
  const [isCentralActionModalOpen, setIsCentralActionModalOpen] = useState(false);
  const [isNewOperationalEventModalOpen, setIsNewOperationalEventModalOpen] = useState(false);
  const [isExceptionalModalOpen, setIsExceptionalModalOpen] = useState(false);
  const [isChacaraModalOpen, setIsChacaraModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isNewReservationModalOpen, setIsNewReservationModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [financialDefaultType, setFinancialDefaultType] = useState<'RECEBIMENTO' | 'DESPESA' | 'REEMBOLSO'>('RECEBIMENTO');
  const [isCrewMemberModalOpen, setIsCrewMemberModalOpen] = useState(false);
  const [isCrewRoleModalOpen, setIsCrewRoleModalOpen] = useState(false);
  const [isPendenciaFormModalOpen, setIsPendenciaFormModalOpen] = useState(false);
  const [isPendenciaGroupModalOpen, setIsPendenciaGroupModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isAccountPayableModalOpen, setIsAccountPayableModalOpen] = useState(false);
  const [isOpenFinanceModalOpen, setIsOpenFinanceModalOpen] = useState(false);

  // Contextual modal pre-selection
  const [contextChacaraId, setContextChacaraId] = useState<string | undefined>(undefined);
  const [contextClientId, setContextClientId] = useState<string | undefined>(undefined);

  // Selected reservation for detail view
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isReservationDetailOpen, setIsReservationDetailOpen] = useState(false);

  // Refresh keys for child components
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTriggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenNewReservationForChacara = (chacaraId: string) => {
    setContextChacaraId(chacaraId);
    setContextClientId(undefined);
    setIsNewReservationModalOpen(true);
  };

  const handleOpenNewReservationForClient = (clientId: string) => {
    setContextClientId(clientId);
    setContextChacaraId(undefined);
    setIsNewReservationModalOpen(true);
  };

  const handleOpenNewReservation = () => {
    setContextChacaraId(undefined);
    setContextClientId(undefined);
    setIsNewReservationModalOpen(true);
  };

  const handleSelectReservation = (res: Reservation) => {
    setSelectedReservation(res);
    setIsReservationDetailOpen(true);
  };

  // Dispatcher for Floating Action Center triggers
  const handleActionTrigger = (triggerId: ActionTriggerId) => {
    switch (triggerId) {
      case 'new_reservation':
        handleOpenNewReservation();
        break;
      case 'new_operational_event':
        setIsNewOperationalEventModalOpen(true);
        break;
      case 'new_exceptional_event':
        setIsExceptionalModalOpen(true);
        break;
      case 'new_client':
        setIsClientModalOpen(true);
        break;
      case 'new_chacara':
        setIsChacaraModalOpen(true);
        break;
      case 'new_block':
        setIsBlockModalOpen(true);
        break;
      case 'new_owner':
        setIsOwnerModalOpen(true);
        break;
      case 'new_financial_transaction':
        setFinancialDefaultType('RECEBIMENTO');
        setIsFinancialModalOpen(true);
        break;
      case 'new_expense':
        setFinancialDefaultType('DESPESA');
        setIsFinancialModalOpen(true);
        break;
      case 'new_crew_member':
        setIsCrewMemberModalOpen(true);
        break;
      case 'new_crew_role':
        setIsCrewRoleModalOpen(true);
        break;
      case 'new_pendencia':
        setIsPendenciaFormModalOpen(true);
        break;
      case 'new_pendencia_group':
        setIsPendenciaGroupModalOpen(true);
        break;
      case 'new_decision':
        setIsDecisionModalOpen(true);
        break;
      case 'new_account_payable':
        setIsAccountPayableModalOpen(true);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#070A1E] text-white flex flex-col font-sans antialiased selection:bg-[#FFD600] selection:text-[#0A0F2C]">
      {/* Sidebar Navigation */}
      <ChacarasSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-20 bg-[#0A0F2C]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-white/70 hover:text-white rounded-xl bg-white/5 border border-white/10"
              title="Abrir Menu"
            >
              <Menu size={20} />
            </button>

            <div>
              <h2 className="text-lg font-black tracking-tight text-white capitalize">
                {activeTab === 'dashboard' && 'Dashboard General'}
                {activeTab === 'chacaras' && 'Gerenciamento de Chácaras'}
                {activeTab === 'reservas' && 'Central de Reservas'}
                {activeTab === 'calendario' && 'Calendário de Ocupação'}
                {activeTab === 'clientes' && 'Cadastro de Clientes'}
                {activeTab === 'equipe' && 'Gestão de Equipe (Crew)'}
                {activeTab === 'pendencias' && 'Gestão de Pendências & Tarefas'}
                {activeTab === 'planejamento' && 'Planejamento & Decisões Estratégicas'}
                {activeTab === 'contas_a_pagar' && 'Gestão de Contas a Pagar'}
                {activeTab === 'financeiro' && 'Módulo Financeiro Geral'}
                {activeTab === 'impostos' && 'Gestão Fiscal & Carnê-Leão'}

                {activeTab === 'configuracoes' && 'Configurações do Sistema'}
              </h2>
              <p className="text-[11px] text-white/40 hidden sm:block">
                Fase 1 & Fase 2 • Sistema de Gestão
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsOpenFinanceModalOpen(true)}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold py-2 px-3 sm:px-3.5 rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-sm"
              title="Conectar Banco via Open Finance (Pluggy)"
            >
              <Landmark size={15} />
              <span className="hidden md:inline">Open Finance</span>
            </button>

            <NotificationBellDropdown onNavigate={(tab) => setActiveTab(tab as TabType)} />

            <button
              onClick={() => setIsCentralActionModalOpen(true)}
              className="bg-[#FFD600] hover:bg-[#FFE500] text-[#0A0F2C] font-black py-2 px-4 rounded-xl shadow-lg shadow-[#FFD600]/15 transition-all active:scale-[0.98] flex items-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova Ação / Agendamento</span>
            </button>
          </div>
        </header>

        {/* View Component Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <ChacarasDashboard
              key={refreshKey}
              onNavigate={(tab) => setActiveTab(tab)}
              onNewReservation={handleOpenNewReservation}
              onNewChacara={() => setIsChacaraModalOpen(true)}
              onNewClient={() => setIsClientModalOpen(true)}
              onSelectReservation={handleSelectReservation}
              onNewPendencia={() => setIsPendenciaFormModalOpen(true)}
              onOpenPendenciaDetail={() => setActiveTab('pendencias')}
            />
          )}

          {activeTab === 'chacaras' && (
            <ChacarasManagement
              key={refreshKey}
              onNewReservationForChacara={handleOpenNewReservationForChacara}
            />
          )}

          {activeTab === 'reservas' && (
            <ReservationsManagement
              key={refreshKey}
              initialChacaraId={contextChacaraId}
              initialClientId={contextClientId}
            />
          )}

          {activeTab === 'calendario' && (
            <ReservationsCalendar key={refreshKey} />
          )}

          {activeTab === 'clientes' && (
            <ClientsManagement
              key={refreshKey}
              onNewReservationForClient={handleOpenNewReservationForClient}
            />
          )}

          {activeTab === 'equipe' && (
            <CrewManagement key={refreshKey} />
          )}

          {activeTab === 'pendencias' && (
            <PendenciasManagement key={refreshKey} />
          )}

          {activeTab === 'planejamento' && (
            <PlanningManagement key={refreshKey} />
          )}

          {activeTab === 'contas_a_pagar' && (
            <AccountsPayableManagement key={refreshKey} />
          )}

          {activeTab === 'financeiro' && (
            <FinancialManagement key={refreshKey} />
          )}

          {activeTab === 'impostos' && (
            <FiscalManagement key={refreshKey} />
          )}


          {activeTab === 'configuracoes' && (
            <ChacarasSettings />
          )}
        </main>
      </div>

      {/* Floating Action Center (FAB Speed Dial) */}
      <FloatingActionCenter
        activeTab={activeTab}
        onActionTrigger={handleActionTrigger}
      />

      {/* Central Action Selector Modal */}
      <CentralActionSelectorModal
        isOpen={isCentralActionModalOpen}
        onClose={() => setIsCentralActionModalOpen(false)}
        activeTab={activeTab}
        onActionTrigger={handleActionTrigger}
      />

      {/* Pendências Modals */}
      <PendenciaFormModal
        isOpen={isPendenciaFormModalOpen}
        onClose={() => setIsPendenciaFormModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      <PendenciaGroupManagerModal
        isOpen={isPendenciaGroupModalOpen}
        onClose={() => setIsPendenciaGroupModalOpen(false)}
        onGroupsUpdated={handleTriggerRefresh}
      />

      {/* New Operational Event Modal */}
      <NewOperationalEventModal
        isOpen={isNewOperationalEventModalOpen}
        onClose={() => setIsNewOperationalEventModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      {/* Exceptional Event Modal */}
      <ExceptionalEventModal
        isOpen={isExceptionalModalOpen}
        onClose={() => setIsExceptionalModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      {/* Global Modals */}
      <ChacaraFormModal
        isOpen={isChacaraModalOpen}
        onClose={() => setIsChacaraModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      <NewReservationModal
        isOpen={isNewReservationModalOpen}
        onClose={() => setIsNewReservationModalOpen(false)}
        onSuccess={handleTriggerRefresh}
        initialChacaraId={contextChacaraId}
        initialClientId={contextClientId}
      />

      <NewBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={handleTriggerRefresh}
        initialChacaraId={contextChacaraId}
      />

      <OwnerFormModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      <FinancialTransactionModal
        isOpen={isFinancialModalOpen}
        defaultType={financialDefaultType}
        onClose={() => setIsFinancialModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      <CrewMemberModal
        isOpen={isCrewMemberModalOpen}
        member={null}
        onClose={() => setIsCrewMemberModalOpen(false)}
        onSaveSuccess={handleTriggerRefresh}
      />

      <CrewRoleModal
        isOpen={isCrewRoleModalOpen}
        onClose={() => setIsCrewRoleModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      <ReservationDetailModal
        reservation={selectedReservation}
        isOpen={isReservationDetailOpen}
        onClose={() => setIsReservationDetailOpen(false)}
        onUpdate={handleTriggerRefresh}
      />

      {/* Planning Strategic Decision Modal */}
      <DecisionFormModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      {/* Account Payable Modal */}
      <AccountPayableFormModal
        isOpen={isAccountPayableModalOpen}
        onClose={() => setIsAccountPayableModalOpen(false)}
        onSuccess={handleTriggerRefresh}
      />

      {/* Global Open Finance Modal */}
      <OpenFinanceModal
        isOpen={isOpenFinanceModalOpen}
        onClose={() => setIsOpenFinanceModalOpen(false)}
        onSuccess={() => {
          handleTriggerRefresh();
        }}
      />
    </div>
  );
}
