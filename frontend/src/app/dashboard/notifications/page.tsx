"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { type NotificationListResponse } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/spinner";

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    apiFetch<NotificationListResponse>("/api/notifications?page=1&page_size=30")
      .then(setData)
      .catch(() => setData(null));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      await load();
    } catch {
      // ignore
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          {data?.unread_count ? `${data.unread_count} unread` : "You're all caught up"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {data?.items.length ? (
          <ul>
            {data.items.map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!item.is_read) void markRead(item.id);
                  }}
                  className={cn(
                    "block w-full px-4 py-4 text-left text-sm transition hover:bg-secondary/60",
                    !item.is_read && "bg-emerald-50/50 dark:bg-emerald-950/20"
                  )}
                >
                  <p className="font-medium capitalize">{item.type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-semibold">No notifications yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Billing and account updates will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
