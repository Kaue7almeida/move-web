import type { Json } from "@/bff/core/supabase/database.types";

/* ─── Literal union types ────────────────────────────────────────────────────── */

export type ChatConversationType = "move_ai_private" | "trainer_chat";

export type TrainerAiMode = "off" | "suggest" | "auto_reply";

export type ChatMessageRole = "user" | "assistant";

export type ChatAssistantType = "move_ai" | "trainer_ai";

/* ─── Domain models (camelCase mirrors of DB rows) ───────────────────────────── */

export type ChatConversation = {
  id: string;
  title: string;
  conversationType: ChatConversationType;
  ownerUserId: string | null;
  studentUserId: string | null;
  trainerUserId: string | null;
  aiEnabled: boolean;
  waitingForTrainer: boolean;
  trainerAiMode: TrainerAiMode;
  contextModule: string | null;
  contextLabel: string | null;
  metadata: Json;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  senderUserId: string | null;
  assistantType: ChatAssistantType | null;
  isAiGenerated: boolean;
  content: string;
  metadata: Json;
  readByStudentAt: string | null;
  readByTrainerAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TrainerAiSettings = {
  id: string;
  trainerUserId: string;
  enabled: boolean;
  mode: TrainerAiMode;
  tone: string | null;
  instructions: string | null;
  preferredExercises: Json;
  restrictions: string | null;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
};

/* ─── Page context (sent by front on each message, never contains PII) ───────── */

export type ChatPageContext = {
  currentRoute: string;
  module: string;
  pageTitle?: string;
  entityId?: string;
};

/* ─── Chat starters ──────────────────────────────────────────────────────────── */

export type ChatStarterTarget = "move_ai" | "trainer_chat";

export type ChatStarter = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  target: ChatStarterTarget;
  prePrompt: string;
  contextPayload?: Record<string, unknown>;
};
