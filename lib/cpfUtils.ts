/**
 * Utilitários para formatação e validação de CPF (Padrão Receita Federal / Carnê-Leão)
 */

/**
 * Remove todos os caracteres não numéricos
 */
export function cleanCPF(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 * Funciona tanto para texto completo quanto durante a digitação
 */
export function formatCPF(value?: string | null): string {
  if (!value) return '';
  const digits = cleanCPF(value).slice(0, 11);
  
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Validação básica e dos dígitos verificadores do CPF oficial
 */
export function validateCPF(value?: string | null): { valid: boolean; message?: string } {
  if (!value) {
    return { valid: false, message: 'Informe o CPF do pagador.' };
  }

  const digits = cleanCPF(value);

  if (digits.length !== 11) {
    return { valid: false, message: 'O CPF deve conter exatamente 11 dígitos numéricos.' };
  }

  // Rejeita sequências de dígitos idênticos (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(digits)) {
    return { valid: false, message: 'CPF inválido (dígitos repetidos).' };
  }

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) {
    return { valid: false, message: 'CPF inválido (dígitos verificadores incorretos).' };
  }

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) {
    return { valid: false, message: 'CPF inválido (dígitos verificadores incorretos).' };
  }

  return { valid: true };
}

/**
 * Retorna CPF mascarado para exibição fora de contextos estritamente fiscais
 * Ex: 123.***.***-45
 */
export function maskCPF(value?: string | null): string {
  if (!value) return 'Não informado';
  const formatted = formatCPF(value);
  if (formatted.length < 14) return formatted;
  return `${formatted.substring(0, 4)}***.***${formatted.substring(11)}`;
}
