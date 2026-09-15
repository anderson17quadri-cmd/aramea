-- =====================================================================
-- ARAMÉA — tabelas dentro do projeto Supabase "agendado-pt".
-- Tudo tem o prefixo aramea_ para não tocar em nada do agendado.pt.
-- Pode voltar a correr-se sem estragar nada (idempotente).
-- Os únicos "drop" são de políticas/triggers com nome aramea_ (recriados logo a seguir).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.aramea_orders (
  id              uuid primary key default gen_random_uuid(),
  client_name     text not null,
  client_phone    text,
  delivery_date   text not null,                 -- YYYY-MM-DD
  delivery_time   text,                          -- HH:MM
  product_id      text,                          -- ids dos produtos, separados por vírgula
  product_name    text,                          -- "3x Rosa, 1x Bouquet"
  quantity        integer not null default 0,    -- total de peças
  items           jsonb not null default '[]',   -- [{productId, name, category, qty}]
  products_price  numeric not null default 0,
  especial        text,
  especial_price  numeric not null default 0,
  price           numeric not null default 0,    -- total = products_price + especial_price
  deposit         numeric not null default 0,
  cost            numeric not null default 0,
  paid            boolean not null default false,
  paid_at         timestamptz,
  photo_uri       text,
  source_channel  text default 'WhatsApp',
  notes           text,
  status          text not null default 'pending'
                  check (status in ('pending', 'in_production', 'completed', 'delivered')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists aramea_orders_delivery_date_idx on public.aramea_orders (delivery_date);
create index if not exists aramea_orders_client_name_idx on public.aramea_orders (lower(client_name));

create table if not exists public.aramea_clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  source_channel  text default 'WhatsApp',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists aramea_clients_name_unique_idx on public.aramea_clients (lower(btrim(name)));

create table if not exists public.aramea_products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Acesso (a app não tem login → papel anon)
-- ---------------------------------------------------------------------
alter table public.aramea_orders   enable row level security;
alter table public.aramea_clients  enable row level security;
alter table public.aramea_products enable row level security;

drop policy if exists "aramea_orders_all"   on public.aramea_orders;
drop policy if exists "aramea_clients_all"  on public.aramea_clients;
drop policy if exists "aramea_products_all" on public.aramea_products;

create policy "aramea_orders_all"   on public.aramea_orders   for all to anon, authenticated using (true) with check (true);
create policy "aramea_clients_all"  on public.aramea_clients  for all to anon, authenticated using (true) with check (true);
create policy "aramea_products_all" on public.aramea_products for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.aramea_orders, public.aramea_clients, public.aramea_products to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Cliente guardado automaticamente a cada encomenda
-- ---------------------------------------------------------------------
create or replace function public.aramea_sync_client_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text := nullif(btrim(new.client_name), '');
  v_phone text := nullif(btrim(coalesce(new.client_phone, '')), '');
begin
  if v_name is null then
    return new;
  end if;

  insert into public.aramea_clients (name, phone, source_channel)
  values (v_name, v_phone, coalesce(new.source_channel, 'WhatsApp'))
  on conflict (lower(btrim(name))) do update
    set phone          = coalesce(excluded.phone, public.aramea_clients.phone),
        source_channel = coalesce(excluded.source_channel, public.aramea_clients.source_channel),
        updated_at     = now();

  return new;
end;
$$;

drop trigger if exists aramea_trg_sync_client on public.aramea_orders;
create trigger aramea_trg_sync_client
  after insert or update of client_name, client_phone, source_channel
  on public.aramea_orders
  for each row execute function public.aramea_sync_client_from_order();

-- ---------------------------------------------------------------------
-- 4. "Concluída" automaticamente 1 hora depois da hora de entrega
-- ---------------------------------------------------------------------
create or replace function public.aramea_complete_overdue_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with atrasadas as (
    update public.aramea_orders
       set status = 'completed',
           paid = true,
           updated_at = now()
     where status in ('pending', 'in_production')
       and delivery_date ~ '^\d{4}-\d{2}-\d{2}$'
       and (delivery_date || ' ' || coalesce(nullif(btrim(coalesce(delivery_time, '')), ''), '23:59'))::timestamp
             + interval '1 hour' <= (now() at time zone 'Europe/Lisbon')
    returning 1
  )
  select count(*) into v_count from atrasadas;
  return v_count;
end;
$$;

grant execute on function public.aramea_complete_overdue_orders() to anon, authenticated;

create or replace function public.aramea_stamp_order_payment()
returns trigger
language plpgsql
as $$
begin
  if new.paid and (old.paid is distinct from new.paid) then
    new.paid_at := coalesce(new.paid_at, now());
  elsif not new.paid then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists aramea_trg_stamp_payment on public.aramea_orders;
create trigger aramea_trg_stamp_payment
  before update of paid on public.aramea_orders
  for each row execute function public.aramea_stamp_order_payment();

-- ---------------------------------------------------------------------
-- 5. Tempo real para os produtos
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.aramea_products;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 6. Storage: bucket público "aramea-photos"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('aramea-photos', 'aramea-photos', true)
on conflict (id) do nothing;

drop policy if exists "aramea_photos_insert" on storage.objects;
drop policy if exists "aramea_photos_select" on storage.objects;

create policy "aramea_photos_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'aramea-photos');

create policy "aramea_photos_select" on storage.objects
  for select to anon, authenticated using (bucket_id = 'aramea-photos');

-- ---------------------------------------------------------------------
-- 7. Produtos iniciais (só se ainda não houver nenhum)
-- ---------------------------------------------------------------------
insert into public.aramea_products (name, category)
select v.name, v.category
from (values
  ('Rosa',              'Flores'),
  ('Tulipa',            'Flores'),
  ('Girassol',          'Flores'),
  ('Peónia',            'Flores'),
  ('Lírio',             'Flores'),
  ('Bouquet pequeno',   'Bouquets'),
  ('Bouquet médio',     'Bouquets'),
  ('Bouquet de noiva',  'Bouquets'),
  ('Arranjo de mesa',   'Arranjos'),
  ('Coroa de flores',   'Arranjos'),
  ('Vaso decorativo',   'Vasos')
) as v(name, category)
where not exists (select 1 from public.aramea_products);

select 'ok' as aramea_setup;
