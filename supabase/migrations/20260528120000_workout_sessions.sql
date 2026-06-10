create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  trainer_user_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  student_workout_id uuid not null references public.student_workouts(id) on delete cascade,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_status_check
    check (status in ('in_progress', 'completed')),
  constraint workout_sessions_completed_requires_completed_at_check
    check (status <> 'completed' or completed_at is not null),
  constraint workout_sessions_duration_check
    check (duration_seconds is null or duration_seconds >= 0)
);

create index idx_workout_sessions_student_user_id
  on public.workout_sessions (student_user_id);

create index idx_workout_sessions_student_workout_id
  on public.workout_sessions (student_workout_id);

create index idx_workout_sessions_status
  on public.workout_sessions (status);

create table public.workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  student_workout_exercise_id uuid references public.student_workout_exercises(id) on delete set null,
  exercise_name text not null,
  set_number integer not null,
  target_reps_text text,
  performed_reps integer not null,
  load_kg numeric not null default 0,
  notes text,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_session_sets_exercise_name_not_blank_check
    check (btrim(exercise_name) <> ''),
  constraint workout_session_sets_set_number_check
    check (set_number > 0),
  constraint workout_session_sets_performed_reps_check
    check (performed_reps >= 0),
  constraint workout_session_sets_load_kg_check
    check (load_kg >= 0)
);

create index idx_workout_session_sets_workout_session_id
  on public.workout_session_sets (workout_session_id);

create trigger set_workout_sessions_updated_at
before update on public.workout_sessions
for each row
execute function public.set_updated_at();

create trigger set_workout_session_sets_updated_at
before update on public.workout_session_sets
for each row
execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;
alter table public.workout_session_sets enable row level security;

create policy workout_sessions_select_own
  on public.workout_sessions
  for select
  to authenticated
  using (auth.uid() = student_user_id);

create policy workout_session_sets_select_own
  on public.workout_session_sets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_sessions ws
      where ws.id = workout_session_id
        and ws.student_user_id = auth.uid()
    )
  );
