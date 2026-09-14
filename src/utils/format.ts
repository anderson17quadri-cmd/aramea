export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local em YYYY-MM-DD (toISOString daria o dia em UTC — errado à noite). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, (m || 1) - 1, (d || 1) + days));
}

/** "12/09/2026" */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** "sábado, 12 de setembro" */
export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return `${WEEKDAYS[date.getDay()]}, ${d} de ${MONTHS[date.getMonth()].toLowerCase()}`;
}

export function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}${Math.abs(safe).toFixed(2).replace('.', ',')} €`;
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

/** "25", "25,5", "25.50" → número; vazio → 0. */
export function parseDecimal(value: string): number {
  const n = parseFloat((value || '0').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function toDecimalInput(value: number): string {
  return value ? String(value).replace('.', ',') : '';
}

export function buildDateStr(dia: string, mes: string, ano: string): string {
  return `${ano.padStart(4, '0')}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

export function buildTimeStr(hora: string, minuto: string): string | null {
  if (!hora) return null;
  return `${hora.padStart(2, '0')}:${(minuto || '0').padStart(2, '0')}`;
}

export function parseDateParts(dateStr: string): { dia: string; mes: string; ano: string } {
  const parts = (dateStr ?? '').split('-');
  if (parts.length !== 3) return { dia: '', mes: '', ano: '' };
  return { dia: parts[2], mes: parts[1], ano: parts[0] };
}

export function parseTimeParts(timeStr: string | null | undefined): { hora: string; minuto: string } {
  if (!timeStr) return { hora: '', minuto: '' };
  const parts = timeStr.split(':');
  return { hora: parts[0] ?? '', minuto: parts[1] ?? '' };
}

export function isValidDate(dia: string, mes: string, ano: string): boolean {
  const d = parseInt(dia, 10);
  const m = parseInt(mes, 10);
  const a = parseInt(ano, 10);
  if (!d || !m || !a || m < 1 || m > 12 || a < 2024) return false;
  return d >= 1 && d <= new Date(a, m, 0).getDate();
}

export function isValidTime(hora: string, minuto: string): boolean {
  if (!hora && !minuto) return true;
  const h = parseInt(hora, 10);
  const mi = parseInt(minuto || '0', 10);
  return Number.isInteger(h) && h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

/** Minúsculas e sem acentos, para pesquisas. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
