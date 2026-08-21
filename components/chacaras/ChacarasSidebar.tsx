'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Home, 
  CalendarCheck, 
  Calendar as CalendarIcon, 
  Users, 
  UserCheck,
  Settings, 
  Menu, 
  X,
  Building2,
  TreePine,
  LogOut,
  DollarSign,
  CheckSquare,
  Receipt,
  Shield,
  Compass,
  Wallet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export type TabType = 'dashboard' | 'chacaras' | 'reservas' | 'calendario' | 'clientes' | 'equipe' | 'pendencias' | 'planejamento' | 'contas_a_pagar' | 'financeiro' | 'reserva_emergencia' | 'impostos' | 'configuracoes';

interface ChacarasSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function ChacarasSidebar({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen
}: ChacarasSidebarProps) {
  const { user, profile, signOut } = useAuth();

  const menuItems: { id: TabType; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chacaras', label: 'Chácaras', icon: TreePine },
    { id: 'reservas', label: 'Reservas', icon: CalendarCheck },
    { id: 'calendario', label: 'Calendário', icon: CalendarIcon },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'equipe', label: 'Equipe', icon: UserCheck, badge: 'Fase 5' },
    { id: 'pendencias', label: 'Pendências', icon: CheckSquare, badge: 'Fase 7' },
    { id: 'planejamento', label: 'Planejamento', icon: Compass, badge: 'Fluxo' },
    { id: 'contas_a_pagar', label: 'Contas a Pagar', icon: Wallet, badge: 'Novo' },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, badge: 'Fase 4' },
    { id: 'reserva_emergencia', label: 'Reserva de Emergência', icon: Shield, badge: '20%' },
    { id: 'impostos', label: 'Impostos / Gestão Fiscal', icon: Receipt, badge: 'Carnê-Leão' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, badge: 'Fase 3' },
  ];


  const handleSelect = (id: TabType) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A0F2C] border-r border-white/10 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Logo */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD600] p-2 rounded-xl shadow-[0_0_15px_rgba(255,214,0,0.3)]">
              <TreePine className="text-[#0A0F2C]" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                Chácaras
              </h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                Gestão & Reservas
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 text-white/60 hover:text-white rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">
            Menu Principal
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-[#FFD600] text-[#0A0F2C] shadow-[0_0_15px_rgba(255,214,0,0.25)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-[#0A0F2C]' : 'text-white/60'} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                    isActive ? 'bg-[#0A0F2C]/10 text-[#0A0F2C]' : 'bg-white/10 text-white/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-black text-[#FFD600] shrink-0">
              {profile?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'Administrador'}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.email || 'Sistema de Chácaras'}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
              title="Sair do sistema"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
