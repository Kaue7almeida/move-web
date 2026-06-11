import { ApiError } from "@/bff/core/errors/ApiError";
import type { Json } from "@/bff/core/supabase/database.types";
import { getChatStarterById } from "@/bff/modules/chat/data/chatStarters";
import type {
  ChatConversation,
  ChatConversationType,
  ChatPageContext,
  ChatMessage,
  ChatStarter,
  TrainerAiMode,
  TrainerAiSettings,
} from "@/bff/modules/chat/types";
import type {
  IChatRepository,
  SetConversationAiStateInput,
} from "@/bff/modules/chat/types/IChatRepository";
import type { ChatContextTriggerResolver } from "@/bff/modules/chat/context-triggers/types";
import type { NotificationService } from "@/bff/modules/notifications/services/NotificationService";

type ChatPromptMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionClient = {
  complete(input: { messages: ChatPromptMessage[] }): Promise<string>;
};

export type CreateChatConversationInput = {
  conversationType: ChatConversationType;
  title?: string;
  contextModule?: string;
  contextLabel?: string;
  trainerUserId?: string;
  studentUserId?: string;
  metadata?: Json;
};

export type ChatContextTriggerRef = {
  id: string;
  entityId: string;
};

export type SendMoveAiMessageInput = {
  conversationId: string;
  content?: string;
  starterId?: string;
  contextTrigger?: ChatContextTriggerRef;
  pageContext?: ChatPageContext;
};

export type SendHumanMessageInput = {
  conversationId: string;
  content: string;
};

export type UpdateConversationAiStateAction =
  | "disable_ai"
  | "enable_ai"
  | "mark_waiting_for_trainer"
  | "clear_waiting_for_trainer";

export type ChatConversationState = {
  aiEnabled: boolean;
  waitingForTrainer: boolean;
};

type TrainerAiAssistantErrorCode =
  | "chat_trainer_ai_failed"
  | "chat_ai_invalid_response";

export type ChatAssistantError = {
  code: TrainerAiAssistantErrorCode;
  message: string;
};

export type SendHumanMessageResult = {
  message: ChatMessage;
  assistantMessage: ChatMessage | null;
  assistantError?: ChatAssistantError | null;
  conversationState: ChatConversationState;
};

export type UpdateConversationAiStateResult = {
  conversation: ChatConversation;
  conversationState: ChatConversationState;
};

export type TrainerAiSettingsView = {
  trainerUserId: string;
  enabled: boolean;
  mode: TrainerAiMode;
  tone: string | null;
  instructions: string | null;
  preferredExercises: string[];
  restrictions: string | null;
  metadata: Json;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UpdateTrainerAiSettingsInput = {
  enabled?: boolean;
  mode?: TrainerAiMode;
  tone?: string | null;
  instructions?: string | null;
  preferredExercises?: string[];
  restrictions?: string | null;
};

type SendMoveAiMessagePlan = {
  persistedContent: string;
  aiUserContent: string;
  metadata?: Json;
};

type NormalizedTrainerAiSettingsInput = {
  enabled?: boolean;
  mode?: TrainerAiMode;
  tone?: string | null;
  instructions?: string | null;
  preferredExercises?: string[];
  restrictions?: string | null;
};

type TrainerChatParticipants = {
  studentUserId: string;
  trainerUserId: string;
};

/** Display names used only inside the trainer AI prompt (never sent to the front). */
type TrainerChatParticipantNames = {
  studentName: string | null;
  trainerName: string | null;
};

const CONVERSATION_NOT_FOUND = new ApiError(
  404,
  "chat_conversation_not_found",
  "Conversa não encontrada.",
);

const RELATIONSHIP_REQUIRED = new ApiError(
  403,
  "chat_relationship_required",
  "É necessário ter um vínculo ativo entre aluno e personal para criar essa conversa.",
);

const INVALID_REQUEST = new ApiError(
  400,
  "invalid_request",
  "Payload inválido.",
);

const TRAINER_ACCESS_REQUIRED = new ApiError(
  403,
  "trainer_access_required",
  "Apenas perfis de personal podem acessar esse recurso.",
);

const CHAT_AI_NOT_AVAILABLE = new ApiError(
  409,
  "chat_ai_not_available",
  "A IA Move privada só está disponível em conversas privadas.",
);

const CHAT_STARTER_NOT_SUPPORTED = new ApiError(
  409,
  "chat_starter_not_supported",
  "Este tema ainda não é suportado pela IA Move privada.",
);

const CHAT_USE_AI_SEND_ENDPOINT = new ApiError(
  409,
  "chat_use_ai_send_endpoint",
  "Use o endpoint de IA para enviar mensagens nesta conversa.",
);

const CHAT_AI_STATE_NOT_AVAILABLE = new ApiError(
  409,
  "chat_ai_state_not_available",
  "Estado da IA nao esta disponivel para esta conversa.",
);

const CHAT_CONVERSATION_DELETE_NOT_ALLOWED = new ApiError(
  409,
  "chat_conversation_delete_not_allowed",
  "Esta conversa não pode ser removida.",
);

const CHAT_CONVERSATION_NOT_EMPTY = new ApiError(
  409,
  "chat_conversation_not_empty",
  "Esta conversa possui mensagens e não pode ser removida.",
);

const CHAT_TRAINER_AI_FAILED = new ApiError(
  502,
  "chat_trainer_ai_failed",
  "Nao foi possivel gerar a resposta da IA do personal.",
);

const TRAINER_AI_SAFE_ERROR_MESSAGE =
  "Não foi possível gerar a resposta automática agora.";

function addUniqueParticipantCandidate(
  candidates: TrainerChatParticipants[],
  candidate: TrainerChatParticipants,
) {
  const alreadyExists = candidates.some(
    (current) =>
      current.studentUserId === candidate.studentUserId &&
      current.trainerUserId === candidate.trainerUserId,
  );

  if (!alreadyExists) {
    candidates.push(candidate);
  }
}

function resolveTrainerChatCandidates(
  userId: string,
  input: CreateChatConversationInput,
): TrainerChatParticipants[] {
  const candidates: TrainerChatParticipants[] = [];

  if (input.trainerUserId && input.trainerUserId !== userId) {
    addUniqueParticipantCandidate(candidates, {
      studentUserId: userId,
      trainerUserId: input.trainerUserId,
    });
  }

  if (input.studentUserId && input.studentUserId !== userId) {
    addUniqueParticipantCandidate(candidates, {
      studentUserId: input.studentUserId,
      trainerUserId: userId,
    });
  }

  return candidates;
}

function normalizeOptionalMessageContent(content?: string): string | null {
  const normalizedContent = content?.trim() ?? "";

  if (!normalizedContent) {
    return null;
  }

  if (normalizedContent.length > 2000) {
    throw INVALID_REQUEST;
  }

  return normalizedContent;
}

function normalizeRequiredMessageContent(content: string): string {
  const normalizedContent = normalizeOptionalMessageContent(content);

  if (!normalizedContent) {
    throw INVALID_REQUEST;
  }

  return normalizedContent;
}

function normalizeNullableSettingsText(
  value: string | null | undefined,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length > maxLength) {
    throw INVALID_REQUEST;
  }

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizePreferredExercisesInput(value?: string[]): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value.length > 50) {
    throw INVALID_REQUEST;
  }

  return value.map((exercise) => {
    const normalizedExercise = exercise.trim();

    if (!normalizedExercise || normalizedExercise.length > 80) {
      throw INVALID_REQUEST;
    }

    return normalizedExercise;
  });
}

function normalizePreferredExercisesOutput(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toTrainerAiSettingsView(
  settings: TrainerAiSettings | null,
  trainerUserId: string,
): TrainerAiSettingsView {
  if (!settings) {
    return {
      trainerUserId,
      enabled: false,
      mode: "off",
      tone: null,
      instructions: null,
      preferredExercises: [],
      restrictions: null,
      metadata: {},
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    trainerUserId: settings.trainerUserId,
    enabled: settings.enabled,
    mode: settings.mode,
    tone: settings.tone,
    instructions: settings.instructions,
    preferredExercises: normalizePreferredExercisesOutput(settings.preferredExercises),
    restrictions: settings.restrictions,
    metadata: settings.metadata,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

function hasTrainerAiSettingsInputValue(input: UpdateTrainerAiSettingsInput): boolean {
  return (
    input.enabled !== undefined ||
    input.mode !== undefined ||
    input.tone !== undefined ||
    input.instructions !== undefined ||
    input.preferredExercises !== undefined ||
    input.restrictions !== undefined
  );
}

function normalizeUpdateTrainerAiSettingsInput(
  input: UpdateTrainerAiSettingsInput,
): NormalizedTrainerAiSettingsInput {
  if (!hasTrainerAiSettingsInputValue(input)) {
    throw INVALID_REQUEST;
  }

  return {
    enabled: input.enabled,
    mode: input.mode,
    tone: normalizeNullableSettingsText(input.tone, 300),
    instructions: normalizeNullableSettingsText(input.instructions, 2000),
    preferredExercises: normalizePreferredExercisesInput(input.preferredExercises),
    restrictions: normalizeNullableSettingsText(input.restrictions, 1000),
  };
}

function buildNextTrainerAiSettings(input: {
  current: TrainerAiSettingsView;
  patch: NormalizedTrainerAiSettingsInput;
}): Omit<TrainerAiSettingsView, "trainerUserId" | "metadata" | "createdAt" | "updatedAt"> {
  const { current, patch } = input;
  let enabled = patch.enabled ?? current.enabled;
  let mode = patch.mode ?? current.mode;

  if (patch.mode && patch.mode !== "off" && patch.enabled === undefined) {
    enabled = true;
  }

  if (patch.enabled === false) {
    mode = "off";
  }

  if (mode === "off") {
    enabled = false;
  }

  return {
    enabled,
    mode,
    tone: patch.tone !== undefined ? patch.tone : current.tone,
    instructions:
      patch.instructions !== undefined ? patch.instructions : current.instructions,
    preferredExercises:
      patch.preferredExercises !== undefined
        ? patch.preferredExercises
        : current.preferredExercises,
    restrictions:
      patch.restrictions !== undefined ? patch.restrictions : current.restrictions,
  };
}

function buildPageContextPrompt(pageContext?: ChatPageContext): string {
  if (!pageContext) {
    return "Contexto leve da tela atual: não informado.";
  }

  const lines = [
    "Contexto leve da tela atual, usado apenas para orientar a resposta:",
    `- currentRoute: ${pageContext.currentRoute}`,
    `- module: ${pageContext.module}`,
  ];

  if (pageContext.pageTitle) {
    lines.push(`- pageTitle: ${pageContext.pageTitle}`);
  }

  if (pageContext.entityId) {
    lines.push(`- entityId opaco: ${pageContext.entityId}`);
  }

  lines.push("Não busque dados por entityId e não assuma dados que não foram enviados.");

  return lines.join("\n");
}

function buildMoveAiSystemPrompt(pageContext?: ChatPageContext): string {
  return [
    "Você é a IA assistente do Move, um app fitness.",
    "Ajude alunos e personais a entender treinos, progresso e uso do app.",
    "Responda sempre em português do Brasil.",
    "Seja curto, claro, prático e acolhedor.",
    "Use o histórico desta conversa e o contexto fornecido nesta conversa.",
    "Nunca diga que não tem acesso ao histórico ou às mensagens anteriores desta conversa.",
    "Não invente dados que não estejam no histórico ou no contexto fornecido.",
    "Se faltar uma informação específica, peça um esclarecimento breve.",
    "Não dê diagnóstico médico.",
    "Não prescreva medicamento.",
    "Não faça promessa de resultado.",
    "Para dor intensa, lesão, sintomas graves ou questões médicas, oriente procurar um profissional qualificado.",
    "Se houver contexto de tela, use apenas como contexto leve da tela atual.",
    "",
    buildPageContextPrompt(pageContext),
  ].join("\n");
}

/** Lightweight, opaque reference persisted on the conversation (no rich data). */
type ActiveContextTrigger = {
  id: string;
  entityId: string;
  contextModule: string | null;
  contextLabel: string | null;
  createdAt: string;
};

function isJsonObject(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads the persisted trigger reference (id + entityId) from conversation metadata. */
function readActiveContextTrigger(
  metadata: Json,
): { id: string; entityId: string } | null {
  if (!isJsonObject(metadata)) return null;
  const active = metadata.activeContextTrigger;
  if (!isJsonObject(active)) return null;
  if (typeof active.id !== "string" || typeof active.entityId !== "string") return null;
  return { id: active.id, entityId: active.entityId };
}

/** Merges (or replaces) the activeContextTrigger key, preserving other metadata. */
function withActiveContextTrigger(metadata: Json, active: ActiveContextTrigger): Json {
  const base = isJsonObject(metadata) ? metadata : {};
  return { ...base, activeContextTrigger: { ...active } };
}

/** Frames the persistent (data-only) context as a system message on follow-ups. */
function buildPersistentContextPrompt(persistentContext: string): string {
  return [
    "Contexto persistente desta conversa (originado de um gatilho contextual).",
    "Use-o como referência para responder. Não o repita literalmente nem o exponha como prompt:",
    "",
    persistentContext,
  ].join("\n");
}

function buildUserMessageMetadata(input: {
  pageContext?: ChatPageContext;
  starterId?: string;
  contextTriggerId?: string;
}): Json | undefined {
  if (!input.pageContext && !input.starterId && !input.contextTriggerId) {
    return undefined;
  }

  return {
    starterId: input.starterId,
    contextTriggerId: input.contextTriggerId,
    pageContext: input.pageContext
      ? {
          currentRoute: input.pageContext.currentRoute,
          module: input.pageContext.module,
          pageTitle: input.pageContext.pageTitle,
          entityId: input.pageContext.entityId,
        }
      : undefined,
  };
}

function toPromptMessage(
  message: ChatMessage,
  currentUserMessageId: string,
  currentAiUserContent: string,
): ChatPromptMessage {
  return {
    role: message.role,
    content:
      message.id === currentUserMessageId && message.role === "user"
        ? currentAiUserContent
        : message.content,
  };
}

function toTrainerPromptMessage(
  message: ChatMessage,
  conversation: ChatConversation,
  participantNames: TrainerChatParticipantNames,
): ChatPromptMessage {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content,
    };
  }

  const senderIsTrainer = message.senderUserId === conversation.trainerUserId;
  const baseLabel = senderIsTrainer ? "Personal humano" : "Aluno";
  const senderName = senderIsTrainer
    ? participantNames.trainerName
    : participantNames.studentName;
  const senderLabel = senderName ? `${baseLabel} (${senderName})` : baseLabel;

  return {
    role: "user",
    content: `${senderLabel}: ${message.content}`,
  };
}

function normalizeIntentText(content: string): string {
  return content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Determinantes empilhaveis em PT-BR: "meu personal", "o personal", "o meu personal".
const TRAINER_HUMAN_OPT_OUT_PATTERNS: RegExp[] = [
  /\bquero\s+falar\s+com\s+((o|a|meu|minha)\s+){0,2}(personal|professor|treinador|pessoa|humano)\b/,
  /\bquero\s+falar\s+com\s+uma\s+pessoa\b/,
  /\b(chama|chamar|chame)\s+((o|a|meu|minha)\s+){0,2}(personal|professor|treinador)\b/,
  /\bnao\s+(quero|usar|preciso)\s+(de\s+)?(ia|inteligencia artificial)\b/,
  /\bsem\s+(ia|inteligencia artificial)\b/,
  /\bprefiro\s+(esperar|aguardar)\s+(ele|ela|((o|a|meu|minha)\s+){0,2}personal)\b/,
];

function shouldStopTrainerAi(content: string): boolean {
  const normalizedContent = normalizeIntentText(content);

  return TRAINER_HUMAN_OPT_OUT_PATTERNS.some((pattern) =>
    pattern.test(normalizedContent),
  );
}

function getConversationState(conversation: ChatConversation): ChatConversationState {
  return {
    aiEnabled: conversation.aiEnabled,
    waitingForTrainer: conversation.waitingForTrainer,
  };
}

function isTrainerChatParticipant(
  userId: string,
  conversation: ChatConversation,
): boolean {
  return (
    conversation.studentUserId === userId || conversation.trainerUserId === userId
  );
}

function resolveConversationAiStatePatch(
  action: UpdateConversationAiStateAction,
): SetConversationAiStateInput {
  switch (action) {
    case "disable_ai":
      return { aiEnabled: false };
    case "enable_ai":
      return { aiEnabled: true, waitingForTrainer: false };
    case "mark_waiting_for_trainer":
      return { aiEnabled: false, waitingForTrainer: true };
    case "clear_waiting_for_trainer":
      return { waitingForTrainer: false };
  }
}

function canAutoReplyWithTrainerAi(input: {
  conversation: ChatConversation;
  settings: TrainerAiSettings | null;
}): input is { conversation: ChatConversation; settings: TrainerAiSettings } {
  return Boolean(
    input.conversation.aiEnabled &&
      !input.conversation.waitingForTrainer &&
      input.settings?.enabled &&
      input.settings.mode === "auto_reply",
  );
}

function buildTrainerAiSystemPrompt(
  settings: TrainerAiSettings,
  participantNames: TrainerChatParticipantNames,
): string {
  const preferredExercises = normalizePreferredExercisesOutput(
    settings.preferredExercises,
  );
  const trainerLabel = participantNames.trainerName ?? "o personal";
  const studentLabel = participantNames.studentName ?? "o aluno";

  const lines = [
    "Voce e uma IA auxiliar do personal dentro do Move.",
    "",
    "Participantes desta conversa:",
    `- Personal (humano): ${participantNames.trainerName ?? "nome nao informado"}.`,
    `- Aluno: ${participantNames.studentName ?? "nome nao informado"}.`,
    `Esta conversa e entre ${studentLabel} e ${trainerLabel}, e voce responde como IA auxiliar de ${trainerLabel}.`,
    "",
    "Responda sempre em portugues do Brasil.",
    "Seja curta, pratica e acolhedora.",
    "Deixe claro que voce e uma IA auxiliar do personal, nao o personal humano.",
    "Nao finja ser o personal humano.",
    "Use o historico recente desta conversa como contexto.",
    "Nao invente dados que nao estejam no historico desta conversa ou nesta configuracao.",
    "Se faltar informacao para responder, peca um esclarecimento breve ao aluno.",
    "Nao prometa resultado.",
    "Nao diagnostique lesao ou doenca.",
    "Nao prescreva remedio.",
    "Em dor forte, lesao, sintomas graves ou questao medica, oriente procurar um profissional qualificado.",
    "Nao altere nem substitua o treino prescrito pelo personal.",
    "Se o aluno pedir mudanca de treino, carga ou exercicio, oriente confirmar com o personal antes.",
    "Se nao tiver certeza, oriente o aluno a aguardar o personal.",
    "",
    "Configuracao do personal:",
    `- Tom: ${settings.tone ?? "nao informado"}.`,
    `- Instrucoes: ${settings.instructions ?? "nao informado"}.`,
    `- Exercicios preferidos: ${
      preferredExercises.length > 0 ? preferredExercises.join(", ") : "nao informado"
    }.`,
    `- Restricoes: ${settings.restrictions ?? "nao informado"}.`,
  ];

  return lines.join("\n");
}

async function completeTrainerAiMessage(input: {
  chatCompletionClient: ChatCompletionClient;
  messages: ChatPromptMessage[];
}): Promise<string> {
  try {
    return await input.chatCompletionClient.complete({ messages: input.messages });
  } catch (error: unknown) {
    if (error instanceof ApiError && error.code === "chat_ai_invalid_response") {
      throw error;
    }

    throw CHAT_TRAINER_AI_FAILED;
  }
}

function toTrainerAiAssistantError(error: unknown): ChatAssistantError {
  if (error instanceof ApiError && error.code === "chat_ai_invalid_response") {
    return {
      code: "chat_ai_invalid_response",
      message: TRAINER_AI_SAFE_ERROR_MESSAGE,
    };
  }

  return {
    code: "chat_trainer_ai_failed",
    message: TRAINER_AI_SAFE_ERROR_MESSAGE,
  };
}

function buildStarterAiUserContent(starter: ChatStarter, content: string | null): string {
  if (!content) {
    return starter.prePrompt;
  }

  return [
    starter.prePrompt,
    "",
    "Complemento informado pelo usuário:",
    content,
  ].join("\n");
}

function buildStarterPersistedContent(starter: ChatStarter, content: string | null): string {
  if (!content) {
    return starter.title;
  }

  return [starter.title, content].join("\n\n");
}

function resolveSendMoveAiMessagePlan(
  input: SendMoveAiMessageInput,
): SendMoveAiMessagePlan {
  const content = normalizeOptionalMessageContent(input.content);
  const starterId = input.starterId?.trim() ?? null;

  if (!content && !starterId) {
    throw INVALID_REQUEST;
  }

  if (!starterId) {
    return {
      persistedContent: content ?? "",
      aiUserContent: content ?? "",
      metadata: buildUserMessageMetadata({ pageContext: input.pageContext }),
    };
  }

  const starter = getChatStarterById(starterId);

  if (!starter) {
    throw new ApiError(
      400,
      "chat_starter_not_found",
      "Tema de conversa não encontrado.",
    );
  }

  if (starter.target !== "move_ai") {
    throw CHAT_STARTER_NOT_SUPPORTED;
  }

  return {
    persistedContent: buildStarterPersistedContent(starter, content),
    aiUserContent: buildStarterAiUserContent(starter, content),
    metadata: buildUserMessageMetadata({
      pageContext: input.pageContext,
      starterId: starter.id,
    }),
  };
}

export class ChatService {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly chatCompletionClient: ChatCompletionClient,
    private readonly contextTriggerResolver: ChatContextTriggerResolver,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Notifies the OTHER trainer_chat participant about a new human message.
   * Best-effort: never throws — a notification failure must not break sending.
   */
  private async notifyTrainerChatMessage(
    conversation: ChatConversation,
    senderUserId: string,
  ): Promise<void> {
    const senderIsStudent = senderUserId === conversation.studentUserId;
    const recipientUserId = senderIsStudent
      ? conversation.trainerUserId
      : conversation.studentUserId;

    if (!recipientUserId || recipientUserId === senderUserId) {
      return;
    }

    try {
      // Grouped: while unread, new messages of the SAME conversation update the
      // existing notification (messageCount em metadata) instead of piling up.
      await this.notificationService.notifyUserGrouped({
        recipientUserId,
        actorUserId: senderUserId,
        type: "chat_message_received",
        title: "Nova mensagem",
        body: senderIsStudent
          ? "Seu aluno enviou uma mensagem"
          : "Seu personal enviou uma mensagem",
        target: {
          path: `/app/chat?conversationId=${conversation.id}`,
          type: "chat_conversation",
          entityId: conversation.id,
        },
        metadata: {
          conversationId: conversation.id,
          senderRole: senderIsStudent ? "student" : "trainer",
          senderUserId,
        },
        groupedTitle: () => "Novas mensagens",
        groupedBody: (count) =>
          senderIsStudent
            ? `Seu aluno enviou ${count} mensagens nesta conversa`
            : `Seu personal enviou ${count} mensagens nesta conversa`,
      });
    } catch {
      // Best-effort.
    }
  }

  async listConversationsForUser(userId: string): Promise<ChatConversation[]> {
    return this.chatRepository.listConversationsForUser(userId);
  }

  async createConversation(
    userId: string,
    input: CreateChatConversationInput,
  ): Promise<ChatConversation> {
    if (input.conversationType === "move_ai_private") {
      return this.chatRepository.createMoveAiConversation({
        ownerUserId: userId,
        title: input.title,
        contextModule: input.contextModule,
        contextLabel: input.contextLabel,
        metadata: input.metadata,
      });
    }

    return this.createTrainerChatConversation(userId, input);
  }

  async listMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
    const conversation = await this.chatRepository.findConversationByIdForUser(
      conversationId,
      userId,
    );

    if (!conversation) {
      throw CONVERSATION_NOT_FOUND;
    }

    const messages = await this.chatRepository.listMessages(conversationId);

    if (conversation.conversationType !== "trainer_chat") {
      return messages;
    }

    // Annotate human messages with the sender's display name so the UI can
    // show real names instead of role labels. Best-effort (names may be null).
    const participantNames = await this.resolveTrainerChatParticipantNames(conversation);

    return messages.map((message) => {
      if (message.role !== "user" || !message.senderUserId) {
        return message;
      }

      const senderName =
        message.senderUserId === conversation.trainerUserId
          ? participantNames.trainerName
          : message.senderUserId === conversation.studentUserId
            ? participantNames.studentName
            : null;

      return senderName ? { ...message, senderName } : message;
    });
  }

  async getTrainerAiSettings(userId: string): Promise<TrainerAiSettingsView> {
    await this.ensureTrainerAccess(userId);

    const settings = await this.chatRepository.getTrainerAiSettings(userId);

    return toTrainerAiSettingsView(settings, userId);
  }

  async updateTrainerAiSettings(
    userId: string,
    input: UpdateTrainerAiSettingsInput,
  ): Promise<TrainerAiSettingsView> {
    await this.ensureTrainerAccess(userId);

    const patch = normalizeUpdateTrainerAiSettingsInput(input);
    const currentSettings = await this.chatRepository.getTrainerAiSettings(userId);
    const current = toTrainerAiSettingsView(currentSettings, userId);
    const next = buildNextTrainerAiSettings({ current, patch });
    const settings = await this.chatRepository.upsertTrainerAiSettings({
      trainerUserId: userId,
      enabled: next.enabled,
      mode: next.mode,
      tone: next.tone,
      instructions: next.instructions,
      preferredExercises: next.preferredExercises,
      restrictions: next.restrictions,
      metadata: currentSettings?.metadata ?? {},
    });

    return toTrainerAiSettingsView(settings, userId);
  }

  async updateConversationAiState(
    userId: string,
    conversationId: string,
    action: UpdateConversationAiStateAction,
  ): Promise<UpdateConversationAiStateResult> {
    const conversation = await this.chatRepository.findConversationByIdForUser(
      conversationId,
      userId,
    );

    if (!conversation) {
      throw CONVERSATION_NOT_FOUND;
    }

    if (conversation.conversationType !== "trainer_chat") {
      throw CHAT_AI_STATE_NOT_AVAILABLE;
    }

    if (!isTrainerChatParticipant(userId, conversation)) {
      throw CONVERSATION_NOT_FOUND;
    }

    const updatedConversation = await this.chatRepository.setConversationAiState(
      conversationId,
      resolveConversationAiStatePatch(action),
    );

    return {
      conversation: updatedConversation,
      conversationState: getConversationState(updatedConversation),
    };
  }

  /**
   * Soft-deletes an EMPTY IA Move conversation owned by the user. Used to clean
   * up orphan conversations created by a contextual auto-send whose first send
   * failed before any message was persisted. Never touches trainer_chat nor a
   * conversation that already has messages.
   */
  async deleteEmptyMoveAiConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.chatRepository.findConversationByIdForUser(
      conversationId,
      userId,
    );

    if (!conversation) {
      throw CONVERSATION_NOT_FOUND;
    }

    if (
      conversation.conversationType !== "move_ai_private" ||
      conversation.ownerUserId !== userId
    ) {
      throw CHAT_CONVERSATION_DELETE_NOT_ALLOWED;
    }

    const messageCount = await this.chatRepository.countMessagesForConversation(conversationId);

    if (messageCount > 0) {
      throw CHAT_CONVERSATION_NOT_EMPTY;
    }

    await this.chatRepository.softDeleteConversation(conversationId);
  }

  async sendMoveAiMessage(
    userId: string,
    input: SendMoveAiMessageInput,
  ): Promise<ChatMessage> {
    const conversation = await this.chatRepository.findConversationByIdForUser(
      input.conversationId,
      userId,
    );

    if (!conversation) {
      throw CONVERSATION_NOT_FOUND;
    }

    if (conversation.conversationType !== "move_ai_private") {
      throw CHAT_AI_NOT_AVAILABLE;
    }

    // Resolve the message plan: contextTrigger (rich context built server-side)
    // takes precedence; otherwise fall back to the existing starter/free flow.
    let persistedContent: string;
    let aiUserContent: string;
    let metadata: Json | undefined;
    // Persistent (data-only) context injected as a system message on FOLLOW-UPS.
    let persistentContextForPrompt: string | null = null;
    // Lightweight reference to persist on the conversation (first turn only).
    let activeContextTriggerToPersist: ActiveContextTrigger | null = null;

    if (input.contextTrigger) {
      const visibleMessage = normalizeRequiredMessageContent(input.content ?? "");
      const triggerResult = await this.contextTriggerResolver.resolve(
        input.contextTrigger.id,
        {
          userId,
          entityId: input.contextTrigger.entityId,
          visibleMessage,
        },
      );

      // First turn: the full context+task is carried by the user message itself,
      // so we don't add a separate persistent-context system message here.
      persistedContent = triggerResult.visibleMessage;
      aiUserContent = triggerResult.aiUserContent;
      metadata = buildUserMessageMetadata({
        pageContext: input.pageContext,
        contextTriggerId: input.contextTrigger.id,
      });
      activeContextTriggerToPersist = {
        id: input.contextTrigger.id,
        entityId: input.contextTrigger.entityId,
        contextModule: input.pageContext?.module ?? null,
        contextLabel: triggerResult.contextLabel ?? null,
        createdAt: new Date().toISOString(),
      };
    } else {
      const sendPlan = resolveSendMoveAiMessagePlan(input);
      persistedContent = sendPlan.persistedContent;
      aiUserContent = sendPlan.aiUserContent;
      metadata = sendPlan.metadata;

      // Follow-up: re-hydrate the conversation's persistent context, if any.
      const active = readActiveContextTrigger(conversation.metadata);
      if (active) {
        persistentContextForPrompt = await this.resolvePersistentContext(
          userId,
          active,
          persistedContent,
        );
      }
    }

    const userMessage = await this.chatRepository.insertUserMessage({
      conversationId: input.conversationId,
      senderUserId: userId,
      content: persistedContent,
      metadata,
    });

    const recentMessages = await this.chatRepository.listRecentMessagesForPrompt(
      input.conversationId,
      20,
    );

    const systemMessages: ChatPromptMessage[] = [
      {
        role: "system",
        content: buildMoveAiSystemPrompt(input.pageContext),
      },
    ];
    if (persistentContextForPrompt) {
      systemMessages.push({
        role: "system",
        content: buildPersistentContextPrompt(persistentContextForPrompt),
      });
    }

    const assistantContent = await this.chatCompletionClient.complete({
      messages: [
        ...systemMessages,
        ...recentMessages.map((message) =>
          toPromptMessage(message, userMessage.id, aiUserContent),
        ),
      ],
    });

    const assistantMessage = await this.chatRepository.insertAssistantMessage({
      conversationId: input.conversationId,
      assistantType: "move_ai",
      content: assistantContent,
    });

    await this.chatRepository.touchConversation(input.conversationId);

    // Persist the lightweight context reference so follow-ups keep the context.
    if (activeContextTriggerToPersist) {
      await this.chatRepository.updateConversationMetadata(
        input.conversationId,
        withActiveContextTrigger(conversation.metadata, activeContextTriggerToPersist),
      );
    }

    return assistantMessage;
  }

  async sendHumanMessage(
    userId: string,
    input: SendHumanMessageInput,
  ): Promise<SendHumanMessageResult> {
    const content = normalizeRequiredMessageContent(input.content);
    const conversation = await this.chatRepository.findConversationByIdForUser(
      input.conversationId,
      userId,
    );

    if (!conversation) {
      throw CONVERSATION_NOT_FOUND;
    }

    if (conversation.conversationType !== "trainer_chat") {
      throw CHAT_USE_AI_SEND_ENDPOINT;
    }

    const message = await this.chatRepository.insertUserMessage({
      conversationId: input.conversationId,
      senderUserId: userId,
      content,
    });

    await this.notifyTrainerChatMessage(conversation, userId);

    if (userId !== conversation.studentUserId) {
      await this.chatRepository.touchConversation(input.conversationId);

      return {
        message,
        assistantMessage: null,
        conversationState: getConversationState(conversation),
      };
    }

    if (shouldStopTrainerAi(content)) {
      const conversationState = {
        aiEnabled: false,
        waitingForTrainer: true,
      };

      await this.chatRepository.setConversationAiState(
        input.conversationId,
        conversationState,
      );
      await this.chatRepository.touchConversation(input.conversationId);

      return {
        message,
        assistantMessage: null,
        conversationState,
      };
    }

    const settings = conversation.trainerUserId
      ? await this.chatRepository.getTrainerAiSettings(conversation.trainerUserId)
      : null;
    const autoReplyContext = { conversation, settings };

    if (!canAutoReplyWithTrainerAi(autoReplyContext)) {
      await this.chatRepository.touchConversation(input.conversationId);

      return {
        message,
        assistantMessage: null,
        conversationState: getConversationState(conversation),
      };
    }

    try {
      await this.chatRepository.touchConversation(input.conversationId);

      const [recentMessages, participantNames] = await Promise.all([
        this.chatRepository.listRecentMessagesForPrompt(input.conversationId, 20),
        this.resolveTrainerChatParticipantNames(conversation),
      ]);

      const assistantContent = await completeTrainerAiMessage({
        chatCompletionClient: this.chatCompletionClient,
        messages: [
          {
            role: "system",
            content: buildTrainerAiSystemPrompt(
              autoReplyContext.settings,
              participantNames,
            ),
          },
          ...recentMessages.map((recentMessage) =>
            toTrainerPromptMessage(recentMessage, conversation, participantNames),
          ),
        ],
      });

      const assistantMessage = await this.chatRepository.insertAssistantMessage({
        conversationId: input.conversationId,
        assistantType: "trainer_ai",
        content: assistantContent,
      });

      await this.chatRepository.touchConversation(input.conversationId);

      return {
        message,
        assistantMessage,
        conversationState: getConversationState(conversation),
      };
    } catch (error: unknown) {
      return {
        message,
        assistantMessage: null,
        assistantError: toTrainerAiAssistantError(error),
        conversationState: getConversationState(conversation),
      };
    }
  }

  /**
   * Resolves participant display names for the trainer AI prompt. Best-effort:
   * a profile lookup failure must not block the auto-reply, so it falls back
   * to role-only labels (null names).
   */
  private async resolveTrainerChatParticipantNames(
    conversation: ChatConversation,
  ): Promise<TrainerChatParticipantNames> {
    try {
      const names = await this.chatRepository.getProfileNames(
        [conversation.studentUserId, conversation.trainerUserId].filter(
          (userId): userId is string => Boolean(userId),
        ),
      );

      return {
        studentName: conversation.studentUserId
          ? (names[conversation.studentUserId] ?? null)
          : null,
        trainerName: conversation.trainerUserId
          ? (names[conversation.trainerUserId] ?? null)
          : null,
      };
    } catch {
      return { studentName: null, trainerName: null };
    }
  }

  private async ensureTrainerAccess(userId: string): Promise<void> {
    const hasTrainerProfile = await this.chatRepository.hasTrainerProfile(userId);

    if (!hasTrainerProfile) {
      throw TRAINER_ACCESS_REQUIRED;
    }
  }

  /**
   * Re-resolves a conversation's persisted trigger to recover its data-only
   * context for follow-up turns. Ownership is re-validated by the builder.
   * Never throws: if the context can't be resolved anymore, returns null so the
   * conversation keeps working with its visible history only.
   */
  private async resolvePersistentContext(
    userId: string,
    active: { id: string; entityId: string },
    visibleMessage: string,
  ): Promise<string | null> {
    try {
      const result = await this.contextTriggerResolver.resolve(active.id, {
        userId,
        entityId: active.entityId,
        visibleMessage,
      });
      return result.persistentContext ?? null;
    } catch {
      return null;
    }
  }

  private async createTrainerChatConversation(
    userId: string,
    input: CreateChatConversationInput,
  ): Promise<ChatConversation> {
    const candidates = resolveTrainerChatCandidates(userId, input);

    if (candidates.length === 0) {
      throw INVALID_REQUEST;
    }

    for (const candidate of candidates) {
      const hasActiveRelationship = await this.chatRepository.findActiveRelationship(
        candidate.studentUserId,
        candidate.trainerUserId,
      );

      if (hasActiveRelationship) {
        return this.chatRepository.createTrainerChatConversation({
          studentUserId: candidate.studentUserId,
          trainerUserId: candidate.trainerUserId,
          title: input.title,
          contextModule: input.contextModule,
          contextLabel: input.contextLabel,
          metadata: input.metadata,
        });
      }
    }

    throw RELATIONSHIP_REQUIRED;
  }
}
