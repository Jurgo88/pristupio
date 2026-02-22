-- Phase 4: site-audit jobs foundation
-- Run this in Supabase SQL editor before deploying site-audit endpoints.

create table if not exists public.audit_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  root_url text not null,
  mode text not null default 'quick' check (mode in ('quick', 'full')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  lang text not null default 'sk' check (lang in ('sk', 'en')),
  audit_tier_snapshot text not null default 'none' check (audit_tier_snapshot in ('none', 'basic', 'pro')),
  pages_limit integer not null default 25 check (pages_limit between 1 and 2000),
  max_depth integer not null default 3 check (max_depth between 0 and 10),
  pages_queued integer not null default 0 check (pages_queued >= 0),
  pages_scanned integer not null default 0 check (pages_scanned >= 0),
  pages_failed integer not null default 0 check (pages_failed >= 0),
  issues_total integer not null default 0 check (issues_total >= 0),
  started_at timestamptz null,
  finished_at timestamptz null,
  error_message text null,
  audit_id uuid null references public.audits(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audit_jobs_user_created_idx
  on public.audit_jobs (user_id, created_at desc);

create index if not exists audit_jobs_status_created_idx
  on public.audit_jobs (status, created_at asc);

create table if not exists public.audit_job_pages (
  id bigserial primary key,
  job_id uuid not null references public.audit_jobs(id) on delete cascade,
  url text not null,
  normalized_url text not null,
  depth integer not null default 0 check (depth >= 0),
  discovered_from_url text null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'skipped')),
  http_status integer null,
  load_ms integer null,
  issues_count integer not null default 0 check (issues_count >= 0),
  scanned_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  unique (job_id, normalized_url)
);

create index if not exists audit_job_pages_job_status_idx
  on public.audit_job_pages (job_id, status);

create index if not exists audit_job_pages_job_depth_idx
  on public.audit_job_pages (job_id, depth, id);

create table if not exists public.audit_job_issues (
  id bigserial primary key,
  job_id uuid not null references public.audit_jobs(id) on delete cascade,
  page_id bigint not null references public.audit_job_pages(id) on delete cascade,
  rule_id text not null,
  impact text not null,
  wcag text null,
  wcag_level text null,
  principle text null,
  selector_fingerprint text not null,
  nodes_count integer not null default 0 check (nodes_count >= 0),
  help_url text null,
  issue_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_job_issues_job_rule_idx
  on public.audit_job_issues (job_id, rule_id);

create index if not exists audit_job_issues_job_cluster_idx
  on public.audit_job_issues (job_id, rule_id, selector_fingerprint);

alter table if exists public.audits
  add column if not exists scope text not null default 'single'
    check (scope in ('single', 'site', 'monitoring')),
  add column if not exists pages_scanned integer not null default 1
    check (pages_scanned >= 0),
  add column if not exists job_id uuid null references public.audit_jobs(id) on delete set null;

update public.audits
set scope = case
  when audit_kind = 'monitor' then 'monitoring'
  else 'single'
end
where scope is null
   or scope not in ('single', 'site', 'monitoring');

alter table public.audit_jobs enable row level security;
alter table public.audit_job_pages enable row level security;
alter table public.audit_job_issues enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_jobs'
      and policyname = 'audit_jobs_select_own'
  ) then
    create policy audit_jobs_select_own
      on public.audit_jobs
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_jobs'
      and policyname = 'audit_jobs_insert_own'
  ) then
    create policy audit_jobs_insert_own
      on public.audit_jobs
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_jobs'
      and policyname = 'audit_jobs_update_own'
  ) then
    create policy audit_jobs_update_own
      on public.audit_jobs
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_job_pages'
      and policyname = 'audit_job_pages_select_own'
  ) then
    create policy audit_job_pages_select_own
      on public.audit_job_pages
      for select
      using (
        exists (
          select 1
          from public.audit_jobs j
          where j.id = audit_job_pages.job_id
            and j.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_job_issues'
      and policyname = 'audit_job_issues_select_own'
  ) then
    create policy audit_job_issues_select_own
      on public.audit_job_issues
      for select
      using (
        exists (
          select 1
          from public.audit_jobs j
          where j.id = audit_job_issues.job_id
            and j.user_id = auth.uid()
        )
      );
  end if;
end
$$;
