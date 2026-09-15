// Supabase Edge Function "aramea-push" — envia as notificações da web app Araméa.
// Chamada de hora em hora pelo pg_cron (ver supabase/push.sql).
//  - às 21h: "Entrega amanhã!" para as encomendas de amanhã
//  - das 8h até à hora de entrega: "Entrega hoje às HH:MM"
// Body { test: true, endpoint } → notificação de teste só para esse telemóvel.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = 'BDOayDjVteWnTmdeNua4pEErwcFnnCEMnKYHANgzGmrMckAqv9wjggIsNE8hAgq72oqa5X_bUoSETfULzZIo7Oo';
const SITE = 'https://anderson17quadri-cmd.github.io/aramea/';
const DEFAULT_TIME = '18:00';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Sub = { endpoint: string; p256dh: string; auth: string };
type Order = { id: string; client_name: string; delivery_date: string; delivery_time: string | null; product_name: string | null; especial: string | null };

function lisbonNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return {
    today: `${parts.year}-${parts.month}-${parts.day}`,
    tomorrow: next.toISOString().slice(0, 10),
    hour: Number(parts.hour) % 24,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!privateKey) return json({ error: 'Falta o secret VAPID_PRIVATE_KEY' }, 500);
  webpush.setVapidDetails(SITE, VAPID_PUBLIC_KEY, privateKey);

  // Chave interna da função: sistema antigo (service role) ou novo (secret keys).
  let serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serverKey) {
    try {
      const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
      serverKey = keys.default ?? Object.values(keys)[0] ?? '';
    } catch {
      serverKey = '';
    }
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serverKey, {
    auth: { persistSession: false },
  });
  const body = await req.json().catch(() => ({}));

  const { data: subsData, error: subsError } = await supabase.from('aramea_push_subscriptions').select('endpoint, p256dh, auth');
  if (subsError) return json({ error: subsError.message }, 500);
  let subs = (subsData ?? []) as Sub[];

  const send = async (payload: Record<string, unknown>) => {
    let ok = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
        ok++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Telemóvel desinstalou a app ou desligou as notificações: esquece-o.
        if (status === 404 || status === 410) await supabase.from('aramea_push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
    return ok;
  };

  if (body.test) {
    if (body.endpoint) subs = subs.filter((s) => s.endpoint === body.endpoint);
    const sent = await send({ title: 'Araméa', body: 'Notificações ativas ✓ Vais receber os lembretes das entregas.', tag: 'aramea-test' });
    return json({ test: true, sent });
  }

  await supabase.rpc('aramea_complete_overdue_orders');

  const { today, tomorrow, hour: realHour } = lisbonNow();
  const hour = typeof body.hour === 'number' ? body.hour : realHour;
  const hh = String(hour).padStart(2, '0');
  const reminders: Array<{ order: Order; kind: 'eve' | 'day'; slot: string }> = [];

  if (hour === 21) {
    const { data } = await supabase
      .from('aramea_orders')
      .select('id, client_name, delivery_date, delivery_time, product_name, especial')
      .eq('delivery_date', tomorrow)
      .in('status', ['pending', 'in_production']);
    for (const o of (data ?? []) as Order[]) reminders.push({ order: o, kind: 'eve', slot: `${tomorrow}-eve` });
  }

  if (hour >= 8) {
    const { data } = await supabase
      .from('aramea_orders')
      .select('id, client_name, delivery_date, delivery_time, product_name, especial')
      .eq('delivery_date', today)
      .in('status', ['pending', 'in_production']);
    for (const o of (data ?? []) as Order[]) {
      if ((o.delivery_time || DEFAULT_TIME) >= `${hh}:00`) reminders.push({ order: o, kind: 'day', slot: `${today}-${hh}` });
    }
  }

  let sent = 0;
  for (const r of reminders) {
    // Nunca envia o mesmo aviso duas vezes (se o cron repetir).
    const { error } = await supabase.from('aramea_push_log').insert({ order_id: r.order.id, slot: r.slot });
    if (error) continue;
    const what = r.order.product_name || (r.order.especial ? `Especial: ${r.order.especial}` : 'encomenda');
    const hora = r.order.delivery_time ? ` às ${r.order.delivery_time}` : '';
    sent += await send({
      title: r.kind === 'eve' ? 'Entrega amanhã!' : `Entrega hoje${hora}`,
      body: `${r.order.client_name}${r.kind === 'eve' ? hora : ''} · ${what}`,
      tag: `order-${r.order.id}`,
      url: `/aramea/order/${r.order.id}`,
    });
  }

  return json({ today, hour, reminders: reminders.length, sent, devices: subs.length });
});
