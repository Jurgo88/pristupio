-- Phase 2 pricing tiers schema
-- Run this in Supabase SQL editor before deploying tiered Lemon webhook updates.

alter table if exists public.profiles
  add column if not exists audit_tier text not null default 'none'
    check (audit_tier in ('none', 'basic', 'pro')),
  add column if not exists monitoring_tier text not null default 'none'
    check (monitoring_tier in ('none', 'basic', 'pro')),
  add column if not exists monitoring_domains_limit integer not null default 0
    check (monitoring_domains_limit >= 0),
  add column if not exists monitoring_monthly_runs integer not null default 0
    check (monitoring_monthly_runs >= 0);

update public.profiles
set audit_tier = 'basic'
where audit_tier = 'none'
  and (coalesce(plan, 'free') = 'paid' or coalesce(paid_audit_credits, 0) > 0);

update public.profiles
set monitoring_tier = case when monitoring_tier = 'none' then 'basic' else monitoring_tier end,
    monitoring_domains_limit = case when monitoring_domains_limit = 0 then 2 else monitoring_domains_limit end,
    monitoring_monthly_runs = case when monitoring_monthly_runs = 0 then 4 else monitoring_monthly_runs end
where coalesce(monitoring_active, false) = true;
