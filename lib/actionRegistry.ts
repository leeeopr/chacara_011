import { TabType } from '@/components/chacaras/ChacarasSidebar';

export type ActionTriggerId =
  | 'new_reservation'
  | 'new_operational_event'
  | 'new_exceptional_event'
  | 'new_client'
  | 'new_chacara'
  | 'new_block'
  | 'new_owner'
  | 'new_crew_member'
  | 'new_crew_role'
  | 'new_financial_transaction'
  | 'new_expense'
  | 'new_pendencia'
  | 'new_pendencia_group'
  | 'new_decision'
  | 'new_account_payable';

export interface ActionItem {
  id: ActionTriggerId;
  label: string;
  description: string;
  iconName: string;
  category: string;
  modules: TabType[];
  requiredRoles?: string[]; // Allowed profile roles (e.g. ['DONA', 'admin', 'SECRETARIA'])
  badge?: string;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    hoverBg: string;
    glow: string;
  };
}

export const ALL_ACTION_ITEMS: ActionItem[] = [
  {
    id: 'new_reservation',
    label: 'Nova Pré-Reserva',
    description: 'Cadastrar e orçar nova reserva com cálculo automático de diárias',
    iconName: 'CalendarCheck',
    category: 'Reservas',
    modules: ['dashboard', 'reservas', 'calendario', 'clientes', 'chacaras', 'financeiro'],
    badge: 'Reserva',
    colorScheme: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      hoverBg: 'hover:bg-emerald-500/20',
      glow: 'shadow-emerald-500/20'
    }
  },
  {
    id: 'new_operational_event',
    label: 'Agendar Serviço Operacional',
    description: 'Limpeza, manutenção, piscina, jardinagem ou vistoria técnica',
    iconName: 'HardHat',
    category: 'Operação',
    modules: ['dashboard', 'calendario', 'equipe', 'chacaras', 'pendencias'],
    badge: 'Operação',
    colorScheme: {
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      hoverBg: 'hover:bg-sky-500/20',
      glow: 'shadow-sky-500/20'
    }
  },
  {
    id: 'new_exceptional_event',
    label: 'Novo Evento Excepcional',
    description: 'Aviso, dedetização, visita do proprietário ou evento fora do padrão',
    iconName: 'AlertTriangle',
    category: 'Avisos & Eventos',
    modules: ['dashboard', 'calendario', 'chacaras', 'pendencias', 'equipe'],
    badge: 'Excepcional',
    colorScheme: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      hoverBg: 'hover:bg-red-500/20',
      glow: 'shadow-red-500/20'
    }
  },
  {
    id: 'new_pendencia',
    label: 'Nova Pendência',
    description: 'Criar tarefa, solicitação ou trâmite interno para a equipe',
    iconName: 'CheckSquare',
    category: 'Comunicação',
    modules: ['pendencias', 'dashboard', 'equipe'],
    badge: 'Tarefa',
    colorScheme: {
      bg: 'bg-[#FFD600]/10',
      text: 'text-[#FFD600]',
      border: 'border-[#FFD600]/30',
      hoverBg: 'hover:bg-[#FFD600]/20',
      glow: 'shadow-[#FFD600]/20'
    }
  },
  {
    id: 'new_pendencia_group',
    label: 'Novo Grupo de Pendências',
    description: 'Criar categoria ou grupo organizacional para filtrar demandas',
    iconName: 'FolderPlus',
    category: 'Comunicação',
    modules: ['pendencias', 'configuracoes'],
    requiredRoles: ['DONA', 'admin', 'SECRETARIA'],
    colorScheme: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      hoverBg: 'hover:bg-amber-500/20',
      glow: 'shadow-amber-500/20'
    }
  },
  {
    id: 'new_client',
    label: 'Novo Cliente',
    description: 'Cadastrar novo cliente / hóspede para reservas',
    iconName: 'UserPlus',
    category: 'Clientes',
    modules: ['dashboard', 'clientes', 'reservas', 'configuracoes'],
    colorScheme: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      hoverBg: 'hover:bg-cyan-500/20',
      glow: 'shadow-cyan-500/20'
    }
  },
  {
    id: 'new_chacara',
    label: 'Nova Chácara',
    description: 'Cadastrar nova propriedade com fotos, diárias e regras',
    iconName: 'TreePine',
    category: 'Propriedades',
    modules: ['chacaras', 'dashboard', 'configuracoes'],
    requiredRoles: ['DONA', 'admin', 'SECRETARIA'],
    colorScheme: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      hoverBg: 'hover:bg-emerald-500/20',
      glow: 'shadow-emerald-500/20'
    }
  },
  {
    id: 'new_block',
    label: 'Novo Bloqueio de Agenda',
    description: 'Bloquear período por uso do proprietário ou manutenção',
    iconName: 'Ban',
    category: 'Agenda',
    modules: ['calendario', 'reservas', 'dashboard', 'chacaras'],
    colorScheme: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      hoverBg: 'hover:bg-rose-500/20',
      glow: 'shadow-rose-500/20'
    }
  },
  {
    id: 'new_owner',
    label: 'Novo Proprietário',
    description: 'Cadastrar proprietário parceiro da propriedade',
    iconName: 'Briefcase',
    category: 'Parceiros',
    modules: ['chacaras', 'clientes'],
    requiredRoles: ['DONA', 'admin', 'SECRETARIA'],
    colorScheme: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      hoverBg: 'hover:bg-indigo-500/20',
      glow: 'shadow-indigo-500/20'
    }
  },
  {
    id: 'new_crew_member',
    label: 'Novo Funcionário',
    description: 'Cadastrar colaborador para a equipe operacional de campo',
    iconName: 'Users',
    category: 'Equipe',
    modules: ['equipe', 'chacaras'],
    requiredRoles: ['DONA', 'admin', 'SECRETARIA'],
    colorScheme: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      hoverBg: 'hover:bg-purple-500/20',
      glow: 'shadow-purple-500/20'
    }
  },
  {
    id: 'new_crew_role',
    label: 'Nova Função de Equipe',
    description: 'Cadastrar cargo ou especialidade para prestadores de serviço',
    iconName: 'Tag',
    category: 'Equipe',
    modules: ['equipe', 'configuracoes'],
    requiredRoles: ['DONA', 'admin'],
    colorScheme: {
      bg: 'bg-fuchsia-500/10',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-500/30',
      hoverBg: 'hover:bg-fuchsia-500/20',
      glow: 'shadow-fuchsia-500/20'
    }
  },
  {
    id: 'new_financial_transaction',
    label: 'Novo Recebimento',
    description: 'Lançar recebimento ou sinal referente a reservas',
    iconName: 'CreditCard',
    category: 'Financeiro',
    modules: ['financeiro', 'dashboard', 'reservas', 'calendario'],
    colorScheme: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      hoverBg: 'hover:bg-emerald-500/20',
      glow: 'shadow-emerald-500/20'
    }
  },
  {
    id: 'new_expense',
    label: 'Nova Despesa Extra',
    description: 'Lançar custo extra, avaria ou taxa operacional',
    iconName: 'TrendingDown',
    category: 'Financeiro',
    modules: ['financeiro'],
    colorScheme: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      hoverBg: 'hover:bg-orange-500/20',
      glow: 'shadow-orange-500/20'
    }
  },
  {
    id: 'new_decision',
    label: 'Nova Decisão Estratégica',
    description: 'Cadastrar e analisar impacto de reformas, compras ou investimentos',
    iconName: 'Compass',
    category: 'Planejamento',
    modules: ['planejamento', 'dashboard', 'financeiro', 'chacaras'],
    badge: 'Estratégico',
    colorScheme: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      hoverBg: 'hover:bg-amber-500/20',
      glow: 'shadow-amber-500/20'
    }
  },
  {
    id: 'new_account_payable',
    label: 'Nova Conta a Pagar',
    description: 'Cadastrar obrigação financeira, concessionária, serviço ou conta de fornecedor',
    iconName: 'Wallet',
    category: 'Financeiro',
    modules: ['contas_a_pagar', 'financeiro', 'dashboard', 'planejamento', 'calendario'],
    badge: 'Contas',
    colorScheme: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      hoverBg: 'hover:bg-purple-500/20',
      glow: 'shadow-purple-500/20'
    }
  }
];

/**
 * Returns filtered actions for a given module/tab, checking user permissions.
 */
export function getActionsForModule(module: TabType, userRole?: string): ActionItem[] {
  return ALL_ACTION_ITEMS.filter(action => {
    // 1. Check module match
    const moduleMatches = action.modules.includes(module);
    if (!moduleMatches) return false;

    // 2. Check permission/role if requiredRoles is defined
    if (action.requiredRoles && action.requiredRoles.length > 0) {
      if (!userRole) {
        // Default allow if user role is not explicitly provided / dev mode
        return true;
      }
      const roleUpper = userRole.toUpperCase();
      const isAllowed = action.requiredRoles.some(r => r.toUpperCase() === roleUpper) ||
        roleUpper === 'ADMIN' ||
        roleUpper === 'DONA';

      if (!isAllowed) return false;
    }

    return true;
  });
}

