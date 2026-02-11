-- Monitoring MVP schema
-- Run this SQL in Supabase before enabling monitoring functions.

create extension if not exists pgcrypto;

create table if not exists public.monitor_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  profile text not null default 'wad',
  frequency_days integer not null default 14,
  active boolean not null default true,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists monitor_targets_user_url_idx on public.monitor_targets (user_id, url);
create index if not exists monitor_targets_next_run_idx on public.monitor_targets (active, next_run_at);

create table if not exists public.monitor_runs (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.monitor_targets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  score integer,
  summary jsonb,
  top_issues jsonb,
  delta jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists monitor_runs_target_created_idx on public.monitor_runs (target_id, created_at desc);
create index if not exists monitor_runs_user_created_idx on public.monitor_runs (user_id, created_at desc);

alter table public.monitor_targets enable row level security;
alter table public.monitor_runs enable row level security;

drop policy if exists monitor_targets_owner_select on public.monitor_targets;
create policy monitor_targets_owner_select
on public.monitor_targets
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists monitor_targets_owner_insert on public.monitor_targets;
create policy monitor_targets_owner_insert
on public.monitor_targets
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists monitor_targets_owner_update on public.monitor_targets;
create policy monitor_targets_owner_update
on public.monitor_targets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists monitor_runs_owner_select on public.monitor_runs;
create policy monitor_runs_owner_select
on public.monitor_runs
for select
to authenticated
using (auth.uid() = user_id);
