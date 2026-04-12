-- Rensume Research Results v2 migration
-- Date: 2026-04-12
--
-- Adds:
-- 1) Soft-delete fields on research_runs
-- 2) Immutable deletion audit table
-- 3) Explicit variant dimensions on research_run_results
-- 4) RPC for transactional soft-delete + audit snapshot
-- 5) Backfill for existing rows

begin;

-- 1) Soft-delete metadata on runs
alter table if exists public.research_runs
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text,
  add column if not exists deleted_by_user_id uuid,
  add column if not exists deleted_by_email text;

-- 2) Immutable deletion audit log
create table if not exists public.research_run_deletions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  reason text not null,
  deleted_at timestamptz not null default now(),
  deleted_by_user_id uuid,
  deleted_by_email text,
  run_snapshot jsonb not null,
  results_snapshot jsonb not null
);

create index if not exists idx_research_run_deletions_run_id
  on public.research_run_deletions(run_id);

-- 3) Aggregation-friendly variant columns
alter table if exists public.research_run_results
  add column if not exists model_key text,
  add column if not exists model_label text,
  add column if not exists blind_mode boolean,
  add column if not exists rules_key text,
  add column if not exists evidence_key text,
  add column if not exists extract_key text,
  add column if not exists fn_defs_key text,
  add column if not exists variant_label text;

create index if not exists idx_research_run_results_model_key
  on public.research_run_results(model_key);

create index if not exists idx_research_run_results_evidence_key
  on public.research_run_results(evidence_key);

create index if not exists idx_research_runs_deleted_at
  on public.research_runs(deleted_at);

-- 4) Transactional soft-delete + audit snapshot RPC
create or replace function public.soft_delete_research_run(
  p_run_id uuid,
  p_reason text,
  p_deleted_by_user_id uuid default null,
  p_deleted_by_email text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_run public.research_runs%rowtype;
  v_results jsonb;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Deletion reason is required';
  end if;

  select *
    into v_run
  from public.research_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'Run not found';
  end if;

  if v_run.deleted_at is not null then
    raise exception 'Run is already deleted';
  end if;

  select coalesce(jsonb_agg(to_jsonb(rr) order by rr.created_at), '[]'::jsonb)
    into v_results
  from public.research_run_results rr
  where rr.run_id = p_run_id;

  insert into public.research_run_deletions (
    run_id,
    reason,
    deleted_at,
    deleted_by_user_id,
    deleted_by_email,
    run_snapshot,
    results_snapshot
  ) values (
    p_run_id,
    p_reason,
    now(),
    p_deleted_by_user_id,
    p_deleted_by_email,
    to_jsonb(v_run),
    v_results
  );

  update public.research_runs
  set
    deleted_at = now(),
    deleted_reason = p_reason,
    deleted_by_user_id = p_deleted_by_user_id,
    deleted_by_email = p_deleted_by_email
  where id = p_run_id;
end;
$$;

-- Restrict RPC execution to authenticated users
revoke all on function public.soft_delete_research_run(uuid, text, uuid, text) from public;
grant execute on function public.soft_delete_research_run(uuid, text, uuid, text) to authenticated;

-- 5) Backfill explicit result fields for existing rows
update public.research_run_results rrr
set
  rules_key = rr.settings->>'rules_key',
  evidence_key = rr.settings->>'evidence_key',
  extract_key = rr.settings->>'extract_key',
  fn_defs_key = rr.settings->>'fn_defs_key',
  blind_mode = coalesce((rr.settings->>'blind')::boolean, false),
  model_key = coalesce(nullif(split_part(rrr.variant_key, '_', 1), ''), rrr.model_key),
  variant_label = coalesce(
    nullif(rrr.variant_label, ''),
    concat_ws(
      ' | ',
      coalesce(rrr.variant_key, 'Unknown variant'),
      coalesce(rr.settings->>'rules_key', ''),
      coalesce(rr.settings->>'evidence_key', ''),
      coalesce(rr.settings->>'extract_key', ''),
      coalesce(rr.settings->>'fn_defs_key', '')
    )
  )
from public.research_runs rr
where rr.id = rrr.run_id;

-- Backfill model label from a fixed map
update public.research_run_results
set model_label = case model_key
  when 'opus_4_6' then 'Opus 4.6'
  when 'opus_4_5' then 'Opus 4.5'
  when 'sonnet_4_6' then 'Sonnet 4.6'
  when 'sonnet_4_5' then 'Sonnet 4.5'
  when 'sonnet_4' then 'Sonnet 4'
  when 'haiku_4_5' then 'Haiku 4.5'
  when 'haiku_3_5' then 'Haiku 3.5'
  when 'haiku_3' then 'Haiku 3'
  else model_label
end
where model_label is null;

commit;

