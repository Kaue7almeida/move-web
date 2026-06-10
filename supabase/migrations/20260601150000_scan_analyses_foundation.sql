-- ─────────────────────────────────────────────────────────────────────────────
-- Scan foundation: scan_analyses + scan_photos tables + private scan-photos bucket.
--
-- This migration is additive: no existing table/column is altered. It establishes
-- the persistence layer for the body-scan module (front is still mocked in this task;
-- no endpoint/service/UI consumes these tables yet).
--
-- PII note: scan_photos rows reference objects in the *private* bucket "scan-photos".
-- They are user-supplied body photos. Access must go exclusively through the BFF
-- service-role client (which bypasses RLS). RLS is enabled with NO policies →
-- deny-by-default for anon/authenticated keys.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.scan_analyses (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  status text not null default 'draft',
  consent_at timestamptz,
  source text not null default 'web',
  -- Snapshot of anthropometric inputs at analysis time (intentionally not FKs).
  weight_kg numeric not null,
  height_cm numeric not null,
  age_years int not null,
  sex text not null,
  -- First-class numeric metrics for trend/billing queries (nullable until completed).
  body_fat_percent numeric,
  lean_mass_kg numeric,
  fat_mass_kg numeric,
  bmi numeric,
  bmr int,
  whr numeric,
  -- Rich presentation payload (quality items, measurements, ranges, observations, insights).
  -- Default object literal cast explicitly so the CHECK below is happy from row 1.
  result jsonb not null default '{}'::jsonb,
  quality_overall text,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scan_analyses_status_check
    check (status in ('draft', 'processing', 'completed', 'failed', 'rejected')),
  constraint scan_analyses_source_check
    check (source in ('web', 'webview')),
  constraint scan_analyses_sex_check
    check (sex in ('masculino', 'feminino', 'desconhecido')),
  constraint scan_analyses_result_object_check
    check (jsonb_typeof(result) = 'object'),
  constraint scan_analyses_weight_positive_check
    check (weight_kg > 0),
  constraint scan_analyses_height_positive_check
    check (height_cm > 0),
  constraint scan_analyses_age_range_check
    check (age_years between 1 and 120)
);

create table public.scan_photos (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scan_analyses(id) on delete cascade,
  slot text not null,
  storage_path text not null,
  content_type text,
  quality_status text,
  -- Plain array of strings (reason codes). Default '[]' + check forces array shape.
  quality_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint scan_photos_slot_check
    check (slot in ('front', 'side')),
  constraint scan_photos_quality_status_check
    check (quality_status is null or quality_status in ('boa', 'media', 'ruim')),
  constraint scan_photos_quality_reasons_array_check
    check (jsonb_typeof(quality_reasons) = 'array'),
  constraint scan_photos_unique_scan_slot
    unique (scan_id, slot),
  constraint scan_photos_unique_storage_path
    unique (storage_path)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index idx_scan_analyses_student_created
  on public.scan_analyses (student_user_id, created_at desc);

create index idx_scan_analyses_status_created
  on public.scan_analyses (status, created_at desc);

create index idx_scan_photos_scan_id
  on public.scan_photos (scan_id);

create index idx_scan_photos_storage_path
  on public.scan_photos (storage_path);

-- ─── updated_at trigger (reuses existing function from identity migration) ───
create trigger set_scan_analyses_updated_at
before update on public.scan_analyses
for each row
execute function public.set_updated_at();

-- ─── RLS: enable with NO policies (deny-by-default) ──────────────────────────
-- BFF accesses these tables only via the service-role client, which bypasses RLS.
alter table public.scan_analyses enable row level security;
alter table public.scan_photos enable row level security;

-- ─── Private bucket for student scan photos (PII) ────────────────────────────
-- NO policies → only service-role can read/write. The public tutorial assets bucket
-- ("scan-assets") was created in a previous migration and is intentionally separate.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scan-photos',
  'scan-photos',
  false,
  15728640,                                  -- 15 MB per object (camera JPEGs)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
