"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { type NotificationListResponse } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = () =>
    apiFetch<NotificationListResponse>("/api/notifications?page=1&page_size=8")
      .then(setData)
      .catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      await load();
    } catch {
      // ignore
    }
  };

  const unread = data?.unread_count ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {data?.items.length ? (
              data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.is_read) void markRead(item.id);
                  }}
                  className={cn(
                    "block w-full border-b border-border px-4 py-3 text-left text-sm transition hover:bg-secondary/60",
                    !item.is_read && "bg-emerald-50/50 dark:bg-emerald-950/20"
                  )}
                >
                  <p className="font-medium capitalize">{item.type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
