import { getReservations } from './reservationsService';
import { getPlanningProcesses } from './planningProcessService';
import { getPendencias } from './pendenciasService';
import { getFinancialSummary } from './financialService';
import { getChacaras } from './chacarasService';
import { getCrewMembers } from './crewService';

export interface AppNotification {
  id: string;
  type: 'VIABILIDADE_RISCO' | 'CAIXA_BAIXO' | 'CHECKIN_HOJE' | 'CHECKOUT_HOJE' | 'PENDENCIA_URGENTE' | 'INFO';
  title: string;
  description: string;
  priority: 'ALTA' | 'MEDIA' | 'BAIXA';
  timestamp: string;
  read?: boolean;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: {
    reservationId?: string;
    clientPhone?: string;
    clientName?: string;
    processId?: string;
    chacaraName?: string;
    amount?: number;
    pendenciaId?: string;
    [key: string]: any;
  };
}

export async function getLiveAppNotifications(): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  try {
    // 1. Check planning processes with risk / attention
    const processes = await getPlanningProcesses();
    processes.forEach(proc => {
      const verdict = proc.latest_viability_analysis?.verdict;
      if (verdict === 'NAO_VIAVEL') {
        notifications.push({
          id: `notif-proc-${proc.id}`,
          type: 'VIABILIDADE_RISCO',
          title: `Processo Não Viável: ${proc.title}`,
          description: `O processo provocaria saldo negativo no fluxo de caixa projetado.`,
          priority: 'ALTA',
          timestamp: proc.updated_at || proc.created_at,
          actionLabel: 'Ver Planejamento',
          metadata: { processId: proc.id, chacaraName: proc.chacara?.name }
        });
      } else if (verdict === 'VIAVEL_COM_ATENCAO') {
        notifications.push({
          id: `notif-proc-warn-${proc.id}`,
          type: 'VIABILIDADE_RISCO',
          title: `Atenção em Processo: ${proc.title}`,
          description: `O processo compromete a margem de segurança do caixa (colchão financeiro).`,
          priority: 'MEDIA',
          timestamp: proc.updated_at || proc.created_at,
          actionLabel: 'Simular Parcelas',
          metadata: { processId: proc.id, chacaraName: proc.chacara?.name }
        });
      }
    });

    // 2. Check today's and tomorrow's check-ins & check-outs
    const reservations = await getReservations();
    reservations.forEach(res => {
      if (res.status === 'CANCELADA') return;

      // Check-in today or tomorrow
      if (res.checkin_date === todayStr || res.checkin_date === tomorrow) {
        const isToday = res.checkin_date === todayStr;
        notifications.push({
          id: `notif-checkin-${res.id}`,
          type: 'CHECKIN_HOJE',
          title: `${isToday ? 'Check-in Hoje' : 'Check-in Amanhã'}: ${res.client?.full_name || 'Hóspede'}`,
          description: `${res.chacara?.name || 'Chácara'} • Entrada às ${res.checkin_time?.slice(0, 5) || '14:00'}. Envie as orientações de chegada.`,
          priority: isToday ? 'ALTA' : 'MEDIA',
          timestamp: new Date().toISOString(),
          actionLabel: 'Enviar WhatsApp',
          metadata: {
            reservationId: res.id,
            clientName: res.client?.full_name,
            clientPhone: res.client?.phone,
            chacaraName: res.chacara?.name,
            code: res.code
          }
        });
      }

      // Check-out today
      if (res.checkout_date === todayStr) {
        notifications.push({
          id: `notif-checkout-${res.id}`,
          type: 'CHECKOUT_HOJE',
          title: `Check-out Hoje: ${res.client?.full_name || 'Hóspede'}`,
          description: `${res.chacara?.name || 'Chácara'} • Saída prevista para às ${res.checkout_time?.slice(0, 5) || '12:00'}. Agende a vistoria e liberação de caução.`,
          priority: 'MEDIA',
          timestamp: new Date().toISOString(),
          actionLabel: 'Ver Detalhes',
          metadata: {
            reservationId: res.id,
            clientName: res.client?.full_name,
            clientPhone: res.client?.phone,
            chacaraName: res.chacara?.name,
            code: res.code
          }
        });
      }
    });

    // 3. Check urgent pendencias / tasks
    try {
      const pendencias = await getPendencias({ status: 'ABERTA' });
      pendencias.forEach(p => {
        if (p.prioridade === 'ALTA' || p.prioridade === 'URGENTE') {
          notifications.push({
            id: `notif-pend-${p.id}`,
            type: 'PENDENCIA_URGENTE',
            title: `Pendência Urgente: ${p.titulo}`,
            description: `${p.chacara?.name || 'Geral'} • ${p.descricao || 'Necessita atenção imediata da equipe.'}`,
            priority: 'ALTA',
            timestamp: p.created_at,
            actionLabel: 'Resolver Pendência',
            metadata: { pendenciaId: p.id }
          });
        }
      });
    } catch {
      // ignore
    }

    // 4. Check financial health / emergency buffer
    try {
      const fin = await getFinancialSummary();
      const freeCash = fin.caixa_liquido_disponivel || 0;
      if (freeCash < 3000) {
        notifications.push({
          id: 'notif-caixa-baixo',
          type: 'CAIXA_BAIXO',
          title: 'Alerta de Caixa Operacional Baixo',
          description: `O saldo livre em conta está em R$ ${freeCash.toFixed(2)}, abaixo do limite prudencial.`,
          priority: 'ALTA',
          timestamp: new Date().toISOString(),
          actionLabel: 'Ver Projeção',
          metadata: { amount: freeCash }
        });
      }
    } catch {
      // ignore
    }

  } catch (err) {
    console.warn('[notificationsService] Erro ao carregar notificações:', err);
  }

  return notifications;
}

export function generateWhatsAppMessage(templateType: 'BOAS_VINDAS' | 'REGRAS' | 'LOCALIZACAO' | 'COBRANCA_SALDO' | 'VISTORIA_CAUCAO' | 'EQUIPE_LIMPEZA', data: {
  clientName?: string;
  chacaraName?: string;
  checkinDate?: string;
  checkinTime?: string;
  checkoutDate?: string;
  checkoutTime?: string;
  code?: string;
  pendingAmount?: number;
  staffName?: string;
  wifiName?: string;
  wifiPassword?: string;
  locationLink?: string;
}): string {
  const name = data.clientName || 'Cliente';
  const chacara = data.chacaraName || 'nossa Chácara';

  switch (templateType) {
    case 'BOAS_VINDAS':
      return `Olá, *${name}*! Tudo bem? 🌿\n\nEstamos muito felizes em receber você e seu grupo na *${chacara}*!\n\n📌 *Reserva:* ${data.code || ''}\n📅 *Entrada:* ${data.checkinDate || ''} a partir das ${data.checkinTime || '14:00'}\n📅 *Saída:* ${data.checkoutDate || ''} até às ${data.checkoutTime || '12:00'}\n\n📶 *Wi-Fi:* ${data.wifiName || 'Disponível no local'}\n🔑 As instruções de portão e acesso serão repassadas pela nossa equipe.\n\nQualquer dúvida, estamos 100% à disposição! Tenham uma excelente estadia! ✨`;

    case 'REGRAS':
      return `Olá, *${name}*! Seguem algumas orientações importantes para garantir uma estadia perfeita na *${chacara}*:\n\n1. 🔊 *Som e Silêncio:* Respeitar a lei do silêncio a partir das 22h.\n2. 🏊 *Piscina:* Não utilizar copos ou garrafas de vidro na área da piscina.\n3. 🗑️ *Lixo:* Descartar nos recipientes adequados.\n4. 🐕 *Pets:* Recolher resíduos e zelar pelos móveis.\n\nAgradecemos a colaboração e desejamos um ótimo descanso! 🌳`;

    case 'COBRANCA_SALDO':
      return `Olá, *${name}*! Esperamos que esteja tudo bem.\n\nLembramos que sua reserva *${data.code || ''}* na *${chacara}* possui um saldo restante de *R$ ${Number(data.pendingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* com vencimento no check-in.\n\nCaso queira adiantar a quitação via PIX para agilizar a entrada, favor nos avisar que enviamos a chave. Obrigado! 🙌`;

    case 'VISTORIA_CAUCAO':
      return `Olá, *${name}*! Agradecemos muito a sua estadia na *${chacara}*.\n\nA vistoria de saída foi concluída com sucesso e o imóvel foi entregue em perfeitas condições. A devolução do seu depósito caução está sendo processada.\n\nEsperamos receber você e sua família novamente em breve! 🏡✨`;

    case 'EQUIPE_LIMPEZA':
      return `Olá, *${data.staffName || 'Equipe'}*! 🧹\n\nNotificação de serviço para *${chacara}*:\n📅 *Próximo Check-in:* ${data.checkinDate || ''} às ${data.checkinTime || '14:00'}\nFavor verificar a limpeza geral, conferência de enxoval e produtos da piscina. Obrigado pelo trabalho! 🌟`;

    default:
      return `Olá, *${name}*! Entramos em contato referente à sua reserva na *${chacara}*.`;
  }
}
