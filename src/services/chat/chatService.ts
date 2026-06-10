import type {
  ChatConversation,
  ChatMessage,
  ChatPageContext,
  ChatStarterTarget,
  ChatConversationType,
  TrainerAiMode,
  TrainerAiSettings,
} from "@/bff/modules/chat/types";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ChatApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
    this.code = code;
  }
}

async function throwChatApiError(response: Response, fallback: string): Promise<never> {
  let code = "unknown_error";
  let message = fallback;

  try {
    const payload = (await response.json()) as ApiErrorPayload;

    if (payload.error?.code) {
      code = payload.error.code;
    }

    if (payload.error?.message) {
      message = payload.error.message;
    }
  } catch {
    // Keep fallback values.
  }

  throw new ChatApiError(response.status, code, message);
}

export type PublicChatStarter = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  target: ChatStarterTarget;
};

export type CreateChatConversationInput = {
  conversationType: ChatConversationType;
  title?: string;
  contextModule?: string;
  contextLabel?: string;
  trainerUserId?: string;
  studentUserId?: string;
  metadata?: Record<string, unknown>;
};

export type ChatContextTriggerRef = {
  id: string;
  entityId: string;
};

export type SendChatMessageInput = {
  conversationId: string;
  content?: string;
  starterId?: string;
  contextTrigger?: ChatContextTriggerRef;
  pageContext?: ChatPageContext;
};

export type ListChatConversationsResponse = {
  conversations: ChatConversation[];
};

export type CreateChatConversationResponse = {
  conversation: ChatConversation;
};

export type ListChatMessagesResponse = {
  messages: ChatMessage[];
};

export type ListChatStartersResponse = {
  starters: PublicChatStarter[];
};

export type SendChatMessageResponse = {
  message: ChatMessage;
};

export type TrainerAiSettingsInput = {
  enabled?: boolean;
  mode?: TrainerAiMode;
  tone?: string | null;
  instructions?: string | null;
  preferredExercises?: string[];
  restrictions?: string | null;
};

export type GetTrainerAiSettingsResponse = {
  settings: TrainerAiSettings;
};

export type UpdateTrainerAiSettingsResponse = {
  settings: TrainerAiSettings;
};

export async function listChatConversations(): Promise<ListChatConversationsResponse> {
  const response = await authenticatedFetch("/api/v1/chat/conversations", {
    method: "GET",
  });

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível carregar suas conversas.");
  }

  return (await response.json()) as ListChatConversationsResponse;
}

/**
 * Soft-deletes an EMPTY IA Move conversation (used to clean up an orphan
 * conversation created by a contextual auto-send whose first send failed).
 * The backend rejects non-empty conversations and trainer_chat.
 */
export async function deleteEmptyConversation(conversationId: string): Promise<void> {
  const response = await authenticatedFetch(
    `/api/v1/chat/conversations/${conversationId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível remover a conversa.");
  }
}

export async function createChatConversation(
  input: CreateChatConversationInput,
): Promise<CreateChatConversationResponse> {
  const response = await authenticatedFetch("/api/v1/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível criar a conversa.");
  }

  return (await response.json()) as CreateChatConversationResponse;
}

export async function listChatMessages(
  conversationId: string,
): Promise<ListChatMessagesResponse> {
  const response = await authenticatedFetch(
    `/api/v1/chat/conversations/${conversationId}/messages`,
    { method: "GET" },
  );

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível carregar as mensagens.");
  }

  return (await response.json()) as ListChatMessagesResponse;
}

export async function listChatStarters(): Promise<ListChatStartersResponse> {
  const response = await authenticatedFetch("/api/v1/chat/starters", {
    method: "GET",
  });

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível carregar os temas sugeridos.");
  }

  return (await response.json()) as ListChatStartersResponse;
}

export async function sendChatMessage(
  input: SendChatMessageInput,
): Promise<SendChatMessageResponse> {
  const response = await authenticatedFetch("/api/v1/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível enviar a mensagem.");
  }

  return (await response.json()) as SendChatMessageResponse;
}

export async function getTrainerAiSettings(): Promise<GetTrainerAiSettingsResponse> {
  const response = await authenticatedFetch("/api/v1/chat/trainer-ai-settings", {
    method: "GET",
  });

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível carregar as configurações da IA.");
  }

  return (await response.json()) as GetTrainerAiSettingsResponse;
}

export async function updateTrainerAiSettings(
  input: TrainerAiSettingsInput,
): Promise<UpdateTrainerAiSettingsResponse> {
  const response = await authenticatedFetch("/api/v1/chat/trainer-ai-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível salvar as configurações da IA.");
  }

  return (await response.json()) as UpdateTrainerAiSettingsResponse;
}

export type TrainerChatStudentItem = {
  userId: string;
  fullName: string;
  email: string;
  status: string;
};

export type ListTrainerChatStudentsResponse = {
  students: TrainerChatStudentItem[];
};

export async function listTrainerChatStudents(): Promise<ListTrainerChatStudentsResponse> {
  const response = await authenticatedFetch("/api/v1/trainer/students", { method: "GET" });

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível carregar seus alunos.");
  }

  return (await response.json()) as ListTrainerChatStudentsResponse;
}

export type SendTrainerChatMessageInput = {
  conversationId: string;
  content: string;
};

export type TrainerChatAssistantError = {
  code: string;
  message: string;
};

export type ConversationState = {
  aiEnabled: boolean;
  waitingForTrainer: boolean;
};

export type SendTrainerChatMessageResponse = {
  message: ChatMessage;
  assistantMessage: ChatMessage | null;
  assistantError?: TrainerChatAssistantError | null;
  conversationState: ConversationState;
};

export async function sendTrainerChatMessage(
  input: SendTrainerChatMessageInput,
): Promise<SendTrainerChatMessageResponse> {
  const response = await authenticatedFetch(
    `/api/v1/chat/conversations/${input.conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.content }),
    },
  );

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível enviar a mensagem.");
  }

  return (await response.json()) as SendTrainerChatMessageResponse;
}

export type UpdateAiStateAction =
  | "disable_ai"
  | "enable_ai"
  | "mark_waiting_for_trainer"
  | "clear_waiting_for_trainer";

export type UpdateConversationAiStateInput = {
  conversationId: string;
  action: UpdateAiStateAction;
};

export type UpdateConversationAiStateResponse = {
  conversation: ChatConversation;
  conversationState: {
    aiEnabled: boolean;
    waitingForTrainer: boolean;
  };
};

export async function updateConversationAiState(
  input: UpdateConversationAiStateInput,
): Promise<UpdateConversationAiStateResponse> {
  const response = await authenticatedFetch(
    `/api/v1/chat/conversations/${input.conversationId}/ai-state`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: input.action }),
    },
  );

  if (!response.ok) {
    await throwChatApiError(response, "Não foi possível atualizar o estado da IA.");
  }

  return (await response.json()) as UpdateConversationAiStateResponse;
}
