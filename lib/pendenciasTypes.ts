export type PendenciaPrioridade = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export type PendenciaStatus = 
  | 'Aberta' 
  | 'Em andamento' 
  | 'Aguardando devolução' 
  | 'Devolvida' 
  | 'Concluída' 
  | 'Cancelada';

export type PendenciaAcaoHistorico = 
  | 'CRIACAO' 
  | 'TRAMITE' 
  | 'DEVOLUCAO' 
  | 'ATUALIZACAO_CHECKLIST' 
  | 'COMENTARIO' 
  | 'CONCLUSAO' 
  | 'CANCELAMENTO';

export interface PendenciaGrupo {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  ordem_exibicao: number;
  created_at?: string;
  updated_at?: string;
}

export interface PendenciaSubitem {
  id: string;
  pendencia_id: string;
  descricao: string;
  concluido: boolean;
  concluido_por?: string;
  concluido_por_nome?: string;
  concluido_em?: string;
  ordem?: number;
  created_at?: string;
}

export interface PendenciaHistorico {
  id: string;
  pendencia_id: string;
  de_usuario_id?: string;
  de_usuario_nome?: string;
  para_usuario_id?: string;
  para_usuario_nome?: string;
  tipo_acao: PendenciaAcaoHistorico;
  observacoes?: string;
  status_anterior?: string;
  status_novo?: string;
  created_at: string;
}

export interface Pendencia {
  id: string;
  grupo_id: string;
  grupo?: PendenciaGrupo;
  chacara_id?: string;
  chacara_nome?: string;
  titulo: string;
  descricao?: string;
  prazo?: string; // YYYY-MM-DD
  prazo_hora?: string; // HH:mm
  prioridade: PendenciaPrioridade;
  status: PendenciaStatus;
  criado_por?: string;
  criado_por_nome?: string;
  criado_por_email?: string;
  responsavel_atual?: string;
  responsavel_atual_nome?: string;
  responsavel_atual_email?: string;
  subitens?: PendenciaSubitem[];
  historico?: PendenciaHistorico[];
  created_at: string;
  updated_at: string;
}

export interface PendenciaNotificacao {
  id: string;
  pendencia_id: string;
  destinatario_id: string;
  destinatario_email?: string;
  remetente_id?: string;
  remetente_nome?: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export interface UserProfileOption {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  cargo?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface PendenciaFilters {
  grupo_id?: string;
  responsavel_id?: string;
  criador_id?: string;
  prioridade?: string;
  status?: string;
  search?: string;
  visaoTab?: 'minhas' | 'enviadas' | 'recebidas' | 'todas';
  chacara_id?: string;
}

export interface CreatePendenciaInput {
  grupo_id: string;
  chacara_id?: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
  prazo_hora?: string;
  prioridade: PendenciaPrioridade;
  responsavel_atual_id: string;
  responsavel_atual_nome: string;
  responsavel_atual_email: string;
  subitens: string[]; // List of subitem descriptions
}

// Block Editor Types (Miro Style Document)
export type PendenciaBlockType = 'TEXT' | 'HEADING' | 'TABLE' | 'CHECKLIST' | 'DIVIDER';

export interface TextBlockContent {
  text: string;
}

export interface HeadingBlockContent {
  text: string;
  level?: number;
}

export interface TableBlockContent {
  rows: string[][];
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistBlockContent {
  items: ChecklistItem[];
}

export interface DividerBlockContent {
  style?: string;
}

export interface PendenciaBlock {
  id: string;
  task_id: string;
  order_index: number;
  type: PendenciaBlockType;
  content: TextBlockContent | HeadingBlockContent | TableBlockContent | ChecklistBlockContent | DividerBlockContent;
  created_at?: string;
  updated_at?: string;
}

