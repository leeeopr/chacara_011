# Design System & Arquitetura - airbnb operation

## 1. Identidade & Estética

O **airbnb op** segue uma estética moderna, técnica e de alta visibilidade ("high-contrast technical").

### Cores Core
- **Fundo Primário**: `#0A0F2C` (Deep Space Blue) - Proporciona profundidade e foco.
- **Destaque Acadêmico**: `#FFD600` (Yellow) - Usado para ações primárias e marca.
- **Sucesso (Confirmado)**: Emerald/Green (`#10b981`) - Usado para status "Confirmado" e ações positivas.
- **Erro/Alerta (Cancelado)**: Rose/Red (`#f43f5e`) - Usado para status "Cancelado" e alertas.
- **Superfícies**: Vidro (Glassmorphism) com `backdrop-blur-md` e bordas sutis `white/5`.

### Tipografia
- **Inter**: Sans-serif principal para legibilidade.
- **Font-Black/Extrabold**: Usada em títulos (`tracking-tight`) e labels de status para criar uma hierarquia visual forte.
- **Uppercase + Spacing**: Labels secundárias e botões de aba usam `uppercase` com `tracking-widest` para um visual moderno/brutalista.

---

## 2. Experiência do Usuário (UX)

### Arquitetura de Tabs
O sistema é organizado em uma SPA (Single Page Application) com navegação lateral/topo dividida em:
1. **Agenda/Reminders**: Visão operacional diária.
2. **Consultas**: Gestão administrativa e histórico.
3. **Pacientes**: Cadastro e prontuários.
4. **Profissionais**: Gestão de equipe (Fonoaudiólogos).
5. **Configurações**: Personalização de templates de mensagens.

### Fluxo de Agendamento
- **Agenda Central**: Suporta visões de Dia, Semana e Mês.
- **Reminders Inteligentes**: Painel dedicado para conferir e enviar confirmações via WhatsApp.
- **Variáveis Dinâmicas**: Sistema de mensagens usa tags como `{DIA_INTELIGENTE}` que traduzem datas em termos humanos como "amanhã" ou "segunda-feira".

---

## 3. Tech Stack

- **Framework**: Next.js 15+ (App Router).
- **Estilo**: Tailwind CSS (Abordagem Utility-First).
- **Animações**: Framer Motion (`motion/react`) para transições de estado e modais suaves.
- **Backend/DB**: Supabase (PostgreSQL + RLS) para persistência e autenticação.
- **Iconografia**: Lucide React.
- **Gestão de Datas**: `date-fns` com locale `pt-BR`.

---

## 4. Padrões de Código (Development Rules)

- **Search Pattern**: Todos os filtros de listagem (Agenda, Pacientes, Consultas) operam localmente via `useMemo` para garantir latência zero ao digitar.
- **Performance**: Evitar refetches desnecessários; utilizar chaves de atualização (`refreshKey`) para sincronizar componentes irmãos.
- **Segurança**: RLS (Row Level Security) ativado no Supabase, garantindo que profissionais só vejam o que lhes é permitido.
- **Layout Responsivo**: Layout de "Full-Height" (`h-screen`) com áreas de scroll independentes (`custom-scrollbar`) para emular uma aplicação desktop robusta.
