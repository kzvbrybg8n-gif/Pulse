-- ============================================================
-- Pulse — Module « Compte à rebours »
-- ============================================================
-- Table countdowns : cartes affichant le temps restant jusqu'à
-- une date cible. Suit les conventions du schéma initial :
--   - user_id (uuid) → auth.users (ON DELETE CASCADE)
--   - RLS : un user n'accède qu'à ses propres lignes
--   - updated_at maintenu par le trigger public.set_updated_at()
--     (défini dans la migration initiale, réutilisé ici)
-- ============================================================

-- ------------------------------------------------------------
-- A. Types énumérés
-- ------------------------------------------------------------

create type public.countdown_type as enum ('countdown', 'countup');

create type public.countdown_recurrence as enum (
  'none', 'daily', 'weekly', 'monthly', 'yearly'
);

create type public.countdown_day_calc_mode as enum ('standard');

-- ------------------------------------------------------------
-- B. Table
-- ------------------------------------------------------------

create table public.countdowns (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  icon               text,                       -- emoji ou clé d'icône, nullable
  target_date        date not null,
  type               public.countdown_type            not null default 'countdown',
  reminder           text,                       -- ex. 'same_day,3_days_before', nullable
  recurrence         public.countdown_recurrence      not null default 'none',
  day_calc_mode      public.countdown_day_calc_mode   not null default 'standard',
  show_in_smart_list boolean not null default false,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger countdowns_set_updated_at
  before update on public.countdowns
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- C. Index
-- ------------------------------------------------------------

create index countdowns_user_id_idx
  on public.countdowns (user_id);

-- Tri d'affichage : ordre manuel puis date cible.
create index countdowns_user_order_idx
  on public.countdowns (user_id, sort_order, target_date);

-- ------------------------------------------------------------
-- D. RLS — propriétaire uniquement (SELECT/INSERT/UPDATE/DELETE)
-- ------------------------------------------------------------

alter table public.countdowns enable row level security;

create policy countdowns_select_own on public.countdowns
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy countdowns_insert_own on public.countdowns
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy countdowns_update_own on public.countdowns
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy countdowns_delete_own on public.countdowns
  for delete to authenticated
  using (user_id = (select auth.uid()));
