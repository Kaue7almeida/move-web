-- ─────────────────────────────────────────────────────────────────────────────
-- Chat foundation: chat_conversations + chat_messages + trainer_ai_settings.
--
-- This migration is additive: no existing table/column is altered.
-- It establishes the persistence layer for the Chat module.
--
-- Three conversation models:
--   move_ai_private  — private thread between one user and the Move AI.
--   trainer_chat     — shared thread between a student and their trainer.
--
-- Access note: RLS is enabled with NO policies → deny-by-default for
-- anon/authenticated keys. All access goes through the BFF service-role client.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── chat_conversations ───────────────────────────────────────────────────────

create table public.chat_conversations (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null default 'Nova conversa',
  conversation_type   text not null,

  -- Participants (mutually exclusive depending on type — see constraints below)
  owner_user_id       uuid references public.profiles(id) on delete cascade,
  student_user_id     uuid references public.student_profiles(user_id) on delete cascade,
  trainer_user_id     uuid references public.trainer_profiles(user_id) on delete cascade,

  -- AI state (relevant for trainer_chat; ignored for move_ai_private)
  ai_enabled          boolean not null default true,
  waiting_for_trainer boolean not null default false,
  trainer_ai_mode     text not null default 'off',

  -- Origin context (optional metadata about what page triggered the conversation)
  context_module      text,
  context_label       text,

  -- Extensible metadata (starter_id, scan_analysis_id, feature flags, etc.)
  metadata            jsonb not null default '{}'::jsonb,

  last_message_at     timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,

  constraint chat_conversations_type_check
    check (conversation_type in ('move_ai_private', 'trainer_chat')),

  constraint chat_conversations_ai_mode_check
    check (trainer_ai_mode in ('off', 'suggest', 'auto_reply')),

  constraint chat_conversations_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),

  -- move_ai_private requires owner_user_id
  constraint chat_conversations_move_ai_private_owner_required
    check (
      conversation_type <> 'move_ai_private'
      or owner_user_id is not null
    ),

  -- trainer_chat requires both student and trainer
  constraint chat_conversations_trainer_chat_participants_required
    check (
      conversation_type <> 'trainer_chat'
      or (student_user_id is not null and trainer_user_id is not null)
    )
);

create index idx_chat_conversations_owner_updated
  on public.chat_conversations (owner_user_id, updated_at desc);

create index idx_chat_conversations_student_updated
  on public.chat_conversations (student_user_id, updated_at desc);

create index idx_chat_conversations_trainer_updated
  on public.chat_conversations (trainer_user_id, updated_at desc);

create index idx_chat_conversations_type_updated
  on public.chat_conversations (conversation_type, updated_at desc);

create index idx_chat_conversations_last_message
  on public.chat_conversations (last_message_at desc);

create trigger set_chat_conversations_updated_at
before update on public.chat_conversations
for each row
execute function public.set_updated_at();

alter table public.chat_conversations enable row level security;

-- ─── chat_messages ────────────────────────────────────────────────────────────

create table public.chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.chat_conversations(id) on delete cascade,

  role                text not null,
  sender_user_id      uuid references public.profiles(id) on delete set null,
  assistant_type      text,
  is_ai_generated     boolean not null default false,

  content             text not null,
  metadata            jsonb not null default '{}'::jsonb,

  -- Per-participant read receipts (null = unread by that participant)
  read_by_student_at  timestamptz,
  read_by_trainer_at  timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,

  constraint chat_messages_role_check
    check (role in ('user', 'assistant')),

  constraint chat_messages_assistant_type_check
    check (
      assistant_type is null
      or assistant_type in ('move_ai', 'trainer_ai')
    ),

  constraint chat_messages_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),

  constraint chat_messages_content_not_blank_check
    check (char_length(trim(content)) > 0),

  -- AI-generated messages must use the 'assistant' role
  constraint chat_messages_ai_generated_requires_assistant_role
    check (
      is_ai_generated = false
      or role = 'assistant'
    ),

  -- Every assistant message must declare which AI generated it
  constraint chat_messages_assistant_requires_assistant_type
    check (
      role <> 'assistant'
      or assistant_type is not null
    ),

  -- Every user message must have a human sender
  constraint chat_messages_user_requires_sender
    check (
      role <> 'user'
      or sender_user_id is not null
    )
);

create index idx_chat_messages_conversation_created_asc
  on public.chat_messages (conversation_id, created_at asc);

create index idx_chat_messages_conversation_created_desc
  on public.chat_messages (conversation_id, created_at desc);

create index idx_chat_messages_sender_created
  on public.chat_messages (sender_user_id, created_at desc);

create index idx_chat_messages_role
  on public.chat_messages (role);

create index idx_chat_messages_is_ai_generated
  on public.chat_messages (is_ai_generated);

create trigger set_chat_messages_updated_at
before update on public.chat_messages
for each row
execute function public.set_updated_at();

alter table public.chat_messages enable row level security;

-- ─── trainer_ai_settings ──────────────────────────────────────────────────────

create table public.trainer_ai_settings (
  id                  uuid primary key default gen_random_uuid(),
  trainer_user_id     uuid not null unique references public.trainer_profiles(user_id) on delete cascade,

  enabled             boolean not null default false,
  mode                text not null default 'off',

  -- Personality configuration (free-text, sanitized by BFF before use in prompts)
  tone                text,
  instructions        text,
  preferred_exercises jsonb not null default '[]'::jsonb,
  restrictions        text,

  metadata            jsonb not null default '{}'::jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint trainer_ai_settings_mode_check
    check (mode in ('off', 'suggest', 'auto_reply')),

  constraint trainer_ai_settings_preferred_exercises_array_check
    check (jsonb_typeof(preferred_exercises) = 'array'),

  constraint trainer_ai_settings_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index idx_trainer_ai_settings_trainer_user_id
  on public.trainer_ai_settings (trainer_user_id);

create trigger set_trainer_ai_settings_updated_at
before update on public.trainer_ai_settings
for each row
execute function public.set_updated_at();

alter table public.trainer_ai_settings enable row level security;
