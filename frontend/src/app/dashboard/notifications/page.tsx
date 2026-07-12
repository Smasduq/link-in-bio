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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {data?.unread_count ? `${data.unread_count} unread` : "You're all caught up"}
          </p>
        </div>
        {data?.unread_count ? (
          <Button variant="outline" size="sm" loading={markingAll} onClick={() => void markAllRead()}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              filter === item.id
                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {data?.items.length ? (
          <ul>
            {data.items.map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <NotificationListItem item={item} onMarkRead={markRead} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-semibold">No notifications yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Billing updates and activity summaries will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
