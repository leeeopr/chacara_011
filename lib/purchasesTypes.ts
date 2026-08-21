export type PurchasePriority = 
  | 'INFRAESTRUTURA'
  | 'ESTRUTURA'
  | 'SUPERESTRUTURA'
  | 'URGENTE'
  | 'ALTA'
  | 'NORMAL'
  | 'BAIXA';

export type PurchaseStatus = 
  | 'A_COMPRAR' 
  | 'EM_COTACAO' 
  | 'AGUARDANDO_DEPENDENCIA' 
  | 'COMPRADO' 
  | 'CANCELADO';

export type PurchaseCategory = 
  | 'Manutenção' 
  | 'Limpeza' 
  | 'Cozinha' 
  | 'Banheiro' 
  | 'Jardim' 
  | 'Piscina' 
  | 'Eletrônicos' 
  | 'Mobiliário' 
  | 'Segurança' 
  | 'Consumíveis' 
  | 'Outros';

export interface PurchaseImage {
  id?: string;
  purchase_id?: string;
  storage_path?: string;
  public_url: string;
  file_name?: string;
  file_size?: number;
  is_primary?: boolean;
  created_at?: string;
}

export interface HousePurchase {
  id: string;
  chacara_id?: string | null;
  chacara_nome?: string | null;
  task_id?: string | null;
  task_titulo?: string | null;
  transaction_id?: string | null;
  depends_on_purchase_id?: string | null;
  depends_on_purchase_name?: string | null;
  product_name: string;
  description?: string | null;
  quantity: number;
  unit: string; // 'un', 'cx', 'kg', 'm', 'pacote', 'litro', 'kit'
  estimated_price: number;
  paid_price?: number | null;
  priority: PurchasePriority; // 'INFRAESTRUTURA' (mais importante), 'ESTRUTURA', 'SUPERESTRUTURA' (menos importante)
  status: PurchaseStatus;
  responsible_id?: string | null;
  responsible_name?: string | null;
  due_date?: string | null; // YYYY-MM-DD
  category: PurchaseCategory;
  supplier?: string | null;
  product_url?: string | null; // Link do produto / loja online com redirecionamento direto
  primary_image_url?: string | null;
  images?: PurchaseImage[];
  images_count?: number;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseFilters {
  chacara_id?: string;
  priority?: PurchasePriority | '';
  status?: PurchaseStatus | '';
  category?: PurchaseCategory | '';
  responsible_id?: string;
  search?: string;
  viewTab?: 'canBuyNow' | 'blocked' | 'urgent' | 'allPending' | 'completed';
}

export interface PurchaseStats {
  totalItems: number;
  urgentCount: number;
  infraCount?: number;
  estruturaCount?: number;
  superestruturaCount?: number;
  blockedCount: number;
  canBuyNowCount: number;
  completedCount: number;
  totalEstimated: number;
  totalPaid: number;
  pendingEstimated: number;
}
