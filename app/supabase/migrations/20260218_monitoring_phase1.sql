-- Phase 1 monitoring schema
-- Run this in Supabase SQL editor before deploying monitoring endpoints.

alter table if exists public.profiles
  add column if not exists monitoring_active boolean not null default false,
  add column if not exists monitoring_until timestamptz null;

create table if not exists public.monitoring_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  default_url text not null,
  profile text not null default 'wad' check (profile in ('wad', 'eaa')),
  active boolean not null default true,
  cadence_mode text not null default 'interval_days' check (cadence_mode in ('interval_days', 'monthly_runs')),
  cadence_value integer not null default 14,
  anchor_at timestamptz not null default now(),
  last_run_at timestamptz null,
  next_run_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists monitoring_targets_user_unique_idx
  on public.monitoring_targets (user_id);

create index if not exists monitoring_targets_due_idx
  on public.monitoring_targets (active, next_run_at);

create table if not exists public.monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.monitoring_targets(id) on delete cascade,
  trigger text not null check (trigger in ('scheduled', 'manual')),
  run_url text not null,
  status text not null check (status in ('pending', 'running', 'success', 'failed')),
  audit_id uuid null references public.audits(id) on delete set null,
  summary_json jsonb null default '{}'::jsonb,
  diff_json jsonb null default '{}'::jsonb,
  error_message text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists monitoring_runs_target_started_idx
  on public.monitoring_runs (target_id, started_at desc);

create index if not exists monitoring_runs_target_status_idx
  on public.monitoring_runs (target_id, status);

alter table public.monitoring_targets enable row level security;
alter table public.monitoring_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring_targets'
      and policyname = 'monitoring_targets_select_own'
  ) then
    create policy monitoring_targets_select_own
      on public.monitoring_targets
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring_targets'
      and policyname = 'monitoring_targets_insert_own'
  ) then
    create policy monitoring_targets_insert_own
      on public.monitoring_targets
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring_targets'
      and policyname = 'monitoring_targets_update_own'
  ) then
    create policy monitoring_targets_update_own
      on public.monitoring_targets
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring_targets'
      and policyname = 'monitoring_targets_delete_own'
  ) then
    create policy monitoring_targets_delete_own
      on public.monitoring_targets
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring_runs'
      and policyname = 'monitoring_runs_select_own'
  ) then
    create policy monitoring_runs_select_own
      on public.monitoring_runs
      for select
      using (
        exists (
          select 1
          from public.monitoring_targets t
          where t.id = monitoring_runs.target_id
            and t.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring_runs'
      and policyname = 'monitoring_runs_insert_own'
  ) then
    create policy monitoring_runs_insert_own
      on public.monitoring_runs
      for insert
      with check (
        exists (
          select 1
          from public.monitoring_targets t
          where t.id = monitoring_runs.target_id
            and t.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring_runs'
      and policyname = 'monitoring_runs_update_own'
  ) then
    create policy monitoring_runs_update_own
      on public.monitoring_runs
      for update
      using (
        exists (
          select 1
          from public.monitoring_targets t
          where t.id = monitoring_runs.target_id
            and t.user_id = auth.uid()
        )
      );
  end if;
end
$$;
Ok