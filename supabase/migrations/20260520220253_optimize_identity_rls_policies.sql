drop policy if exists profiles_select_own
  on public.profiles;

drop policy if exists student_profiles_select_own
  on public.student_profiles;

drop policy if exists trainer_profiles_select_own
  on public.trainer_profiles;

drop policy if exists student_trainer_relationships_select_participants
  on public.student_trainer_relationships;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy student_profiles_select_own
  on public.student_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy trainer_profiles_select_own
  on public.trainer_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy student_trainer_relationships_select_participants
  on public.student_trainer_relationships
  for select
  to authenticated
  using (
    ((select auth.uid()) = student_user_id)
    or ((select auth.uid()) = trainer_user_id)
  );