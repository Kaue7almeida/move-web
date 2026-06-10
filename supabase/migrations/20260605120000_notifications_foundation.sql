-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications foundation: public.notifications.
--
-- Additive migration: no existing table/column is altered. Establishes a simple,
-- reusable in-app notification store that any BFF module can write to.
--
-- Access note: RLS is enabled with NO policies → deny-by-default for
-- anon/authenticated keys. All access goes through the BFF service-role client.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.notifications (
  id                uuid primary key default gen_random_uuid(),

  -- Who receives it (always set) and who triggered it (optional).
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id     uuid references public.profiles(id) on delete set null,

  -- Controlled MVP type set.
  type              text not null,

  title             text not null,
  body              text,

  -- Deep-link target (path is relative; type + entity id stay serializable for
  -- web and a future mobile client).
  target_path       text,
  target_type       text,
  target_entity_id  uuid,

  metadata          jsonb not null default '{}'::jsonb,

  -- null = unread.
  read_at           timestamptz,

  created_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  constraint notifications_type_check
    check (type in ('chat_message_received', 'workout_assigned')),

  constraint notifications_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),

  -- When present, the target path must be relative (starts with '/').
  constraint notifications_target_path_relative_check
    check (target_path is null or target_path like '/%')
);

-- Recent notifications for a user (the main list query).
create index idx_notifications_recipient_created
  on public.notifications (recipient_user_id, created_at desc)
  where deleted_at is null;

-- Unread lookups / counts.
create index idx_notifications_recipient_unread
  on public.notifications (recipient_user_id, read_at)
  where deleted_at is null;

create index idx_notifications_type
  on public.notifications (type);

create index idx_notifications_target_entity
  on public.notifications (target_entity_id);

alter table public.notifications enable row level security;
