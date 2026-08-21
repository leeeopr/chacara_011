import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isSameDay, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSmartDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  if (isSameDay(date, today)) {
    return 'hoje';
  }
  
  if (isSameDay(date, tomorrow)) {
    return 'amanhã';
  }

  // Wednesday -> quarta-feira
  return format(date, 'eeee', { locale: ptBR });
}

/**
 * Wraps a promise with a timeout. 
 * If the promise doesn't resolve within the specified time, it rejects.
 * Optionally accepts an AbortController to cancel the underlying request.
 */
export async function fetchWithTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 30000, 
  controller?: AbortController
): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (controller) {
        controller.abort();
      }
      reject(new Error('TIMEOUT_ERROR'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function formatReminderMessage(
  template: string,
  data: {
    patientName?: string;
    professionalName?: string;
    date?: string;
    time?: string;
    rawDate?: Date;
    [key: string]: any;
  }
) {
  if (!template) return '';
  
  const variables: Record<string, string> = {
    NOME: data.patientName || data.name || '',
    name: data.patientName || data.name || '',
    HORA: data.time || '',
    time: data.time || '',
    DATA: data.date || '',
    date: data.date || '',
    FONO: data.professionalName || data.professional_name || '',
    professional_name: data.professionalName || data.professional_name || '',
    DIA_INTELIGENTE: data.rawDate ? getSmartDayLabel(data.rawDate) : ''
  };

  // Add any other properties from data to variables dynamically
  Object.keys(data).forEach(key => {
    if (!['patientName', 'professionalName', 'date', 'time', 'rawDate'].includes(key)) {
      variables[key] = String(data[key] !== undefined && data[key] !== null ? data[key] : '');
    }
  });

  // Safe replacement: if key not found, keep original tag {VAR}
  const formatted = template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    
    // Special case for DIA_INTELIGENTE: if we don't have a date, maybe we shouldn't replace it or replace with something neutral
    if (key === 'DIA_INTELIGENTE' && !data.rawDate) {
      return match; 
    }

    return value !== undefined ? value : match;
  });

  // Debugging as requested
  console.log('--- TEMPLATE ENGINE DEBUG ---');
  console.log('Template:', template);
  console.log('Variables:', variables);
  console.log('Output:', formatted);
  console.log('-----------------------------');

  return formatted;
}

export function formatBirthdayMessage(template: string, fullName: string): string {
  if (!template) return '';
  const firstName = fullName ? fullName.split(' ')[0] : '';
  return template
    .replace(/{nome}/g, fullName || '')
    .replace(/{primeiro_nome}/g, firstName || '');
}

/**
 * Formata um valor numérico para a moeda brasileira (BRL - R$ 0,00)
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'R$ 0,00';
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY ou DD/MM/YYYY HH:mm)
 */
export function formatDate(
  dateValue: string | Date | null | undefined, 
  includeTime: boolean = false
): string {
  if (!dateValue) return '';
  try {
    const d = typeof dateValue === 'string' ? new Date(dateValue.includes('T') ? dateValue : `${dateValue}T12:00:00`) : dateValue;
    if (isNaN(d.getTime())) return String(dateValue);
    
    if (includeTime) {
      return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    }
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return String(dateValue);
  }
}

