/**
 * Chat contextual trigger intent (Task 10b).
 *
 * Front-only infrastructure that lets any screen ask `/app/chat` to open a
 * specific experience (IA Move or trainer_chat) with a pre-filled, user-visible
 * message and an opaque context label. It deliberately carries NO rich payload:
 * `entityId` is an opaque string and must never be resolved here, and no
 * sensitive data (scan results, body metrics, photos, personal data) is stored.
 *
 * The intent is handed off through `sessionStorage` (not `localStorage`) so it
 * never leaks across browser sessions, and it is consumed exactly once.
 */

export type ChatTriggerTarget = "move_ai" | "trainer_chat";

export type ChatTriggerIntent = {
  /** Stable identifier of the trigger that produced this intent. */
  id: string;
  target: ChatTriggerTarget;
  /** The text shown to the user (pre-filled in the input). Kept simple/natural. */
  visibleMessage: string;
  /** Optional conversation title. */
  title?: string;
  /** Opaque context labels (used only as light hints / conversation labels). */
  contextModule?: string;
  contextLabel?: string;
  sourceRoute?: string;
  /** Opaque entity id — never resolved on the front in this task. */
  entityId?: string;
  /** Only meaningful for `target === "move_ai"`. */
  starterId?: string;
  /** Only meaningful for `target === "trainer_chat"`. */
  trainerUserId?: string;
  studentUserId?: string;
  /** When true, /app/chat sends the message automatically instead of pre-filling. */
  autoSend?: boolean;
  /**
   * Visible-context override for trainer_chat: the input shows `visibleMessage`,
   * but the FIRST send uses this enriched text (so the personal sees the context).
   * Only used for trainer_chat; never alters IA Move triggers.
   */
  sendMessageOverride?: string;
  /** Server-side contextual trigger: front sends only id + opaque entityId. */
  contextTrigger?: {
    id: string;
    entityId: string;
  };
};

const STORAGE_KEY = "move.chat.triggerIntent.v1";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isChatTriggerIntent(value: unknown): value is ChatTriggerIntent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isString(candidate.id) &&
    (candidate.target === "move_ai" || candidate.target === "trainer_chat") &&
    isString(candidate.visibleMessage) &&
    isOptionalString(candidate.title) &&
    isOptionalString(candidate.contextModule) &&
    isOptionalString(candidate.contextLabel) &&
    isOptionalString(candidate.sourceRoute) &&
    isOptionalString(candidate.entityId) &&
    isOptionalString(candidate.starterId) &&
    isOptionalString(candidate.trainerUserId) &&
    isOptionalString(candidate.studentUserId) &&
    isOptionalString(candidate.sendMessageOverride)
  );
}

/** Persists a contextual intent to be consumed by `/app/chat`. */
export function saveChatTriggerIntent(intent: ChatTriggerIntent): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // sessionStorage may be unavailable (private mode / quota). Fail silently.
  }
}

/**
 * Reads and removes the pending intent. Always clears the key — even when the
 * stored value is invalid — so a bad/old intent can never get stuck.
 */
export function consumeChatTriggerIntent(): ChatTriggerIntent | null {
  if (typeof window === "undefined") {
    return null;
  }

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore removal failures.
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isChatTriggerIntent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Clears any pending intent without consuming it. */
export function clearChatTriggerIntent(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore removal failures.
  }
}
