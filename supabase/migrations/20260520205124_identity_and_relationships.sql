create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date,
  sex text,
  weight_kg numeric,
  height_cm numeric,
  training_goal text,
  training_level text,
  training_profile text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trainer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text,
  bio text,
  invite_slug text unique,
  is_internal_move_trainer boolean not null default false,
  activated_at timestamptz,
  billing_anchor_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_trainer_relationships (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  trainer_user_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  status text not null default 'pending',
  source text not null default 'invite_link',
  visibility_settings jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  billing_eligible_from timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_trainer_relationships_status_check
    check (status in ('pending', 'active', 'rejected', 'ended')),
  constraint student_trainer_relationships_no_self_relationship_check
    check (student_user_id <> trainer_user_id),
  constraint student_trainer_relationships_source_check
    check (source in ('invite_link', 'manual', 'move_internal')),
  constraint student_trainer_relationships_visibility_settings_object_check
    check (jsonb_typeof(visibility_settings) = 'object')
);

create index idx_student_trainer_relationships_student_user_id
  on public.student_trainer_relationships (student_user_id);

create index idx_student_trainer_relationships_trainer_user_id
  on public.student_trainer_relationships (trainer_user_id);

create index idx_student_trainer_relationships_status
  on public.student_trainer_relationships (status);

create unique index uq_student_trainer_relationships_active_or_pending_pair
  on public.student_trainer_relationships (student_user_id, trainer_user_id)
  where status in ('pending', 'active');

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

create trigger set_trainer_profiles_updated_at
before update on public.trainer_profiles
for each row
execute function public.set_updated_at();

create trigger set_student_trainer_relationships_updated_at
before update on public.student_trainer_relationships
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.trainer_profiles enable row level security;
alter table public.student_trainer_relationships enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy student_profiles_select_own
  on public.student_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy trainer_profiles_select_own
  on public.trainer_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy student_trainer_relationships_select_participants
  on public.student_trainer_relationships
  for select
  to authenticated
  using (
    auth.uid() = student_user_id
    or auth.uid() = trainer_user_id
  );
