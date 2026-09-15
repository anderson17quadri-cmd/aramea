import { Platform, Share } from 'react-native';
import { Order } from '../types';
import { formatDate, formatDateLong, formatMoney } from '../utils/format';

/** Talão térmico 58mm: 32 caracteres por linha, fonte monoespaçada. */
export const RECEIPT_WIDTH = 32;
/** 58mm em pontos (72 pt por polegada). */
const PAGE_WIDTH_PT = 164;
const LINE_HEIGHT_PT = 9.5;

const W = RECEIPT_WIDTH;
const rule = (ch = '-') => ch.repeat(W);
/** Na impressora não há "€" — usamos EUR, com a mesma largura em todo o lado. */
const eur = (v: number) => `EUR ${v.toFixed(2).replace('.', ',')}`;

/** Quebra o texto em linhas de `width`; `hang` indenta as linhas seguintes. */
export function wrap(text: string, width = W, hang = 0): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const limit = () => (lines.length === 0 ? width : width - hang);

  for (let word of words) {
    while (word.length > limit()) {
      if (line) {
        lines.push(line);
        line = '';
      }
      const size = limit();
      lines.push(word.slice(0, size));
      word = word.slice(size);
    }
    if (!word) continue;
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > limit()) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.map((l, i) => (i === 0 ? l : ' '.repeat(hang) + l));
}

function paragraphs(text: string, hang = 0): string[] {
  return text.split('\n').flatMap((p) => (p.trim() ? wrap(p, W, hang) : ['']));
}

function center(text: string): string[] {
  return wrap(text).map((l) => ' '.repeat(Math.floor((W - l.length) / 2)) + l);
}

function row(left: string, right: string): string[] {
  if (left.length + right.length + 1 <= W) return [left + ' '.repeat(W - left.length - right.length) + right];
  return [...wrap(left), right.padStart(W)];
}

export function generateLines(order: Order): string[] {
  const out: string[] = [];

  out.push(...center('A R A M E A'));
  out.push(...center('feito à mão'));
  out.push(rule('='));
  out.push(...row('Encomenda', `#${order.id.slice(0, 6).toUpperCase()}`));
  out.push(rule());

  out.push('CLIENTE');
  out.push(...wrap(order.clientName));
  if (order.clientPhone) out.push(...wrap(`Contacto: ${order.clientPhone}`, W, 2));
  out.push(`Canal: ${order.sourceChannel}`);
  out.push(rule());

  out.push('PRODUTOS');
  for (const item of order.items) out.push(...wrap(`${item.qty}x ${item.name}`, W, 3));
  if (order.especial) {
    if (order.items.length) out.push('');
    out.push('ESPECIAL:');
    out.push(...paragraphs(order.especial, 1));
  }
  if (order.quantity > 0) out.push(...row('Qtd. total', String(order.quantity)));
  out.push(rule());

  out.push('ENTREGA');
  out.push(...row('Data', formatDate(order.deliveryDate)));
  if (order.deliveryTime) out.push(...row('Hora', order.deliveryTime));
  out.push(rule('='));
  out.push(...row('TOTAL', eur(order.price)));
  if (order.deposit > 0 && !order.paid) {
    out.push(...row('Sinal pago', eur(order.deposit)));
    out.push(...row('Falta pagar', eur(Math.max(0, order.price - order.deposit))));
  }
  if (order.paid) out.push(...row('Pagamento', 'PAGO'));
  out.push(rule('='));

  if (order.notes) {
    out.push('OBSERVACOES');
    out.push(...paragraphs(order.notes));
    out.push(rule());
  }

  out.push('');
  out.push(...center('Obrigada pela preferência!'));
  out.push('');
  return out;
}

export function generateText(order: Order): string {
  return generateLines(order).join('\n');
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function receiptHTML(order: Order): { html: string; height: number } {
  const lines = generateLines(order);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: 58mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { width: 58mm; }
  pre { margin: 0; padding: 3mm 4mm; font-family: 'Courier New', Courier, monospace;
        font-size: 7pt; line-height: ${LINE_HEIGHT_PT}pt; white-space: pre; color: #000; }
</style></head><body><pre>${escapeHtml(lines.join('\n'))}</pre></body></html>`;
  return { html, height: Math.ceil(lines.length * LINE_HEIGHT_PT + 30) };
}

function openOnWeb(html: string) {
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

/** Imprime o talão de 58mm (iPhone: AirPrint; Android: serviço de impressão). */
export async function printReceipt(order: Order): Promise<void> {
  const { html, height } = receiptHTML(order);
  if (Platform.OS === 'web') return openOnWeb(html);
  const Print = await import('expo-print');
  const { uri } = await Print.printToFileAsync({ html, width: PAGE_WIDTH_PT, height });
  await Print.printAsync({ uri });
}

/** PDF do talão em 58mm — dá para abrir na app da impressora térmica. */
export async function shareReceiptPdf(order: Order): Promise<void> {
  const { html, height } = receiptHTML(order);
  if (Platform.OS === 'web') return openOnWeb(html);
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html, width: PAGE_WIDTH_PT, height });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Talão 58mm' });
  }
}

/** Mensagem para partilhar no WhatsApp/Instagram. */
export function buildShareMessage(order: Order): string {
  const parts = ['Araméa · feito à mão', '', `Cliente: ${order.clientName}${order.clientPhone ? ` (${order.clientPhone})` : ''}`];
  if (order.items.length) parts.push(`Produtos: ${order.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}`);
  if (order.especial) parts.push(`Especial: ${order.especial}`);
  parts.push(`Entrega: ${formatDateLong(order.deliveryDate)}${order.deliveryTime ? ` às ${order.deliveryTime}` : ''}`);
  parts.push(`Total: ${formatMoney(order.price)}`);
  if (order.notes) parts.push(`Obs.: ${order.notes}`);
  return parts.join('\n');
}

export async function shareMessage(order: Order): Promise<void> {
  const message = buildShareMessage(order);
  if (Platform.OS === 'web') {
    // No iPhone (Safari / ecrã principal) abre a folha de partilha nativa.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ text: message });
    } else {
      await navigator.clipboard?.writeText(message);
      window.alert('Mensagem copiada — cola no WhatsApp ou Instagram.');
    }
    return;
  }
  await Share.share({ message });
}
