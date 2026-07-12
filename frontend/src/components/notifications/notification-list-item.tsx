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
        "flex w-full gap-2.5 text-left transition hover:bg-secondary/60 sm:gap-3",
        compact ? "border-b border-border px-3 py-2.5 text-sm last:border-b-0 sm:px-4 sm:py-3" : "px-3 py-3 sm:px-4 sm:py-4",
        !item.is_read && "bg-emerald-50/50 dark:bg-emerald-950/20"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-secondary",
          compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8 sm:h-9 sm:w-9"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconClassName)} />
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{item.message}</p>
        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
          {new Date(item.created_at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </span>
    </button>
  );
}
