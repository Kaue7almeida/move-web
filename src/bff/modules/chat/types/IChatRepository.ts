import type { Json } from "@/bff/core/supabase/database.types";
import type {
  ChatAssistantType,
  ChatConversation,
  ChatMessage,
  TrainerAiMode,
  TrainerAiSettings,
} from "@/bff/modules/chat/types";

/* ─── Input types ────────────────────────────────────────────────────────────── */

export type CreateMoveAiConversationInput = {
  ownerUserId: string;
  title?: string;
  contextModule?: string;
  contextLabel?: string;
  metadata?: Json;
};

export type CreateTrainerChatConversationInput = {
  studentUserId: string;
  trainerUserId: string;
  title?: string;
  contextModule?: string;
  contextLabel?: string;
  metadata?: Json;
};

export type InsertUserMessageInput = {
  conversationId: string;
  senderUserId: string;
  content: string;
  metadata?: Json;
};

export type InsertAssistantMessageInput = {
  conversationId: string;
  assistantType: ChatAssistantType;
  content: string;
  metadata?: Json;
};

export type SetConversationAiStateInput = {
  aiEnabled?: boolean;
  waitingForTrainer?: boolean;
};

export type UpsertTrainerAiSettingsInput = {
  trainerUserId: string;
  enabled: boolean;
  mode: TrainerAiMode;
  tone: string | null;
  instructions: string | null;
  preferredExercises: Json;
  restrictions: string | null;
  metadata?: Json;
};

/* ─── Interface ──────────────────────────────────────────────────────────────── */

export interface IChatRepository {
  // ── chat_conversations ──
  createMoveAiConversation(input: CreateMoveAiConversationInput): Promise<ChatConversation>;
  createTrainerChatConversation(
    input: CreateTrainerChatConversationInput,
  ): Promise<ChatConversation>;
  listConversationsForUser(userId: string): Promise<ChatConversation[]>;
  findConversationByIdForUser(
    conversationId: string,
    userId: string,
  ): Promise<ChatConversation | null>;
  touchConversation(conversationId: string): Promise<void>;
  updateConversationTitle(conversationId: string, title: string): Promise<void>;
  updateConversationMetadata(conversationId: string, metadata: Json): Promise<void>;
  softDeleteConversation(conversationId: string): Promise<void>;
  setConversationAiState(
    conversationId: string,
    input: SetConversationAiStateInput,
  ): Promise<ChatConversation>;

  // ── chat_messages ──
  insertUserMessage(input: InsertUserMessageInput): Promise<ChatMessage>;
  insertAssistantMessage(input: InsertAssistantMessageInput): Promise<ChatMessage>;
  listMessages(conversationId: string, limit?: number): Promise<ChatMessage[]>;
  listRecentMessagesForPrompt(conversationId: string, limit?: number): Promise<ChatMessage[]>;
  countMessagesForConversation(conversationId: string): Promise<number>;

  // ── profiles ──
  /** Maps user id → display name (profiles.full_name); ids without name are omitted. */
  getProfileNames(userIds: string[]): Promise<Record<string, string>>;

  // ── trainer_ai_settings ──
  hasTrainerProfile(userId: string): Promise<boolean>;
  getTrainerAiSettings(trainerUserId: string): Promise<TrainerAiSettings | null>;
  upsertTrainerAiSettings(input: UpsertTrainerAiSettingsInput): Promise<TrainerAiSettings>;

  // ── relationship check (student_trainer_relationships) ──
  findActiveRelationship(studentUserId: string, trainerUserId: string): Promise<boolean>;
}
