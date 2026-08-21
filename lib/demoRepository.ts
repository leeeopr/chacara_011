import { 
  Chacara, 
  Client, 
  Reservation, 
  ChacaraBlock, 
  CrewRole, 
  CrewMember, 
  Owner,
  ReservationGuest,
  ReservationCharge,
  ReservationPayment,
  ReservationDeposit,
  ReservationExpense,
  ReservationRefund,
  FinancialAuditLog,
  ReservationFullFinancialSummary,
  CrewAuditLog,
  OperationalEventType,
  OperationalRecurrenceRule,
  OperationalEvent,
  OperationalEventStatus,
  StaffUnavailability
} from '@/lib/chacaraTypes';
import {
  EmergencyFund,
  EmergencyFundTransaction,
  EmergencyFundSummary,
  ChacaraEmergencyContribution,
  RecordExpenseInput,
  RecordManualContributionInput,
  RecordManualWithdrawalInput
} from '@/lib/emergencyFundTypes';
import { 
  DEMO_CHACARAS, 
  DEMO_CLIENTS, 
  DEMO_CREW_ROLES, 
  DEMO_CREW_MEMBERS, 
  DEMO_OWNERS, 
  DEMO_BLOCKS, 
  DEMO_OPERATIONAL_EVENT_TYPES, 
  DEMO_OPERATIONAL_RECURRENCE_RULES, 
  DEMO_STAFF_UNAVAILABILITY, 
  generateDemoReservations, 
  generateDemoOperationalEvents 
} from './demoDataset';

const STORAGE_KEY = 'chacaras_demo_dataset_v3';

interface DemoDataStore {
  owners: Owner[];
  chacaras: Chacara[];
  clients: Client[];
  reservations: Reservation[];
  blocks: ChacaraBlock[];
  crewRoles: CrewRole[];
  crewMembers: CrewMember[];
  payments: ReservationPayment[];
  expenses: ReservationExpense[];
  refunds: ReservationRefund[];
  deposits: Record<string, ReservationDeposit>;
  crewAuditLogs: CrewAuditLog[];
  operationalEventTypes: OperationalEventType[];
  operationalRecurrenceRules: OperationalRecurrenceRule[];
  operationalEvents: OperationalEvent[];
  staffUnavailability: StaffUnavailability[];
  emergencyFund?: EmergencyFund;
  emergencyFundTransactions?: EmergencyFundTransaction[];
}

let inMemoryStore: DemoDataStore | null = null;

function initializeDefaultStore(): DemoDataStore {
  const chacaras = JSON.parse(JSON.stringify(DEMO_CHACARAS));
  const clients = JSON.parse(JSON.stringify(DEMO_CLIENTS));
  const reservations = generateDemoReservations(chacaras, clients);
  const crewRoles = JSON.parse(JSON.stringify(DEMO_CREW_ROLES));
  const crewMembers = JSON.parse(JSON.stringify(DEMO_CREW_MEMBERS));
  const blocks = JSON.parse(JSON.stringify(DEMO_BLOCKS));
  const owners = JSON.parse(JSON.stringify(DEMO_OWNERS));
  const operationalEventTypes = JSON.parse(JSON.stringify(DEMO_OPERATIONAL_EVENT_TYPES));
  const operationalRecurrenceRules = JSON.parse(JSON.stringify(DEMO_OPERATIONAL_RECURRENCE_RULES));
  const operationalEvents = JSON.parse(JSON.stringify(generateDemoOperationalEvents()));
  const staffUnavailability = JSON.parse(JSON.stringify(DEMO_STAFF_UNAVAILABILITY));

  // Pre-generate payments for confirmed/checkout reservations
  const payments: ReservationPayment[] = [];
  const emergencyFundTransactions: EmergencyFundTransaction[] = [];
  let runningEmergencyBalance = 0;

  const emergencyFund: EmergencyFund = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Reserva de Emergência',
    description: 'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais, manutenções emergenciais e reparos na infraestrutura das chácaras.',
    default_percentage: 20.00,
    current_balance: 0,
    status: 'ATIVO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  reservations.forEach((r, idx) => {
    if (r.status === 'CONFIRMADA' || r.status === 'CHECKOUT_REALIZADO' || r.status === 'HOSPEDADO' || r.status === 'CHECKIN_REALIZADO') {
      const fin = r.financial_summary || {};
      const total = Number(fin.total_amount || 2000);
      const paid = Number(fin.paid_amount || total);
      if (paid > 0) {
        const payId = `pay-${r.id}-1`;
        payments.push({
          id: payId,
          reservation_id: r.id,
          amount: paid,
          payment_date: r.created_at ? r.created_at.split('T')[0] : r.checkin_date,
          payment_method: idx % 2 === 0 ? 'PIX' : 'CARTAO_CREDITO',
          notes: 'Pagamento de reserva de demonstração',
          created_by: 'Sistema Demo'
        });

        // 20% auto-allocation for emergency fund
        const alloc = Math.round(paid * 0.20 * 100) / 100;
        runningEmergencyBalance += alloc;
        emergencyFundTransactions.push({
          id: `tx-em-${payId}`,
          fund_id: emergencyFund.id,
          chacara_id: r.chacara_id || null,
          chacara_name: r.chacara?.name || null,
          reservation_id: r.id,
          reservation_code: r.code || null,
          payment_id: payId,
          transaction_type: 'APORTE_AUTOMATICO',
          amount: alloc,
          gross_amount: paid,
          percentage_applied: 20,
          balance_after: runningEmergencyBalance,
          category: 'RECEITA_ALUGUEL_20%',
          description: `Aporte Automático (20%) - Reserva #${r.code || 'N/A'}`,
          performed_by: 'Sistema Automático',
          notes: 'Dedução automática preventiva',
          created_at: r.created_at || new Date().toISOString()
        });
      }
    }
  });

  // Add 2 realistic emergency maintenance expenses
  if (chacaras.length > 0) {
    const c1 = chacaras[0];
    const exp1Amt = 680.00;
    runningEmergencyBalance -= exp1Amt;
    emergencyFundTransactions.push({
      id: `tx-em-exp-1`,
      fund_id: emergencyFund.id,
      chacara_id: c1.id,
      chacara_name: c1.name,
      transaction_type: 'RETIRADA_DESPESA',
      amount: -exp1Amt,
      gross_amount: exp1Amt,
      balance_after: runningEmergencyBalance,
      category: 'MANUTENCAO_HIDRAULICA',
      description: `Conserto emergencial da bomba da piscina e troca de registro - ${c1.name}`,
      performed_by: 'Carlos Gerente',
      notes: 'Nota fiscal anexada / Serviço executado em regime de urgência',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    });
  }

  emergencyFund.current_balance = Math.max(0, runningEmergencyBalance);

  return {
    owners,
    chacaras,
    clients,
    reservations,
    blocks,
    crewRoles,
    crewMembers,
    payments,
    expenses: [],
    refunds: [],
    deposits: {},
    crewAuditLogs: [],
    operationalEventTypes: operationalEventTypes || [],
    operationalRecurrenceRules: operationalRecurrenceRules || [],
    operationalEvents: operationalEvents || [],
    staffUnavailability: staffUnavailability || [],
    emergencyFund,
    emergencyFundTransactions
  };
}

function ensureStoreFields(store: DemoDataStore) {
  if (!store) return;
  if (!Array.isArray(store.owners)) store.owners = JSON.parse(JSON.stringify(DEMO_OWNERS));
  if (!Array.isArray(store.chacaras)) store.chacaras = JSON.parse(JSON.stringify(DEMO_CHACARAS));
  if (!Array.isArray(store.clients)) store.clients = JSON.parse(JSON.stringify(DEMO_CLIENTS));
  if (!Array.isArray(store.reservations)) store.reservations = [];
  if (!Array.isArray(store.blocks)) store.blocks = [];
  if (!Array.isArray(store.crewRoles)) store.crewRoles = JSON.parse(JSON.stringify(DEMO_CREW_ROLES));
  if (!Array.isArray(store.crewMembers)) store.crewMembers = JSON.parse(JSON.stringify(DEMO_CREW_MEMBERS));
  if (!Array.isArray(store.payments)) store.payments = [];
  if (!Array.isArray(store.expenses)) store.expenses = [];
  if (!Array.isArray(store.refunds)) store.refunds = [];
  if (!store.deposits) store.deposits = {};
  if (!Array.isArray(store.crewAuditLogs)) store.crewAuditLogs = [];
  if (!Array.isArray(store.operationalEventTypes)) store.operationalEventTypes = JSON.parse(JSON.stringify(DEMO_OPERATIONAL_EVENT_TYPES));
  if (!Array.isArray(store.operationalRecurrenceRules)) {
    store.operationalRecurrenceRules = [];
  } else {
    // Purge old mock recurrence rules
    store.operationalRecurrenceRules = store.operationalRecurrenceRules.filter(
      r => r.id && !r.id.startsWith('rec-00') && !r.id.startsWith('rec-demo')
    );
  }
  if (!Array.isArray(store.operationalEvents)) {
    store.operationalEvents = [];
  } else {
    // Purge old mock operational events
    store.operationalEvents = store.operationalEvents.filter(
      e => e.id && !e.id.startsWith('op-evt-') && !e.id.startsWith('gen-rec-') && !e.id.startsWith('exc-demo-')
    );
  }
  if (!Array.isArray(store.staffUnavailability)) store.staffUnavailability = [];
  if (!store.emergencyFund) {
    store.emergencyFund = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Reserva de Emergência',
      description: 'Fundo destinado exclusivamente a despesas inesperadas, danos estruturais, manutenções emergenciais e reparos na infraestrutura das chácaras.',
      default_percentage: 20.00,
      current_balance: 0,
      status: 'ATIVO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  if (!Array.isArray(store.emergencyFundTransactions)) {
    store.emergencyFundTransactions = [];
    // Populate retroactively from payments
    let runningBal = 0;
    const txs: EmergencyFundTransaction[] = [];
    (store.payments || []).forEach(p => {
      const res = store.reservations.find(r => r.id === p.reservation_id);
      const alloc = Math.round(Number(p.amount) * 0.20 * 100) / 100;
      runningBal += alloc;
      txs.push({
        id: `tx-em-${p.id}`,
        fund_id: store.emergencyFund!.id,
        chacara_id: res?.chacara_id || null,
        chacara_name: res?.chacara?.name || null,
        reservation_id: res?.id || null,
        reservation_code: res?.code || null,
        payment_id: p.id,
        transaction_type: 'APORTE_AUTOMATICO',
        amount: alloc,
        gross_amount: Number(p.amount),
        percentage_applied: 20,
        balance_after: runningBal,
        category: 'RECEITA_ALUGUEL_20%',
        description: `Aporte Automático (20%) - Reserva #${res?.code || 'N/A'}`,
        performed_by: 'Sistema Automático',
        notes: 'Dedução automática preventiva',
        created_at: p.payment_date || new Date().toISOString()
      });
    });
    store.emergencyFundTransactions = txs;
    store.emergencyFund.current_balance = runningBal;
  }
}

function getStore(): DemoDataStore {
  if (inMemoryStore) {
    ensureStoreFields(inMemoryStore);
    return inMemoryStore;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        inMemoryStore = JSON.parse(stored);
        if (inMemoryStore && inMemoryStore.chacaras && inMemoryStore.chacaras.length > 0) {
          ensureStoreFields(inMemoryStore);
          return inMemoryStore;
        }
      }
    } catch (e) {
      console.warn('[DemoRepository] Erro ao carregar do localStorage:', e);
    }
  }

  inMemoryStore = initializeDefaultStore();
  saveStore(inMemoryStore);
  return inMemoryStore;
}

function saveStore(store: DemoDataStore) {
  inMemoryStore = store;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('[DemoRepository] Erro ao salvar no localStorage:', e);
    }
  }
}

export const demoRepository = {
  resetToDefault(): DemoDataStore {
    const store = initializeDefaultStore();
    saveStore(store);
    return store;
  },

  // ==========================================
  // CHÁCARAS
  // ==========================================
  async getChacaras(filters?: { search?: string; status?: string }): Promise<Chacara[]> {
    const store = getStore();
    let list = store.chacaras.filter(c => !c.is_deleted);

    if (filters?.status && filters.status !== 'TODOS') {
      list = list.filter(c => c.status === filters.status);
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.neighborhood && c.neighborhood.toLowerCase().includes(q))
      );
    }

    return JSON.parse(JSON.stringify(list));
  },

  async getChacaraById(id: string): Promise<Chacara | null> {
    const store = getStore();
    const item = store.chacaras.find(c => c.id === id && !c.is_deleted);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  },

  async createChacara(chacaraData: Partial<Chacara>, photos: string[] = []): Promise<Chacara> {
    const store = getStore();
    const id = `chacara-${Date.now()}`;
    const newChacara: Chacara = {
      ...chacaraData as any,
      id,
      status: chacaraData.status || 'ATIVA',
      capacity_people: Number(chacaraData.capacity_people || chacaraData.max_capacity || 20),
      bedrooms_count: Number(chacaraData.bedrooms_count || 4),
      bathrooms_count: Number(chacaraData.bathrooms_count || 3),
      daily_rate_standard: Number(chacaraData.daily_rate_standard || 1000),
      daily_rate_weekend: Number(chacaraData.daily_rate_weekend || 1500),
      deposit_amount: Number(chacaraData.deposit_amount || 800),
      cleaning_fee: Number(chacaraData.cleaning_fee || 200),
      main_photo_url: photos[0] || chacaraData.main_photo_url || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=80',
      photos: photos.map((url, idx) => ({
        id: `p-${id}-${idx}`,
        chacara_id: id,
        url,
        is_main: idx === 0,
        display_order: idx
      })),
      created_at: new Date().toISOString()
    };

    store.chacaras.unshift(newChacara);
    saveStore(store);
    return JSON.parse(JSON.stringify(newChacara));
  },

  async updateChacara(id: string, updates: Partial<Chacara>, photos?: string[]): Promise<Chacara> {
    const store = getStore();
    const idx = store.chacaras.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Chácara não encontrada.');

    const updated: Chacara = {
      ...store.chacaras[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (photos !== undefined) {
      updated.photos = photos.map((url, i) => ({
        id: `p-${id}-${i}`,
        chacara_id: id,
        url,
        is_main: i === 0,
        display_order: i
      }));
      if (photos.length > 0) {
        updated.main_photo_url = photos[0];
      }
    }

    store.chacaras[idx] = updated;
    saveStore(store);
    return JSON.parse(JSON.stringify(updated));
  },

  async deleteChacara(id: string): Promise<boolean> {
    const store = getStore();
    const idx = store.chacaras.findIndex(c => c.id === id);
    if (idx !== -1) {
      store.chacaras[idx].is_deleted = true;
      saveStore(store);
    }
    return true;
  },

  async duplicateChacara(id: string): Promise<Chacara> {
    const original = await this.getChacaraById(id);
    if (!original) throw new Error('Chácara não encontrada.');
    const photos = original.photos?.map(p => p.url) || [];
    const { id: _i, created_at: _c, ...rest } = original;
    return this.createChacara({ ...rest, name: `${original.name} (Cópia Demo)` }, photos);
  },

  async getOwners(): Promise<Owner[]> {
    const store = getStore();
    return JSON.parse(JSON.stringify(store.owners));
  },

  async createOwner(ownerData: Partial<Owner>): Promise<Owner> {
    const store = getStore();
    const newOwner: Owner = {
      id: `owner-${Date.now()}`,
      full_name: ownerData.full_name || 'Novo Proprietário',
      phone: ownerData.phone || '',
      email: ownerData.email || '',
      cpf_cnpj: ownerData.cpf_cnpj || ownerData.document_number || '000.000.000-00',
      notes: ownerData.notes || '',
      created_at: new Date().toISOString()
    };
    store.owners.push(newOwner);
    saveStore(store);
    return JSON.parse(JSON.stringify(newOwner));
  },

  // ==========================================
  // CLIENTES
  // ==========================================
  async getClients(filters?: { search?: string }): Promise<Client[]> {
    const store = getStore();
    let list = store.clients;

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.document_number && c.document_number.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }

    return JSON.parse(JSON.stringify(list));
  },

  async getClientById(id: string): Promise<Client | null> {
    const store = getStore();
    const client = store.clients.find(c => c.id === id);
    return client ? JSON.parse(JSON.stringify(client)) : null;
  },

  async createClient(clientData: Partial<Client>): Promise<Client> {
    const store = getStore();
    const newClient: Client = {
      id: `client-${Date.now()}`,
      full_name: clientData.full_name || 'Novo Cliente',
      phone: clientData.phone || '(11) 90000-0000',
      email: clientData.email || '',
      document_number: clientData.document_number || '000.000.000-00',
      city: clientData.city || 'São Paulo',
      state: clientData.state || 'SP',
      notes: clientData.notes || '',
      total_reservations: 0,
      total_spent: 0,
      created_at: new Date().toISOString()
    };
    store.clients.unshift(newClient);
    saveStore(store);
    return JSON.parse(JSON.stringify(newClient));
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const store = getStore();
    const idx = store.clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado.');

    const updated: Client = {
      ...store.clients[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    store.clients[idx] = updated;
    saveStore(store);
    return JSON.parse(JSON.stringify(updated));
  },

  async deleteClient(id: string): Promise<boolean> {
    const store = getStore();
    store.clients = store.clients.filter(c => c.id !== id);
    saveStore(store);
    return true;
  },

  // ==========================================
  // RESERVAS
  // ==========================================
  async getReservations(filters?: {
    search?: string;
    status?: string;
    chacara_id?: string;
    client_id?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Reservation[]> {
    const store = getStore();
    let list = store.reservations.filter(r => !r.is_deleted);

    if (filters?.status && filters.status !== 'TODOS') {
      list = list.filter(r => r.status === filters.status);
    }
    if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
      list = list.filter(r => r.chacara_id === filters.chacara_id);
    }
    if (filters?.client_id) {
      list = list.filter(r => r.client_id === filters.client_id);
    }
    if (filters?.startDate) {
      list = list.filter(r => r.checkin_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter(r => r.checkout_date <= filters.endDate!);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(r =>
        r.code.toLowerCase().includes(q) ||
        (r.client?.full_name && r.client.full_name.toLowerCase().includes(q)) ||
        (r.chacara?.name && r.chacara.name.toLowerCase().includes(q))
      );
    }

    // Sort by checkin_date ascending
    list.sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

    // Ensure chacara and client populated
    list.forEach(r => {
      if (!r.chacara) r.chacara = store.chacaras.find(c => c.id === r.chacara_id);
      if (!r.client) r.client = store.clients.find(c => c.id === r.client_id);
    });

    return JSON.parse(JSON.stringify(list));
  },

  async getReservationById(id: string): Promise<Reservation | null> {
    const store = getStore();
    const res = store.reservations.find(r => r.id === id && !r.is_deleted);
    if (!res) return null;

    if (!res.chacara) res.chacara = store.chacaras.find(c => c.id === res.chacara_id);
    if (!res.client) res.client = store.clients.find(c => c.id === res.client_id);

    return JSON.parse(JSON.stringify(res));
  },

  async checkAvailability(
    chacara_id: string,
    checkin_date: string,
    checkin_time: string,
    checkout_date: string,
    checkout_time: string,
    exclude_id?: string
  ) {
    const store = getStore();
    const reqStart = new Date(`${checkin_date}T${checkin_time || '14:00'}:00`).getTime();
    const reqEnd = new Date(`${checkout_date}T${checkout_time || '12:00'}:00`).getTime();

    const activeReservations = store.reservations.filter(
      r => r.chacara_id === chacara_id && !r.is_deleted && r.status !== 'CANCELADA' && r.status !== 'NO_SHOW' && r.id !== exclude_id
    );

    for (const res of activeReservations) {
      const resStart = new Date(`${res.checkin_date}T${res.checkin_time || '14:00'}:00`).getTime();
      const resEnd = new Date(`${res.checkout_date}T${res.checkout_time || '12:00'}:00`).getTime();

      if (reqStart < resEnd && reqEnd > resStart) {
        if (res.status === 'PRE_RESERVA') {
          return { is_available: false, conflict_type: 'PRE_RESERVA_EXISTENTE', conflict_code: 'CONFLICT_PRE_RESERVA', conflict_reservation: res };
        }
        return { is_available: false, conflict_type: 'RESERVA_EXISTENTE', conflict_code: 'CONFLICT_RESERVATION', conflict_reservation: res };
      }
    }

    const blocks = store.blocks.filter(b => b.chacara_id === chacara_id);
    for (const b of blocks) {
      const bStart = new Date(`${b.start_date}T00:00:00`).getTime();
      const bEnd = new Date(`${b.end_date}T23:59:59`).getTime();
      if (reqStart <= bEnd && reqEnd >= bStart) {
        return { is_available: false, conflict_type: 'BLOQUEIO_ADMINISTRATIVO', conflict_code: 'CONFLICT_BLOCK' };
      }
    }

    return { is_available: true, conflict_type: 'DISPONIVEL', conflict_code: 'OK' };
  },

  async createReservation(
    data: Partial<Reservation>,
    guests: Partial<ReservationGuest>[] = []
  ): Promise<Reservation> {
    const store = getStore();
    const id = `res-${Date.now()}`;
    const code = `REC-${Math.floor(2000 + Math.random() * 8000)}`;

    const chacara = store.chacaras.find(c => c.id === data.chacara_id);
    const client = store.clients.find(c => c.id === data.client_id);

    const checkin = new Date(data.checkin_date || new Date().toISOString().split('T')[0]);
    const checkout = new Date(data.checkout_date || new Date().toISOString().split('T')[0]);
    const nights = Math.max(1, Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24)));

    const dailyRate = chacara?.daily_rate_weekend || 1200;
    const subtotal = dailyRate * nights;
    const cleaningFee = chacara?.cleaning_fee || 200;
    const totalAmount = subtotal + cleaningFee;

    const newRes: Reservation = {
      ...data as any,
      id,
      code,
      chacara_id: data.chacara_id || store.chacaras[0]?.id || 'chacara-001',
      client_id: data.client_id || store.clients[0]?.id || 'client-001',
      checkin_date: data.checkin_date || new Date().toISOString().split('T')[0],
      checkin_time: data.checkin_time || '14:00',
      checkout_date: data.checkout_date || new Date().toISOString().split('T')[0],
      checkout_time: data.checkout_time || '12:00',
      guests_adults: data.guests_adults || 10,
      guests_children: data.guests_children || 0,
      guests_infants: data.guests_infants || 0,
      guests_pets: data.guests_pets || 0,
      status: data.status || 'CONFIRMADA',
      origin: data.origin || 'WHATSAPP',
      financial_summary: {
        daily_rate_applied: dailyRate,
        daily_rates_subtotal: subtotal,
        cleaning_fee: cleaningFee,
        deposit_amount: chacara?.deposit_amount || 800,
        total_amount: totalAmount,
        paid_amount: totalAmount,
        nights_count: nights,
        payment_status: 'PAGO'
      },
      chacara,
      client,
      guests_list: guests.map((g, idx) => ({
        id: `g-${id}-${idx}`,
        reservation_id: id,
        full_name: g.full_name || 'Hóspede',
        document_number: g.document_number,
        is_responsible: !!g.is_responsible,
        is_child: !!g.is_child
      })),
      created_at: new Date().toISOString()
    };

    store.reservations.unshift(newRes);

    // Also register payment
    store.payments.push({
      id: `pay-${id}-1`,
      reservation_id: id,
      amount: totalAmount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'PIX',
      notes: 'Pagamento total registrado na criação da reserva demo',
      created_by: 'Administrador'
    });

    saveStore(store);
    return JSON.parse(JSON.stringify(newRes));
  },

  async updateReservation(
    id: string,
    data: Partial<Reservation>,
    guests?: Partial<ReservationGuest>[]
  ): Promise<Reservation> {
    const store = getStore();
    const idx = store.reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reserva não encontrada.');

    const updated: Reservation = {
      ...store.reservations[idx],
      ...data,
      updated_at: new Date().toISOString()
    };

    if (guests !== undefined) {
      updated.guests_list = guests.map((g, i) => ({
        id: `g-${id}-${i}`,
        reservation_id: id,
        full_name: g.full_name || 'Hóspede',
        document_number: g.document_number,
        is_responsible: !!g.is_responsible,
        is_child: !!g.is_child
      }));
    }

    store.reservations[idx] = updated;
    saveStore(store);
    return JSON.parse(JSON.stringify(updated));
  },

  async updateReservationCustomPrice(
    id: string,
    customPrice: number | null,
    performedBy: string = 'Administrador',
    reason?: string
  ): Promise<Reservation> {
    const store = getStore();
    const idx = store.reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reserva não encontrada.');

    const res = store.reservations[idx];
    const isCustom = customPrice !== null && !isNaN(Number(customPrice));
    const numericVal = isCustom ? Math.max(0, Number(customPrice)) : null;

    const currentFin = res.financial_summary || {};
    const calculatedTotal = Number(currentFin.calculated_total || currentFin.subtotal_before_adjustment || currentFin.total_amount || 0);
    const newTotalAmount = isCustom && numericVal !== null ? numericVal : calculatedTotal;

    const updatedFin = {
      ...currentFin,
      calculated_total: calculatedTotal,
      custom_price: numericVal,
      is_custom_price: isCustom,
      total_amount: newTotalAmount
    };

    const updated: Reservation = {
      ...res,
      custom_price: numericVal,
      is_custom_price: isCustom,
      financial_summary: updatedFin,
      updated_at: new Date().toISOString()
    };

    store.reservations[idx] = updated;
    saveStore(store);
    return JSON.parse(JSON.stringify(updated));
  },

  async confirmReservation(id: string, confirmedBy: string = 'Administrador'): Promise<Reservation> {
    return this.updateReservation(id, {
      status: 'CONFIRMADA',
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString()
    });
  },

  async cancelReservation(id: string, reason: string, cancelledBy: string = 'Administrador', fee: number = 0): Promise<Reservation> {
    return this.updateReservation(id, {
      status: 'CANCELADA',
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      cancellation_fee: fee
    });
  },

  async executeCheckin(id: string, notes?: string): Promise<Reservation> {
    return this.updateReservation(id, {
      status: 'CHECKIN_REALIZADO',
      actual_checkin_at: new Date().toISOString(),
      checkin_notes: notes || 'Check-in realizado com sucesso'
    });
  },

  async executeCheckout(id: string, notes?: string): Promise<Reservation> {
    return this.updateReservation(id, {
      status: 'CHECKOUT_REALIZADO',
      actual_checkout_at: new Date().toISOString(),
      checkout_notes: notes || 'Check-out realizado com sucesso'
    });
  },

  async duplicateReservation(id: string): Promise<Reservation> {
    const original = await this.getReservationById(id);
    if (!original) throw new Error('Reserva não encontrada.');
    const { id: _i, code: _c, created_at: _ca, ...rest } = original;
    return this.createReservation({
      ...rest,
      status: 'PRE_RESERVA',
      special_requests: `Cópia da reserva ${original.code}`
    }, original.guests_list);
  },

  async deleteReservation(id: string): Promise<boolean> {
    const store = getStore();
    const idx = store.reservations.findIndex(r => r.id === id);
    if (idx !== -1) {
      store.reservations[idx].is_deleted = true;
      saveStore(store);
    }
    return true;
  },

  async getChacaraBlocks(chacara_id?: string): Promise<ChacaraBlock[]> {
    const store = getStore();
    let list = store.blocks;
    if (chacara_id && chacara_id !== 'TODAS') {
      list = list.filter(b => b.chacara_id === chacara_id);
    }
    return JSON.parse(JSON.stringify(list));
  },

  async createChacaraBlock(block: Partial<ChacaraBlock>): Promise<ChacaraBlock> {
    const store = getStore();
    const newBlock: ChacaraBlock = {
      id: `block-${Date.now()}`,
      chacara_id: block.chacara_id || store.chacaras[0].id,
      start_date: block.start_date || new Date().toISOString().split('T')[0],
      end_date: block.end_date || new Date().toISOString().split('T')[0],
      title: block.title || 'Bloqueio Administrativo Demo',
      reason: block.reason || 'MANUTENCAO',
      description: block.description || '',
      created_at: new Date().toISOString()
    };
    store.blocks.push(newBlock);
    saveStore(store);
    return JSON.parse(JSON.stringify(newBlock));
  },

  async updateChacaraBlock(id: string, updates: Partial<ChacaraBlock>): Promise<boolean> {
    const store = getStore();
    const idx = store.blocks.findIndex(b => b.id === id);
    if (idx !== -1) {
      store.blocks[idx] = { ...store.blocks[idx], ...updates };
      saveStore(store);
    }
    return true;
  },

  async deleteChacaraBlock(id: string): Promise<boolean> {
    const store = getStore();
    store.blocks = store.blocks.filter(b => b.id !== id);
    saveStore(store);
    return true;
  },

  // ==========================================
  // EQUIPE (CREW)
  // ==========================================
  async getCrewRoles(includeInactive = true): Promise<CrewRole[]> {
    const store = getStore();
    let list = store.crewRoles;
    if (!includeInactive) list = list.filter(r => r.ativo);
    return JSON.parse(JSON.stringify(list));
  },

  async createCrewRole(roleData: Omit<CrewRole, 'id' | 'created_at' | 'updated_at'>): Promise<CrewRole> {
    const store = getStore();
    const newRole: CrewRole = {
      ...roleData,
      id: `role-${Date.now()}`,
      cor: roleData.cor || '#10B981',
      icone: roleData.icone || 'Sparkles',
      ativo: roleData.ativo ?? true,
      created_at: new Date().toISOString()
    };
    store.crewRoles.push(newRole);
    saveStore(store);
    return JSON.parse(JSON.stringify(newRole));
  },

  async updateCrewRole(id: string, roleData: Partial<CrewRole>): Promise<CrewRole> {
    const store = getStore();
    const idx = store.crewRoles.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Função não encontrada.');
    const updated = { ...store.crewRoles[idx], ...roleData, updated_at: new Date().toISOString() };
    store.crewRoles[idx] = updated;
    saveStore(store);
    return JSON.parse(JSON.stringify(updated));
  },

  async deleteCrewRole(id: string): Promise<void> {
    const store = getStore();
    store.crewRoles = store.crewRoles.filter(r => r.id !== id);
    saveStore(store);
  },

  async getCrewMembers(filters?: { search?: string; roleId?: string; chacaraId?: string; activeOnly?: boolean }): Promise<CrewMember[]> {
    const store = getStore();
    let list = store.crewMembers;

    if (filters?.activeOnly) list = list.filter(m => m.ativo);
    if (filters?.roleId && filters.roleId !== 'TODAS') list = list.filter(m => m.role_ids?.includes(filters.roleId!));
    if (filters?.chacaraId && filters.chacaraId !== 'TODAS') list = list.filter(m => m.chacara_ids?.includes(filters.chacaraId!));
    if (filters?.search?.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(m => m.nome.toLowerCase().includes(q) || (m.telefone && m.telefone.includes(q)));
    }

    // Populate roles and chacaras
    list.forEach(m => {
      m.roles = store.crewRoles.filter(r => m.role_ids?.includes(r.id));
      m.chacaras = store.chacaras.filter(c => m.chacara_ids?.includes(c.id));
      if (!m.payment_frequency) {
        m.payment_frequency = 'MONTHLY';
      }
    });

    return JSON.parse(JSON.stringify(list));
  },

  async getCrewMemberById(id: string): Promise<CrewMember | null> {
    const list = await this.getCrewMembers();
    return list.find(m => m.id === id) || null;
  },

  async createCrewMember(memberData: Omit<CrewMember, 'id' | 'created_at' | 'updated_at' | 'roles' | 'chacaras'>, roleIds: string[], chacaraIds: string[]): Promise<CrewMember> {
    const store = getStore();
    const id = `crew-${Date.now()}`;
    const newMember: CrewMember = {
      ...memberData,
      id,
      role_ids: roleIds,
      chacara_ids: chacaraIds,
      ativo: memberData.ativo ?? true,
      created_at: new Date().toISOString()
    };
    store.crewMembers.unshift(newMember);
    saveStore(store);
    return (await this.getCrewMemberById(id))!;
  },

  async updateCrewMember(id: string, memberData: Partial<CrewMember>, roleIds?: string[], chacaraIds?: string[]): Promise<CrewMember> {
    const store = getStore();
    const idx = store.crewMembers.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Colaborador não encontrado.');

    const updated: CrewMember = {
      ...store.crewMembers[idx],
      ...memberData,
      ...(roleIds !== undefined ? { role_ids: roleIds } : {}),
      ...(chacaraIds !== undefined ? { chacara_ids: chacaraIds } : {}),
      updated_at: new Date().toISOString()
    };

    store.crewMembers[idx] = updated;
    saveStore(store);
    return (await this.getCrewMemberById(id))!;
  },

  async deleteCrewMember(id: string): Promise<void> {
    const store = getStore();
    store.crewMembers = store.crewMembers.filter(m => m.id !== id);
    saveStore(store);
  },

  async toggleCrewMemberStatus(id: string, active: boolean): Promise<void> {
    await this.updateCrewMember(id, { ativo: active });
  },

  async linkMemberToProperty(memberId: string, chacaraId: string): Promise<void> {
    const store = getStore();
    const member = store.crewMembers.find(m => m.id === memberId);
    if (member && !member.chacara_ids?.includes(chacaraId)) {
      member.chacara_ids = [...(member.chacara_ids || []), chacaraId];
      saveStore(store);
    }
  },

  async unlinkMemberFromProperty(memberId: string, chacaraId: string): Promise<void> {
    const store = getStore();
    const member = store.crewMembers.find(m => m.id === memberId);
    if (member && member.chacara_ids) {
      member.chacara_ids = member.chacara_ids.filter(id => id !== chacaraId);
      saveStore(store);
    }
  },

  async getPropertyCrewMembers(chacaraId: string): Promise<CrewMember[]> {
    const list = await this.getCrewMembers();
    return list.filter(m => m.chacara_ids?.includes(chacaraId));
  },

  async getCrewAuditLogs(memberId?: string): Promise<CrewAuditLog[]> {
    return [];
  },

  // ==========================================
  // FINANCEIRO
  // ==========================================
  async getOrCreateReservationCharge(reservation: Reservation): Promise<ReservationCharge> {
    const total = reservation.financial_summary?.total_amount || 2000;
    return {
      id: `charge-${reservation.id}`,
      reservation_id: reservation.id,
      daily_rates_subtotal: total * 0.85,
      cleaning_fee: reservation.chacara?.cleaning_fee || 250,
      deposit_amount: reservation.chacara?.deposit_amount || 1000,
      pet_fee: 0,
      energy_fee: 0,
      event_fee: 0,
      extra_guests_fee: 0,
      discounts_total: 0,
      surcharges_total: 0,
      manual_adjustment: 0,
      total_amount: total,
      status: reservation.status === 'CANCELADA' ? 'CANCELADO' : 'PAGO',
      created_at: reservation.created_at
    };
  },

  async getReservationFinancialSummary(reservation: Reservation): Promise<ReservationFullFinancialSummary> {
    const store = getStore();
    const charge = await this.getOrCreateReservationCharge(reservation);
    const payments = store.payments.filter(p => p.reservation_id === reservation.id);
    const expenses = store.expenses.filter(e => e.reservation_id === reservation.id);
    const refunds = store.refunds.filter(r => r.reservation_id === reservation.id);

    const totalContracted = charge.total_amount;
    const totalReceived = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalRefunds = refunds.reduce((acc, r) => acc + r.amount, 0);
    const netBalance = totalContracted + totalExpenses - totalRefunds - totalReceived;

    return {
      reservation_id: reservation.id,
      charge,
      payments,
      deposit: {
        id: `dep-${reservation.id}`,
        reservation_id: reservation.id,
        expected_amount: charge.deposit_amount,
        received_amount: charge.deposit_amount,
        returned_amount: 0,
        status: 'RECEBIDO'
      },
      expenses,
      refunds,
      total_contracted: totalContracted,
      total_received: totalReceived,
      total_expenses: totalExpenses,
      total_refunds: totalRefunds,
      net_balance: Math.max(0, netBalance),
      financial_status: reservation.status === 'CANCELADA' ? 'CANCELADO' : (netBalance <= 0 ? 'PAGO' : 'PARCIALMENTE_PAGO'),
      audit_logs: []
    };
  },

  async addReservationPayment(reservation: Reservation, paymentData: { amount: number; payment_method: any; notes?: string; performed_by?: string }): Promise<ReservationPayment> {
    const store = getStore();
    const newPay: ReservationPayment = {
      id: `pay-${Date.now()}`,
      reservation_id: reservation.id,
      amount: Number(paymentData.amount),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentData.payment_method || 'PIX',
      notes: paymentData.notes || '',
      created_by: paymentData.performed_by || 'Administrador',
      created_at: new Date().toISOString()
    };
    store.payments.push(newPay);

    // Update reservation paid amount
    const res = store.reservations.find(r => r.id === reservation.id);
    if (res && res.financial_summary) {
      res.financial_summary.paid_amount = (res.financial_summary.paid_amount || 0) + newPay.amount;
    }

    saveStore(store);
    return JSON.parse(JSON.stringify(newPay));
  },

  async updateReservationDeposit(reservation: Reservation, updates: any): Promise<ReservationDeposit> {
    return {
      id: `dep-${reservation.id}`,
      reservation_id: reservation.id,
      expected_amount: 1000,
      received_amount: updates.received_amount || 1000,
      returned_amount: updates.returned_amount || 0,
      status: updates.status || 'RECEBIDO'
    };
  },

  async addReservationExpense(reservation: Reservation, expenseData: { description: string; amount: number; performed_by?: string }): Promise<ReservationExpense> {
    const store = getStore();
    const newExp: ReservationExpense = {
      id: `exp-${Date.now()}`,
      reservation_id: reservation.id,
      description: expenseData.description,
      amount: Number(expenseData.amount),
      expense_date: new Date().toISOString().split('T')[0],
      created_by: expenseData.performed_by || 'Administrador',
      created_at: new Date().toISOString()
    };
    store.expenses.push(newExp);
    saveStore(store);
    return JSON.parse(JSON.stringify(newExp));
  },

  async addReservationRefund(reservation: Reservation, refundData: { amount: number; reason: string; performed_by?: string }): Promise<ReservationRefund> {
    const store = getStore();
    const newRef: ReservationRefund = {
      id: `ref-${Date.now()}`,
      reservation_id: reservation.id,
      amount: Number(refundData.amount),
      reason: refundData.reason,
      refund_date: new Date().toISOString().split('T')[0],
      created_by: refundData.performed_by || 'Administrador',
      created_at: new Date().toISOString()
    };
    store.refunds.push(newRef);
    saveStore(store);
    return JSON.parse(JSON.stringify(newRef));
  },

  async reconcileExistingReservationStaffAssignments(): Promise<any> {
    const store = getStore();
    const storeAny = store as any;
    const reservations = store.reservations.filter(r => !r.is_deleted);
    const opEvents = storeAny.operationalEvents || storeAny.events || [];
    const propertyCrew = storeAny.propertyCrew || [];
    const crewMembers = storeAny.crewMembers || storeAny.crew || [];
    const membersMap = new Map<string, string>(crewMembers.map((m: any) => [m.id, String(m.nome || m.name || 'Funcionário')]));

    let ja_vinculadas = 0;
    let vinculadas_automaticamente = 0;
    let sem_vinculacao_informacao_insuficiente = 0;
    let conflitos_ambiguidades = 0;
    const detalhes: any[] = [];

    for (const res of reservations) {
      const resStaffIds: string[] = Array.isArray(res.staff_ids) ? res.staff_ids.filter(Boolean) : [];
      const chacara = store.chacaras.find(c => c.id === res.chacara_id);
      const chacaraName = chacara?.name || 'Chácara';

      if (resStaffIds.length > 0) {
        ja_vinculadas++;
        detalhes.push({
          reservation_id: res.id,
          reservation_code: res.code,
          chacara_name: chacaraName,
          checkin_date: res.checkin_date,
          checkout_date: res.checkout_date,
          status_migracao: 'JA_VINCULADO',
          staff_ids: resStaffIds,
          staff_names: resStaffIds.map(id => membersMap.get(id) || 'Funcionário'),
          motivo: 'Já possuía funcionários vinculados no registro da reserva.'
        });
        continue;
      }

      const linkedOp = opEvents.filter((e: any) => e.reservation_id === res.id && Array.isArray(e.staff_ids) && e.staff_ids.length > 0);
      if (linkedOp.length > 0) {
        const foundIds: string[] = [];
        linkedOp.forEach((e: any) => {
          (e.staff_ids as string[]).forEach((s: string) => {
            if (s && !foundIds.includes(s)) foundIds.push(s);
          });
        });

        if (foundIds.length > 0) {
          res.staff_ids = foundIds;
          res.staff_names = foundIds.map(id => membersMap.get(id) || 'Funcionário');
          res.primary_staff_id = foundIds[0];
          vinculadas_automaticamente++;
          detalhes.push({
            reservation_id: res.id,
            reservation_code: res.code,
            chacara_name: chacaraName,
            checkin_date: res.checkin_date,
            checkout_date: res.checkout_date,
            status_migracao: 'VINCULADO_AUTO_OPERACIONAL',
            staff_ids: foundIds,
            staff_names: res.staff_names,
            motivo: 'Vinculado automaticamente a partir dos eventos operacionais agendados para esta reserva.'
          });
          continue;
        }
      }

      const chacaraCrew = propertyCrew.filter((pc: any) => pc.chacara_id === res.chacara_id || pc.property_id === res.chacara_id);
      if (chacaraCrew.length === 1) {
        const crewMemberId = chacaraCrew[0].member_id || chacaraCrew[0].crew_member_id;
        if (crewMemberId) {
          const staffName = membersMap.get(crewMemberId) || 'Funcionário da Chácara';
          res.staff_ids = [crewMemberId];
          res.staff_names = [staffName];
          res.primary_staff_id = crewMemberId;
          vinculadas_automaticamente++;
          detalhes.push({
            reservation_id: res.id,
            reservation_code: res.code,
            chacara_name: chacaraName,
            checkin_date: res.checkin_date,
            checkout_date: res.checkout_date,
            status_migracao: 'VINCULADO_AUTO_EQUIPE_CHACARA',
            staff_ids: [crewMemberId],
            staff_names: [staffName],
            motivo: 'Vinculado ao único funcionário responsável cadastrado para esta chácara.'
          });
          continue;
        }
      } else if (chacaraCrew.length > 1) {
        conflitos_ambiguidades++;
      }

      sem_vinculacao_informacao_insuficiente++;
      detalhes.push({
        reservation_id: res.id,
        reservation_code: res.code,
        chacara_name: chacaraName,
        checkin_date: res.checkin_date,
        checkout_date: res.checkout_date,
        status_migracao: 'SEM_FUNCIONARIO_DEFINIDO',
        staff_ids: [],
        staff_names: [],
        motivo: 'Sem dados suficientes. Identificado como "sem funcionário definido" para atribuição manual.'
      });
    }

    saveStore(store);
    return {
      total_reservas: reservations.length,
      ja_vinculadas,
      vinculadas_automaticamente,
      sem_vinculacao_informacao_insuficiente,
      conflitos_ambiguidades,
      detalhes
    };
  },

  async getGlobalFinancialData(filters?: any) {
    const reservations = await this.getReservations(filters);
    let receitaPrevista = 0;
    let receitaRecebida = 0;
    let receitaPendente = 0;
    let totalNights = 0;

    const receitaPorChacara: Record<string, { chacaraName: string; total: number; count: number }> = {};
    const receitaPorOrigem: Record<string, { total: number; count: number }> = {};
    const itemsList: any[] = [];

    for (const res of reservations) {
      const summary = await this.getReservationFinancialSummary(res);
      itemsList.push({ reservation: res, summary });

      if (res.status !== 'CANCELADA') {
        receitaPrevista += summary.total_contracted;
        receitaRecebida += summary.total_received;
        receitaPendente += summary.net_balance;

        const cName = res.chacara?.name || 'Chácara Demo';
        if (!receitaPorChacara[cName]) receitaPorChacara[cName] = { chacaraName: cName, total: 0, count: 0 };
        receitaPorChacara[cName].total += summary.total_received;
        receitaPorChacara[cName].count += 1;

        const orig = res.origin || 'WHATSAPP';
        if (!receitaPorOrigem[orig]) receitaPorOrigem[orig] = { total: 0, count: 0 };
        receitaPorOrigem[orig].total += summary.total_received;
        receitaPorOrigem[orig].count += 1;

        totalNights += (res.financial_summary?.nights_count || 2);
      }
    }

    const activeCount = reservations.filter(r => r.status !== 'CANCELADA').length;

    return {
      receitaPrevista,
      receitaRecebida,
      receitaPendente,
      caucoesEmAberto: 12000,
      totalReembolsos: 1800,
      totalReservas: reservations.length,
      totalCanceladas: reservations.filter(r => r.status === 'CANCELADA').length,
      taxaOcupacao: 78,
      ticketMedio: activeCount > 0 ? receitaPrevista / activeCount : 0,
      tempoMedioHospedagem: 2.8,
      valorMedioDiaria: 1150,
      receitaPorChacara,
      receitaPorOrigem,
      itemsList
    };
  },

  // ==========================================
  // FASE 6: CALENDÁRIO OPERACIONAL
  // ==========================================

  async getOperationalEventTypes(): Promise<OperationalEventType[]> {
    const store = getStore();
    if (!store.operationalEventTypes || store.operationalEventTypes.length === 0) {
      store.operationalEventTypes = JSON.parse(JSON.stringify(DEMO_OPERATIONAL_EVENT_TYPES));
      saveStore(store);
    }
    return store.operationalEventTypes;
  },

  async saveOperationalEventType(type: Partial<OperationalEventType>): Promise<OperationalEventType> {
    const store = getStore();
    if (!store.operationalEventTypes) store.operationalEventTypes = [];

    let saved: OperationalEventType;
    if (type.id) {
      const idx = store.operationalEventTypes.findIndex(t => t.id === type.id);
      if (idx !== -1) {
        store.operationalEventTypes[idx] = {
          ...store.operationalEventTypes[idx],
          ...type,
          updated_at: new Date().toISOString()
        };
        saved = store.operationalEventTypes[idx];
      } else {
        saved = {
          id: type.id,
          code: type.code || `type_${Date.now()}`,
          name: type.name || 'Novo Tipo',
          color: type.color || '#3B82F6',
          icon: type.icon || 'Calendar',
          priority: type.priority || 1,
          description: type.description || '',
          settings: type.settings || {},
          is_system: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.operationalEventTypes.push(saved);
      }
    } else {
      saved = {
        id: `evt-type-${Date.now()}`,
        code: type.code || `custom_${Date.now()}`,
        name: type.name || 'Novo Tipo',
        color: type.color || '#3B82F6',
        icon: type.icon || 'Calendar',
        priority: type.priority || 1,
        description: type.description || '',
        settings: type.settings || {},
        is_system: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.operationalEventTypes.push(saved);
    }

    saveStore(store);
    return saved;
  },

  async deleteOperationalEventType(id: string): Promise<boolean> {
    const store = getStore();
    if (!store.operationalEventTypes) return false;
    const type = store.operationalEventTypes.find(t => t.id === id);
    if (type && type.is_system) {
      throw new Error('Tipos de sistema padrão não podem ser excluídos.');
    }
    store.operationalEventTypes = store.operationalEventTypes.filter(t => t.id !== id);
    saveStore(store);
    return true;
  },

  async getOperationalRecurrenceRules(): Promise<OperationalRecurrenceRule[]> {
    const store = getStore();
    if (!store.operationalRecurrenceRules || store.operationalRecurrenceRules.length === 0) {
      store.operationalRecurrenceRules = JSON.parse(JSON.stringify(DEMO_OPERATIONAL_RECURRENCE_RULES));
      saveStore(store);
    }
    return store.operationalRecurrenceRules.filter(r => r.is_active);
  },

  async saveOperationalRecurrenceRule(rule: Partial<OperationalRecurrenceRule>): Promise<OperationalRecurrenceRule> {
    const store = getStore();
    if (!store.operationalRecurrenceRules) store.operationalRecurrenceRules = [];

    let savedRule: OperationalRecurrenceRule;
    if (rule.id) {
      const idx = store.operationalRecurrenceRules.findIndex(r => r.id === rule.id);
      if (idx !== -1) {
        store.operationalRecurrenceRules[idx] = {
          ...store.operationalRecurrenceRules[idx],
          ...rule,
          updated_at: new Date().toISOString()
        } as OperationalRecurrenceRule;
        savedRule = store.operationalRecurrenceRules[idx];
      } else {
        savedRule = {
          id: rule.id,
          chacara_id: rule.chacara_id,
          event_type_id: rule.event_type_id || 'evt-type-15',
          event_type_code: rule.event_type_code || 'outro',
          title: rule.title || 'Recorrência sem título',
          description: rule.description,
          frequency: rule.frequency || 'SEMANAL',
          recurrence_interval: rule.recurrence_interval || 1,
          days_of_week: rule.days_of_week || [1],
          start_date: rule.start_date || new Date().toISOString().split('T')[0],
          end_date: rule.end_date,
          has_no_end_date: rule.has_no_end_date ?? true,
          max_occurrences: rule.max_occurrences,
          default_time_start: rule.default_time_start || '08:00',
          default_time_end: rule.default_time_end || '10:00',
          staff_ids: rule.staff_ids || [],
          automations: rule.automations || [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.operationalRecurrenceRules.push(savedRule);
      }
    } else {
      savedRule = {
        id: `rec-${Date.now()}`,
        chacara_id: rule.chacara_id,
        event_type_id: rule.event_type_id || 'evt-type-15',
        event_type_code: rule.event_type_code || 'outro',
        title: rule.title || 'Recorrência sem título',
        description: rule.description,
        frequency: rule.frequency || 'SEMANAL',
        recurrence_interval: rule.recurrence_interval || 1,
        days_of_week: rule.days_of_week || [1],
        start_date: rule.start_date || new Date().toISOString().split('T')[0],
        end_date: rule.end_date,
        has_no_end_date: rule.has_no_end_date ?? true,
        max_occurrences: rule.max_occurrences,
        default_time_start: rule.default_time_start || '08:00',
        default_time_end: rule.default_time_end || '10:00',
        staff_ids: rule.staff_ids || [],
        automations: rule.automations || [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.operationalRecurrenceRules.push(savedRule);
    }

    saveStore(store);
    return savedRule;
  },

  async deleteOperationalRecurrenceRule(id: string): Promise<boolean> {
    const store = getStore();
    if (!store.operationalRecurrenceRules) return false;
    store.operationalRecurrenceRules = store.operationalRecurrenceRules.filter(r => r.id !== id);
    // Also remove associated future generated events
    if (store.operationalEvents) {
      store.operationalEvents = store.operationalEvents.filter(e => e.recurrence_rule_id !== id || e.status === 'CONCLUIDO');
    }
    saveStore(store);
    return true;
  },

  async getOperationalEvents(filters?: {
    chacara_id?: string;
    staff_id?: string;
    event_type_code?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<OperationalEvent[]> {
    const store = getStore();
    if (!store.operationalEvents) {
      store.operationalEvents = JSON.parse(JSON.stringify(generateDemoOperationalEvents()));
      saveStore(store);
    }

    let list = [...store.operationalEvents];

    if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
      list = list.filter(e => e.chacara_id === filters.chacara_id);
    }

    if (filters?.staff_id && filters.staff_id !== 'TODOS') {
      list = list.filter(e => e.staff_ids && e.staff_ids.includes(filters.staff_id!));
    }

    if (filters?.event_type_code && filters.event_type_code !== 'TODOS') {
      list = list.filter(e => e.event_type_code === filters.event_type_code);
    }

    if (filters?.status && filters.status !== 'TODOS') {
      list = list.filter(e => e.status === filters.status);
    }

    if (filters?.start_date) {
      list = list.filter(e => e.end_date >= filters.start_date!);
    }

    if (filters?.end_date) {
      list = list.filter(e => e.start_date <= filters.end_date!);
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(e => 
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.chacara_name && e.chacara_name.toLowerCase().includes(q))
      );
    }

    // Populate type_info and staff_members helpers
    const types = await this.getOperationalEventTypes();
    const members = await this.getCrewMembers();
    const chacaras = await this.getChacaras();

    return list.map(evt => {
      const tInfo = types.find(t => t.code === evt.event_type_code || t.id === evt.event_type_id);
      const sMembers = members.filter(m => evt.staff_ids?.includes(m.id));
      const chacara = chacaras.find(c => c.id === evt.chacara_id);

      return {
        ...evt,
        type_info: tInfo,
        staff_members: sMembers,
        chacara,
        chacara_name: evt.chacara_name || chacara?.name || 'Geral'
      };
    });
  },

  async saveOperationalEvent(event: Partial<OperationalEvent>): Promise<OperationalEvent> {
    const store = getStore();
    if (!store.operationalEvents) store.operationalEvents = [];

    const chacaras = store.chacaras || [];
    const foundChacara = chacaras.find(c => c.id === event.chacara_id);

    const crewMembers = store.crewMembers || [];
    const staffNames = crewMembers
      .filter(m => event.staff_ids?.includes(m.id))
      .map(m => m.nome);

    let saved: OperationalEvent;

    if (event.id) {
      const idx = store.operationalEvents.findIndex(e => e.id === event.id);
      if (idx !== -1) {
        store.operationalEvents[idx] = {
          ...store.operationalEvents[idx],
          ...event,
          chacara_name: foundChacara?.name || event.chacara_name || store.operationalEvents[idx].chacara_name,
          staff_names: staffNames.length > 0 ? staffNames : store.operationalEvents[idx].staff_names,
          updated_at: new Date().toISOString()
        } as OperationalEvent;
        saved = store.operationalEvents[idx];
      } else {
        saved = {
          id: event.id,
          chacara_id: event.chacara_id,
          chacara_name: foundChacara?.name || event.chacara_name,
          recurrence_rule_id: event.recurrence_rule_id,
          event_type_id: event.event_type_id || 'evt-type-15',
          event_type_code: event.event_type_code || 'outro',
          title: event.title || 'Evento sem título',
          description: event.description,
          start_date: event.start_date || new Date().toISOString().split('T')[0],
          start_time: event.start_time || '08:00',
          end_date: event.end_date || event.start_date || new Date().toISOString().split('T')[0],
          end_time: event.end_time || '10:00',
          status: event.status || 'AGENDADO',
          staff_ids: event.staff_ids || [],
          staff_names: staffNames,
          automations: event.automations || [],
          metadata: event.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.operationalEvents.push(saved);
      }
    } else {
      saved = {
        id: `op-evt-${Date.now()}`,
        chacara_id: event.chacara_id,
        chacara_name: foundChacara?.name || event.chacara_name,
        recurrence_rule_id: event.recurrence_rule_id,
        event_type_id: event.event_type_id || 'evt-type-15',
        event_type_code: event.event_type_code || 'outro',
        title: event.title || 'Evento sem título',
        description: event.description,
        start_date: event.start_date || new Date().toISOString().split('T')[0],
        start_time: event.start_time || '08:00',
        end_date: event.end_date || event.start_date || new Date().toISOString().split('T')[0],
        end_time: event.end_time || '10:00',
        status: event.status || 'AGENDADO',
        staff_ids: event.staff_ids || [],
        staff_names: staffNames,
        automations: event.automations || [],
        metadata: event.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.operationalEvents.push(saved);
    }

    saveStore(store);
    return saved;
  },

  async updateOperationalEventStatus(
    eventId: string, 
    status: OperationalEventStatus, 
    payload?: {
      absence_reason?: string;
      absence_notes?: string;
      rescheduled_to_date?: string;
      confirmed_by?: string;
    }
  ): Promise<OperationalEvent> {
    const store = getStore();
    if (!store.operationalEvents) throw new Error('Evento não encontrado');

    const idx = store.operationalEvents.findIndex(e => e.id === eventId);
    if (idx === -1) throw new Error('Evento não encontrado');

    const evt = store.operationalEvents[idx];
    evt.status = status;
    evt.updated_at = new Date().toISOString();

    if (status === 'CONFIRMADO' || status === 'CONCLUIDO') {
      evt.presence_confirmed_at = new Date().toISOString();
      evt.presence_confirmed_by = payload?.confirmed_by || 'Administrador';
    } else if (status === 'FALTOU') {
      evt.absence_reason = payload?.absence_reason;
      evt.absence_notes = payload?.absence_notes;
      evt.rescheduled_to_date = payload?.rescheduled_to_date;
      
      // If a new rescheduled date was provided, auto-create a new rescheduled event
      if (payload?.rescheduled_to_date) {
        const newRescheduledEvent: OperationalEvent = {
          ...evt,
          id: `op-evt-${Date.now()}`,
          start_date: payload.rescheduled_to_date,
          end_date: payload.rescheduled_to_date,
          status: 'AGENDADO',
          title: `[Reagendado] ${evt.title}`,
          presence_confirmed_at: undefined,
          presence_confirmed_by: undefined,
          absence_reason: undefined,
          absence_notes: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.operationalEvents.push(newRescheduledEvent);
      }
    }

    saveStore(store);
    return evt;
  },

  async deleteOperationalEvent(
    id: string, 
    scope: 'THIS_OCCURRENCE' | 'ALL_OCCURRENCES' | 'THIS_AND_FUTURE' = 'THIS_OCCURRENCE',
    options?: {
      disableAutomation?: boolean;
      reason?: string;
      deletedBy?: string;
    }
  ): Promise<boolean> {
    const store = getStore();
    if (!store.operationalEvents) store.operationalEvents = [];

    const cleanId = id.replace(/^op_/, '');

    // 1. Check if event has associated reservation & disable automation if requested
    const existingEvt = store.operationalEvents.find(e => e.id === cleanId || e.id === id);
    const resId = existingEvt?.reservation_id || existingEvt?.metadata?.reservation_id;

    if (options?.disableAutomation && resId && store.reservations) {
      const resIndex = store.reservations.findIndex(r => r.id === resId);
      if (resIndex !== -1) {
        const resObj = store.reservations[resIndex] as any;
        resObj.metadata = {
          ...(resObj.metadata || {}),
          is_cleaning_automation_disabled: true,
          automation_disabled_at: new Date().toISOString(),
          automation_disabled_by: options?.deletedBy || 'Administrador',
          automation_disabled_reason: options?.reason || 'Serviço automático excluído'
        };
      }
    }

    // 2. Handle generated recurrence IDs: gen-[ruleId]-[YYYY-MM-DD]
    if (cleanId.startsWith('gen-')) {
      const dateStr = cleanId.slice(-10); // e.g. "2026-07-25"
      const ruleId = cleanId.substring(4, cleanId.length - 11); // e.g. "op-rec-1"

      if (scope === 'ALL_OCCURRENCES') {
        if (store.operationalRecurrenceRules) {
          store.operationalRecurrenceRules = store.operationalRecurrenceRules.filter(r => r.id !== ruleId);
        }
        store.operationalEvents = store.operationalEvents.filter(e => e.recurrence_rule_id !== ruleId);
      } else {
        // Create an explicit CANCELADO event in store.operationalEvents to suppress this generated occurrence
        const rule = store.operationalRecurrenceRules?.find(r => r.id === ruleId);
        const cancelledEvt: OperationalEvent = {
          id: cleanId,
          chacara_id: rule?.chacara_id,
          recurrence_rule_id: ruleId,
          event_type_id: rule?.event_type_id || 'evt-type-15',
          event_type_code: rule?.event_type_code || 'outro',
          title: rule?.title || 'Serviço Recorrente',
          description: rule?.description,
          start_date: dateStr,
          start_time: rule?.default_time_start || '08:00',
          end_date: dateStr,
          end_time: rule?.default_time_end || '10:00',
          status: 'CANCELADO',
          staff_ids: rule?.staff_ids || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.operationalEvents = store.operationalEvents.filter(e => e.id !== cleanId);
        store.operationalEvents.push(cancelledEvt);
      }

      saveStore(store);
      return true;
    }

    // 3. Handle standard saved operational events
    const targetIndex = store.operationalEvents.findIndex(
      e => e.id === cleanId || e.id === id || e.id.replace(/^op_/, '') === cleanId
    );

    if (targetIndex !== -1) {
      const target = store.operationalEvents[targetIndex];

      if (scope === 'THIS_OCCURRENCE' || !target.recurrence_rule_id) {
        // Mark as CANCELADO with audit metadata
        store.operationalEvents[targetIndex] = {
          ...target,
          status: 'CANCELADO',
          updated_at: new Date().toISOString(),
          metadata: {
            ...(target.metadata || {}),
            deleted_at: new Date().toISOString(),
            deleted_by: options?.deletedBy || 'Administrador',
            deletion_reason: options?.reason || 'Excluído pelo usuário',
            is_automation_disabled: options?.disableAutomation || false
          }
        };
      } else if (scope === 'ALL_OCCURRENCES') {
        const ruleId = target.recurrence_rule_id;
        store.operationalEvents = store.operationalEvents.filter(e => e.recurrence_rule_id !== ruleId);
        if (store.operationalRecurrenceRules) {
          store.operationalRecurrenceRules = store.operationalRecurrenceRules.filter(r => r.id !== ruleId);
        }
      } else if (scope === 'THIS_AND_FUTURE') {
        const ruleId = target.recurrence_rule_id;
        store.operationalEvents = store.operationalEvents.filter(e => {
          if (e.recurrence_rule_id === ruleId) {
            return e.start_date < target.start_date;
          }
          return true;
        });
      }
    } else {
      // Fallback: filter out by cleanId or id
      store.operationalEvents = store.operationalEvents.filter(
        e => e.id !== cleanId && e.id !== id
      );
    }

    saveStore(store);
    return true;
  },

  async getStaffUnavailability(): Promise<StaffUnavailability[]> {
    const store = getStore();
    if (!store.staffUnavailability) {
      store.staffUnavailability = JSON.parse(JSON.stringify(DEMO_STAFF_UNAVAILABILITY));
      saveStore(store);
    }
    return store.staffUnavailability;
  },

  async saveStaffUnavailability(unavail: Partial<StaffUnavailability>): Promise<StaffUnavailability> {
    const store = getStore();
    if (!store.staffUnavailability) store.staffUnavailability = [];

    const newItem: StaffUnavailability = {
      id: unavail.id || `unavail-${Date.now()}`,
      member_id: unavail.member_id!,
      start_date: unavail.start_date!,
      end_date: unavail.end_date!,
      reason: unavail.reason || 'Ausência Registrada',
      notes: unavail.notes,
      created_at: new Date().toISOString()
    };

    store.staffUnavailability.push(newItem);
    saveStore(store);
    return newItem;
  },

  async getOrCreateEmergencyFund(): Promise<EmergencyFund> {
    const store = getStore();
    return store.emergencyFund!;
  },

  async getEmergencyFundSummary(filters?: {
    chacara_id?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<EmergencyFundSummary> {
    const store = getStore();
    const fund = store.emergencyFund!;
    let txs = store.emergencyFundTransactions || [];

    if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
      txs = txs.filter(t => t.chacara_id === filters.chacara_id);
    }
    if (filters?.startDate) {
      txs = txs.filter(t => t.created_at >= `${filters.startDate}T00:00:00.000Z`);
    }
    if (filters?.endDate) {
      txs = txs.filter(t => t.created_at <= `${filters.endDate}T23:59:59.999Z`);
    }

    const percentage = Number(fund.default_percentage || 20);

    // Active reservations in demo store
    let activeReservations = store.reservations.filter(
      r => !r.is_deleted && r.status !== 'CANCELADA'
    );
    if (filters?.chacara_id && filters.chacara_id !== 'TODAS') {
      activeReservations = activeReservations.filter(r => r.chacara_id === filters.chacara_id);
    }
    if (filters?.startDate) {
      activeReservations = activeReservations.filter(r => r.checkin_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      activeReservations = activeReservations.filter(r => r.checkin_date <= filters.endDate!);
    }

    let totalReservationsGrossVolume = 0;
    const chacaraReservationsVolume: Record<string, { name: string; volume: number; count: number }> = {};

    activeReservations.forEach(r => {
      let rPrice = 0;
      if (r.is_custom_price && r.custom_price != null && Number(r.custom_price) > 0) {
        rPrice = Number(r.custom_price);
      } else if (r.financial_summary && Number(r.financial_summary.total_amount) > 0) {
        rPrice = Number(r.financial_summary.total_amount);
      } else {
        rPrice = 1500;
      }
      totalReservationsGrossVolume += rPrice;

      const cId = r.chacara_id || 'sem_chacara';
      const c = store.chacaras.find(ch => ch.id === cId);
      const cName = c?.name || (cId === 'sem_chacara' ? 'Geral / Não Especificada' : 'Chácara');

      if (!chacaraReservationsVolume[cId]) {
        chacaraReservationsVolume[cId] = { name: cName, volume: 0, count: 0 };
      }
      chacaraReservationsVolume[cId].volume += rPrice;
      chacaraReservationsVolume[cId].count += 1;
    });

    let currentBalance = 0;
    let totalAccumulated = 0;
    let totalUsed = 0;
    let totalRefunded = 0;
    const contributingResIds = new Set<string>();
    const chacaraMap: Record<string, ChacaraEmergencyContribution> = {};

    Object.keys(chacaraReservationsVolume).forEach(cId => {
      const info = chacaraReservationsVolume[cId];
      const idealAmt = Math.round((info.volume * (percentage / 100)) * 100) / 100;
      chacaraMap[cId] = {
        chacara_id: cId,
        chacara_name: info.name,
        reservations_count: info.count,
        reservations_gross_volume: Math.round(info.volume * 100) / 100,
        ideal_speculated_amount: idealAmt,
        total_allocated: 0,
        total_used: 0,
        net_contribution: 0,
        coverage_percentage: 0,
        transactions_count: 0
      };
    });

    txs.forEach(tx => {
      const amt = Number(tx.amount || 0);
      currentBalance += amt;
      if (amt > 0) {
        totalAccumulated += amt;
      } else if (tx.transaction_type === 'RETIRADA_DESPESA') {
        totalUsed += Math.abs(amt);
      } else if (tx.transaction_type === 'ESTORNO_REEMBOLSO') {
        totalRefunded += Math.abs(amt);
      }

      if (tx.reservation_id) {
        contributingResIds.add(tx.reservation_id);
      }

      const cId = tx.chacara_id || 'sem_chacara';
      const cName = tx.chacara_name || (cId === 'sem_chacara' ? 'Geral / Não Especificada' : 'Chácara');
      if (!chacaraMap[cId]) {
        chacaraMap[cId] = {
          chacara_id: cId,
          chacara_name: cName,
          reservations_count: 0,
          reservations_gross_volume: 0,
          ideal_speculated_amount: 0,
          total_allocated: 0,
          total_used: 0,
          net_contribution: 0,
          coverage_percentage: 0,
          transactions_count: 0
        };
      }
      if (amt > 0) {
        chacaraMap[cId].total_allocated += amt;
      } else {
        chacaraMap[cId].total_used += Math.abs(amt);
      }
      chacaraMap[cId].net_contribution += amt;
      chacaraMap[cId].transactions_count += 1;
    });

    Object.values(chacaraMap).forEach(item => {
      item.total_allocated = Math.round(item.total_allocated * 100) / 100;
      item.total_used = Math.round(item.total_used * 100) / 100;
      item.net_contribution = Math.round(item.net_contribution * 100) / 100;
      if (item.ideal_speculated_amount > 0) {
        item.coverage_percentage = Math.min(100, Math.round((item.total_allocated / item.ideal_speculated_amount) * 100));
      } else if (item.total_allocated > 0) {
        item.coverage_percentage = 100;
      }
    });

    const recentEntries = [...txs].filter(t => Number(t.amount) > 0).reverse().slice(0, 10);
    const recentExits = [...txs].filter(t => Number(t.amount) < 0).reverse().slice(0, 10);

    const idealSpeculatedAccumulated = Math.round((totalReservationsGrossVolume * (percentage / 100)) * 100) / 100;
    const roundedCurrentBalance = Math.round(currentBalance * 100) / 100;
    const speculatedCoveragePercentage = idealSpeculatedAccumulated > 0
      ? Math.min(100, Math.round((roundedCurrentBalance / idealSpeculatedAccumulated) * 100))
      : (roundedCurrentBalance > 0 ? 100 : 0);

    const pendingSpeculatedBalance = Math.max(0, Math.round((idealSpeculatedAccumulated - totalAccumulated) * 100) / 100);

    return {
      fund,
      current_balance: roundedCurrentBalance,
      total_accumulated: Math.round(totalAccumulated * 100) / 100,
      total_used: Math.round(totalUsed * 100) / 100,
      total_refunded: Math.round(totalRefunded * 100) / 100,
      contributing_reservations_count: contributingResIds.size,
      total_reservations_count: activeReservations.length,
      total_reservations_gross_volume: Math.round(totalReservationsGrossVolume * 100) / 100,
      ideal_speculated_accumulated: idealSpeculatedAccumulated,
      speculated_coverage_percentage: speculatedCoveragePercentage,
      pending_speculated_balance: pendingSpeculatedBalance,
      configured_percentage: percentage,
      contributions_by_chacara: Object.values(chacaraMap).sort((a, b) => b.ideal_speculated_amount - a.ideal_speculated_amount),
      recent_entries: recentEntries,
      recent_exits: recentExits,
      all_transactions: [...txs].reverse()
    };
  },

  async allocateEmergencyFundFromPayment(
    payment: ReservationPayment,
    reservation?: Reservation
  ): Promise<EmergencyFundTransaction | null> {
    const store = getStore();
    const fund = store.emergencyFund!;

    // Idempotency check
    const existing = (store.emergencyFundTransactions || []).find(
      t => t.payment_id === payment.id && t.transaction_type === 'APORTE_AUTOMATICO'
    );
    if (existing) return existing;

    const res = reservation || store.reservations.find(r => r.id === payment.reservation_id);
    const percentage = Number(fund.default_percentage || 20);
    const allocated = Math.round(Number(payment.amount) * (percentage / 100) * 100) / 100;
    if (allocated <= 0) return null;

    const currentTotal = (store.emergencyFundTransactions || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal + allocated) * 100) / 100;

    const newTx: EmergencyFundTransaction = {
      id: `tx-em-${payment.id}`,
      fund_id: fund.id,
      chacara_id: res?.chacara_id || null,
      chacara_name: res?.chacara?.name || null,
      reservation_id: res?.id || payment.reservation_id || null,
      reservation_code: res?.code || null,
      payment_id: payment.id,
      transaction_type: 'APORTE_AUTOMATICO',
      amount: allocated,
      gross_amount: Number(payment.amount),
      percentage_applied: percentage,
      balance_after: balanceAfter,
      category: 'RECEITA_ALUGUEL_20%',
      description: `Aporte Automático (${percentage}%) - Reserva #${res?.code || 'N/A'}`,
      performed_by: payment.created_by || 'Sistema',
      notes: payment.notes || null,
      created_at: new Date().toISOString()
    };

    store.emergencyFundTransactions = store.emergencyFundTransactions || [];
    store.emergencyFundTransactions.push(newTx);
    fund.current_balance = balanceAfter;
    fund.updated_at = new Date().toISOString();

    saveStore(store);
    return newTx;
  },

  async revertEmergencyFundFromRefund(
    refund: ReservationRefund,
    reservation?: Reservation
  ): Promise<EmergencyFundTransaction | null> {
    const store = getStore();
    const fund = store.emergencyFund!;

    const existing = (store.emergencyFundTransactions || []).find(
      t => t.refund_id === refund.id && t.transaction_type === 'ESTORNO_REEMBOLSO'
    );
    if (existing) return existing;

    const res = reservation || store.reservations.find(r => r.id === refund.reservation_id);
    const percentage = Number(fund.default_percentage || 20);
    const reversal = Math.round(Number(refund.amount) * (percentage / 100) * 100) / 100;
    if (reversal <= 0) return null;

    const currentTotal = (store.emergencyFundTransactions || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal - reversal) * 100) / 100;

    const newTx: EmergencyFundTransaction = {
      id: `tx-em-ref-${refund.id}`,
      fund_id: fund.id,
      chacara_id: res?.chacara_id || null,
      chacara_name: res?.chacara?.name || null,
      reservation_id: res?.id || refund.reservation_id || null,
      reservation_code: res?.code || null,
      refund_id: refund.id,
      transaction_type: 'ESTORNO_REEMBOLSO',
      amount: -Math.abs(reversal),
      gross_amount: Number(refund.amount),
      percentage_applied: percentage,
      balance_after: balanceAfter,
      category: 'ESTORNO_CANCELAMENTO_REEMBOLSO',
      description: `Estorno de Reembolso (${percentage}%) - Reserva #${res?.code || 'N/A'}: ${refund.reason || 'Cancelamento'}`,
      performed_by: refund.created_by || 'Sistema',
      notes: refund.reason || null,
      created_at: new Date().toISOString()
    };

    store.emergencyFundTransactions = store.emergencyFundTransactions || [];
    store.emergencyFundTransactions.push(newTx);
    fund.current_balance = balanceAfter;
    fund.updated_at = new Date().toISOString();

    saveStore(store);
    return newTx;
  },

  async recordEmergencyFundExpense(input: RecordExpenseInput): Promise<EmergencyFundTransaction> {
    const store = getStore();
    const fund = store.emergencyFund!;
    const amount = Math.round(Number(input.amount) * 100) / 100;

    const currentTotal = (store.emergencyFundTransactions || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal - amount) * 100) / 100;

    const c = input.chacara_id ? store.chacaras.find(ch => ch.id === input.chacara_id) : null;

    const newTx: EmergencyFundTransaction = {
      id: `tx-em-exp-${Date.now()}`,
      fund_id: fund.id,
      chacara_id: input.chacara_id || null,
      chacara_name: c?.name || null,
      transaction_type: 'RETIRADA_DESPESA',
      amount: -Math.abs(amount),
      gross_amount: amount,
      balance_after: balanceAfter,
      category: input.category || 'INFRAESTRUTURA_EMERGENCIAL',
      description: input.description.trim(),
      performed_by: input.performed_by || 'Administrador',
      notes: input.notes || null,
      created_at: new Date().toISOString()
    };

    store.emergencyFundTransactions = store.emergencyFundTransactions || [];
    store.emergencyFundTransactions.push(newTx);
    fund.current_balance = balanceAfter;
    fund.updated_at = new Date().toISOString();

    saveStore(store);
    return newTx;
  },

  async recordManualEmergencyContribution(input: RecordManualContributionInput): Promise<EmergencyFundTransaction> {
    const store = getStore();
    const fund = store.emergencyFund!;
    const amount = Math.round(Number(input.amount) * 100) / 100;

    const currentTotal = (store.emergencyFundTransactions || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal + amount) * 100) / 100;

    const c = input.chacara_id ? store.chacaras.find(ch => ch.id === input.chacara_id) : null;

    const newTx: EmergencyFundTransaction = {
      id: `tx-em-man-${Date.now()}`,
      fund_id: fund.id,
      chacara_id: input.chacara_id || null,
      chacara_name: c?.name || null,
      transaction_type: 'APORTE_MANUAL',
      amount: Math.abs(amount),
      gross_amount: amount,
      balance_after: balanceAfter,
      category: 'APORTE_EXTRAORDINARIO',
      description: input.description.trim(),
      performed_by: input.performed_by || 'Administrador',
      notes: input.notes || null,
      created_at: new Date().toISOString()
    };

    store.emergencyFundTransactions = store.emergencyFundTransactions || [];
    store.emergencyFundTransactions.push(newTx);
    fund.current_balance = balanceAfter;
    fund.updated_at = new Date().toISOString();

    saveStore(store);
    return newTx;
  },

  async recordManualEmergencyWithdrawal(input: RecordManualWithdrawalInput): Promise<EmergencyFundTransaction> {
    const store = getStore();
    const fund = store.emergencyFund!;
    const amount = Math.round(Number(input.amount) * 100) / 100;

    const currentTotal = (store.emergencyFundTransactions || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const balanceAfter = Math.round((currentTotal - amount) * 100) / 100;

    const c = input.chacara_id ? store.chacaras.find(ch => ch.id === input.chacara_id) : null;

    const newTx: EmergencyFundTransaction = {
      id: `tx-em-adj-${Date.now()}`,
      fund_id: fund.id,
      chacara_id: input.chacara_id || null,
      chacara_name: c?.name || null,
      transaction_type: 'AJUSTE_MANUAL',
      amount: -Math.abs(amount),
      gross_amount: amount,
      balance_after: balanceAfter,
      category: 'AJUSTE_RETIRADA_MANUAL',
      description: input.description.trim(),
      performed_by: input.performed_by || 'Administrador',
      notes: input.notes || null,
      created_at: new Date().toISOString()
    };

    store.emergencyFundTransactions = store.emergencyFundTransactions || [];
    store.emergencyFundTransactions.push(newTx);
    fund.current_balance = balanceAfter;
    fund.updated_at = new Date().toISOString();

    saveStore(store);
    return newTx;
  },

  async updateEmergencyFundPercentage(newPercentage: number): Promise<EmergencyFund> {
    const store = getStore();
    const fund = store.emergencyFund!;
    fund.default_percentage = Math.round(Number(newPercentage) * 100) / 100;
    fund.updated_at = new Date().toISOString();

    saveStore(store);
    return fund;
  }
};

