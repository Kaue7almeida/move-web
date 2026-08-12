-- ─────────────────────────────────────────────────────────────────────────────
-- Food Diary (Diário Alimentar) foundation — P1.
--
-- Creates the persistence layer for the food-diary module:
--   • food_diary_entries      — one analyzed meal (draft → … → confirmed)
--   • food_diary_items        — editable items of a meal (AI estimate + user review)
--   • daily_calorie_targets   — daily kcal/macro goal as a time series
--   • activity_energy_entries — manual energy expenditure (P1: manual only)
--   • private bucket "food-diary-photos"
--
-- This migration is ADDITIVE ONLY: it creates new objects and does not alter or
-- drop any existing table, column, policy, function or bucket. It depends only on
-- objects that already exist in every environment:
--   public.student_profiles(user_id)   — identity_and_relationships
--   public.workout_sessions(id)        — workout_sessions (nullable FK, P2 use)
--   public.set_updated_at()            — identity_and_relationships
-- Because of that it can be applied standalone (Dashboard SQL editor / Management
-- API) without depending on the migration ledger being in sync.
--
-- PII note: food_diary_entries.photo_storage_path references objects in the
-- *private* bucket "food-diary-photos" (user-supplied meal photos). Access must go
-- exclusively through the BFF service-role client, which bypasses RLS. RLS is
-- enabled with NO policies → deny-by-default for anon/authenticated keys, matching
-- the scan_analyses / scan_photos / notifications precedent.
--
-- Product rules deliberately NOT encoded here (they live in the BFF, configurable):
--   • daily limit of completed analyses per student (initially 6)
--   • TACO/USDA nutrition lookup (P2 — schema is ready, no catalog tables here)
--   • automatic energy from workout sessions (P2 — FK exists, no trigger/job)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. food_diary_entries ───────────────────────────────────────────────────

create table public.food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,

  -- Analysis lifecycle.
  --   draft      → created, photo/context not analyzed yet
  --   processing → AI call in flight (atomic transition guards double submit)
  --   completed  → AI answered and validated; awaiting mandatory human review
  --   confirmed  → student reviewed and saved; only this state counts in the diary
  --   rejected   → photo unusable (needs_retake), no reliable estimate produced
  --   failed     → technical failure (timeout, invalid AI payload, provider error)
  --   abandoned  → analyzed but never confirmed; eligible for photo cleanup
  status text not null default 'draft',

  meal_type text not null,
  -- Day the meal counts for. Separate from created_at on purpose: the student can
  -- log a meal from earlier in the day, and daily summaries aggregate by this.
  logged_at timestamptz not null default now(),

  -- Single photo per analysis (P1). Path inside the private bucket, never a URL.
  photo_storage_path text,
  photo_content_type text,

  -- Context supplied by the student (all optional except meal_type above).
  container_size text,
  meal_origin text,
  preparation_hint text,
  hidden_ingredients jsonb not null default '[]'::jsonb,
  is_shared_portion boolean not null default false,
  user_notes text,

  -- Idempotency: client-generated key so a retried "analyze" request cannot create
  -- a second entry. Nullable (legacy/manual rows may not carry one).
  idempotency_key text,

  -- Raw structured AI payload, preserved verbatim for auditing and future metrics.
  ai_result jsonb not null default '{}'::jsonb,
  ai_model text,
  confidence numeric,
  quality_overall text,
  needs_retake boolean not null default false,
  failure_reason text,

  -- Totals as ESTIMATED by the AI. Frozen at analysis time, never edited by the
  -- student — this is what allows measuring AI quality against the confirmed values.
  estimated_total_kcal numeric,
  estimated_total_protein_g numeric,
  estimated_total_carb_g numeric,
  estimated_total_fat_g numeric,
  estimated_total_fiber_g numeric,

  -- Totals as CONFIRMED by the student after review. Recomputed by the BFF from
  -- food_diary_items whenever an item changes. Only these count for the daily diary.
  confirmed_total_kcal numeric,
  confirmed_total_protein_g numeric,
  confirmed_total_carb_g numeric,
  confirmed_total_fat_g numeric,
  confirmed_total_fiber_g numeric,

  -- Lifecycle timestamps.
  processing_started_at timestamptz,
  analyzed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint food_diary_entries_status_check
    check (status in ('draft', 'processing', 'completed', 'confirmed', 'rejected', 'failed', 'abandoned')),
  constraint food_diary_entries_meal_type_check
    check (meal_type in ('cafe_da_manha', 'almoco', 'lanche', 'jantar', 'extra')),
  constraint food_diary_entries_container_size_check
    check (container_size is null or container_size in ('pequeno', 'medio', 'grande')),
  constraint food_diary_entries_meal_origin_check
    check (meal_origin is null or meal_origin in ('caseiro', 'restaurante', 'embalado')),
  constraint food_diary_entries_quality_overall_check
    check (quality_overall is null or quality_overall in ('boa', 'media', 'ruim')),
  constraint food_diary_entries_ai_result_object_check
    check (jsonb_typeof(ai_result) = 'object'),
  constraint food_diary_entries_hidden_ingredients_array_check
    check (jsonb_typeof(hidden_ingredients) = 'array'),
  constraint food_diary_entries_confidence_range_check
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint food_diary_entries_idempotency_key_not_blank_check
    check (idempotency_key is null or btrim(idempotency_key) <> ''),
  constraint food_diary_entries_photo_path_not_blank_check
    check (photo_storage_path is null or btrim(photo_storage_path) <> ''),

  -- Totals are never negative (null = not produced yet).
  constraint food_diary_entries_estimated_totals_non_negative_check
    check (
      coalesce(estimated_total_kcal, 0) >= 0
      and coalesce(estimated_total_protein_g, 0) >= 0
      and coalesce(estimated_total_carb_g, 0) >= 0
      and coalesce(estimated_total_fat_g, 0) >= 0
      and coalesce(estimated_total_fiber_g, 0) >= 0
    ),
  constraint food_diary_entries_confirmed_totals_non_negative_check
    check (
      coalesce(confirmed_total_kcal, 0) >= 0
      and coalesce(confirmed_total_protein_g, 0) >= 0
      and coalesce(confirmed_total_carb_g, 0) >= 0
      and coalesce(confirmed_total_fat_g, 0) >= 0
      and coalesce(confirmed_total_fiber_g, 0) >= 0
    ),

  -- Minimum timestamp/state consistency.
  constraint food_diary_entries_confirmed_requires_confirmed_at_check
    check (status <> 'confirmed' or confirmed_at is not null),
  constraint food_diary_entries_confirmed_requires_kcal_check
    check (status <> 'confirmed' or confirmed_total_kcal is not null),
  constraint food_diary_entries_analyzed_at_after_processing_check
    check (
      analyzed_at is null
      or processing_started_at is null
      or analyzed_at >= processing_started_at
    ),
  constraint food_diary_entries_confirmed_at_after_analyzed_check
    check (
      confirmed_at is null
      or analyzed_at is null
      or confirmed_at >= analyzed_at
    )
);

-- Diary day / history queries (also serves the initial 7-day history).
create index idx_food_diary_entries_student_logged
  on public.food_diary_entries (student_user_id, logged_at desc);

-- Lifecycle lookups (resume a draft, find in-flight analysis).
create index idx_food_diary_entries_student_status
  on public.food_diary_entries (student_user_id, status);

-- Supports the configurable daily quota of COMPLETED analyses without hardcoding
-- the limit itself: the BFF counts rows in a date window using this index.
create index idx_food_diary_entries_student_analyzed
  on public.food_diary_entries (student_user_id, analyzed_at desc)
  where status in ('completed', 'confirmed');

-- Only confirmed meals feed the diary totals/history.
create index idx_food_diary_entries_student_confirmed
  on public.food_diary_entries (student_user_id, confirmed_at desc)
  where status = 'confirmed';

-- Idempotency: one entry per (student, key). Partial so multiple NULLs are allowed.
create unique index uq_food_diary_entries_student_idempotency_key
  on public.food_diary_entries (student_user_id, idempotency_key)
  where idempotency_key is not null;

-- A storage object belongs to exactly one entry.
create unique index uq_food_diary_entries_photo_storage_path
  on public.food_diary_entries (photo_storage_path)
  where photo_storage_path is not null;

-- Cleanup candidates: analyzed but never confirmed.
create index idx_food_diary_entries_abandoned_cleanup
  on public.food_diary_entries (analyzed_at)
  where status in ('completed', 'abandoned') and photo_storage_path is not null;

-- ─── 2. food_diary_items ─────────────────────────────────────────────────────

create table public.food_diary_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.food_diary_entries(id) on delete cascade,

  -- Display order inside the meal (stable across edits).
  position integer not null default 0,

  name text not null,
  preparation text,
  category text,

  -- AI original estimate — frozen, never overwritten by the review. Keeping it
  -- separate from grams_confirmed is what makes "estimated vs confirmed" auditable.
  grams_estimated numeric not null,
  -- Value after human review. NULL = student accepted the AI estimate as-is.
  grams_confirmed numeric,

  household_measure text,
  confidence numeric,
  is_partially_hidden boolean not null default false,

  -- Provenance of the item itself.
  is_user_added boolean not null default false,
  is_removed boolean not null default false,

  -- Where the nutrition numbers came from. P1 ships 'ai_estimated' and 'manual';
  -- 'taco' / 'usda' are already valid so the P2 lookup needs no migration.
  nutrition_source text not null default 'ai_estimated',
  -- Identifier of the matched food in the external base (P2). NULL until matched.
  nutrition_reference_id text,

  -- Per-100 g values actually used for this item's math. Storing them (instead of
  -- only the final totals) lets the review recompute kcal/macros locally when the
  -- student edits grams — no extra AI call, and the snapshot survives base updates.
  kcal_per_100g numeric not null,
  protein_per_100g numeric not null,
  carb_per_100g numeric not null,
  fat_per_100g numeric not null,
  fiber_per_100g numeric,

  -- Verbatim AI payload for this item (confidence reasons, raw name, etc.).
  ai_item_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint food_diary_items_name_not_blank_check
    check (btrim(name) <> ''),
  constraint food_diary_items_position_check
    check (position >= 0),
  constraint food_diary_items_grams_estimated_check
    check (grams_estimated >= 0),
  constraint food_diary_items_grams_confirmed_check
    check (grams_confirmed is null or grams_confirmed >= 0),
  constraint food_diary_items_confidence_range_check
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint food_diary_items_nutrition_source_check
    check (nutrition_source in ('ai_estimated', 'manual', 'taco', 'usda')),
  constraint food_diary_items_per_100g_non_negative_check
    check (
      kcal_per_100g >= 0
      and protein_per_100g >= 0
      and carb_per_100g >= 0
      and fat_per_100g >= 0
      and coalesce(fiber_per_100g, 0) >= 0
    ),
  constraint food_diary_items_ai_item_payload_object_check
    check (jsonb_typeof(ai_item_payload) = 'object'),
  -- An externally matched item must say which record it matched.
  constraint food_diary_items_reference_requires_external_source_check
    check (nutrition_reference_id is null or nutrition_source in ('taco', 'usda'))
);

create index idx_food_diary_items_entry_id
  on public.food_diary_items (entry_id, position);

-- Future quality metrics: how often each nutrition source is used.
create index idx_food_diary_items_nutrition_source
  on public.food_diary_items (nutrition_source);

-- ─── 3. daily_calorie_targets ────────────────────────────────────────────────

create table public.daily_calorie_targets (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,

  -- Time series: a new row supersedes the previous one from this date onward.
  -- Past days keep resolving to the target that was in force back then, so the
  -- history never gets rewritten when the student changes the goal.
  effective_from date not null default current_date,

  target_kcal numeric not null,

  -- Macro split as percentages of target_kcal. Defaults match the product decision
  -- (25 / 45 / 30) so a student never has to fill a second form.
  protein_percent numeric not null default 25,
  carb_percent numeric not null default 45,
  fat_percent numeric not null default 30,

  -- 'manual' (student typed it) | 'suggested' (app default) |
  -- 'estimated_from_scan' (derived from scan bmr, P2) | 'trainer' (P2)
  source text not null default 'manual',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint daily_calorie_targets_target_kcal_positive_check
    check (target_kcal > 0),
  constraint daily_calorie_targets_percent_range_check
    check (
      protein_percent >= 0 and protein_percent <= 100
      and carb_percent >= 0 and carb_percent <= 100
      and fat_percent >= 0 and fat_percent <= 100
    ),
  constraint daily_calorie_targets_percent_sum_check
    check (protein_percent + carb_percent + fat_percent = 100),
  constraint daily_calorie_targets_source_check
    check (source in ('manual', 'suggested', 'estimated_from_scan', 'trainer'))
);

-- One target per student per effective date.
create unique index uq_daily_calorie_targets_student_effective_from
  on public.daily_calorie_targets (student_user_id, effective_from);

-- "Which target was in force on day X" — the main read.
create index idx_daily_calorie_targets_student_effective
  on public.daily_calorie_targets (student_user_id, effective_from desc);

-- ─── 4. activity_energy_entries ──────────────────────────────────────────────

create table public.activity_energy_entries (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,

  -- P1 writes only 'manual'. 'workout_session' is accepted by the schema so the P2
  -- integration needs no migration — but nothing populates it automatically here.
  source text not null default 'manual',
  workout_session_id uuid references public.workout_sessions(id) on delete set null,

  label text,
  kcal_burned numeric not null,
  logged_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_energy_entries_source_check
    check (source in ('manual', 'workout_session')),
  constraint activity_energy_entries_kcal_positive_check
    check (kcal_burned > 0),
  -- Keeps source and link honest in both directions.
  constraint activity_energy_entries_source_link_consistency_check
    check (
      (source = 'workout_session' and workout_session_id is not null)
      or (source = 'manual' and workout_session_id is null)
    )
);

create index idx_activity_energy_entries_student_logged
  on public.activity_energy_entries (student_user_id, logged_at desc);

-- Prevents the same workout session from being counted twice as energy expenditure
-- once the P2 integration starts writing these rows.
create unique index uq_activity_energy_entries_workout_session
  on public.activity_energy_entries (workout_session_id)
  where workout_session_id is not null;

-- ─── 5. updated_at triggers (reuse existing function, no new function) ───────

create trigger set_food_diary_entries_updated_at
before update on public.food_diary_entries
for each row
execute function public.set_updated_at();

create trigger set_food_diary_items_updated_at
before update on public.food_diary_items
for each row
execute function public.set_updated_at();

create trigger set_daily_calorie_targets_updated_at
before update on public.daily_calorie_targets
for each row
execute function public.set_updated_at();

create trigger set_activity_energy_entries_updated_at
before update on public.activity_energy_entries
for each row
execute function public.set_updated_at();

-- ─── 6. RLS: enable with NO policies (deny-by-default) ───────────────────────
-- Same posture as scan_analyses / scan_photos / notifications: the BFF reaches
-- these tables only through the service-role client, which bypasses RLS. With RLS
-- on and zero policies, anon/authenticated keys can read nothing — which also means
-- no student can reach another student's rows, no trainer gets read access, and no
-- admin gets a special client-side path. Adding a select-own policy later is purely
-- additive if the product ever wants direct client reads.
alter table public.food_diary_entries enable row level security;
alter table public.food_diary_items enable row level security;
alter table public.daily_calorie_targets enable row level security;
alter table public.activity_energy_entries enable row level security;

-- ─── 7. Private bucket for meal photos (PII) ─────────────────────────────────
-- NO storage policies → service-role only. Reads happen through short-lived signed
-- URLs generated by the BFF at request time; no signed URL is persisted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-diary-photos',
  'food-diary-photos',
  false,
  15728640,                                  -- 15 MB per object, same as scan-photos
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
