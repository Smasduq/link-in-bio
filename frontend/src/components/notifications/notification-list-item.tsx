"use client";

import {
  getNotificationPresentation,
  resolveNotificationCategory,
  type NotificationItem,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

type NotificationListItemProps = {
  item: NotificationItem;
  onMarkRead?: (id: string) => void;
  compact?: boolean;
};

export function NotificationListItem({ item, onMarkRead, compact = false }: NotificationListItemProps) {
  const category = resolveNotificationCategory(item);
  const { icon: Icon, label, iconClassName } = getNotificationPresentation(item.type, category);

  return (
    <button
      type="button"
      onClick={() => {
        if (!item.is_read) onMarkRead?.(item.id);
      }}
      className={cn(
        "flex w-full gap-3 text-left transition hover:bg-secondary/60",
        compact ? "border-b border-border px-4 py-3 text-sm last:border-b-0" : "px-4 py-4",
        !item.is_read && "bg-emerald-50/50 dark:bg-emerald-950/20"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary",
          compact && "h-8 w-8"
        )}
      >
        <Icon className={cn("h-4 w-4", iconClassName)} />
      </span>
      <span className="min-w-0 flex-1">
        <p className="font-medium capitalize">{label}</p>
        <p className={cn("text-muted-foreground", compact ? "mt-1" : "mt-1")}>{item.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
      </span>
    </button>
  );
}
