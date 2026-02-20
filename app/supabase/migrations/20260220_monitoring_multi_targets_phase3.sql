-- Phase 3: allow multiple monitoring domains per account
-- Run this in Supabase SQL editor before deploying multi-target monitoring dashboard.

drop index if exists public.monitoring_targets_user_unique_idx;

create unique index if not exists monitoring_targets_user_url_unique_idx
  on public.monitoring_targets (user_id, regexp_replace(default_url, '/+$', ''));

create index if not exists monitoring_targets_user_updated_idx
  on public.monitoring_targets (user_id, updated_at desc);
