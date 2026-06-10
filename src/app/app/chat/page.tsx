"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bed,
  CalendarCheck,
  Clock,
  Coffee,
  HelpCircle,
  Info,
  Loader2,
  MessageCircle,
  Moon,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Send,
  Shield,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import type { ChatConversation, ChatConversationType, ChatMessage } from "@/bff/modules/chat/types";
import {
  ChatApiError,
  createChatConversation,
  deleteEmptyConversation,
  listChatConversations,
  listChatMessages,
  listChatStarters,
  listTrainerChatStudents,
  sendChatMessage,
  sendTrainerChatMessage,
  updateConversationAiState,
  type PublicChatStarter,
  type TrainerChatStudentItem,
  type UpdateAiStateAction,
} from "@/services/chat/chatService";
import {
  consumeChatTriggerIntent,
  type ChatTriggerIntent,
} from "@/services/chat/chatTriggerService";

import { useAppShell } from "../AppShellContext";

/* ─────────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────────── */

type LoadState = "loading" | "ready" | "error";
type MobileView = "list" | "chat";
type StudentPickerLoadState = "loading" | "ready" | "error";

/** A conversation the user is composing but that has NOT been persisted yet.
 *  Only created in the backend when the first message is sent. */
type DraftConversation = {
  conversationType: ChatConversationType;
  title: string;
  trainerUserId?: string;
  studentUserId?: string;
  recipientLabel?: string;
  // Contextual trigger fields (Task 10b) — all opaque, no rich payload.
  contextModule?: string;
  contextLabel?: string;
  sourceRoute?: string;
  entityId?: string;
};

const PAGE_CONTEXT = {
  currentRoute: "/app/chat",
  module: "chat",
  pageTitle: "Chat IA Move",
} as const;

/** Builds a light pageContext from a draft, falling back to the default chat
 *  context. entityId stays opaque; no rich/sensitive data is ever included. */
function buildDraftPageContext(draft: DraftConversation) {
  if (!draft.contextModule && !draft.contextLabel && !draft.sourceRoute && !draft.entityId) {
    return PAGE_CONTEXT;
  }
  return {
    currentRoute: draft.sourceRoute || PAGE_CONTEXT.currentRoute,
    module: draft.contextModule || PAGE_CONTEXT.module,
    pageTitle: draft.contextLabel || PAGE_CONTEXT.pageTitle,
    entityId: draft.entityId,
  };
}

const POLL_INTERVAL_MS = 2500;

const STARTER_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  "alert-circle": AlertCircle,
  shield: Shield,
  moon: Moon,
  coffee: Coffee,
  "help-circle": HelpCircle,
  scale: Scale,
  "calendar-check": CalendarCheck,
  bed: Bed,
  info: Info,
  clock: Clock,
};

/* ─────────────────────────────────────────────────────────────────────────────
   Pure helpers
   ───────────────────────────────────────────────────────────────────────────── */

function formatConversationDate(iso: string | null): string {
  if (!iso) return "Sem mensagens";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sem mensagens";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getChatErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ChatApiError) return error.message;
  return fallback;
}

/** Merge cached + server messages: dedupe by id, drop optimistic temp messages
 *  once the server confirms them (same user content), keep order by createdAt. */
function mergeMessages(cached: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of cached) {
    if (!message.id.startsWith("temp-")) byId.set(message.id, message);
  }
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  const serverUserContents = new Set(
    incoming.filter((m) => m.role === "user").map((m) => m.content),
  );
  for (const message of cached) {
    if (message.id.startsWith("temp-") && !serverUserContents.has(message.content)) {
      byId.set(message.id, message);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function createOptimisticMessage(
  conversationId: string,
  content: string,
  senderUserId: string | null,
): ChatMessage {
  const now = new Date().toISOString();
  return {
    id: `temp-${now}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    role: "user",
    senderUserId,
    assistantType: null,
    isAiGenerated: false,
    content,
    metadata: {} as ChatMessage["metadata"],
    readByStudentAt: null,
    readByTrainerAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function conversationBadgeLabel(conv: ChatConversation, isTrainer: boolean): string {
  if (conv.conversationType === "trainer_chat") return isTrainer ? "Aluno" : "Personal";
  return "IA";
}

/* ─────────────────────────────────────────────────────────────────────────────
   Small presentational pieces
   ───────────────────────────────────────────────────────────────────────────── */

function StarterIcon({ icon }: { icon: string }) {
  const Icon = STARTER_ICONS[icon] ?? Sparkles;
  return <Icon size={16} strokeWidth={1.8} />;
}

function FullLoading() {
  return (
    <div className="flex min-h-[56vh] flex-col items-center justify-center gap-3">
      <Loader2 size={22} className="animate-spin text-accent" />
      <p className="text-sm text-muted">Carregando chat...</p>
    </div>
  );
}

function FullError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[56vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
        <AlertCircle size={22} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Não foi possível carregar o chat</p>
        <p className="mt-1 max-w-xs text-sm text-muted">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
      >
        <RefreshCw size={14} />
        Tentar novamente
      </button>
    </div>
  );
}

/* ─── AI state badge (header) ─── */
function AiStateBadge({ conversation }: { conversation: ChatConversation }) {
  if (conversation.waitingForTrainer) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none bg-amber-500/10 text-amber-600">
        Aguardando personal
      </span>
    );
  }
  if (conversation.aiEnabled) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none bg-green-500/10 text-green-600">
        IA permitida
      </span>
    );
  }
  return (
    <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none bg-surface-strong text-muted">
      IA pausada
    </span>
  );
}

/* ─── waitingForTrainer banner ─── */
function TrainerChatBanner({
  conversation,
  isTrainer,
  isUpdating,
  onAction,
}: {
  conversation: ChatConversation;
  isTrainer: boolean;
  isUpdating: boolean;
  onAction: (action: UpdateAiStateAction) => void;
}) {
  if (!conversation.waitingForTrainer) return null;
  return (
    <div className="mx-3 mt-3 flex items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Clock size={14} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-400">
          {isTrainer
            ? "Aluno pediu atendimento humano. A IA está pausada nesta conversa."
            : "Você pediu para falar com seu personal. A IA está pausada."}
        </p>
      </div>
      {isTrainer && (
        <button
          type="button"
          onClick={() => onAction("enable_ai")}
          disabled={isUpdating}
          className="shrink-0 text-xs font-semibold text-amber-700 transition-opacity hover:opacity-70 disabled:opacity-50 dark:text-amber-400"
        >
          {isUpdating ? <Loader2 size={12} className="animate-spin" /> : "Retomar IA"}
        </button>
      )}
    </div>
  );
}

/* ─── Ligar/Desligar IA (trainer only) ─── */
function AiToggleButton({
  conversation,
  isUpdating,
  onAction,
}: {
  conversation: ChatConversation;
  isUpdating: boolean;
  onAction: (action: UpdateAiStateAction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAction(conversation.aiEnabled ? "disable_ai" : "enable_ai")}
      disabled={isUpdating}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface-strong px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
    >
      {isUpdating && <Loader2 size={11} className="animate-spin" />}
      {conversation.aiEnabled ? "Desligar IA" : "Ligar IA"}
    </button>
  );
}

/* ─── Inline **bold** → <strong> (React-escaped, no raw HTML) ─── */
function renderInlineBold(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let boldIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <strong key={`${keyPrefix}-b${boldIndex}`} className="font-semibold text-foreground">
        {match[1]}
      </strong>,
    );
    lastIndex = regex.lastIndex;
    boldIndex += 1;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const NUMBERED_LINE = /^\s*\d+\.\s+(.*)$/;
const BULLET_LINE = /^\s*[-*]\s+(.*)$/;
const HEADING_LINE = /^\s*#{2,3}\s+(.*)$/;

/* ─── Safe, minimal Markdown renderer for assistant messages only ───
   Supports: **bold**, numbered lists, bullet lists, blank-line paragraphs,
   single line breaks. No raw HTML, no dangerouslySetInnerHTML. */
function FormattedAssistantMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const key = `blk${blocks.length}`;
    const paraLines = paragraph;
    blocks.push(
      <p key={key} className="break-words">
        {paraLines.map((line, idx) => (
          <span key={`${key}-l${idx}`}>
            {renderInlineBold(line, `${key}-l${idx}`)}
            {idx < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      flushParagraph();
      i += 1;
      continue;
    }

    const headingMatch = line.match(HEADING_LINE);
    if (headingMatch) {
      flushParagraph();
      const key = `blk${blocks.length}`;
      blocks.push(
        <p
          key={key}
          className="mt-3 break-words text-sm font-semibold text-foreground first:mt-0"
        >
          {renderInlineBold(headingMatch[1], `${key}-h`)}
        </p>,
      );
      i += 1;
      continue;
    }

    if (NUMBERED_LINE.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(NUMBERED_LINE);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      const key = `blk${blocks.length}`;
      blocks.push(
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {items.map((item, idx) => (
            <li key={`${key}-i${idx}`}>{renderInlineBold(item, `${key}-i${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (BULLET_LINE.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(BULLET_LINE);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      const key = `blk${blocks.length}`;
      blocks.push(
        <ul key={key} className="list-disc space-y-1 pl-5">
          {items.map((item, idx) => (
            <li key={`${key}-i${idx}`}>{renderInlineBold(item, `${key}-i${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    paragraph.push(line);
    i += 1;
  }
  flushParagraph();

  return <div className="space-y-2 break-words">{blocks}</div>;
}

/* ─── Message bubble (labels preserved) ─── */
function MessageBubble({ message }: { message: ChatMessage }) {
  const { me, isTrainer } = useAppShell();

  const isMyMessage = message.role === "user" && message.senderUserId === me.user.id;
  const isAiMessage = message.role === "assistant";
  const isOtherUserMessage = message.role === "user" && !isMyMessage;
  const isRight = isMyMessage;

  let leftLabel = "";
  if (isAiMessage) {
    leftLabel = message.assistantType === "trainer_ai" ? "IA do Personal" : "IA Move";
  } else if (isOtherUserMessage) {
    leftLabel = isTrainer ? "Aluno" : "Personal";
  }

  return (
    <div className={["flex gap-2", isRight ? "justify-end" : "justify-start"].join(" ")}>
      {!isRight && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent">
          {isAiMessage ? <Sparkles size={12} strokeWidth={2} /> : <User size={12} strokeWidth={2} />}
        </div>
      )}
      <div
        className={[
          "max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[72%]",
          isRight
            ? "rounded-br-sm bg-accent text-accent-on"
            : "rounded-bl-sm border border-border bg-surface text-foreground",
        ].join(" ")}
      >
        {!isRight && leftLabel && (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            {leftLabel}
          </p>
        )}
        {isAiMessage ? (
          <FormattedAssistantMessage content={message.content} />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>
    </div>
  );
}

/* ─── "respondendo..." indicator ─── */
function RespondingIndicator({ label }: { label: string }) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent">
        <Sparkles size={12} strokeWidth={2} />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <Loader2 size={13} className="animate-spin text-accent" />
          <span className="text-sm text-muted">{label}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Chat input ─── */
function ChatInputForm({
  inputId,
  draft,
  isSending,
  onDraftChange,
  onSubmit,
}: {
  inputId: string;
  draft: string;
  isSending: boolean;
  onDraftChange: (val: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
        <label htmlFor={inputId} className="sr-only">
          Mensagem
        </label>
        <textarea
          id={inputId}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={1}
          placeholder="Escreva sua mensagem..."
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-transparent bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isSending || draft.trim().length === 0}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          title="Enviar mensagem"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </form>
  );
}

/* ─── Conversation panel: header + scrollable messages + footer input ─── */
function ConversationPanel({
  title,
  subtitle,
  badge,
  headerRight,
  banner,
  onBack,
  messages,
  isLoading,
  showResponding,
  respondingLabel,
  draftHint,
  contextHint,
  sendError,
  draft,
  isSending,
  onDraftChange,
  onSubmit,
  inputId,
  scrollKey,
}: {
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  headerRight: React.ReactNode;
  banner: React.ReactNode;
  onBack?: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  showResponding: boolean;
  respondingLabel: string;
  draftHint: string | null;
  contextHint: string | null;
  sendError: string | null;
  draft: string;
  isSending: boolean;
  onDraftChange: (val: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  inputId: string;
  scrollKey: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // Auto-scroll only when the user is already near the bottom (don't yank during polling).
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, showResponding]);

  // Force scroll to bottom when switching conversation/draft.
  useEffect(() => {
    nearBottomRef.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [scrollKey]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted">{subtitle}</span>
            {badge}
            {contextHint && (
              <span className="rounded bg-accent-muted px-1.5 py-0.5 text-[10px] font-medium text-accent">
                {contextHint}
              </span>
            )}
          </div>
        </div>
        {headerRight}
      </div>

      {banner}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={16} className="animate-spin text-accent" />
            Carregando mensagens...
          </div>
        ) : messages.length === 0 && !showResponding ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted text-accent">
              <Sparkles size={18} strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted">{draftHint ?? "Envie uma mensagem para começar."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {showResponding && <RespondingIndicator label={respondingLabel} />}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        {sendError && (
          <div className="mb-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-500">
            {sendError}
          </div>
        )}
        <ChatInputForm
          inputId={inputId}
          draft={draft}
          isSending={isSending}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

/* ─── Starter grid (IA Move only) ─── */
function StarterGrid({
  starters,
  isBusy,
  onStarterClick,
}: {
  starters: PublicChatStarter[];
  isBusy: boolean;
  onStarterClick: (s: PublicChatStarter) => void;
}) {
  const moveAiStarters = starters.filter((s) => s.target === "move_ai");
  if (moveAiStarters.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Temas sugeridos</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {moveAiStarters.map((starter) => (
          <button
            key={starter.id}
            type="button"
            onClick={() => onStarterClick(starter)}
            disabled={isBusy}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/30 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent transition-colors group-hover:bg-accent-soft">
              <StarterIcon icon={starter.icon} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{starter.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted">{starter.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Hub actions: Nova IA + start trainer_chat ─── */
function HubActions({
  isCreating,
  onNewMoveAi,
  onOpenPicker,
  onStartWithTrainer,
}: {
  isCreating: boolean;
  onNewMoveAi: () => void;
  onOpenPicker: () => void;
  onStartWithTrainer: (trainerUserId: string) => void;
}) {
  const { me, isTrainer } = useAppShell();
  const activeRelationships = useMemo(
    () => me.relationships.filter((r) => r.status === "active"),
    [me.relationships],
  );

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onNewMoveAi}
        disabled={isCreating}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        <Plus size={15} strokeWidth={2.2} />
        Nova conversa IA
      </button>

      {isTrainer ? (
        <button
          type="button"
          onClick={onOpenPicker}
          disabled={isCreating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
        >
          <User size={14} strokeWidth={2} />
          Iniciar conversa com aluno
        </button>
      ) : (
        activeRelationships.map((rel, idx) => (
          <button
            key={rel.trainer_user_id}
            type="button"
            onClick={() => onStartWithTrainer(rel.trainer_user_id)}
            disabled={isCreating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
          >
            <User size={14} strokeWidth={2} />
            {activeRelationships.length > 1
              ? `Conversar com meu personal ${idx + 1}`
              : "Conversar com meu personal"}
          </button>
        ))
      )}
    </div>
  );
}

/* ─── Hub welcome + starters (right panel desktop / top of mobile hub) ─── */
function HubWelcome({
  starters,
  isBusy,
  onStarterClick,
}: {
  starters: PublicChatStarter[];
  isBusy: boolean;
  onStarterClick: (s: PublicChatStarter) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <MessageCircle size={26} strokeWidth={1.5} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground sm:text-xl">
          Como posso te ajudar hoje?
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Tire dúvidas com a IA Move sobre treino, rotina e recuperação — ou fale diretamente com
          seu personal.
        </p>
      </div>
      <StarterGrid starters={starters} isBusy={isBusy} onStarterClick={onStarterClick} />
    </div>
  );
}

/* ─── Recent conversations list ─── */
function RecentConversations({
  conversations,
  selectedConversationId,
  isTrainer,
  onSelect,
}: {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  isTrainer: boolean;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted">
        Suas conversas vão aparecer aqui.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {conversations.map((conv, idx) => {
        const isActive = conv.id === selectedConversationId;
        const isTrainerChat = conv.conversationType === "trainer_chat";
        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            className={[
              "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors",
              idx < conversations.length - 1 ? "border-b border-border" : "",
              isActive ? "bg-accent-soft" : "hover:bg-surface-hover",
            ].join(" ")}
          >
            <div className="min-w-0 flex-1">
              <p
                className={[
                  "truncate text-sm font-medium",
                  isActive ? "text-accent" : "text-foreground",
                ].join(" ")}
              >
                {conv.title}
              </p>
              <span
                className={[
                  "mt-0.5 inline-flex rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none",
                  isTrainerChat ? "bg-blue-500/10 text-blue-500" : "bg-accent-muted text-accent",
                ].join(" ")}
              >
                {conversationBadgeLabel(conv, isTrainer)}
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-muted">
              {formatConversationDate(conv.lastMessageAt ?? conv.updatedAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Student picker overlay (modal desktop / bottom sheet mobile) ─── */
function StudentPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (student: TrainerChatStudentItem) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<StudentPickerLoadState>("loading");
  const [students, setStudents] = useState<TrainerChatStudentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await listTrainerChatStudents();
        if (!mounted) return;
        setStudents(result.students.filter((s) => s.status === "active"));
        setState("ready");
      } catch (e: unknown) {
        if (!mounted) return;
        setError(getChatErrorMessage(e, "Não foi possível carregar seus alunos."));
        setState("error");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered =
    search.trim() === ""
      ? students
      : students.filter(
          (s) =>
            s.fullName.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase()),
        );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Selecionar aluno"
        className="relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Iniciar conversa com aluno</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {state === "loading" && (
            <div className="flex items-center justify-center gap-2 py-10">
              <Loader2 size={16} className="animate-spin text-accent" />
              <span className="text-sm text-muted">Carregando alunos...</span>
            </div>
          )}
          {state === "error" && (
            <p className="px-4 py-10 text-center text-sm text-red-500">
              {error ?? "Erro ao carregar alunos."}
            </p>
          )}
          {state === "ready" && filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted">
              {students.length === 0
                ? "Nenhum aluno ativo encontrado."
                : "Nenhum resultado para essa busca."}
            </p>
          )}
          {state === "ready" &&
            filtered.map((student, idx) => (
              <button
                key={student.userId}
                type="button"
                onClick={() => onSelect(student)}
                className={[
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover",
                  idx < filtered.length - 1 ? "border-b border-border" : "",
                ].join(" ")}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
                  {student.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{student.fullName}</p>
                  <p className="truncate text-xs text-muted">{student.email}</p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main page
   ───────────────────────────────────────────────────────────────────────────── */

export default function ChatPage() {
  const { me, isTrainer } = useAppShell();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [starters, setStarters] = useState<PublicChatStarter[]>([]);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draftConversation, setDraftConversation] = useState<DraftConversation | null>(null);
  const [draftMessages, setDraftMessages] = useState<ChatMessage[]>([]);
  const [messagesByConversationId, setMessagesByConversationId] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);

  // Mirror of the message cache for synchronous reads (avoids stale setState getters).
  const cacheRef = useRef(messagesByConversationId);
  useEffect(() => {
    cacheRef.current = messagesByConversationId;
  }, [messagesByConversationId]);

  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingAiState, setIsUpdatingAiState] = useState(false);
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [contextHint, setContextHint] = useState<string | null>(null);
  // trainer_chat visible-context override: keep the simple input but send the
  // enriched text on first send (only when the input is left unedited).
  const [pendingSendOverride, setPendingSendOverride] = useState<{
    base: string;
    override: string;
  } | null>(null);

  // Latest isSending for the polling loop (avoid re-subscribing every toggle).
  const isSendingRef = useRef(false);
  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  // Contextual trigger intent (Task 10b): applied once after data is loaded.
  const intentHandledRef = useRef(false);
  const applyIntentRef = useRef<(intent: ChatTriggerIntent) => void>(() => {});

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  /* ── data loading ── */

  const loadMessages = useCallback(
    async (conversationId: string, opts?: { showLoaderIfEmpty?: boolean }) => {
      const showLoader = opts?.showLoaderIfEmpty ?? true;
      const hadCache = (cacheRef.current[conversationId]?.length ?? 0) > 0;
      if (showLoader && !hadCache) setLoadingConversationId(conversationId);
      try {
        const response = await listChatMessages(conversationId);
        setMessagesByConversationId((prev) => {
          const merged = mergeMessages(prev[conversationId] ?? [], response.messages);
          const current = prev[conversationId] ?? [];
          // Bail out (keep same reference) when nothing changed — avoids re-render
          // churn and scroll jitter during background polling.
          const unchanged =
            current.length === merged.length &&
            current.every((m, i) => m.id === merged[i].id && m.updatedAt === merged[i].updatedAt);
          if (unchanged) return prev;
          return { ...prev, [conversationId]: merged };
        });
      } catch (e: unknown) {
        if (!hadCache) {
          setSendError(getChatErrorMessage(e, "Não foi possível carregar as mensagens."));
        }
      } finally {
        setLoadingConversationId((prev) => (prev === conversationId ? null : prev));
      }
    },
    [],
  );

  const refreshConversationsQuietly = useCallback(async () => {
    try {
      const response = await listChatConversations();
      setConversations(response.conversations);
    } catch {
      // Non-critical: keep current list on failure.
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const [convResponse, starterResponse] = await Promise.all([
        listChatConversations(),
        listChatStarters(),
      ]);
      setConversations(convResponse.conversations);
      setStarters(starterResponse.starters);
      // No auto-selection: land on the hub.
      setSelectedConversationId(null);
      setDraftConversation(null);
      setMobileView("list");
      setLoadState("ready");
    } catch (e: unknown) {
      setErrorMessage(getChatErrorMessage(e, "Não foi possível carregar o chat."));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadInitialData();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadInitialData]);

  /* ── polling for the open trainer_chat ── */
  useEffect(() => {
    if (!selectedConversationId) return;
    const conv = conversations.find((c) => c.id === selectedConversationId);
    if (conv?.conversationType !== "trainer_chat") return;

    const interval = window.setInterval(() => {
      if (isSendingRef.current) return;
      void loadMessages(selectedConversationId, { showLoaderIfEmpty: false });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [selectedConversationId, conversations, loadMessages]);

  /* ── navigation helpers ── */

  const goToHub = useCallback(() => {
    setSelectedConversationId(null);
    setDraftConversation(null);
    setDraftMessages([]);
    setSendError(null);
    setContextHint(null);
    setPendingSendOverride(null);
    setMobileView("list");
  }, []);

  const selectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      setDraftConversation(null);
      setDraftMessages([]);
      setSendError(null);
      setContextHint(null);
      setPendingSendOverride(null);
      setMobileView("chat");
      void loadMessages(conversationId);
    },
    [loadMessages],
  );

  const openDraft = useCallback((nextDraft: DraftConversation) => {
    setDraftConversation(nextDraft);
    setSelectedConversationId(null);
    setDraftMessages([]);
    setSendError(null);
    setContextHint(null);
    setPendingSendOverride(null);
    setDraft("");
    setMobileView("chat");
  }, []);

  function startMoveAiDraft() {
    openDraft({ conversationType: "move_ai_private", title: "Nova conversa" });
  }

  function startTrainerChatWithStudent(student: TrainerChatStudentItem) {
    setIsPickerOpen(false);
    const existing = conversations.find(
      (c) => c.conversationType === "trainer_chat" && c.studentUserId === student.userId,
    );
    if (existing) {
      selectConversation(existing.id);
      return;
    }
    openDraft({
      conversationType: "trainer_chat",
      title: `Conversa com ${student.fullName}`,
      studentUserId: student.userId,
      recipientLabel: student.fullName,
    });
  }

  function startTrainerChatWithTrainer(trainerUserId: string) {
    const existing = conversations.find(
      (c) => c.conversationType === "trainer_chat" && c.trainerUserId === trainerUserId,
    );
    if (existing) {
      selectConversation(existing.id);
      return;
    }
    openDraft({
      conversationType: "trainer_chat",
      title: "Conversa com seu personal",
      trainerUserId,
      recipientLabel: "seu personal",
    });
  }

  /* ── AI state ── */
  async function handleUpdateAiState(action: UpdateAiStateAction) {
    if (!selectedConversation) return;
    setIsUpdatingAiState(true);
    try {
      const result = await updateConversationAiState({
        conversationId: selectedConversation.id,
        action,
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === result.conversation.id ? result.conversation : c)),
      );
    } catch (e: unknown) {
      setSendError(getChatErrorMessage(e, "Não foi possível atualizar o estado da IA."));
    } finally {
      setIsUpdatingAiState(false);
    }
  }

  /* ── sending ── */

  async function sendToConversation(conversation: ChatConversation, content: string) {
    setIsSending(true);
    setSendError(null);
    const optimistic = createOptimisticMessage(conversation.id, content, me.user.id);
    setMessagesByConversationId((prev) => ({
      ...prev,
      [conversation.id]: [...(prev[conversation.id] ?? []), optimistic],
    }));
    setDraft("");
    try {
      if (conversation.conversationType === "trainer_chat") {
        const result = await sendTrainerChatMessage({
          conversationId: conversation.id,
          content,
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id
              ? {
                  ...c,
                  aiEnabled: result.conversationState.aiEnabled,
                  waitingForTrainer: result.conversationState.waitingForTrainer,
                  lastMessageAt: new Date().toISOString(),
                }
              : c,
          ),
        );
        await loadMessages(conversation.id, { showLoaderIfEmpty: false });
        if (result.assistantError) {
          setSendError("Mensagem enviada, mas a IA do personal não respondeu agora.");
        }
      } else {
        await sendChatMessage({
          conversationId: conversation.id,
          content,
          pageContext: PAGE_CONTEXT,
        });
        await loadMessages(conversation.id, { showLoaderIfEmpty: false });
        await refreshConversationsQuietly();
      }
    } catch (e: unknown) {
      setSendError(getChatErrorMessage(e, "Não foi possível enviar a mensagem."));
    } finally {
      setIsSending(false);
    }
  }

  async function sendFromDraft(activeDraft: DraftConversation, content: string) {
    setIsSending(true);
    setSendError(null);
    const optimistic = createOptimisticMessage("draft", content, me.user.id);
    setDraftMessages([optimistic]);
    setDraft("");
    try {
      const created = await createChatConversation({
        conversationType: activeDraft.conversationType,
        title: activeDraft.title,
        trainerUserId: activeDraft.trainerUserId,
        studentUserId: activeDraft.studentUserId,
        contextModule: activeDraft.contextModule,
        contextLabel: activeDraft.contextLabel,
      });
      const conversation = created.conversation;
      // Seed cache with the optimistic message re-pointed at the real id.
      setMessagesByConversationId((prev) => ({
        ...prev,
        [conversation.id]: [{ ...optimistic, conversationId: conversation.id }],
      }));
      setConversations((prev) => [conversation, ...prev]);
      setSelectedConversationId(conversation.id);
      setDraftConversation(null);
      setDraftMessages([]);

      if (conversation.conversationType === "trainer_chat") {
        const result = await sendTrainerChatMessage({
          conversationId: conversation.id,
          content,
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id
              ? {
                  ...c,
                  aiEnabled: result.conversationState.aiEnabled,
                  waitingForTrainer: result.conversationState.waitingForTrainer,
                  lastMessageAt: new Date().toISOString(),
                }
              : c,
          ),
        );
        await loadMessages(conversation.id, { showLoaderIfEmpty: false });
        if (result.assistantError) {
          setSendError("Mensagem enviada, mas a IA do personal não respondeu agora.");
        }
      } else {
        await sendChatMessage({
          conversationId: conversation.id,
          content,
          pageContext: buildDraftPageContext(activeDraft),
        });
        await loadMessages(conversation.id, { showLoaderIfEmpty: false });
        await refreshConversationsQuietly();
      }
    } catch (e: unknown) {
      setSendError(getChatErrorMessage(e, "Não foi possível enviar a mensagem."));
    } finally {
      setIsSending(false);
    }
  }

  async function handleStarterClick(starter: PublicChatStarter) {
    if (isSending || isCreating) return;
    setSendError(null);
    setIsCreating(true);
    let createdConversationId: string | null = null;
    let sendSucceeded = false;
    try {
      const created = await createChatConversation({
        conversationType: "move_ai_private",
        title: starter.title,
      });
      const conversation = created.conversation;
      createdConversationId = conversation.id;
      setConversations((prev) => [conversation, ...prev]);
      setSelectedConversationId(conversation.id);
      setDraftConversation(null);
      setDraftMessages([]);
      setMobileView("chat");
      setIsCreating(false);

      setIsSending(true);
      const optimistic = createOptimisticMessage(conversation.id, starter.title, me.user.id);
      setMessagesByConversationId((prev) => ({ ...prev, [conversation.id]: [optimistic] }));
      await sendChatMessage({
        conversationId: conversation.id,
        starterId: starter.id,
        pageContext: PAGE_CONTEXT,
      });
      sendSucceeded = true;
      await loadMessages(conversation.id, { showLoaderIfEmpty: false });
      await refreshConversationsQuietly();
    } catch (e: unknown) {
      if (createdConversationId && !sendSucceeded) {
        await discardOrphanConversation(createdConversationId);
        setSendError("Não foi possível iniciar o tema sugerido agora. Tente novamente.");
      } else {
        setSendError(getChatErrorMessage(e, "Não foi possível enviar o tema sugerido."));
      }
    } finally {
      setIsCreating(false);
      setIsSending(false);
    }
  }

  // Removes an orphan IA Move conversation created by an auto-send whose first
  // send failed before any message was persisted. Soft-deletes on the backend
  // (best-effort) and clears it from local list/cache, returning to the hub.
  async function discardOrphanConversation(conversationId: string) {
    try {
      await deleteEmptyConversation(conversationId);
    } catch {
      // Best-effort: even if the backend delete fails, drop it locally.
    }
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setMessagesByConversationId((prev) => {
      if (!(conversationId in prev)) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    setSelectedConversationId((prev) => (prev === conversationId ? null : prev));
    setContextHint(null);
    setMobileView("list");
  }

  // Auto-send a contextual trigger (Task 10d): create the move_ai conversation
  // and immediately send content + contextTrigger so the backend can enrich it.
  async function autoSendContextTrigger(intent: ChatTriggerIntent) {
    if (isSending || isCreating) return;
    setSendError(null);
    setIsCreating(true);
    let createdConversationId: string | null = null;
    let sendSucceeded = false;
    try {
      const created = await createChatConversation({
        conversationType: "move_ai_private",
        title: intent.title || intent.visibleMessage || "Nova conversa",
        contextModule: intent.contextModule,
        contextLabel: intent.contextLabel,
      });
      const conversation = created.conversation;
      createdConversationId = conversation.id;
      setConversations((prev) => [conversation, ...prev]);
      setSelectedConversationId(conversation.id);
      setDraftConversation(null);
      setDraftMessages([]);
      setContextHint(intent.contextLabel ? `Contexto: ${intent.contextLabel}` : null);
      setMobileView("chat");
      setIsCreating(false);

      setIsSending(true);
      const optimistic = createOptimisticMessage(
        conversation.id,
        intent.visibleMessage,
        me.user.id,
      );
      setMessagesByConversationId((prev) => ({ ...prev, [conversation.id]: [optimistic] }));
      await sendChatMessage({
        conversationId: conversation.id,
        content: intent.visibleMessage,
        contextTrigger: intent.contextTrigger,
        pageContext: {
          currentRoute: intent.sourceRoute || PAGE_CONTEXT.currentRoute,
          module: intent.contextModule || PAGE_CONTEXT.module,
          pageTitle: intent.contextLabel || PAGE_CONTEXT.pageTitle,
          entityId: intent.entityId,
        },
      });
      sendSucceeded = true;
      await loadMessages(conversation.id, { showLoaderIfEmpty: false });
      await refreshConversationsQuietly();
    } catch (e: unknown) {
      // Only discard a conversation that was created in THIS attempt and whose
      // send never persisted a message (failure before sendSucceeded).
      if (createdConversationId && !sendSucceeded) {
        await discardOrphanConversation(createdConversationId);
        setSendError(
          "Não foi possível iniciar essa conversa contextual agora. Tente novamente.",
        );
      } else {
        setSendError(getChatErrorMessage(e, "Não foi possível enviar a mensagem."));
      }
    } finally {
      setIsCreating(false);
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    // If a visible-context override is pending and the user left the input
    // unedited, send the enriched text instead. One-shot: cleared after use.
    let effectiveContent = content;
    if (pendingSendOverride) {
      if (content === pendingSendOverride.base.trim()) {
        effectiveContent = pendingSendOverride.override;
      }
      setPendingSendOverride(null);
    }

    if (draftConversation) {
      void sendFromDraft(draftConversation, effectiveContent);
      return;
    }
    if (selectedConversation) {
      void sendToConversation(selectedConversation, effectiveContent);
    }
  }

  /* ── contextual trigger intent (Task 10b) ── */

  // Keep the apply function fresh (closes over current conversations/starters/handlers).
  // This effect only assigns a ref — it never calls setState synchronously.
  useEffect(() => {
    applyIntentRef.current = (intent: ChatTriggerIntent) => {
      if (intent.target === "move_ai") {
        // autoSend + contextTrigger: create the conversation and send right away
        // so the backend enriches the message. The front sends only id + entityId.
        if (intent.autoSend && intent.contextTrigger) {
          void autoSendContextTrigger(intent);
          return;
        }
        // With a starterId, reuse the existing safe starter flow so the rich
        // prePrompt stays server-side and is never exposed/sent raw by the front.
        if (intent.starterId) {
          const starter = starters.find(
            (s) => s.id === intent.starterId && s.target === "move_ai",
          );
          if (starter) {
            void handleStarterClick(starter);
            return;
          }
          // Unknown starter → fall through to a pre-filled draft.
        }
        openDraft({
          conversationType: "move_ai_private",
          title: intent.title || intent.visibleMessage || "Nova conversa",
          contextModule: intent.contextModule,
          contextLabel: intent.contextLabel,
          sourceRoute: intent.sourceRoute,
          entityId: intent.entityId,
        });
        setDraft(intent.visibleMessage);
        setContextHint(intent.contextLabel ? `Contexto: ${intent.contextLabel}` : null);
        return;
      }

      // trainer_chat: never guess the destination.
      if (!intent.trainerUserId && !intent.studentUserId) {
        setSendError("Não foi possível abrir a conversa com contexto: destino não informado.");
        return;
      }

      const existing = conversations.find(
        (c) =>
          c.conversationType === "trainer_chat" &&
          ((intent.studentUserId && c.studentUserId === intent.studentUserId) ||
            (intent.trainerUserId && c.trainerUserId === intent.trainerUserId)),
      );

      // Visible-context override (trainer_chat only): input stays simple, but the
      // first send uses the enriched text so the personal sees the context.
      const overrideForSend =
        intent.sendMessageOverride && intent.sendMessageOverride !== intent.visibleMessage
          ? { base: intent.visibleMessage, override: intent.sendMessageOverride }
          : null;

      if (existing) {
        selectConversation(existing.id);
        setDraft(intent.visibleMessage);
        setContextHint(intent.contextLabel ? `Contexto: ${intent.contextLabel}` : null);
        setPendingSendOverride(overrideForSend);
        return;
      }

      openDraft({
        conversationType: "trainer_chat",
        title: intent.title || intent.visibleMessage || "Conversa",
        trainerUserId: intent.trainerUserId,
        studentUserId: intent.studentUserId,
        recipientLabel: intent.contextLabel,
        contextModule: intent.contextModule,
        contextLabel: intent.contextLabel,
        sourceRoute: intent.sourceRoute,
        entityId: intent.entityId,
      });
      setDraft(intent.visibleMessage);
      setContextHint(intent.contextLabel ? `Contexto: ${intent.contextLabel}` : null);
      setPendingSendOverride(overrideForSend);
    };
  });

  // Consume the pending intent once, after conversations/starters are loaded.
  useEffect(() => {
    if (loadState !== "ready") return;
    const id = window.setTimeout(() => {
      if (intentHandledRef.current) return;
      intentHandledRef.current = true;
      const intent = consumeChatTriggerIntent();
      if (intent) applyIntentRef.current(intent);
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadState]);

  /* ── derived view state ── */

  const hasActiveTarget = Boolean(selectedConversation) || Boolean(draftConversation);
  const isTrainerChatActive =
    (draftConversation?.conversationType ?? selectedConversation?.conversationType) ===
    "trainer_chat";

  const activeMessages: ChatMessage[] = draftConversation
    ? draftMessages
    : selectedConversationId
      ? (messagesByConversationId[selectedConversationId] ?? [])
      : [];

  const panelTitle = draftConversation
    ? draftConversation.title
    : (selectedConversation?.title ?? "Conversa");

  const panelSubtitle = isTrainerChatActive
    ? isTrainer
      ? "Conversa com aluno"
      : "Conversa com personal"
    : "IA Move privada";

  const draftHint = draftConversation
    ? draftConversation.conversationType === "trainer_chat"
      ? `Envie a primeira mensagem para ${draftConversation.recipientLabel ?? "seu contato"}.`
      : "Comece uma conversa com a IA Move."
    : null;

  const expectsAiReply = isTrainerChatActive
    ? !isTrainer &&
      (selectedConversation
        ? selectedConversation.aiEnabled && !selectedConversation.waitingForTrainer
        : true)
    : true;
  const showResponding = isSending && expectsAiReply && hasActiveTarget;
  const respondingLabel = isTrainerChatActive
    ? "IA do personal está respondendo..."
    : "IA Move está respondendo...";

  const isLoadingActive =
    !draftConversation && selectedConversation
      ? loadingConversationId === selectedConversation.id
      : false;

  const badgeNode =
    !draftConversation && selectedConversation?.conversationType === "trainer_chat" ? (
      <AiStateBadge conversation={selectedConversation} />
    ) : null;

  const headerRightNode =
    !draftConversation &&
    selectedConversation?.conversationType === "trainer_chat" &&
    isTrainer ? (
      <AiToggleButton
        conversation={selectedConversation}
        isUpdating={isUpdatingAiState}
        onAction={handleUpdateAiState}
      />
    ) : null;

  const bannerNode =
    !draftConversation && selectedConversation?.conversationType === "trainer_chat" ? (
      <TrainerChatBanner
        conversation={selectedConversation}
        isTrainer={isTrainer}
        isUpdating={isUpdatingAiState}
        onAction={handleUpdateAiState}
      />
    ) : null;

  const scrollKey = draftConversation ? "draft" : (selectedConversation?.id ?? "none");
  const isBusy = isSending || isCreating;

  /* ── loading / error screens ── */
  if (loadState === "loading") return <FullLoading />;
  if (loadState === "error") {
    return (
      <FullError
        message={errorMessage ?? "Não foi possível carregar o chat."}
        onRetry={() => void loadInitialData()}
      />
    );
  }

  return (
    <>
      {/* ───────────── Mobile ───────────── */}
      <div className="lg:hidden">
        {mobileView === "chat" && hasActiveTarget ? (
          <div className="h-[calc(100svh-176px)] overflow-hidden rounded-2xl border border-border bg-surface">
            <ConversationPanel
              title={panelTitle}
              subtitle={panelSubtitle}
              badge={badgeNode}
              headerRight={headerRightNode}
              banner={bannerNode}
              onBack={goToHub}
              messages={activeMessages}
              isLoading={isLoadingActive}
              showResponding={showResponding}
              respondingLabel={respondingLabel}
              draftHint={draftHint}
              contextHint={contextHint}
              sendError={sendError}
              draft={draft}
              isSending={isSending}
              onDraftChange={setDraft}
              onSubmit={handleSubmit}
              inputId="chat-input-mobile"
              scrollKey={scrollKey}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Chat Move</h1>
              <p className="mt-0.5 text-xs text-muted">IA Move e conversas com personal</p>
            </div>
            <HubActions
              isCreating={isBusy}
              onNewMoveAi={startMoveAiDraft}
              onOpenPicker={() => setIsPickerOpen(true)}
              onStartWithTrainer={startTrainerChatWithTrainer}
            />
            <HubWelcome
              starters={starters}
              isBusy={isBusy}
              onStarterClick={(s) => void handleStarterClick(s)}
            />
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Conversas recentes
              </p>
              <RecentConversations
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                isTrainer={isTrainer}
                onSelect={selectConversation}
              />
            </div>
          </div>
        )}
      </div>

      {/* ───────────── Desktop ───────────── */}
      <div className="hidden lg:block lg:h-[calc(100vh-4rem)]">
        <div className="grid h-full grid-cols-[280px_minmax(0,1fr)] gap-4">
          {/* Sidebar */}
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border p-3">
              <HubActions
                isCreating={isBusy}
                onNewMoveAi={startMoveAiDraft}
                onOpenPicker={() => setIsPickerOpen(true)}
                onStartWithTrainer={startTrainerChatWithTrainer}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Conversas
              </p>
              <RecentConversations
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                isTrainer={isTrainer}
                onSelect={selectConversation}
              />
            </div>
          </aside>

          {/* Right panel: hub or conversation */}
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
            {hasActiveTarget ? (
              <ConversationPanel
                title={panelTitle}
                subtitle={panelSubtitle}
                badge={badgeNode}
                headerRight={headerRightNode}
                banner={bannerNode}
                messages={activeMessages}
                isLoading={isLoadingActive}
                showResponding={showResponding}
                respondingLabel={respondingLabel}
                draftHint={draftHint}
                contextHint={contextHint}
                sendError={sendError}
                draft={draft}
                isSending={isSending}
                onDraftChange={setDraft}
                onSubmit={handleSubmit}
                inputId="chat-input-desktop"
                scrollKey={scrollKey}
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-10">
                <div className="mx-auto max-w-xl">
                  <HubWelcome
                    starters={starters}
                    isBusy={isBusy}
                    onStarterClick={(s) => void handleStarterClick(s)}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Student picker overlay */}
      {isPickerOpen && (
        <StudentPickerModal
          onSelect={startTrainerChatWithStudent}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </>
  );
}
