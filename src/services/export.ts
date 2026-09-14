import { Platform } from 'react-native';
import { FinanceSummary } from './financeMath';
import { Order } from '../types';
import { formatDate, monthName } from '../utils/format';

const euros = (v: number) => v.toFixed(2).replace('.', ',');

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function descricao(o: Order): string {
  const parts: string[] = [];
  if (o.items.length) parts.push(o.items.map((i) => `${i.qty}x ${i.name}`).join(', '));
  if (o.especial) parts.push(`Especial: ${o.especial}`);
  return parts.join(' | ');
}

/** CSV com ponto e vírgula e vírgula decimal — abre direto no Excel em português. */
export function ordersToCsv(orders: Order[]): string {
  const head = ['Data', 'Hora', 'Cliente', 'Contacto', 'Canal', 'Produtos', 'Peças', 'Preço', 'Sinal', 'Custo', 'Lucro', 'Pago', 'Estado'];
  const linhas = orders.map((o) =>
    [
      formatDate(o.deliveryDate),
      o.deliveryTime ?? '',
      o.clientName ?? '',
      o.clientPhone ?? '',
      o.sourceChannel ?? '',
      descricao(o),
      String(o.quantity ?? 0),
      euros(o.price ?? 0),
      euros(o.deposit ?? 0),
      euros(o.cost ?? 0),
      euros((o.price ?? 0) - (o.cost ?? 0)),
      o.paid ? 'Sim' : 'Não',
      o.status ?? '',
    ]
      .map((campo) => {
        const v = String(campo ?? '');
        return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      })
      .join(';'),
  );
  // BOM para o Excel reconhecer os acentos.
  return '﻿' + [head.join(';'), ...linhas].join('\n');
}

export function monthlyReportHtml(orders: Order[], summary: FinanceSummary, year: number, month: number): string {
  const linhas = orders
    .map(
      (o) => `
      <tr>
        <td>${escapeHtml(formatDate(o.deliveryDate))}</td>
        <td>${escapeHtml(o.clientName ?? '')}</td>
        <td>${escapeHtml(descricao(o))}</td>
        <td class="num">${euros(o.price ?? 0)} €</td>
        <td class="num">${euros(o.cost ?? 0)} €</td>
        <td class="${o.paid ? 'ok' : 'pend'}">${o.paid ? 'Pago' : 'Por pagar'}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #3D4036; padding: 28px; background: #FFFDFB; }
  .brand { text-align: center; margin-bottom: 18px; }
  .brand h1 { font-family: Georgia, "Times New Roman", serif; font-weight: normal; letter-spacing: 8px; font-size: 26px; margin: 0; color: #6E7262; }
  .brand .tag { font-family: Georgia, serif; color: #8E937F; font-size: 13px; margin-top: 2px; }
  .sub { color: #6B6E62; font-size: 12px; text-align: center; }
  .cards { display: flex; gap: 10px; margin: 22px 0; }
  .card { flex: 1; border: 1px solid #ECE4DB; border-radius: 12px; padding: 12px; background: #fff; }
  .card .label { font-size: 10px; color: #8E937F; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
  .card .value { font-size: 17px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #F3ECE5; color: #5A5E50; padding: 7px 8px; font-size: 10px; text-transform: uppercase; }
  td { padding: 7px 8px; border-bottom: 1px solid #F4EEE8; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .ok { color: #6F9A74; font-weight: 700; }
  .pend { color: #C4964F; font-weight: 700; }
  .foot { margin-top: 24px; font-size: 10px; color: #A09F94; text-align: center; }
</style></head><body>
  <div class="brand"><h1>ARAMÉA</h1><div class="tag">feito à mão</div></div>
  <div class="sub">Relatório de ${monthName(month)} de ${year}</div>
  <div class="cards">
    <div class="card"><div class="label">Faturação</div><div class="value">${euros(summary.revenue)} €</div></div>
    <div class="card"><div class="label">Recebido</div><div class="value" style="color:#6F9A74">${euros(summary.received)} €</div></div>
    <div class="card"><div class="label">Por receber</div><div class="value" style="color:#C4964F">${euros(summary.pending)} €</div></div>
    <div class="card"><div class="label">Lucro</div><div class="value">${euros(summary.profit)} €</div></div>
  </div>
  <table>
    <thead><tr><th>Data</th><th>Cliente</th><th>Produtos</th><th class="num">Preço</th><th class="num">Custo</th><th>Pagamento</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="foot">${summary.orderCount} encomendas · ${summary.pieces} peças · gerado em ${new Date().toLocaleDateString('pt-PT')}</div>
</body></html>`;
}

export async function shareMonthlyPdf(orders: Order[], summary: FinanceSummary, year: number, month: number): Promise<void> {
  const html = monthlyReportHtml(orders, summary, year, month);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
    return;
  }
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Relatório ${monthName(month)} ${year}`,
    });
  }
}

export async function shareMonthlyCsv(orders: Order[], year: number, month: number): Promise<void> {
  const csv = ordersToCsv(orders);
  const nome = `aramea-${year}-${String(month).padStart(2, '0')}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nome;
    link.click();
    return;
  }

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const ficheiro = new File(Paths.cache, nome);
  if (ficheiro.exists) ficheiro.delete();
  ficheiro.create();
  ficheiro.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(ficheiro.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: nome });
  }
}
