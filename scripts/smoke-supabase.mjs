// Teste rápido à base de dados da Araméa (corre no PC: node scripts/smoke-supabase.mjs).
// Cria uma encomenda de teste, confirma o cliente automático e a foto, e apaga só o que criou.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const name = `TESTE Araméa ${Date.now()}`;
let failed = false;
const must = (label, ok, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failed = true;
};

const products = await supabase.from('aramea_products').select('*');
must('ler aramea_products', !products.error, products.error?.message ?? `${products.data.length} produtos`);

const first = products.data?.[0];
const insert = await supabase
  .from('aramea_orders')
  .insert({
    client_name: name,
    client_phone: '910000000',
    delivery_date: '2030-01-01',
    delivery_time: '10:00',
    items: first ? [{ productId: first.id, name: first.name, category: first.category, qty: 2 }] : [],
    product_name: first ? `2x ${first.name}` : null,
    quantity: 2,
    products_price: 10,
    price: 10,
    source_channel: 'Instagram',
  })
  .select('id')
  .single();
must('gravar aramea_orders', !insert.error, insert.error?.message);

const client = await supabase.from('aramea_clients').select('*').eq('name', name).maybeSingle();
must('cliente criado pelo trigger', !!client.data, client.error?.message);

const rpc = await supabase.rpc('aramea_complete_overdue_orders');
must('rpc aramea_complete_overdue_orders', !rpc.error, rpc.error?.message ?? `fechou ${rpc.data}`);

const path = `orders/teste-${Date.now()}.txt`;
const up = await supabase.storage.from('aramea-photos').upload(path, new Blob(['teste']), { contentType: 'text/plain' });
must('upload no bucket aramea-photos', !up.error, up.error?.message);
if (!up.error) {
  const url = supabase.storage.from('aramea-photos').getPublicUrl(path).data.publicUrl;
  const res = await fetch(url);
  must('link público da foto', res.ok, `HTTP ${res.status}`);
}

// Limpeza: só o que este teste criou.
if (insert.data?.id) await supabase.from('aramea_orders').delete().eq('id', insert.data.id);
if (client.data?.id) await supabase.from('aramea_clients').delete().eq('id', client.data.id);
console.log('limpeza feita (encomenda e cliente de teste apagados; o ficheiro de teste fica no bucket)');
process.exit(failed ? 1 : 0);
