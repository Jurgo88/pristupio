-- Phase 6: cleanup legacy monitoring tables
-- This migration first backfills legacy monitor_* data into monitoring_* tables.
-- After successful backfill it drops legacy tables.

do $$
declare
  v_migrated_targets bigint := 0;
  v_migrated_runs bigint := 0;
begin
  if to_regclass('public.monitoring_targets') is null
    or to_regclass('public.monitoring_runs') is null then
    raise exception 'Missing public.monitoring_targets/public.monitoring_runs. Apply monitoring migrations first.';
  end if;

  if to_regclass('public.monitor_targets') is not null then
    update public.monitoring_targets t
    set profile = case when l.profile in ('wad', 'eaa') then l.profile else t.profile end,
      active = coalesce(l.active, t.active),
      last_run_at = coalesce(l.last_run_at, t.last_run_at),
      next_run_at = coalesce(l.next_run_at, t.next_run_at),
      updated_at = greatest(
        coalesce(t.updated_at, now()),
        coalesce(l.updated_at, t.updated_at, now()),
        now()
      )
    from public.monitor_targets l
    where t.user_id = l.user_id
      and regexp_replace(t.default_url, '/+$', '') = regexp_replace(l.url, '/+$', '');

    insert into public.monitoring_targets (
      id,
      user_id,
      default_url,
      profile,
      active,
      cadence_mode,
      cadence_value,
      anchor_at,
      last_run_at,
      next_run_at,
      created_at,
      updated_at
    )
    select
      l.id,
      l.user_id,
      l.url,
      case when l.profile = 'eaa' then 'eaa' else 'wad' end,
      coalesce(l.active, true),
      'interval_days',
      least(60, greatest(1, coalesce(l.frequency_days, 14))),
      coalesce(l.created_at, now()),
      l.last_run_at,
      coalesce(l.next_run_at, now()),
      coalesce(l.created_at, now()),
      coalesce(l.updated_at, now())
    from public.monitor_targets l
    where not exists (
      select 1
      from public.monitoring_targets t
      where t.id = l.id
    )
      and not exists (
      select 1
      from public.monitoring_targets t
      where t.user_id = l.user_id
        and regexp_replace(t.default_url, '/+$', '') = regexp_replace(l.url, '/+$', '')
    );

    get diagnostics v_migrated_targets = row_count;
    raise notice 'Legacy monitor_targets inserted into monitoring_targets: %', v_migrated_targets;
  end if;

  if to_regclass('public.monitors') is not null then
    insert into public.monitoring_targets (
      id,
      user_id,
      default_url,
      profile,
      active,
      cadence_mode,
      cadence_value,
      anchor_at,
      last_run_at,
      next_run_at,
      created_at,
      updated_at
    )
    select
      m.id,
      m.user_id,
      m.url,
      'wad',
      coalesce(m.enabled, false),
      case when lower(coalesce(m.frequency, '')) = '2x_month' then 'monthly_runs' else 'interval_days' end,
      case when lower(coalesce(m.frequency, '')) = '2x_month' then 2 else 14 end,
      coalesce(m.last_run_at, now()),
      m.last_run_at,
      case
        when lower(coalesce(m.frequency, '')) = '2x_month' then coalesce(m.last_run_at, now()) + interval '15 days'
        else coalesce(m.last_run_at, now()) + interval '14 days'
      end,
      now(),
      now()
    from public.monitors m
    where not exists (
      select 1
      from public.monitoring_targets t
      where t.id = m.id
    )
      and not exists (
      select 1
      from public.monitoring_targets t
      where t.user_id = m.user_id
        and regexp_replace(t.default_url, '/+$', '') = regexp_replace(m.url, '/+$', '')
    );
  end if;

  if to_regclass('public.monitor_runs') is not null and to_regclass('public.monitor_targets') is not null then
    with target_map as (
      select
        l.id as legacy_target_id,
        coalesce(t_by_id.id, t_by_url.id) as new_target_id,
        l.url as legacy_url
      from public.monitor_targets l
      left join public.monitoring_targets t_by_id
        on t_by_id.id = l.id
      left join public.monitoring_targets t_by_url
        on t_by_url.user_id = l.user_id
        and regexp_replace(t_by_url.default_url, '/+$', '') = regexp_replace(l.url, '/+$', '')
    )
    insert into public.monitoring_runs (
      id,
      target_id,
      trigger,
      run_url,
      status,
      summary_json,
      diff_json,
      error_message,
      started_at,
      finished_at,
      created_at
    )
    select
      r.id,
      m.new_target_id,
      'scheduled',
      coalesce(m.legacy_url, 'https://example.com'),
      case
        when r.status in ('pending', 'running', 'success', 'failed') then r.status
        when lower(coalesce(r.status, '')) in ('completed', 'done', 'ok') then 'success'
        else 'failed'
      end,
      coalesce(r.summary, '{}'::jsonb),
      coalesce(r.delta, '{}'::jsonb),
      r.error,
      coalesce(r.started_at, r.created_at, now()),
      r.completed_at,
      coalesce(r.created_at, r.started_at, now())
    from public.monitor_runs r
    join target_map m
      on m.legacy_target_id = r.target_id
    where m.new_target_id is not null
      and not exists (
      select 1
      from public.monitoring_runs mr
      where mr.id = r.id
    );

    get diagnostics v_migrated_runs = row_count;
    raise notice 'Legacy monitor_runs inserted into monitoring_runs: %', v_migrated_runs;
  end if;
end
$$;

drop table if exists public.monitor_runs;
drop table if exists public.monitor_targets;
drop table if exists public.monitors;
