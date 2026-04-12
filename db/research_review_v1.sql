-- Rensume review workflow v1
-- Date: 2026-04-12
--
-- Adds:
-- 1) Per-variant review sessions (draft/finalized)
-- 2) Per-role/per-label evidence ratings with flags
-- 3) Inter-rater support via reviewer_key

begin;

create table if not exists public.research_variant_reviews (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs(id) on delete cascade,
  run_result_id uuid not null references public.research_run_results(id) on delete cascade,
  resume_id uuid not null references public.research_resumes(id) on delete cascade,
  reviewer_key text not null,
  reviewer_user_id uuid,
  reviewer_email text,
  label_family text not null default 'function',
  review_aspect text not null default 'evidence',
  status text not null default 'draft',
  coverage_pct numeric(5,2) not null default 0,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_variant_reviews_status_check check (status in ('draft', 'finalized')),
  constraint research_variant_reviews_label_family_check check (label_family in ('function', 'industry', 'knowledge_area')),
  constraint research_variant_reviews_review_aspect_check check (review_aspect in ('evidence', 'label_accuracy'))
);

create unique index if not exists ux_research_variant_reviews_scope
  on public.research_variant_reviews(run_result_id, reviewer_key, label_family, review_aspect);

create index if not exists idx_research_variant_reviews_run_result_id
  on public.research_variant_reviews(run_result_id);

create index if not exists idx_research_variant_reviews_status
  on public.research_variant_reviews(status);

create table if not exists public.research_variant_review_items (
  id uuid primary key default gen_random_uuid(),
  variant_review_id uuid not null references public.research_variant_reviews(id) on delete cascade,
  role_index integer not null,
  label_name text not null,
  label_family text not null default 'function',
  review_aspect text not null default 'evidence',
  evidence_text text,
  rating text,
  flags text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_variant_review_items_rating_check check (rating in ('accurate', 'partially_accurate', 'inaccurate') or rating is null),
  constraint research_variant_review_items_label_family_check check (label_family in ('function', 'industry', 'knowledge_area')),
  constraint research_variant_review_items_review_aspect_check check (review_aspect in ('evidence', 'label_accuracy'))
);

create unique index if not exists ux_research_variant_review_items_scope
  on public.research_variant_review_items(variant_review_id, role_index, label_name, label_family, review_aspect);

create index if not exists idx_research_variant_review_items_variant_review_id
  on public.research_variant_review_items(variant_review_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_research_variant_reviews_updated_at on public.research_variant_reviews;
create trigger trg_research_variant_reviews_updated_at
before update on public.research_variant_reviews
for each row execute function public.set_updated_at();

drop trigger if exists trg_research_variant_review_items_updated_at on public.research_variant_review_items;
create trigger trg_research_variant_review_items_updated_at
before update on public.research_variant_review_items
for each row execute function public.set_updated_at();

commit;
