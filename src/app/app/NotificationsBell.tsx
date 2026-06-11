"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Dumbbell, Loader2, MessageCircle, RefreshCw } from "lucide-react";

import type { AppNotification, NotificationType } from "@/bff/modules/notifications/types";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications/notificationService";

type PanelState = "loading" | "ready" | "error";

const TYPE_ICON: Record<NotificationType, typeof MessageCircle> = {
  chat_message_received: MessageCircle,
  workout_assigned: Dumbbell,
};

/** Reads metadata.conversationId (Json-safe), falling back to targetEntityId. */
function readConversationId(notification: AppNotification): string | null {
  const metadata = notification.metadata;
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata) &&
    typeof metadata.conversationId === "string" &&
    metadata.conversationId
  ) {
    return metadata.conversationId;
  }
  return notification.targetEntityId;
}

/** Chat notifications deep-link to their conversation (covers legacy rows
 *  created with a plain "/app/chat" target_path). */
function resolveTargetPath(notification: AppNotification): string | null {
  if (notification.type === "chat_message_received") {
    const conversationId = readConversationId(notification);
    if (conversationId) {
      return `/app/chat?conversationId=${encodeURIComponent(conversationId)}`;
    }
  }
  return notification.targetPath;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick: (notification: AppNotification) => void;
}) {
  const Icon = TYPE_ICON[notification.type] ?? Bell;
  const isUnread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={[
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover",
        isUnread ? "bg-accent-soft/40" : "",
      ].join(" ")}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent">
        <Icon size={15} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
          {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
        </div>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{notification.body}</p>
        )}
        <p className="mt-1 text-[11px] text-muted">{formatWhen(notification.createdAt)}</p>
      </div>
    </button>
  );
}

export function NotificationsBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>("loading");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // Non-critical: keep last known count on failure.
    }
  }, []);

  // Initial unread count on mount (deferred to avoid a synchronous effect setState).
  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshUnreadCount();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshUnreadCount]);

  const loadList = useCallback(async () => {
    setPanelState("loading");
    try {
      const result = await listNotifications({ limit: 20 });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setPanelState("ready");
    } catch {
      setPanelState("error");
    }
  }, []);

  function handleOpen() {
    setIsOpen(true);
    void loadList();
  }

  async function handleItemClick(notification: AppNotification) {
    setIsOpen(false);

    if (notification.readAt === null) {
      // Optimistic: reflect read state immediately.
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      void markNotificationRead(notification.id).catch(() => {
        // Best-effort: re-sync the count if the request failed.
        void refreshUnreadCount();
      });
    }

    const targetPath = resolveTargetPath(notification);
    if (targetPath) {
      router.push(targetPath);
    }
  }

  async function handleMarkAll() {
    setNotifications((prev) =>
      prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })),
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      void refreshUnreadCount();
    }
  }

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <>
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        aria-label={
          unreadCount > 0
            ? `Notificações, ${unreadCount} não lida${unreadCount !== 1 ? "s" : ""}`
            : "Notificações"
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Bell size={20} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-on">
            {badgeLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Notificações"
            className="absolute right-3 top-16 flex max-h-[70vh] w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Notificações</p>
              {notifications.some((n) => n.readAt === null) && (
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  <CheckCheck size={13} />
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {panelState === "loading" && (
                <div className="flex items-center justify-center gap-2 py-10">
                  <Loader2 size={16} className="animate-spin text-accent" />
                  <span className="text-sm text-muted">Carregando...</span>
                </div>
              )}

              {panelState === "error" && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm text-muted">Não foi possível carregar as notificações.</p>
                  <button
                    type="button"
                    onClick={() => void loadList()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    <RefreshCw size={12} />
                    Tentar novamente
                  </button>
                </div>
              )}

              {panelState === "ready" && notifications.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-strong text-muted">
                    <Bell size={18} strokeWidth={1.6} />
                  </div>
                  <p className="text-sm text-muted">Nenhuma notificação por enquanto.</p>
                </div>
              )}

              {panelState === "ready" && notifications.length > 0 && (
                <ul className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <NotificationItem notification={notification} onClick={handleItemClick} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
