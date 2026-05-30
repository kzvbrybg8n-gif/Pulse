-- Phase 8 : stocke les endpoints Web Push des utilisateurs.
-- Permet au job cron d'envoyer les notifications push sans passer par le client navigateur.

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "own push subscriptions"
  on public.push_subscriptions
  for all
  using (user_id = auth.uid());
