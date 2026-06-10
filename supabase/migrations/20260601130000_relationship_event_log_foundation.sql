-- Append-only event log for the student <-> trainer relationship lifecycle.
--
-- Foundation only: this migration creates the table, constraints and indexes.
-- No flow is instrumented and no event is emitted yet.
--
-- Rationale: student_trainer_relationships stores only the *current* mutable state,
-- which is insufficient for future analytics and billing ("active in the last X days").
-- This table is the durable, time-ordered source of truth for those questions.

create table public.student_trainer_relationship_events (
  id uuid primary key default gen_random_uuid(),
  -- Nullable + ON DELETE SET NULL so an event survives the deletion of its relationship.
  relationship_id uuid references public.student_trainer_relationships(id) on delete set null,
  -- User ids are stored as durable snapshots (no FK) so audit history outlives any
  -- profile deletion. trainer_user_id is NOT NULL, so ON DELETE SET NULL is impossible,
  -- and CASCADE would erase audit history; hence no user/profile FK in this foundation.
  trainer_user_id uuid not null,
  student_user_id uuid,
  event_type text not null,
  actor_user_id uuid,
  actor_role text not null,
  source text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint student_trainer_relationship_events_event_type_check
    check (event_type in (
      'invite_slug_generated',
      'invite_link_opened',
      'relationship_activated',
      'relationship_removed_by_trainer',
      'relationship_left_by_student',
      'relationship_reactivated'
    )),
  constraint student_trainer_relationship_events_actor_role_check
    check (actor_role in ('trainer', 'student', 'system', 'anonymous')),
  constraint student_trainer_relationship_events_source_check
    check (source in ('web', 'mobile', 'invite_link', 'system')),
  constraint student_trainer_relationship_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

-- Dedupe guard for retries / double-submit: one row per non-null idempotency_key.
create unique index uq_student_trainer_relationship_events_idempotency_key
  on public.student_trainer_relationship_events (idempotency_key)
  where idempotency_key is not null;

create index idx_student_trainer_relationship_events_trainer_occurred
  on public.student_trainer_relationship_events (trainer_user_id, occurred_at desc);

create index idx_student_trainer_relationship_events_student_occurred
  on public.student_trainer_relationship_events (student_user_id, occurred_at desc);

create index idx_student_trainer_relationship_events_type_occurred
  on public.student_trainer_relationship_events (event_type, occurred_at desc);

-- Deny-by-default: enable RLS with no policies. The BFF writes through the service-role
-- admin client (which bypasses RLS); no authenticated/anon read or write path exists yet.
-- Append-only by design: no UPDATE/DELETE paths, no updated_at column, no trigger.
alter table public.student_trainer_relationship_events enable row level security;
