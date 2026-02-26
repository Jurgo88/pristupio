create table if not exists public.audit_rule_copy (
  id bigserial primary key,
  rule_id text not null,
  locale text not null default 'sk' check (locale in ('sk', 'en')),
  title text not null default '',
  description text not null default '',
  recommendation text not null default '',
  source text not null default 'static' check (source in ('static', 'ai')),
  prompt_version text null,
  generated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_id, locale)
);

create index if not exists audit_rule_copy_rule_locale_idx
  on public.audit_rule_copy (rule_id, locale);

alter table public.audit_rule_copy enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_rule_copy'
      and policyname = 'audit_rule_copy_select_authenticated'
  ) then
    create policy audit_rule_copy_select_authenticated
      on public.audit_rule_copy
      for select
      to authenticated
      using (true);
  end if;
end
$$;
