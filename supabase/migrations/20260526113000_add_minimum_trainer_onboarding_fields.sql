alter table public.trainer_profiles
  add column specialties text[] not null default '{}'::text[],
  add column student_count_range text,
  add column work_model text;

alter table public.trainer_profiles
  add constraint trainer_profiles_specialties_no_nulls_check
  check (array_position(specialties, null) is null);