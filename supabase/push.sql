-- =====================================================================
-- ARAMÉA — notificações da web app (iPhone). Correr no projeto agendado-pt.
-- Só cria coisas novas com prefixo aramea_ / aramea-.
-- =====================================================================

create table if not exists public.aramea_push_subscriptions (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Sem políticas para anon: só a função (service role) lê os telemóveis registados.
alter table public.aramea_push_subscriptions enable row level security;

create table if not exists public.aramea_push_log (
  order_id  uuid not null,
  slot      text not null,
  sent_at   timestamptz not null default now(),
  primary key (order_id, slot)
);
alter table public.aramea_push_log enable row level security;

-- A app regista o telemóvel por aqui (sem poder ler os outros).
create or replace function public.aramea_save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.aramea_push_subscriptions (endpoint, p256dh, auth, user_agent)
  values (p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, updated_at = now();
$$;

grant execute on function public.aramea_save_push_subscription(text, text, text, text) to anon, authenticated;

-- Agendamento de hora em hora (minuto 0) → chama a Edge Function.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'aramea-push-hourly';

select cron.schedule(
  'aramea-push-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://vvgpykbmpwgdtcgakwod.supabase.co/functions/v1/aramea-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

select jobname, schedule from cron.job where jobname = 'aramea-push-hourly';
