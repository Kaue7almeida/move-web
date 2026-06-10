-- Gallery foundation — additive only.
-- Marks workout templates as published to the trainer's gallery, and records the
-- origin of each student workout (assigned | customized | gallery).
-- No new tables. Defaults keep existing rows and current inserts valid.

alter table public.workout_templates
  add column if not exists is_in_gallery   boolean not null default false,
  add column if not exists gallery_category text;

alter table public.student_workouts
  add column if not exists source text not null default 'assigned';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_workouts_source_check') then
    alter table public.student_workouts
      add constraint student_workouts_source_check
      check (source in ('assigned', 'customized', 'gallery'));
  end if;
end $$;
