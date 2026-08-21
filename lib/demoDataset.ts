import { 
  Chacara, 
  Client, 
  Reservation, 
  ChacaraBlock, 
  CrewRole, 
  CrewMember, 
  Owner,
  ReservationPayment,
  ReservationExpense,
  ReservationRefund
} from '@/lib/chacaraTypes';

export const DEMO_OWNERS: Owner[] = [
  {
    id: 'owner-001',
    full_name: 'Carlos Eduardo Silva',
    document_number: '123.456.789-00',
    cpf_cnpj: '123.456.789-00',
    email: 'carlos.silva@chacaras.com.br',
    phone: '(11) 98765-4321',
    notes: 'Proprietário de 3 chácaras em Mairiporã e Atibaia.'
  },
  {
    id: 'owner-002',
    full_name: 'Ana Maria Pereira',
    document_number: '234.567.890-11',
    cpf_cnpj: '234.567.890-11',
    email: 'ana.pereira@gmail.com',
    phone: '(11) 97654-3210',
    notes: 'Proprietária da Estância Bela Vista e Recanto do Sol.'
  },
  {
    id: 'owner-003',
    full_name: 'Marcos Roberto Santos',
    document_number: '345.678.901-22',
    cpf_cnpj: '345.678.901-22',
    email: 'marcos.santos@grupoestancia.com.br',
    phone: '(15) 99123-8877',
    notes: 'Proprietário de sítios na região de Ibiúna e Sorocaba.'
  },
  {
    id: 'owner-004',
    full_name: 'Juliana Montenegro',
    document_number: '456.789.012-33',
    cpf_cnpj: '456.789.012-33',
    email: 'juliana.montenegro@outloook.com',
    phone: '(19) 98112-4455',
    notes: 'Investidora em imóveis de temporada no interior de SP.'
  }
];

export const DEMO_CHACARAS: Chacara[] = [
  {
    id: 'chacara-001',
    owner_id: 'owner-001',
    name: 'Recanto das Palmeiras',
    description: 'Excelente chácara para eventos familiares e finais de semana. Ampla área verde com campo de futebol, piscina aquecida, churrasqueira completa e salão de festas decorado.',
    status: 'ATIVA',
    street: 'Estrada das Palmeiras',
    neighborhood: 'Capoavinha',
    city: 'Mairiporã',
    state: 'SP',
    zip_code: '07600-000',
    capacity_people: 40,
    bedrooms_count: 6,
    bathrooms_count: 5,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: true,
    has_wifi: true,
    has_air_conditioning: true,
    has_equipped_kitchen: true,
    rules: 'Proibido som alto após as 22h. Animais permitidos mediante taxa. Limite de 40 pessoas.',
    checkin_time: '14:00',
    checkout_time: '12:00',
    daily_rate_standard: 1200,
    daily_rate_weekend: 1800,
    daily_rate_holiday: 2200,
    deposit_amount: 1000,
    cleaning_fee: 250,
    extra_guest_fee: 100,
    included_guests: 20,
    max_capacity: 40,
    allow_pets: true,
    pet_fee: 150,
    energy_fee: 0,
    event_fee: 500,
    main_photo_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=80',
    owner: DEMO_OWNERS[0],
    photos: [
      { id: 'p1', chacara_id: 'chacara-001', url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=80', is_main: true, display_order: 0 },
      { id: 'p2', chacara_id: 'chacara-001', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&q=80', is_main: false, display_order: 1 },
      { id: 'p3', chacara_id: 'chacara-001', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', is_main: false, display_order: 2 }
    ]
  },
  {
    id: 'chacara-002',
    owner_id: 'owner-001',
    name: 'Vila dos Sonhos',
    description: 'Chácara de alto padrão em condomínio fechado com segurança 24h. Conta com piscina de borda infinita, sauna a vapor, quadra de tênis e suítes climatizadas.',
    status: 'ATIVA',
    street: 'Alameda dos Ipês, 150',
    neighborhood: 'Residencial Shambbala',
    city: 'Atibaia',
    state: 'SP',
    zip_code: '12940-000',
    capacity_people: 25,
    bedrooms_count: 5,
    bathrooms_count: 6,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: false,
    has_wifi: true,
    has_air_conditioning: true,
    has_equipped_kitchen: true,
    rules: 'Não são permitidas festas abertas ao público. Som ambiente apenas na área da piscina.',
    checkin_time: '15:00',
    checkout_time: '12:00',
    daily_rate_standard: 1500,
    daily_rate_weekend: 2400,
    daily_rate_holiday: 2800,
    deposit_amount: 1500,
    cleaning_fee: 300,
    extra_guest_fee: 120,
    included_guests: 15,
    max_capacity: 25,
    allow_pets: false,
    pet_fee: 0,
    energy_fee: 0,
    event_fee: 0,
    main_photo_url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80',
    owner: DEMO_OWNERS[0],
    photos: [
      { id: 'p4', chacara_id: 'chacara-002', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80', is_main: true, display_order: 0 },
      { id: 'p5', chacara_id: 'chacara-002', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80', is_main: false, display_order: 1 }
    ]
  },
  {
    id: 'chacara-003',
    owner_id: 'owner-002',
    name: 'Estância Bela Vista',
    description: 'Sítio charmoso próximo à Rota do Vinho em São Roque. Vista panorâmica espetacular para as montanhas, lareira externa, lago para pesca e pomar variado.',
    status: 'ATIVA',
    street: 'Estrada do Vinho, Km 8',
    neighborhood: 'Canguiri',
    city: 'São Roque',
    state: 'SP',
    zip_code: '18130-000',
    capacity_people: 30,
    bedrooms_count: 4,
    bathrooms_count: 4,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: true,
    has_wifi: true,
    has_air_conditioning: false,
    has_equipped_kitchen: true,
    rules: 'Cuidado com o fogo na lareira externa. Pesca esportiva permitida no lago.',
    checkin_time: '14:00',
    checkout_time: '14:00',
    daily_rate_standard: 950,
    daily_rate_weekend: 1450,
    daily_rate_holiday: 1800,
    deposit_amount: 800,
    cleaning_fee: 200,
    extra_guest_fee: 80,
    included_guests: 15,
    max_capacity: 30,
    allow_pets: true,
    pet_fee: 100,
    energy_fee: 0,
    event_fee: 400,
    main_photo_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
    owner: DEMO_OWNERS[1],
    photos: [
      { id: 'p6', chacara_id: 'chacara-003', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  },
  {
    id: 'chacara-004',
    owner_id: 'owner-003',
    name: 'Valle dos Pássaros',
    description: 'Refúgio ecológico rodeado de mata nativa em Ibiúna. Piscina natural com água de nascente, playground infantil, espaço gourmet caipira e trilhas privativas.',
    status: 'ATIVA',
    street: 'Estrada Municipal da Bunka',
    neighborhood: 'Residencial Paruru',
    city: 'Ibiúna',
    state: 'SP',
    zip_code: '18150-000',
    capacity_people: 35,
    bedrooms_count: 5,
    bathrooms_count: 4,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: true,
    has_wifi: true,
    has_air_conditioning: false,
    has_equipped_kitchen: true,
    rules: 'Respeito à fauna e flora local. Lixo reciclável deve ser separado.',
    checkin_time: '12:00',
    checkout_time: '12:00',
    daily_rate_standard: 850,
    daily_rate_weekend: 1300,
    daily_rate_holiday: 1600,
    deposit_amount: 700,
    cleaning_fee: 180,
    extra_guest_fee: 70,
    included_guests: 15,
    max_capacity: 35,
    allow_pets: true,
    pet_fee: 80,
    energy_fee: 0,
    event_fee: 350,
    main_photo_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
    owner: DEMO_OWNERS[2],
    photos: [
      { id: 'p7', chacara_id: 'chacara-004', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  },
  {
    id: 'chacara-005',
    owner_id: 'owner-002',
    name: 'Chácara Santa Luzia',
    description: 'Espaço acolhedor ideal para casamentos no campo, aniversários e encontros de empresas. Possui capela, pergolado decorativo e salão com capacidade para 120 convidados.',
    status: 'ATIVA',
    street: 'Estrada do Barnabé, 450',
    neighborhood: 'Santa Luzia',
    city: 'Juquitiba',
    state: 'SP',
    zip_code: '06950-000',
    capacity_people: 60,
    bedrooms_count: 7,
    bathrooms_count: 8,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: true,
    has_wifi: true,
    has_air_conditioning: true,
    has_equipped_kitchen: true,
    rules: 'Eventos grandes exigem equipe de limpeza reforçada contratada previamente.',
    checkin_time: '14:00',
    checkout_time: '12:00',
    daily_rate_standard: 1800,
    daily_rate_weekend: 2900,
    daily_rate_holiday: 3500,
    deposit_amount: 2000,
    cleaning_fee: 450,
    extra_guest_fee: 150,
    included_guests: 30,
    max_capacity: 60,
    allow_pets: true,
    pet_fee: 200,
    energy_fee: 100,
    event_fee: 800,
    main_photo_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
    owner: DEMO_OWNERS[1],
    photos: [
      { id: 'p8', chacara_id: 'chacara-005', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  },
  {
    id: 'chacara-006',
    owner_id: 'owner-004',
    name: 'Quinta das Orquídeas',
    description: 'Propriedade elegante em Itupeva com paisagismo premiado. Piscina infantil e adulta, banheira de hidromassagem aquecida ao ar livre e cozinha profissional.',
    status: 'ATIVA',
    street: 'Rua das Orquídeas, 88',
    neighborhood: 'Cafezal II',
    city: 'Itupeva',
    state: 'SP',
    zip_code: '13295-000',
    capacity_people: 20,
    bedrooms_count: 4,
    bathrooms_count: 4,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: false,
    has_wifi: true,
    has_air_conditioning: true,
    has_equipped_kitchen: true,
    rules: 'Proibido fumar no interior da casa principal.',
    checkin_time: '15:00',
    checkout_time: '11:00',
    daily_rate_standard: 1100,
    daily_rate_weekend: 1750,
    daily_rate_holiday: 2100,
    deposit_amount: 1000,
    cleaning_fee: 220,
    extra_guest_fee: 90,
    included_guests: 12,
    max_capacity: 20,
    allow_pets: true,
    pet_fee: 120,
    energy_fee: 0,
    event_fee: 0,
    main_photo_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    owner: DEMO_OWNERS[3],
    photos: [
      { id: 'p9', chacara_id: 'chacara-006', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  },
  {
    id: 'chacara-007',
    owner_id: 'owner-003',
    name: 'Sítio Verde Vida',
    description: 'Ampla propriedade rural com estrutura completa para retiros espirituais e corporativos. Refeitório espaçoso, alojamentos confortáveis e área de fogueira.',
    status: 'ATIVA',
    street: 'Rodovia João Leme, Km 12',
    neighborhood: 'Brigadeiro Tobias',
    city: 'Sorocaba',
    state: 'SP',
    zip_code: '18080-000',
    capacity_people: 50,
    bedrooms_count: 8,
    bathrooms_count: 6,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: true,
    has_wifi: true,
    has_air_conditioning: false,
    has_equipped_kitchen: true,
    rules: 'Bebidas alcoólicas permitidas com moderação. Som encerrado às 23h.',
    checkin_time: '13:00',
    checkout_time: '13:00',
    daily_rate_standard: 1300,
    daily_rate_weekend: 1950,
    daily_rate_holiday: 2400,
    deposit_amount: 1200,
    cleaning_fee: 350,
    extra_guest_fee: 85,
    included_guests: 25,
    max_capacity: 50,
    allow_pets: true,
    pet_fee: 150,
    energy_fee: 50,
    event_fee: 600,
    main_photo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80',
    owner: DEMO_OWNERS[2],
    photos: [
      { id: 'p10', chacara_id: 'chacara-007', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  },
  {
    id: 'chacara-008',
    owner_id: 'owner-004',
    name: 'Solar dos Eucaliptos',
    description: 'Mansão estilo colonial em Indaiatuba. Conta com piscina privativa aquecida, campo de beach tennis, espaço gourmet ao lado do jardim e sauna seca.',
    status: 'ATIVA',
    street: 'Av. dos Eucaliptos, 300',
    neighborhood: 'Helvetia',
    city: 'Indaiatuba',
    state: 'SP',
    zip_code: '13330-000',
    capacity_people: 22,
    bedrooms_count: 5,
    bathrooms_count: 5,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: false,
    has_wifi: true,
    has_air_conditioning: true,
    has_equipped_kitchen: true,
    rules: 'Uso obrigatório de traje de banho adequado na piscina e sauna.',
    checkin_time: '14:00',
    checkout_time: '12:00',
    daily_rate_standard: 1400,
    daily_rate_weekend: 2200,
    daily_rate_holiday: 2600,
    deposit_amount: 1300,
    cleaning_fee: 280,
    extra_guest_fee: 110,
    included_guests: 14,
    max_capacity: 22,
    allow_pets: true,
    pet_fee: 130,
    energy_fee: 0,
    event_fee: 0,
    main_photo_url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80',
    owner: DEMO_OWNERS[3],
    photos: [
      { id: 'p11', chacara_id: 'chacara-008', url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  },
  {
    id: 'chacara-009',
    owner_id: 'owner-002',
    name: 'Recanto do Sol',
    description: 'Sítio arborizado na grande São Paulo. Fácil acesso, com piscina semi-olímpica, churrasqueira para até 100 pessoas e campo de futebol society.',
    status: 'ATIVA',
    street: 'Estrada do Sabaúna, 1200',
    neighborhood: 'Sabaúna',
    city: 'Mogi das Cruzes',
    state: 'SP',
    zip_code: '08700-000',
    capacity_people: 45,
    bedrooms_count: 6,
    bathrooms_count: 5,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: true,
    has_wifi: true,
    has_air_conditioning: true,
    has_equipped_kitchen: true,
    rules: 'Permitido churrascos e comemorações familiares. Não permitido som automotivo.',
    checkin_time: '13:00',
    checkout_time: '12:00',
    daily_rate_standard: 1250,
    daily_rate_weekend: 1900,
    daily_rate_holiday: 2300,
    deposit_amount: 1000,
    cleaning_fee: 260,
    extra_guest_fee: 95,
    included_guests: 20,
    max_capacity: 45,
    allow_pets: true,
    pet_fee: 140,
    energy_fee: 0,
    event_fee: 450,
    main_photo_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80',
    owner: DEMO_OWNERS[1],
    photos: [
      { id: 'p12', chacara_id: 'chacara-009', url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  },
  {
    id: 'chacara-010',
    owner_id: 'owner-001',
    name: 'Chácara Paraíso Tropical',
    description: 'Chácara em Cotia perfeita para festas infantis e confraternizações. Conta com tirolesa, casa na árvore, quiosque com forno de pizza e piscina com cascata.',
    status: 'ATIVA',
    street: 'Rua dos Pinheiros, 77',
    neighborhood: 'Granja Viana',
    city: 'Cotia',
    state: 'SP',
    zip_code: '06700-000',
    capacity_people: 30,
    bedrooms_count: 4,
    bathrooms_count: 4,
    has_pool: true,
    has_barbecue: true,
    has_event_hall: true,
    has_wifi: true,
    has_air_conditioning: true,
    has_equipped_kitchen: true,
    rules: 'Monitoramento no playground e tirolesa é de responsabilidade dos pais.',
    checkin_time: '14:00',
    checkout_time: '12:00',
    daily_rate_standard: 1000,
    daily_rate_weekend: 1600,
    daily_rate_holiday: 1950,
    deposit_amount: 900,
    cleaning_fee: 210,
    extra_guest_fee: 85,
    included_guests: 15,
    max_capacity: 30,
    allow_pets: true,
    pet_fee: 110,
    energy_fee: 0,
    event_fee: 300,
    main_photo_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    owner: DEMO_OWNERS[0],
    photos: [
      { id: 'p13', chacara_id: 'chacara-010', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', is_main: true, display_order: 0 }
    ]
  }
];

export const DEMO_CREW_ROLES: CrewRole[] = [
  { id: 'role-001', nome: 'Limpeza e Higienização', cor: '#10B981', icone: 'Sparkles', descricao: 'Limpeza pré e pós check-in', ativo: true, ordem_exibicao: 1 },
  { id: 'role-002', nome: 'Manutenção de Piscina', cor: '#06B6D4', icone: 'Waves', descricao: 'Tratamento de água e aspiração', ativo: true, ordem_exibicao: 2 },
  { id: 'role-003', nome: 'Jardinagem e Paisagismo', cor: '#059669', icone: 'Flower2', descricao: 'Corte de grama e manutenção verde', ativo: true, ordem_exibicao: 3 },
  { id: 'role-004', nome: 'Caseiro Residente', cor: '#F59E0B', icone: 'Home', descricao: 'Apoio geral e zeladoria da chácara', ativo: true, ordem_exibicao: 4 },
  { id: 'role-005', nome: 'Recepção e Check-in', cor: '#8B5CF6', icone: 'UserCheck', descricao: 'Entrega e vistoria de chaves', ativo: true, ordem_exibicao: 5 },
  { id: 'role-006', nome: 'Manutenção Elétrica', cor: '#EAB308', icone: 'Zap', descricao: 'Elétrica, gerador e iluminação', ativo: true, ordem_exibicao: 6 },
  { id: 'role-007', nome: 'Manutenção Hidráulica', cor: '#3B82F6', icone: 'Wrench', descricao: 'Bombas d\'água e encanamento', ativo: true, ordem_exibicao: 7 },
  { id: 'role-008', nome: 'Segurança Patrimonial', cor: '#EF4444', icone: 'Shield', descricao: 'Ronda noturna e portaria de evento', ativo: true, ordem_exibicao: 8 }
];

export const DEMO_CREW_MEMBERS: CrewMember[] = [
  { id: 'crew-001', nome: 'José Alencar', telefone: '(11) 98877-1122', whatsapp: '(11) 98877-1122', email: 'jose.caseiro@gmail.com', pix_key: '123.456.789-00', payment_frequency: 'MONTHLY', observacoes: 'Caseiro com 8 anos de experiência.', ativo: true, role_ids: ['role-004', 'role-003'], chacara_ids: ['chacara-001', 'chacara-002'] },
  { id: 'crew-002', nome: 'Maria das Graças', telefone: '(11) 97766-2233', whatsapp: '(11) 97766-2233', email: 'maria.limpeza@hotmail.com', pix_key: 'maria.limpeza@pix.com', payment_frequency: 'PER_RESERVATION', observacoes: 'Líder da equipe de governança.', ativo: true, role_ids: ['role-001', 'role-005'], chacara_ids: ['chacara-001', 'chacara-010'] },
  { id: 'crew-003', nome: 'Roberto Farias', telefone: '(11) 96655-3344', whatsapp: '(11) 96655-3344', email: 'roberto.piscinas@outlook.com', pix_key: '(11) 96655-3344', payment_frequency: 'WEEKLY', observacoes: 'Técnico certificado em tratamento químico.', ativo: true, role_ids: ['role-002', 'role-007'], chacara_ids: ['chacara-001', 'chacara-002', 'chacara-003', 'chacara-006'] },
  { id: 'crew-004', nome: 'Antônio Carlos Nunes', telefone: '(15) 99188-4455', whatsapp: '(15) 99188-4455', email: 'antonio.nunes@gmail.com', pix_key: 'antonio.nunes@gmail.com', payment_frequency: 'PER_RESERVATION', observacoes: 'Especialista em cercas e portões elétricos.', ativo: true, role_ids: ['role-006'], chacara_ids: ['chacara-004', 'chacara-007'] },
  { id: 'crew-005', nome: 'Francisca Oliveira', telefone: '(19) 98223-5566', whatsapp: '(19) 98223-5566', email: 'francisca.itupeva@yahoo.com', pix_key: '987.654.321-11', payment_frequency: 'PER_RESERVATION', observacoes: 'Atendimento impecável no check-in.', ativo: true, role_ids: ['role-001', 'role-005'], chacara_ids: ['chacara-006', 'chacara-008'] },
  { id: 'crew-006', nome: 'Cláudio Ramos', telefone: '(11) 95544-6677', whatsapp: '(11) 95544-6677', email: 'claudio.seguranca@gmail.com', observacoes: 'Segurança de eventos corporativos.', ativo: true, role_ids: ['role-008'], chacara_ids: ['chacara-001', 'chacara-005', 'chacara-009'] },
  { id: 'crew-007', nome: 'Sebastião Lima', telefone: '(11) 94433-7788', whatsapp: '(11) 94433-7788', email: 'sebastiao.jardim@gmail.com', observacoes: 'Paisagista e encarregado do pomar.', ativo: true, role_ids: ['role-003'], chacara_ids: ['chacara-003', 'chacara-005'] },
  { id: 'crew-008', nome: 'Luciana Barbosa', telefone: '(11) 93322-8899', whatsapp: '(11) 93322-8899', email: 'luciana.mogi@gmail.com', observacoes: 'Auxiliar de limpeza rápida entre reservas.', ativo: true, role_ids: ['role-001'], chacara_ids: ['chacara-009', 'chacara-010'] },
  { id: 'crew-009', nome: 'Gerson Martins', telefone: '(11) 92211-9900', whatsapp: '(11) 92211-9900', email: 'gerson.bombas@gmail.com', observacoes: 'Encanador e manutenção de saunas.', ativo: true, role_ids: ['role-007', 'role-006'], chacara_ids: ['chacara-002', 'chacara-008'] },
  { id: 'crew-010', nome: 'Aline Souza', telefone: '(11) 91100-0011', whatsapp: '(11) 91100-0011', email: 'aline.recepcao@gmail.com', observacoes: 'Recepcionista bilíngue.', ativo: true, role_ids: ['role-005'], chacara_ids: ['chacara-002', 'chacara-005'] },
  { id: 'crew-011', nome: 'Marcos Vinícius', telefone: '(15) 98811-2233', whatsapp: '(15) 98811-2233', email: 'marcos.v@gmail.com', observacoes: 'Caseiro residente em Ibiúna.', ativo: true, role_ids: ['role-004'], chacara_ids: ['chacara-004'] },
  { id: 'crew-012', nome: 'Patrícia Mendes', telefone: '(19) 97722-3344', whatsapp: '(19) 97722-3344', email: 'patricia.mendes@gmail.com', observacoes: 'Limpeza minuciosa de suítes.', ativo: true, role_ids: ['role-001'], chacara_ids: ['chacara-006'] },
  { id: 'crew-013', nome: 'Vagner Silveira', telefone: '(11) 96633-4455', whatsapp: '(11) 96633-4455', email: 'vagner.piscina@gmail.com', observacoes: 'Tratamento de piscinas com gerador de cloro.', ativo: true, role_ids: ['role-002'], chacara_ids: ['chacara-005', 'chacara-007', 'chacara-010'] },
  { id: 'crew-014', nome: 'Regina Duarte', telefone: '(11) 95544-5566', whatsapp: '(11) 95544-5566', email: 'regina.mairipora@gmail.com', observacoes: 'Cozinheira opcional para eventos de fim de semana.', ativo: true, role_ids: ['role-001', 'role-005'], chacara_ids: ['chacara-001'] },
  { id: 'crew-015', nome: 'Sérgio Nogueira', telefone: '(11) 94455-6677', whatsapp: '(11) 94455-6677', email: 'sergio.nogueira@gmail.com', observacoes: 'Manutenção preventiva de motores.', ativo: true, role_ids: ['role-006', 'role-007'], chacara_ids: ['chacara-003', 'chacara-009'] },
  { id: 'crew-016', nome: 'Tânia Regina', telefone: '(11) 93366-7788', whatsapp: '(11) 93366-7788', email: 'tania.regina@gmail.com', observacoes: 'Chefe de equipe de festas.', ativo: true, role_ids: ['role-001', 'role-005'], chacara_ids: ['chacara-005'] },
  { id: 'crew-017', nome: 'Valter Ribeiro', telefone: '(15) 92277-8899', whatsapp: '(15) 92277-8899', email: 'valter.sorocaba@gmail.com', observacoes: 'Apoio logístico em retiros.', ativo: true, role_ids: ['role-004', 'role-008'], chacara_ids: ['chacara-007'] },
  { id: 'crew-018', nome: 'Wellington Prado', telefone: '(19) 91188-9900', whatsapp: '(19) 91188-9900', email: 'wellington.prado@gmail.com', observacoes: 'Jardineiro especialista em palmeiras.', ativo: true, role_ids: ['role-003'], chacara_ids: ['chacara-008'] },
  { id: 'crew-019', nome: 'Yara Camargo', telefone: '(11) 99099-0011', whatsapp: '(11) 99099-0011', email: 'yara.cotia@gmail.com', observacoes: 'Gestão de rouparia e enxoval.', ativo: true, role_ids: ['role-001'], chacara_ids: ['chacara-010'] },
  { id: 'crew-020', nome: 'Éverson Castro', telefone: '(11) 98988-1122', whatsapp: '(11) 98988-1122', email: 'everson.castro@gmail.com', observacoes: 'Piscineiro para finais de semana.', ativo: true, role_ids: ['role-002'], chacara_ids: ['chacara-004', 'chacara-009'] },
  { id: 'crew-021', nome: 'Beatriz Vasconcelos', telefone: '(11) 97877-2233', whatsapp: '(11) 97877-2233', email: 'beatriz.v@gmail.com', observacoes: 'Recepcionista de eventos corporativos.', ativo: true, role_ids: ['role-005'], chacara_ids: ['chacara-001', 'chacara-002'] },
  { id: 'crew-022', nome: 'Danilo Xavier', telefone: '(11) 96766-3344', whatsapp: '(11) 96766-3344', email: 'danilo.x@gmail.com', observacoes: 'Técnico de automação de iluminação.', ativo: true, role_ids: ['role-006'], chacara_ids: ['chacara-002', 'chacara-005'] },
  { id: 'crew-023', nome: 'Eduarda Freitas', telefone: '(11) 95655-4455', whatsapp: '(11) 95655-4455', email: 'eduarda.f@gmail.com', observacoes: 'Auxiliar de governança.', ativo: true, role_ids: ['role-001'], chacara_ids: ['chacara-003'] },
  { id: 'crew-024', nome: 'Fabiano Costa', telefone: '(11) 94544-5566', whatsapp: '(11) 94544-5566', email: 'fabiano.costa@gmail.com', observacoes: 'Ronda de segurança noturna.', ativo: true, role_ids: ['role-008'], chacara_ids: ['chacara-007', 'chacara-008'] },
  { id: 'crew-025', nome: 'Gustavo Henrique', telefone: '(11) 93433-6677', whatsapp: '(11) 93433-6677', email: 'gustavo.h@gmail.com', observacoes: 'Caseiro folguista.', ativo: true, role_ids: ['role-004'], chacara_ids: ['chacara-001', 'chacara-003'] },
  { id: 'crew-026', nome: 'Helena Miranda', telefone: '(11) 92322-7788', whatsapp: '(11) 92322-7788', email: 'helena.m@gmail.com', observacoes: 'Atendimento vip no check-in.', ativo: true, role_ids: ['role-005'], chacara_ids: ['chacara-008'] },
  { id: 'crew-027', nome: 'Igor Rocha', telefone: '(11) 91211-8899', whatsapp: '(11) 91211-8899', email: 'igor.rocha@gmail.com', observacoes: 'Limpador de caixas d\'água.', ativo: true, role_ids: ['role-007'], chacara_ids: ['chacara-001', 'chacara-010'] },
  { id: 'crew-028', nome: 'Juliano Antunes', telefone: '(11) 90100-9900', whatsapp: '(11) 90100-9900', email: 'juliano.a@gmail.com', observacoes: 'Jardineiro especialista em podas altas.', ativo: true, role_ids: ['role-003'], chacara_ids: ['chacara-002', 'chacara-009'] }
];

// Helper to generate 105 realistic clients
const FIRST_NAMES = ['Fernanda', 'Lucas', 'Camila', 'Rodrigo', 'Juliana', 'Gabriel', 'Mariana', 'Thiago', 'Beatriz', 'Rafael', 'Patricia', 'Bruno', 'Aline', 'Diego', 'Vanessa', 'Marcelo', 'Rafaela', 'Gustavo', 'Carla', 'Felipe', 'Monique', 'Vinicius', 'Leticia', 'Leonardo', 'Priscila', 'Eduardo', 'Tatiana', 'Guilherme', 'Vanessa', 'Daniel', 'Bianca', 'Andre', 'Natalia', 'Alexandre', 'Sabrina', 'Caio', 'Caroline', 'Henrique', 'Paula', 'Murilo'];
const LAST_NAMES = ['Oliveira', 'Silva', 'Santos', 'Ferreira', 'Souza', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araujo', 'Pereira', 'Carvalho', 'Gomes', 'Martins', 'Ribeiro', 'Alves', 'Barbosa', 'Monteiro', 'Mendes', 'Barros', 'Freitas', 'Moreira', 'Cardoso', 'Teixeira', 'Cavalcante'];
const CITIES = ['São Paulo - SP', 'Campinas - SP', 'Sorocaba - SP', 'Santos - SP', 'Jundiaí - SP', 'Ribeirão Preto - SP', 'São José dos Campos - SP', 'Santo André - SP', 'Osasco - SP', 'Barueri - SP', 'Belo Horizonte - MG', 'Curitiba - PR'];

export function generateDemoClients(): Client[] {
  const clients: Client[] = [];
  for (let i = 1; i <= 105; i++) {
    const fn = FIRST_NAMES[(i * 3) % FIRST_NAMES.length];
    const ln1 = LAST_NAMES[(i * 5) % LAST_NAMES.length];
    const ln2 = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const city = CITIES[i % CITIES.length];
    const d1 = String(100 + (i * 7) % 899);
    const d2 = String(100 + (i * 13) % 899);
    const d3 = String(100 + (i * 17) % 899);

    clients.push({
      id: `client-${String(i).padStart(3, '0')}`,
      full_name: `${fn} ${ln1} ${ln2}`,
      document_number: `${d1}.${d2}.${d3}-${String((i * 11) % 99).padStart(2, '0')}`,
      email: `${fn.toLowerCase()}.${ln1.toLowerCase()}${i}@gmail.com`,
      phone: `(11) 9${String(8000 + i * 19).slice(0, 4)}-${String(1000 + i * 37).slice(0, 4)}`,
      city: city.split(' - ')[0],
      state: city.split(' - ')[1],
      notes: i % 4 === 0 ? 'Cliente recorrente VIP. Sempre cuida muito bem da chácara.' : 'Hóspede pontual e comunicativo.',
      tags: i % 5 === 0 ? ['VIP', 'FESTA_FAMILIA'] : ['TEMPORADA'],
      total_reservations: (i % 6) + 1,
      total_spent: ((i % 6) + 1) * 2200,
      created_at: new Date(Date.now() - i * 86400000 * 3).toISOString()
    });
  }
  return clients;
}

export const DEMO_CLIENTS = generateDemoClients();

export function generateDemoReservations(chacaras: Chacara[], clients: Client[]): Reservation[] {
  const reservations: Reservation[] = [];
  const statuses: ('CONFIRMADA' | 'PRE_RESERVA' | 'CHECKOUT_REALIZADO' | 'CANCELADA')[] = [
    'CONFIRMADA', 'CONFIRMADA', 'CONFIRMADA', 'PRE_RESERVA', 'CHECKOUT_REALIZADO', 'CANCELADA'
  ];
  const origins: ('WHATSAPP' | 'INSTAGRAM' | 'AIRBNB' | 'SITE_DIRETO' | 'INDICACAO' | 'BOOKING')[] = [
    'WHATSAPP', 'WHATSAPP', 'INSTAGRAM', 'AIRBNB', 'SITE_DIRETO', 'INDICACAO', 'BOOKING'
  ];

  const now = new Date();
  
  // Create 88 reservations spanning past 90 days to future 120 days
  for (let i = 0; i < 88; i++) {
    const chacara = chacaras[i % chacaras.length];
    const client = clients[i % clients.length];
    
    // Offset in days relative to today
    // i=0..25: past, i=26..50: current month, i=51..87: future
    let dayOffset = (i - 30) * 4; 
    const checkin = new Date(now.getTime() + dayOffset * 86400000);
    const checkout = new Date(checkin.getTime() + (2 + (i % 3)) * 86400000); // 2 to 4 nights

    const checkinStr = checkin.toISOString().split('T')[0];
    const checkoutStr = checkout.toISOString().split('T')[0];

    let status: 'CONFIRMADA' | 'PRE_RESERVA' | 'CHECKOUT_REALIZADO' | 'CANCELADA' = statuses[i % statuses.length];
    if (dayOffset < -5) {
      status = status === 'CANCELADA' ? 'CANCELADA' : 'CHECKOUT_REALIZADO';
    } else if (dayOffset > 10) {
      status = status === 'CHECKOUT_REALIZADO' ? 'CONFIRMADA' : status;
    }

    const nights = Math.max(1, Math.round((checkout.getTime() - checkin.getTime()) / 86400000));
    const dailyRate = checkin.getDay() === 5 || checkin.getDay() === 6 ? chacara.daily_rate_weekend : chacara.daily_rate_standard;
    const subtotal = dailyRate * nights;
    const totalAmount = subtotal + chacara.cleaning_fee;
    const paidAmount = status === 'CANCELADA' ? 0 : (status === 'PRE_RESERVA' ? totalAmount * 0.3 : totalAmount);

    const resId = `res-${String(i + 1).padStart(3, '0')}`;
    const code = `REC-${2000 + i}`;

    reservations.push({
      id: resId,
      chacara_id: chacara.id,
      client_id: client.id,
      code,
      checkin_date: checkinStr,
      checkin_time: chacara.checkin_time || '14:00',
      checkout_date: checkoutStr,
      checkout_time: chacara.checkout_time || '12:00',
      guests_adults: 10 + (i % 15),
      guests_children: (i % 4),
      guests_infants: (i % 2),
      guests_pets: (i % 3 === 0 && chacara.allow_pets) ? 1 : 0,
      total_guests: 10 + (i % 15) + (i % 4),
      status,
      origin: origins[i % origins.length],
      special_requests: i % 3 === 0 ? 'Solicitou montagem de mesa de buffet na área externa.' : undefined,
      financial_summary: {
        daily_rate_applied: dailyRate,
        daily_rates_subtotal: subtotal,
        cleaning_fee: chacara.cleaning_fee,
        deposit_amount: chacara.deposit_amount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        nights_count: nights,
        payment_status: status === 'CANCELADA' ? 'CANCELADO' : (paidAmount >= totalAmount ? 'PAGO' : 'PARCIALMENTE_PAGO')
      },
      chacara,
      client,
      guests_list: [
        {
          id: `guest-${resId}-1`,
          reservation_id: resId,
          full_name: client.full_name,
          document_number: client.document_number,
          is_responsible: true,
          is_child: false,
          vehicle_plate: `ABC-${1000 + i}`
        },
        {
          id: `guest-${resId}-2`,
          reservation_id: resId,
          full_name: `Acompanhante de ${client.full_name.split(' ')[0]}`,
          is_responsible: false,
          is_child: false
        }
      ],
      created_at: new Date(checkin.getTime() - 15 * 86400000).toISOString()
    });
  }

  return reservations;
}

export const DEMO_BLOCKS: ChacaraBlock[] = [
  {
    id: 'block-001',
    chacara_id: 'chacara-001',
    start_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
    reason: 'MANUTENCAO',
    title: 'Manutenção da Piscina e Pintura do Deck',
    description: 'Troca de azulejos e aplicação de verniz no deck de madeira.'
  },
  {
    id: 'block-002',
    chacara_id: 'chacara-003',
    start_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
    reason: 'USO_PROPRIETARIO',
    title: 'Aniversário do Proprietário',
    description: 'Uso exclusivo da família da Sra. Ana Maria.'
  }
];

export const DEMO_OPERATIONAL_EVENT_TYPES: any[] = [
  { id: 'evt-type-1', code: 'reserva', name: 'Reserva', color: '#10B981', icon: 'CalendarCheck', priority: 10, is_system: true, description: 'Reserva de hóspedes' },
  { id: 'evt-type-2', code: 'pre_reserva', name: 'Pré-reserva', color: '#F59E0B', icon: 'Clock', priority: 9, is_system: true, description: 'Aguardando confirmação' },
  { id: 'evt-type-3', code: 'bloqueio', name: 'Bloqueio', color: '#6B7280', icon: 'Ban', priority: 10, is_system: true, description: 'Bloqueio do imóvel' },
  { id: 'evt-type-4', code: 'check_in', name: 'Check-in', color: '#06B6D4', icon: 'LogIn', priority: 8, is_system: true, description: 'Recepção de hóspedes' },
  { id: 'evt-type-5', code: 'check_out', name: 'Check-out', color: '#8B5CF6', icon: 'LogOut', priority: 8, is_system: true, description: 'Checkout e liberação' },
  { id: 'evt-type-6', code: 'limpeza', name: 'Limpeza', color: '#3B82F6', icon: 'Sparkles', priority: 7, is_system: true, description: 'Higienização e faxina' },
  { id: 'evt-type-7', code: 'piscina', name: 'Piscina', color: '#0EA5E9', icon: 'Waves', priority: 6, is_system: true, description: 'Limpeza e cloro' },
  { id: 'evt-type-8', code: 'jardinagem', name: 'Jardinagem', color: '#84CC16', icon: 'Trees', priority: 5, is_system: true, description: 'Poda e gramado' },
  { id: 'evt-type-9', code: 'manutencao', name: 'Manutenção', color: '#EF4444', icon: 'Wrench', priority: 7, is_system: true, description: 'Reparos e rede elétrica/hidráulica' },
  { id: 'evt-type-10', code: 'inspecao', name: 'Inspeção', color: '#D97706', icon: 'ClipboardCheck', priority: 6, is_system: true, description: 'Vistoria e conferência' },
  { id: 'evt-type-11', code: 'prestador_recorrente', name: 'Prestador Recorrente', color: '#6366F1', icon: 'UserCheck', priority: 5, is_system: true, description: 'Visita periódica cadastrada' },
  { id: 'evt-type-12', code: 'prestador_eventual', name: 'Prestador Eventual', color: '#EC4899', icon: 'Briefcase', priority: 5, is_system: true, description: 'Visita avulsa pontual' },
  { id: 'evt-type-13', code: 'reuniao', name: 'Reunião', color: '#A855F7', icon: 'Users', priority: 4, is_system: true, description: 'Reunião de alinhamento' },
  { id: 'evt-type-14', code: 'vistoria', name: 'Vistoria', color: '#14B8A6', icon: 'ShieldCheck', priority: 7, is_system: true, description: 'Inspeção de bens e entrada' },
  { id: 'evt-type-15', code: 'outro', name: 'Outro', color: '#9CA3AF', icon: 'MoreHorizontal', priority: 1, is_system: true, description: 'Eventos diversos' }
];

export const DEMO_STAFF_UNAVAILABILITY: any[] = [];

export const DEMO_OPERATIONAL_RECURRENCE_RULES: any[] = [];

export function generateDemoOperationalEvents(): any[] {
  return [];
}

