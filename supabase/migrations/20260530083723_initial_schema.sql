-- ============================================================
-- Pulse — Schéma initial (Phase 2)
-- ============================================================
-- 10 tables : organisationnelles (folders, lists, tags), tâches
-- (tasks, subtasks, task_tags), habitudes (habits, habit_logs),
-- focus (pomodoro_sessions), rappels (reminders).
--
-- Toutes les tables :
--   - portent user_id (uuid) référençant auth.users (ON DELETE CASCADE)
--   - sont protégées par RLS avec policy `user_id = auth.uid()`
--   - ont created_at ; les mutables ont updated_at + trigger
--
-- Convention : noms en snake_case, pluriels, timestamps en timestamptz.
-- ============================================================

-- ------------------------------------------------------------
-- A. Helpers
-- ------------------------------------------------------------

-- Trigger function réutilisée par toutes les tables mutables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- B. Tables organisationnelles
-- ------------------------------------------------------------

create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  folder_id   uuid references public.folders(id) on delete set null,
  name        text not null check (length(trim(name)) > 0),
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  -- Un tag par nom (insensible à la casse) par user.
  constraint tags_user_lower_name_unique unique (user_id, name)
);
-- Pour faire respecter l'unicité insensible à la casse :
create unique index tags_user_lower_name_idx
  on public.tags (user_id, lower(name));

-- ------------------------------------------------------------
-- C. Tâches
-- ------------------------------------------------------------

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  list_id     uuid references public.lists(id) on delete set null,
  title       text not null check (length(trim(title)) > 0),
  status      text not null default 'open'
              check (status in ('open', 'done', 'archived')),
  prio        smallint not null default 4
              check (prio between 1 and 4),
  due_at      timestamptz,
  recur_rule  text,                        -- RFC 5545 RRULE, nullable
  note        text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create table public.subtasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  task_id     uuid not null references public.tasks(id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  done        boolean not null default false,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger subtasks_set_updated_at
  before update on public.subtasks
  for each row execute function public.set_updated_at();

-- Table de jointure tags ↔ tasks.
-- user_id est redondant avec les fks mais nécessaire pour que la policy
-- RLS soit évaluable sans jointure (pattern Supabase standard).
create table public.task_tags (
  task_id    uuid not null references public.tasks(id) on delete cascade,
  tag_id     uuid not null references public.tags(id)  on delete cascade,
  user_id    uuid not null references auth.users(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, tag_id)
);

-- ------------------------------------------------------------
-- D. Habitudes
-- ------------------------------------------------------------

create table public.habits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null check (length(trim(name)) > 0),
  target_per_period integer not null default 1 check (target_per_period > 0),
  period            text not null default 'day'
                    check (period in ('day', 'week', 'month')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  habit_id   uuid not null references public.habits(id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  -- Un seul check-in par jour par habitude.
  constraint habit_logs_habit_day_unique unique (habit_id, day)
);

-- ------------------------------------------------------------
-- E. Focus (Pomodoro)
-- ------------------------------------------------------------

create table public.pomodoro_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  task_id          uuid references public.tasks(id) on delete set null,
  mode             text not null check (mode in ('focus', 'break')),
  duration_seconds integer not null check (duration_seconds > 0),
  started_at       timestamptz not null,
  ended_at         timestamptz,
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- F. Rappels
-- ------------------------------------------------------------

create table public.reminders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  task_id    uuid not null references public.tasks(id) on delete cascade,
  remind_at  timestamptz not null,
  sent_at    timestamptz,                  -- nul = jamais envoyé
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- G. Index (performance + RLS)
-- ------------------------------------------------------------
-- RLS applique systématiquement un filtre user_id = auth.uid().
-- On indexe donc user_id sur chaque table, puis on ajoute des index
-- métier sur les colonnes les plus filtrées/triées.

create index folders_user_id_idx           on public.folders           (user_id);
create index lists_user_id_idx             on public.lists             (user_id);
create index lists_folder_id_idx           on public.lists             (folder_id);
create index tags_user_id_idx              on public.tags              (user_id);

create index tasks_user_id_idx             on public.tasks             (user_id);
create index tasks_user_due_idx            on public.tasks             (user_id, due_at);
create index tasks_user_status_idx         on public.tasks             (user_id, status);
create index tasks_user_list_idx           on public.tasks             (user_id, list_id);

create index subtasks_user_id_idx          on public.subtasks          (user_id);
create index subtasks_task_id_idx          on public.subtasks          (task_id);

create index task_tags_user_id_idx         on public.task_tags         (user_id);
create index task_tags_tag_id_idx          on public.task_tags         (tag_id);

create index habits_user_id_idx            on public.habits            (user_id);
create index habit_logs_user_id_idx        on public.habit_logs        (user_id);
create index habit_logs_habit_day_idx      on public.habit_logs        (habit_id, day desc);

create index pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);
create index pomodoro_sessions_started_idx on public.pomodoro_sessions (user_id, started_at desc);

create index reminders_user_id_idx         on public.reminders         (user_id);
-- Pour le futur worker : récupérer rapidement les rappels en attente.
create index reminders_pending_idx
  on public.reminders (remind_at)
  where sent_at is null;

-- ------------------------------------------------------------
-- H. RLS — activer + policy unique par table
-- ------------------------------------------------------------
-- Pattern unique partout : un user authentifié ne peut lire/insérer/
-- modifier/supprimer QUE ses propres lignes (user_id = auth.uid()).
-- Aucune policy publique. Aucun bypass anonyme.

alter table public.folders            enable row level security;
alter table public.lists              enable row level security;
alter table public.tags               enable row level security;
alter table public.tasks              enable row level security;
alter table public.subtasks           enable row level security;
alter table public.task_tags          enable row level security;
alter table public.habits             enable row level security;
alter table public.habit_logs         enable row level security;
alter table public.pomodoro_sessions  enable row level security;
alter table public.reminders          enable row level security;

create policy folders_owner            on public.folders
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy lists_owner              on public.lists
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy tags_owner               on public.tags
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy tasks_owner              on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy subtasks_owner           on public.subtasks
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy task_tags_owner          on public.task_tags
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy habits_owner             on public.habits
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy habit_logs_owner         on public.habit_logs
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy pomodoro_sessions_owner  on public.pomodoro_sessions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy reminders_owner          on public.reminders
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
