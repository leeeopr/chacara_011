import { Pendencia, PendenciaStatus, PendenciaPrioridade } from './pendenciasTypes';

export interface PriorityInfo {
  score: number;
  level: 'CRITICO' | 'ALTA' | 'MEDIA' | 'NORMAL' | 'CONCLUIDO';
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardGlow: string;
  daysDiff: number; // Negative = overdue, 0 = today, Positive = future
  isAssignedToMe: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  isDevolvida: boolean;
  isAguardando: boolean;
  subitemsCompleted: number;
  subitemsTotal: number;
}

/**
 * Calculates a dynamic, real-time priority score for a pendência item based on:
 * 1. Deadline & Overdue status (Prazo e Atraso)
 * 2. Explicit Priority setting (Urgência definida)
 * 3. Workflow Status (Devolvida, Aberta, Aguardando)
 * 4. User context (Assigned to logged user vs. sent to others)
 * 5. Stagnation / Time without updates
 * 6. Checklist progress
 */
export function calculatePendenciaPriority(
  p: Pendencia,
  currentUserId?: string
): PriorityInfo {
  if (p.status === 'Concluída' || p.status === 'Cancelada') {
    const totalSub = p.subitens?.length || 0;
    const doneSub = p.subitens?.filter(s => s.concluido).length || 0;
    return {
      score: 0,
      level: 'CONCLUIDO',
      label: p.status === 'Concluída' ? '✅ Concluída' : '🚫 Cancelada',
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      cardGlow: '',
      daysDiff: 999,
      isAssignedToMe: p.responsavel_atual === currentUserId,
      isOverdue: false,
      isDueToday: false,
      isDevolvida: false,
      isAguardando: false,
      subitemsCompleted: doneSub,
      subitemsTotal: totalSub
    };
  }

  let score = 0;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let daysDiff = 999;
  let isOverdue = false;
  let isDueToday = false;

  // 1. Deadline Math
  if (p.prazo) {
    const prazoDate = new Date(`${p.prazo}T${p.prazo_hora || '23:59:59'}`);
    const todayDate = new Date(`${todayStr}T00:00:00`);

    const diffMs = prazoDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    daysDiff = diffDays;

    if (p.prazo < todayStr) {
      isOverdue = true;
      const overdueDays = Math.max(1, Math.abs(diffDays));
      score += 100 + Math.min(50, overdueDays * 10); // Massive boost for overdue items
    } else if (p.prazo === todayStr) {
      isDueToday = true;
      score += 75; // Urgent focus for items due today
    } else if (diffDays === 1) {
      score += 45; // Tomorrow
    } else if (diffDays <= 3) {
      score += 25; // Next 3 days
    } else {
      score += 10;
    }
  } else {
    score += 5;
  }

  // 2. Explicit Priority Score
  switch (p.prioridade) {
    case 'Urgente':
      score += 50;
      break;
    case 'Alta':
      score += 30;
      break;
    case 'Média':
      score += 15;
      break;
    case 'Baixa':
    default:
      score += 5;
      break;
  }

  // 3. Workflow Status
  const isDevolvida = p.status === 'Devolvida';
  const isAguardando = p.status === 'Aguardando devolução';

  if (isDevolvida) {
    score += 60; // Needs immediate attention/correction
  } else if (p.status === 'Em andamento') {
    score += 30;
  } else if (p.status === 'Aberta') {
    score += 25;
  } else if (isAguardando) {
    score += 15;
  }

  // 4. User Responsiveness Math
  const isAssignedToMe = Boolean(currentUserId && p.responsavel_atual === currentUserId);
  const isCreatedByMe = Boolean(currentUserId && p.criado_por === currentUserId);

  if (isAssignedToMe) {
    score += 40; // Direct responsibility on logged user
  } else if (isCreatedByMe && isDevolvida) {
    score += 35; // Sent back to creator
  }

  // 5. Stagnation / Time without update
  const lastUpdate = new Date(p.updated_at || p.created_at || now.toISOString());
  const hoursStagnant = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

  if (hoursStagnant > 48) {
    score += 20; // Stagnant item
  } else if (hoursStagnant > 24) {
    score += 10;
  }

  // 6. Checklist Subitems
  const totalSub = p.subitens?.length || 0;
  const doneSub = p.subitens?.filter(s => s.concluido).length || 0;
  if (totalSub > 0 && doneSub < totalSub) {
    const pendingSub = totalSub - doneSub;
    score += pendingSub * 5;
  }

  // Determine Level and Label
  let level: 'CRITICO' | 'ALTA' | 'MEDIA' | 'NORMAL' = 'NORMAL';
  let label = 'Normal';
  let badgeBg = 'bg-sky-500/10';
  let badgeText = 'text-sky-400';
  let badgeBorder = 'border-sky-500/30';
  let cardGlow = '';

  if (score >= 140 || (isOverdue && isAssignedToMe)) {
    level = 'CRITICO';
    label = isOverdue ? '🚨 Atrasado' : isDevolvida ? '🔄 Devolvido' : '🔥 Crítico';
    badgeBg = 'bg-rose-500/15';
    badgeText = 'text-rose-400';
    badgeBorder = 'border-rose-500/40';
    cardGlow = 'shadow-[0_0_20px_rgba(244,63,94,0.15)]';
  } else if (score >= 90 || isDueToday) {
    level = 'ALTA';
    label = isDueToday ? '⏰ Vence Hoje' : '⚡ Alta Prioridade';
    badgeBg = 'bg-[#FFD600]/15';
    badgeText = 'text-[#FFD600]';
    badgeBorder = 'border-[#FFD600]/40';
    cardGlow = 'shadow-[0_0_15px_rgba(255,214,0,0.12)]';
  } else if (score >= 50) {
    level = 'MEDIA';
    label = '📌 Média Prioridade';
    badgeBg = 'bg-amber-500/10';
    badgeText = 'text-amber-400';
    badgeBorder = 'border-amber-500/30';
  }

  return {
    score,
    level,
    label,
    badgeBg,
    badgeText,
    badgeBorder,
    cardGlow,
    daysDiff,
    isAssignedToMe,
    isOverdue,
    isDueToday,
    isDevolvida,
    isAguardando,
    subitemsCompleted: doneSub,
    subitemsTotal: totalSub
  };
}

/**
 * Sorts array of pendências descending by priority score
 */
export function sortPendenciasByPriority(
  pendencias: Pendencia[],
  currentUserId?: string
): (Pendencia & { priorityInfo: PriorityInfo })[] {
  return pendencias
    .map(p => ({
      ...p,
      priorityInfo: calculatePendenciaPriority(p, currentUserId)
    }))
    .sort((a, b) => b.priorityInfo.score - a.priorityInfo.score);
}

/**
 * Categorizes list of pendências into smart operational buckets
 */
export function categorizePendencias(
  pendencias: Pendencia[],
  currentUserId?: string
) {
  const sorted = sortPendenciasByPriority(pendencias, currentUserId);
  const todayStr = new Date().toISOString().split('T')[0];

  const ativas = sorted.filter(p => p.status !== 'Concluída' && p.status !== 'Cancelada');

  // #1 Proxima Ação Destaque (Single top active item assigned to current user or highest score overall)
  const proximaAcaoDestaque =
    ativas.find(p => p.priorityInfo.isAssignedToMe) || ativas[0] || null;

  // 🔥 Fazer agora (Critical or High score)
  const fazerAgora = ativas.filter(p => p.priorityInfo.score >= 80);

  // ⏰ Hoje (Due today or overdue)
  const hoje = ativas.filter(p => p.prazo && p.prazo <= todayStr);

  // 📅 Esta semana (Due within 7 days)
  const setediasStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const estaSemana = ativas.filter(p => p.prazo && p.prazo > todayStr && p.prazo <= setediasStr);

  // ⌛ Aguardando resposta / Terceiros
  const aguardandoResposta = ativas.filter(
    p => p.status === 'Aguardando devolução' || (p.criado_por === currentUserId && !p.priorityInfo.isAssignedToMe)
  );

  // 🚧 Bloqueadas / Devolvidas
  const bloqueadas = ativas.filter(p => p.status === 'Devolvida' || p.priorityInfo.isDevolvida);

  // ✅ Concluídas recentemente
  const concluidas = sorted.filter(p => p.status === 'Concluída');

  return {
    sortedAll: sorted,
    ativas,
    proximaAcaoDestaque,
    fazerAgora,
    hoje,
    estaSemana,
    aguardandoResposta,
    bloqueadas,
    concluidas
  };
}

/**
 * Computes high-level analytics & metrics from real data
 */
export function computePendenciasStats(pendencias: Pendencia[], currentUserId?: string) {
  const total = pendencias.length;
  const ativas = pendencias.filter(p => p.status !== 'Concluída' && p.status !== 'Cancelada');
  const concluidas = pendencias.filter(p => p.status === 'Concluída');
  const todayStr = new Date().toISOString().split('T')[0];

  const atrasadas = ativas.filter(p => p.prazo && p.prazo < todayStr).length;
  const vencemHoje = ativas.filter(p => p.prazo === todayStr).length;
  const devolvidas = ativas.filter(p => p.status === 'Devolvida').length;
  const atribuidasAMim = ativas.filter(p => p.responsavel_atual === currentUserId).length;

  // Completion Rate
  const completionRate = total > 0 ? Math.round((concluidas.length / total) * 100) : 100;

  // Concluded this week
  const oneWeekAgoMs = Date.now() - 7 * 86400000;
  const concluidasEstaSemana = concluidas.filter(p => {
    if (!p.updated_at) return false;
    return new Date(p.updated_at).getTime() >= oneWeekAgoMs;
  }).length;

  return {
    total,
    ativasCount: ativas.length,
    concluidasCount: concluidas.length,
    atrasadas,
    vencemHoje,
    devolvidas,
    atribuidasAMim,
    completionRate,
    concluidasEstaSemana
  };
}
