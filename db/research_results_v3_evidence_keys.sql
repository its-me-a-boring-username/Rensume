-- Rensume Research Results v3: Evidence key naming alignment
-- Date: 2026-04-14
--
-- Adds explicit columns with intuitive names:
-- - research_run_results.evidence_display_settings_key
-- - research_run_results.evidence_quality_assessment_key
-- Backfills from prior fields where available.

begin;

alter table if exists public.research_run_results
  add column if not exists evidence_display_settings_key text,
  add column if not exists evidence_quality_assessment_key text;

create index if not exists idx_research_run_results_evidence_display_settings_key
  on public.research_run_results(evidence_display_settings_key);

create index if not exists idx_research_run_results_evidence_quality_assessment_key
  on public.research_run_results(evidence_quality_assessment_key);

-- Backfill result-level keys.
update public.research_run_results rrr
set
  evidence_display_settings_key = coalesce(
    nullif(rrr.evidence_display_settings_key, ''),
    nullif(rrr.evidence_preset_key, ''),
    nullif(rr.settings->>'evidence_display_settings_key', ''),
    nullif(rr.settings->>'evidence_preset_key', '')
  ),
  evidence_quality_assessment_key = coalesce(
    nullif(rrr.evidence_quality_assessment_key, ''),
    nullif(rr.settings->>'evidence_quality_assessment_key', '')
  )
from public.research_runs rr
where rr.id = rrr.run_id;

-- Normalize run settings for downstream reads.
update public.research_runs
set settings = jsonb_set(
  jsonb_set(
    coalesce(settings, '{}'::jsonb),
    '{evidence_display_settings_key}',
    to_jsonb(coalesce(
      nullif(settings->>'evidence_display_settings_key', ''),
      nullif(settings->>'evidence_preset_key', '')
    ))
  ),
  '{evidence_quality_assessment_key}',
  to_jsonb(coalesce(
    nullif(settings->>'evidence_quality_assessment_key', ''),
    'quality_v1_balanced'
  ))
)
where settings is not null;

commit;
