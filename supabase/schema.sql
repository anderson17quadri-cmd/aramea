-- =====================================================================
-- ARAMÉA — correr TUDO de uma vez no Supabase → SQL Editor → Run.
-- Pode voltar a correr-se sem estragar nada (idempotente).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.orders (
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

create index if not exists orders_delivery_date_idx on public.orders (delivery_date);
create index if not exists orders_client_name_idx on public.orders (lower(client_name));

create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  source_channel  text default 'WhatsApp',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Nome único (sem diferenças de maiúsculas/espaços).
create unique index if not exists clients_name_unique_idx on public.clients (lower(btrim(name)));

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Acesso (app sem login → papel anon)
-- ---------------------------------------------------------------------
alter table public.orders   enable row level security;
alter table public.clients  enable row level security;
alter table public.products enable row level security;

drop policy if exists "anon orders"   on public.orders;
drop policy if exists "anon clients"  on public.clients;
drop policy if exists "anon products" on public.products;

create policy "anon orders"   on public.orders   for all to anon, authenticated using (true) with check (true);
create policy "anon clients"  on public.clients  for all to anon, authenticated using (true) with check (true);
create policy "anon products" on public.products for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 3. Cliente guardado automaticamente a cada encomenda
-- ---------------------------------------------------------------------
create or replace function public.sync_client_from_order()
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

  insert into public.clients (name, phone, source_channel)
  values (v_name, v_phone, coalesce(new.source_channel, 'WhatsApp'))
  on conflict (lower(btrim(name))) do update
    set phone          = coalesce(excluded.phone, public.clients.phone),
        source_channel = coalesce(excluded.source_channel, public.clients.source_channel),
        updated_at     = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_client_from_order on public.orders;
create trigger trg_sync_client_from_order
  after insert or update of client_name, client_phone, source_channel
  on public.orders
  for each row execute function public.sync_client_from_order();

-- ---------------------------------------------------------------------
-- 4. "Concluída" automaticamente 1 hora depois da hora de entrega
-- ---------------------------------------------------------------------
create or replace function public.order_delivery_at(p_date text, p_time text)
returns timestamp
language sql
immutable
as $$
  select (p_date || ' ' || coalesce(nullif(btrim(coalesce(p_time, '')), ''), '23:59'))::timestamp
$$;

create or replace function public.complete_overdue_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with atrasadas as (
    update public.orders
       set status = 'completed',
           paid = true,
           updated_at = now()
     where status in ('pending', 'in_production')
       and delivery_date ~ '^\d{4}-\d{2}-\d{2}$'
       and public.order_delivery_at(delivery_date, delivery_time)
             + interval '1 hour' <= (now() at time zone 'Europe/Lisbon')
    returning 1
  )
  select count(*) into v_count from atrasadas;
  return v_count;
end;
$$;

grant execute on function public.complete_overdue_orders() to anon, authenticated;

-- Data do pagamento (preenchida sozinha ao marcar como paga).
create or replace function public.stamp_order_payment()
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

drop trigger if exists trg_stamp_order_payment on public.orders;
create trigger trg_stamp_order_payment
  before update of paid on public.orders
  for each row execute function public.stamp_order_payment();

-- ---------------------------------------------------------------------
-- 5. Tempo real para os produtos (o formulário atualiza sozinho)
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.products;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 6. Storage: bucket público "photos"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos insert anon" on storage.objects;
drop policy if exists "photos select anon" on storage.objects;

create policy "photos insert anon" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'photos');

create policy "photos select anon" on storage.objects
  for select to anon, authenticated using (bucket_id = 'photos');

-- ---------------------------------------------------------------------
-- 7. Produtos iniciais (só se a tabela estiver vazia)
-- ---------------------------------------------------------------------
insert into public.products (name, category)
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
where not exists (select 1 from public.products);
