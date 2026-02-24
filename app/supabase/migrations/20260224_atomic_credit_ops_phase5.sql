-- Phase 5: atomic paid-audit credit operations
-- Run this in Supabase SQL editor before deploying webhook/audit credit updates.

create or replace function public.adjust_paid_audit_credits(
  p_user_id uuid,
  p_delta integer,
  p_floor_zero boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  update public.profiles
  set paid_audit_credits = case
      when p_floor_zero then greatest(0, coalesce(paid_audit_credits, 0) + p_delta)
      else coalesce(paid_audit_credits, 0) + p_delta
    end,
    updated_at = now()
  where id = p_user_id
  returning paid_audit_credits into v_next;

  return v_next;
end;
$$;

create or replace function public.consume_paid_audit_credit(
  p_user_id uuid,
  p_mark_completed boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  update public.profiles
  set paid_audit_credits = case
      when role = 'admin' then coalesce(paid_audit_credits, 0)
      else greatest(0, coalesce(paid_audit_credits, 0) - 1)
    end,
    paid_audit_completed = case
      when p_mark_completed then true
      else coalesce(paid_audit_completed, false)
    end,
    updated_at = now()
  where id = p_user_id
    and (role = 'admin' or coalesce(paid_audit_credits, 0) > 0)
  returning paid_audit_credits into v_remaining;

  return v_remaining;
end;
$$;

revoke all on function public.adjust_paid_audit_credits(uuid, integer, boolean) from public;
revoke all on function public.consume_paid_audit_credit(uuid, boolean) from public;

grant execute on function public.adjust_paid_audit_credits(uuid, integer, boolean) to service_role;
grant execute on function public.consume_paid_audit_credit(uuid, boolean) to service_role;
