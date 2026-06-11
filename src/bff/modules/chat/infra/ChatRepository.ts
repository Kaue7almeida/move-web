import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database, Json } from "@/bff/core/supabase/database.types";
import type {
  ChatAssistantType,
  ChatConversation,
  ChatConversationType,
  ChatMessage,
  ChatMessageRole,
  TrainerAiMode,
  TrainerAiSettings,
} from "@/bff/modules/chat/types";
import type {
  CreateMoveAiConversationInput,
  CreateTrainerChatConversationInput,
  IChatRepository,
  InsertAssistantMessageInput,
  InsertUserMessageInput,
  SetConversationAiStateInput,
  UpsertTrainerAiSettingsInput,
} from "@/bff/modules/chat/types/IChatRepository";

/* ─── Row types (aliases for readability) ────────────────────────────────────── */

type ConversationRow =
  Database["public"]["Tables"]["chat_conversations"]["Row"];
type MessageRow =
  Database["public"]["Tables"]["chat_messages"]["Row"];
type TrainerAiSettingsRow =
  Database["public"]["Tables"]["trainer_ai_settings"]["Row"];

/* ─── Sentinel errors ────────────────────────────────────────────────────────── */

const CONVERSATION_CREATE_FAILED = new ApiError(
  500,
  "chat_conversation_create_failed",
  "Não foi possível criar a conversa.",
);

const CONVERSATION_QUERY_FAILED = new ApiError(
  500,
  "chat_conversation_query_failed",
  "Não foi possível carregar a conversa.",
);

const CONVERSATION_UPDATE_FAILED = new ApiError(
  500,
  "chat_conversation_update_failed",
  "Não foi possível atualizar a conversa.",
);

const MESSAGE_CREATE_FAILED = new ApiError(
  500,
  "chat_message_create_failed",
  "Não foi possível salvar a mensagem.",
);

const MESSAGE_QUERY_FAILED = new ApiError(
  500,
  "chat_message_query_failed",
  "Não foi possível carregar as mensagens.",
);

const AI_SETTINGS_QUERY_FAILED = new ApiError(
  500,
  "chat_ai_settings_query_failed",
  "Não foi possível carregar as configurações de IA.",
);

const AI_SETTINGS_UPDATE_FAILED = new ApiError(
  500,
  "chat_ai_settings_update_failed",
  "Nao foi possivel salvar as configuracoes de IA.",
);

const RELATIONSHIP_CHECK_FAILED = new ApiError(
  500,
  "chat_relationship_check_failed",
  "Não foi possível verificar o vínculo aluno-personal.",
);

const PROFILE_NAMES_QUERY_FAILED = new ApiError(
  500,
  "chat_profile_names_query_failed",
  "Não foi possível carregar os participantes da conversa.",
);

/* ─── Limits ─────────────────────────────────────────────────────────────────── */

const DEFAULT_MESSAGES_LIMIT = 50;
const MAX_MESSAGES_LIMIT = 100;
const DEFAULT_PROMPT_WINDOW = 20;
const MAX_PROMPT_WINDOW = 50;

/* ─── Mappers (Row → domain) ─────────────────────────────────────────────────── */

// Casts are intentional: DB CHECK constraints guarantee the string values are
// valid members of each union type. Using `as` here is not `any`.

function mapConversationRow(row: ConversationRow): ChatConversation {
  return {
    id: row.id,
    title: row.title,
    conversationType: row.conversation_type as ChatConversationType,
    ownerUserId: row.owner_user_id,
    studentUserId: row.student_user_id,
    trainerUserId: row.trainer_user_id,
    aiEnabled: row.ai_enabled,
    waitingForTrainer: row.waiting_for_trainer,
    trainerAiMode: row.trainer_ai_mode as TrainerAiMode,
    contextModule: row.context_module,
    contextLabel: row.context_label,
    metadata: row.metadata,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as ChatMessageRole,
    senderUserId: row.sender_user_id,
    assistantType: row.assistant_type as ChatAssistantType | null,
    isAiGenerated: row.is_ai_generated,
    content: row.content,
    metadata: row.metadata,
    readByStudentAt: row.read_by_student_at,
    readByTrainerAt: row.read_by_trainer_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapTrainerAiSettingsRow(row: TrainerAiSettingsRow): TrainerAiSettings {
  return {
    id: row.id,
    trainerUserId: row.trainer_user_id,
    enabled: row.enabled,
    mode: row.mode as TrainerAiMode,
    tone: row.tone,
    instructions: row.instructions,
    preferredExercises: row.preferred_exercises,
    restrictions: row.restrictions,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ─── Ownership OR filter (PostgREST inline syntax) ──────────────────────────── */

function ownershipFilter(userId: string): string {
  return [
    `owner_user_id.eq.${userId}`,
    `student_user_id.eq.${userId}`,
    `trainer_user_id.eq.${userId}`,
  ].join(",");
}

/* ─── Repository ─────────────────────────────────────────────────────────────── */

export class ChatRepository implements IChatRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /* ── chat_conversations: create ── */

  async createMoveAiConversation(
    input: CreateMoveAiConversationInput,
  ): Promise<ChatConversation> {
    const payload: Database["public"]["Tables"]["chat_conversations"]["Insert"] = {
      conversation_type: "move_ai_private",
      owner_user_id: input.ownerUserId,
      title: input.title ?? "Nova conversa",
      context_module: input.contextModule ?? null,
      context_label: input.contextLabel ?? null,
      metadata: input.metadata ?? {},
      ai_enabled: true,
      waiting_for_trainer: false,
      trainer_ai_mode: "off",
    };

    const { data, error } = await this.supabase
      .from("chat_conversations")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw CONVERSATION_CREATE_FAILED;
    }

    return mapConversationRow(data);
  }

  async createTrainerChatConversation(
    input: CreateTrainerChatConversationInput,
  ): Promise<ChatConversation> {
    const payload: Database["public"]["Tables"]["chat_conversations"]["Insert"] = {
      conversation_type: "trainer_chat",
      student_user_id: input.studentUserId,
      trainer_user_id: input.trainerUserId,
      title: input.title ?? "Nova conversa",
      context_module: input.contextModule ?? null,
      context_label: input.contextLabel ?? null,
      metadata: input.metadata ?? {},
      ai_enabled: true,
      waiting_for_trainer: false,
      trainer_ai_mode: "off",
    };

    const { data, error } = await this.supabase
      .from("chat_conversations")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw CONVERSATION_CREATE_FAILED;
    }

    return mapConversationRow(data);
  }

  /* ── chat_conversations: query ── */

  async listConversationsForUser(userId: string): Promise<ChatConversation[]> {
    const { data, error } = await this.supabase
      .from("chat_conversations")
      .select("*")
      .is("deleted_at", null)
      .or(ownershipFilter(userId))
      .order("updated_at", { ascending: false });

    if (error) {
      throw CONVERSATION_QUERY_FAILED;
    }

    return (data ?? []).map(mapConversationRow);
  }

  async findConversationByIdForUser(
    conversationId: string,
    userId: string,
  ): Promise<ChatConversation | null> {
    const { data, error } = await this.supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", conversationId)
      .is("deleted_at", null)
      .or(ownershipFilter(userId))
      .maybeSingle();

    if (error) {
      throw CONVERSATION_QUERY_FAILED;
    }

    return data ? mapConversationRow(data) : null;
  }

  /* ── chat_conversations: update ── */

  async touchConversation(conversationId: string): Promise<void> {
    // Setting last_message_at triggers the set_updated_at trigger automatically.
    const { error } = await this.supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (error) {
      throw CONVERSATION_UPDATE_FAILED;
    }
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const { error } = await this.supabase
      .from("chat_conversations")
      .update({ title })
      .eq("id", conversationId);

    if (error) {
      throw CONVERSATION_UPDATE_FAILED;
    }
  }

  async updateConversationMetadata(conversationId: string, metadata: Json): Promise<void> {
    const { error } = await this.supabase
      .from("chat_conversations")
      .update({ metadata })
      .eq("id", conversationId);

    if (error) {
      throw CONVERSATION_UPDATE_FAILED;
    }
  }

  async softDeleteConversation(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("chat_conversations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (error) {
      throw CONVERSATION_UPDATE_FAILED;
    }
  }

  async setConversationAiState(
    conversationId: string,
    input: SetConversationAiStateInput,
  ): Promise<ChatConversation> {
    const patch: Database["public"]["Tables"]["chat_conversations"]["Update"] = {};

    if (input.aiEnabled !== undefined) {
      patch.ai_enabled = input.aiEnabled;
    }

    if (input.waitingForTrainer !== undefined) {
      patch.waiting_for_trainer = input.waitingForTrainer;
    }

    const { data, error } = await this.supabase
      .from("chat_conversations")
      .update(patch)
      .eq("id", conversationId)
      .select("*")
      .single();

    if (error || !data) {
      throw CONVERSATION_UPDATE_FAILED;
    }

    return mapConversationRow(data);
  }

  /* ── chat_messages: insert ── */

  async insertUserMessage(input: InsertUserMessageInput): Promise<ChatMessage> {
    const payload: Database["public"]["Tables"]["chat_messages"]["Insert"] = {
      conversation_id: input.conversationId,
      role: "user",
      sender_user_id: input.senderUserId,
      assistant_type: null,
      is_ai_generated: false,
      content: input.content,
      metadata: input.metadata ?? {},
    };

    const { data, error } = await this.supabase
      .from("chat_messages")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw MESSAGE_CREATE_FAILED;
    }

    return mapMessageRow(data);
  }

  async insertAssistantMessage(input: InsertAssistantMessageInput): Promise<ChatMessage> {
    const payload: Database["public"]["Tables"]["chat_messages"]["Insert"] = {
      conversation_id: input.conversationId,
      role: "assistant",
      sender_user_id: null,
      assistant_type: input.assistantType,
      is_ai_generated: true,
      content: input.content,
      metadata: input.metadata ?? {},
    };

    const { data, error } = await this.supabase
      .from("chat_messages")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw MESSAGE_CREATE_FAILED;
    }

    return mapMessageRow(data);
  }

  /* ── chat_messages: query ── */

  async listMessages(
    conversationId: string,
    limit: number = DEFAULT_MESSAGES_LIMIT,
  ): Promise<ChatMessage[]> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_MESSAGES_LIMIT);

    const { data, error } = await this.supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(safeLimit);

    if (error) {
      throw MESSAGE_QUERY_FAILED;
    }

    return (data ?? []).map(mapMessageRow);
  }

  async countMessagesForConversation(conversationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .is("deleted_at", null);

    if (error) {
      throw MESSAGE_QUERY_FAILED;
    }

    return count ?? 0;
  }

  async listRecentMessagesForPrompt(
    conversationId: string,
    limit: number = DEFAULT_PROMPT_WINDOW,
  ): Promise<ChatMessage[]> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_PROMPT_WINDOW);

    // Fetch the most recent N messages (DESC) then reverse to ASC for the prompt.
    const { data, error } = await this.supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw MESSAGE_QUERY_FAILED;
    }

    return (data ?? []).map(mapMessageRow).reverse();
  }

  /* ── profiles ── */

  async getProfileNames(userIds: string[]): Promise<Record<string, string>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];

    if (uniqueIds.length === 0) {
      return {};
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uniqueIds);

    if (error) {
      throw PROFILE_NAMES_QUERY_FAILED;
    }

    const names: Record<string, string> = {};

    for (const row of data ?? []) {
      const fullName = row.full_name?.trim();
      if (fullName) {
        names[row.id] = fullName;
      }
    }

    return names;
  }

  /* ── trainer_ai_settings ── */

  async hasTrainerProfile(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("trainer_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw AI_SETTINGS_QUERY_FAILED;
    }

    return Boolean(data);
  }

  async getTrainerAiSettings(trainerUserId: string): Promise<TrainerAiSettings | null> {
    const { data, error } = await this.supabase
      .from("trainer_ai_settings")
      .select("*")
      .eq("trainer_user_id", trainerUserId)
      .maybeSingle();

    if (error) {
      throw AI_SETTINGS_QUERY_FAILED;
    }

    return data ? mapTrainerAiSettingsRow(data) : null;
  }

  /* ── student_trainer_relationships ── */

  async upsertTrainerAiSettings(
    input: UpsertTrainerAiSettingsInput,
  ): Promise<TrainerAiSettings> {
    const payload: Database["public"]["Tables"]["trainer_ai_settings"]["Insert"] = {
      trainer_user_id: input.trainerUserId,
      enabled: input.enabled,
      mode: input.mode,
      tone: input.tone,
      instructions: input.instructions,
      preferred_exercises: input.preferredExercises,
      restrictions: input.restrictions,
      metadata: input.metadata ?? {},
    };

    const { data, error } = await this.supabase
      .from("trainer_ai_settings")
      .upsert(payload, { onConflict: "trainer_user_id" })
      .select("*")
      .single();

    if (error || !data) {
      throw AI_SETTINGS_UPDATE_FAILED;
    }

    return mapTrainerAiSettingsRow(data);
  }

  async findActiveRelationship(
    studentUserId: string,
    trainerUserId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("id")
      .eq("student_user_id", studentUserId)
      .eq("trainer_user_id", trainerUserId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw RELATIONSHIP_CHECK_FAILED;
    }

    return Boolean(data);
  }
}
