/**
 * Chat Context Triggers (Task 10d).
 *
 * A contextual trigger lets a screen ask the IA Move for a context-aware answer
 * while the front sends ONLY an opaque entityId + the user-visible message.
 * The backend resolves the trigger: it validates ownership, fetches real data
 * and builds the enriched (hidden) AI content. The hidden content is never
 * persisted as a message nor returned to the front.
 */

export type ChatContextTriggerInput = {
  /** Authenticated user id (resolved from the request, never from the body). */
  userId: string;
  /** Opaque entity id sent by the front (e.g. a student workout id). */
  entityId: string;
  /** The simple, user-facing message that will be stored in the chat. */
  visibleMessage: string;
};

export type ChatContextTriggerResult = {
  /** Persisted, user-facing message (kept simple). */
  visibleMessage: string;
  /** Enriched content (real context + task) for the FIRST turn. AI-only. */
  aiUserContent: string;
  /**
   * Data-only context block (no task framing) re-injected as a system message on
   * follow-up turns, so the conversation keeps the real context. AI-only.
   */
  persistentContext?: string;
  /** Optional short label for the conversation/context (no sensitive data). */
  contextLabel?: string;
};

/** A single trigger implementation. */
export interface ChatContextTriggerBuilder {
  readonly id: string;
  build(input: ChatContextTriggerInput): Promise<ChatContextTriggerResult>;
}

/** Resolves a trigger id to its enriched result (or throws if unsupported). */
export interface ChatContextTriggerResolver {
  resolve(
    triggerId: string,
    input: ChatContextTriggerInput,
  ): Promise<ChatContextTriggerResult>;
}
