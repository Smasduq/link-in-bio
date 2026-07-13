"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { type NotificationFilter, type NotificationListResponse } from "@/lib/notifications";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/spinner";

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "billing", label: "Billing" },
  { id: "activity", label: "Activity" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(
    () =>
      apiFetch<NotificationListResponse>(
        `/api/notifications?page=1&page_size=30&category=${filter}`
      )
        .then(setData)
        .catch(() => setData(null)),
    [filter]
  );

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      await load();
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      await load();
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Notifications</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {data?.unread_count ? `${data.unread_count} unread` : "You're all caught up"}
          </p>
        </div>
        {data?.unread_count ? (
          <Button
            variant="outline"
            size="sm"
            loading={markingAll}
            onClick={() => void markAllRead()}
            className="w-full shrink-0 sm:w-auto"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="flex w-full min-w-0 gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition sm:py-1.5 sm:text-sm",
              filter === item.id
                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        {data?.items.length ? (
          <ul>
            {data.items.map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <NotificationListItem item={item} onMarkRead={markRead} compact />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-4 py-10 text-center sm:py-16">
            <Bell className="h-8 w-8 text-muted-foreground sm:h-10 sm:w-10" />
            <p className="mt-3 text-sm font-semibold sm:mt-4 sm:text-base">No notifications yet</p>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground sm:mt-2 sm:text-sm">
              Billing updates and activity summaries will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
