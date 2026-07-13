"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { type NotificationListResponse } from "@/lib/notifications";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [desktopCoords, setDesktopCoords] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = () =>
    apiFetch<NotificationListResponse>("/api/notifications?page=1&page_size=8")
      .then(setData)
      .catch(() => undefined);

  useEffect(() => {
    setMounted(true);
    load();
  }, []);

  useEffect(() => {
    if (!open) return;

    const updateDesktopCoords = () => {
      if (!buttonRef.current || window.innerWidth < 768) {
        setDesktopCoords(null);
        return;
      }
      const rect = buttonRef.current.getBoundingClientRect();
      setDesktopCoords({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    };

    updateDesktopCoords();
    window.addEventListener("resize", updateDesktopCoords);
    window.addEventListener("scroll", updateDesktopCoords, true);

    const previous = document.body.style.overflow;
    const lockScroll = window.innerWidth < 768;
    if (lockScroll) document.body.style.overflow = "hidden";

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutside);

    return () => {
      if (lockScroll) document.body.style.overflow = previous;
      window.removeEventListener("resize", updateDesktopCoords);
      window.removeEventListener("scroll", updateDesktopCoords, true);
      document.removeEventListener("pointerdown", closeOnOutside);
    };
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

  const panel =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 z-[70] bg-black/30 md:hidden"
              onClick={() => setOpen(false)}
            />

            <div
              ref={panelRef}
              className={cn(
                "fixed z-[80] flex flex-col overflow-hidden border border-border bg-card shadow-lg",
                "max-md:left-[max(0.75rem,env(safe-area-inset-left,0px))]",
                "max-md:right-[max(0.75rem,env(safe-area-inset-right,0px))]",
                "max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px)+0.5rem)]",
                "max-md:max-h-[min(70dvh,28rem)] max-md:rounded-xl",
                "md:inset-x-auto md:bottom-auto md:max-h-80 md:rounded-xl md:w-72 lg:w-80"
              )}
              style={
                desktopCoords
                  ? { top: desktopCoords.top, right: desktopCoords.right }
                  : undefined
              }
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5 md:px-4 md:py-3">
                <p className="min-w-0 truncate text-sm font-semibold">Notifications</p>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/dashboard/notifications"
                    className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    onClick={() => setOpen(false)}
                  >
                    View all
                  </Link>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {data?.items.length ? (
                  data.items.map((item) => (
                    <NotificationListItem
                      key={item.id}
                      item={item}
                      compact
                      onMarkRead={markRead}
                    />
                  ))
                ) : (
                  <p className="px-3 py-5 text-sm text-muted-foreground md:px-4 md:py-6">
                    No notifications yet.
                  </p>
                )}
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) load();
            return next;
          });
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
      {panel}
    </>
  );
}
