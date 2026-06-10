create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  primary_muscle text,
  equipment text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_slug_not_blank_check
    check (btrim(slug) <> ''),
  constraint exercises_slug_lowercase_check
    check (slug = lower(slug)),
  constraint exercises_name_not_blank_check
    check (btrim(name) <> '')
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_templates_title_not_blank_check
    check (btrim(title) <> ''),
  constraint workout_templates_status_check
    check (status in ('draft', 'active', 'archived'))
);

create index idx_workout_templates_trainer_user_id
  on public.workout_templates (trainer_user_id);

create index idx_workout_templates_status
  on public.workout_templates (status);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  sort_order integer not null,
  sets_count integer not null,
  reps_text text not null,
  rest_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_template_exercises_sort_order_check
    check (sort_order > 0),
  constraint workout_template_exercises_sets_count_check
    check (sets_count > 0),
  constraint workout_template_exercises_reps_text_not_blank_check
    check (btrim(reps_text) <> ''),
  constraint workout_template_exercises_rest_seconds_check
    check (rest_seconds is null or rest_seconds >= 0),
  constraint uq_workout_template_exercises_template_sort_order
    unique (workout_template_id, sort_order)
);

create index idx_workout_template_exercises_workout_template_id
  on public.workout_template_exercises (workout_template_id);

create index idx_workout_template_exercises_exercise_id
  on public.workout_template_exercises (exercise_id);

create table public.student_workouts (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'pending',
  assigned_at timestamptz not null default now(),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workouts_title_not_blank_check
    check (btrim(title) <> ''),
  constraint student_workouts_status_check
    check (status in ('pending', 'active', 'cancelled')),
  constraint student_workouts_active_requires_activated_at_check
    check (status <> 'active' or activated_at is not null)
);

create index idx_student_workouts_trainer_user_id
  on public.student_workouts (trainer_user_id);

create index idx_student_workouts_student_user_id
  on public.student_workouts (student_user_id);

create index idx_student_workouts_status
  on public.student_workouts (status);

create index idx_student_workouts_workout_template_id
  on public.student_workouts (workout_template_id);

create table public.student_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  student_workout_id uuid not null references public.student_workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  sort_order integer not null,
  sets_count integer not null,
  reps_text text not null,
  rest_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workout_exercises_name_not_blank_check
    check (btrim(exercise_name) <> ''),
  constraint student_workout_exercises_sort_order_check
    check (sort_order > 0),
  constraint student_workout_exercises_sets_count_check
    check (sets_count > 0),
  constraint student_workout_exercises_reps_text_not_blank_check
    check (btrim(reps_text) <> ''),
  constraint student_workout_exercises_rest_seconds_check
    check (rest_seconds is null or rest_seconds >= 0),
  constraint uq_student_workout_exercises_workout_sort_order
    unique (student_workout_id, sort_order)
);

create index idx_student_workout_exercises_student_workout_id
  on public.student_workout_exercises (student_workout_id);

create trigger set_exercises_updated_at
before update on public.exercises
for each row
execute function public.set_updated_at();

create trigger set_workout_templates_updated_at
before update on public.workout_templates
for each row
execute function public.set_updated_at();

create trigger set_workout_template_exercises_updated_at
before update on public.workout_template_exercises
for each row
execute function public.set_updated_at();

create trigger set_student_workouts_updated_at
before update on public.student_workouts
for each row
execute function public.set_updated_at();

create trigger set_student_workout_exercises_updated_at
before update on public.student_workout_exercises
for each row
execute function public.set_updated_at();

alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.student_workouts enable row level security;
alter table public.student_workout_exercises enable row level security;

create policy exercises_select_authenticated
  on public.exercises
  for select
  to authenticated
  using (true);

create policy workout_templates_select_own
  on public.workout_templates
  for select
  to authenticated
  using (auth.uid() = trainer_user_id);

create policy workout_template_exercises_select_owning_trainer
  on public.workout_template_exercises
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_templates workout_template
      where workout_template.id = workout_template_id
        and workout_template.trainer_user_id = auth.uid()
    )
  );

create policy student_workouts_select_participants
  on public.student_workouts
  for select
  to authenticated
  using (
    auth.uid() = trainer_user_id
    or auth.uid() = student_user_id
  );

create policy student_workout_exercises_select_participants
  on public.student_workout_exercises
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.student_workouts student_workout
      where student_workout.id = student_workout_id
        and (
          student_workout.trainer_user_id = auth.uid()
          or student_workout.student_user_id = auth.uid()
        )
    )
  );

insert into public.exercises (
  slug,
  name,
  description,
  primary_muscle,
  equipment
) values
  (
    'agachamento-livre',
    'Agachamento Livre',
    'Movimento base para pernas e gluteos com barra livre.',
    'quadriceps',
    'barra'
  ),
  (
    'supino-reto',
    'Supino Reto',
    'Exercicio base de empurrar para peitoral com barra.',
    'peitoral',
    'barra'
  ),
  (
    'remada-curvada',
    'Remada Curvada',
    'Remada com barra para costas e estabilidade de tronco.',
    'costas',
    'barra'
  ),
  (
    'desenvolvimento-halteres',
    'Desenvolvimento com Halteres',
    'Empurrar acima da cabeca com foco em ombros.',
    'ombros',
    'halteres'
  ),
  (
    'prancha',
    'Prancha',
    'Isometria simples para core e estabilidade.',
    'core',
    'peso corporal'
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  primary_muscle = excluded.primary_muscle,
  equipment = excluded.equipment,
  is_active = true;