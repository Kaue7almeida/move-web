-- ─────────────────────────────────────────────────────────────────────────────
-- Food Diary — role-agnostic ownership
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY
-- The Food Diary is a PERSONAL feature of the Move user and must work regardless
-- of role (student, trainer/personal, admin). The original foundation migration
-- (20260805120000_food_diary_foundation.sql — already applied in production and
-- kept immutable) tied ownership to public.student_profiles(user_id), which blocks
-- a trainer-only account from owning diary rows.
--
-- WHAT
-- Re-point the three ownership FKs from public.student_profiles(user_id) to
-- public.profiles(id) — the entity that represents the Move USER (profiles.id is
-- the auth user id: `id uuid primary key references auth.users(id)`). We keep the
-- legacy column name `student_user_id` on purpose: renaming now would widen the
-- blast radius across repository/types/tests/prod for no functional gain.
-- Semantically the column is now "owner user id". Clean-up of the name can happen
-- in a later evolution.
--
-- SAFETY (no data touched)
--  • Every existing student_user_id value already satisfies the OLD FK, i.e. it is
--    a public.student_profiles(user_id). And student_profiles.user_id is itself
--    `primary key references public.profiles(id)`. Therefore every existing
--    student_user_id is guaranteed to exist in public.profiles(id): the new FK
--    validates with ZERO orphan rows.
--  • Only the three FK constraints change. No rows are inserted/updated/deleted,
--    no columns renamed, no indexes/RLS/Storage/other constraints touched.
--  • ON DELETE CASCADE is preserved. Bonus correctness: ownership now survives a
--    role change (deleting a student_profile no longer cascades away a user's
--    diary); rows are only removed when the user (profiles/auth.users) is deleted.
--
-- CONSTRAINT NAMES
-- The original FKs were declared as unnamed inline column references
-- (`student_user_id uuid not null references public.student_profiles(user_id) ...`),
-- so PostgreSQL assigned the deterministic default name `<table>_<column>_fkey`:
--   • food_diary_entries_student_user_id_fkey
--   • daily_calorie_targets_student_user_id_fkey
--   • activity_energy_entries_student_user_id_fkey
-- The final DO block below aborts the whole transaction if ANY food-diary FK still
-- references public.student_profiles after the swap — so a wrong/renamed constraint
-- name fails loudly and rolls back instead of silently leaving a stale FK.
--
-- NOT APPLIED AUTOMATICALLY. Review, then run manually in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- 1. food_diary_entries.student_user_id → public.profiles(id)
alter table public.food_diary_entries
  drop constraint if exists food_diary_entries_student_user_id_fkey;

alter table public.food_diary_entries
  add constraint food_diary_entries_student_user_id_fkey
  foreign key (student_user_id) references public.profiles(id) on delete cascade;

-- 2. daily_calorie_targets.student_user_id → public.profiles(id)
alter table public.daily_calorie_targets
  drop constraint if exists daily_calorie_targets_student_user_id_fkey;

alter table public.daily_calorie_targets
  add constraint daily_calorie_targets_student_user_id_fkey
  foreign key (student_user_id) references public.profiles(id) on delete cascade;

-- 3. activity_energy_entries.student_user_id → public.profiles(id)
alter table public.activity_energy_entries
  drop constraint if exists activity_energy_entries_student_user_id_fkey;

alter table public.activity_energy_entries
  add constraint activity_energy_entries_student_user_id_fkey
  foreign key (student_user_id) references public.profiles(id) on delete cascade;

-- 4. Safety net: fail (and roll back) if any food-diary ownership FK still points
--    at public.student_profiles — guards against a mismatched constraint name.
do $$
begin
  if exists (
    select 1
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_class parent on parent.oid = con.confrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
    where con.contype = 'f'
      and child_ns.nspname = 'public'
      and parent_ns.nspname = 'public'
      and parent.relname = 'student_profiles'
      and child.relname in (
        'food_diary_entries',
        'daily_calorie_targets',
        'activity_energy_entries'
      )
  ) then
    raise exception
      'A food diary ownership FK still references public.student_profiles — aborting (check the original constraint names).';
  end if;
end $$;

commit;
