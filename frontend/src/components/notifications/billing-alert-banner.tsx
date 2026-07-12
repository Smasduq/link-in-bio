"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BANNER_NOTIFICATION_TYPES, type NotificationListResponse } from "@/lib/notifications";
import { Button } from "@/components/ui/button";

export function BillingAlertBanner() {
  const [notification, setNotification] = useState<{ id: string; message: string } | null>(null);

  const loadBanner = () =>
    apiFetch<NotificationListResponse>("/api/notifications?page=1&page_size=20")
      .then((data) => {
        const match = data.items.find(
          (item) => !item.is_read && BANNER_NOTIFICATION_TYPES.has(item.type)
        );
        setNotification(match ? { id: match.id, message: match.message } : null);
      })
      .catch(() => undefined);

  useEffect(() => {
    loadBanner();
  }, []);

  const dismiss = async () => {
    if (!notification) return;
    try {
      await apiFetch(`/api/notifications/${notification.id}/read`, { method: "POST" });
    } catch {
      // still hide locally
    }
    setNotification(null);
  };

  if (!notification) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-950 dark:text-amber-100">{notification.message}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/dashboard/settings">
            <Button size="sm" variant="outline">
              Manage billing
            </Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Dismiss
          </Button>
        </div>
      </div>
      <button type="button" className="rounded-md p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300" onClick={dismiss} aria-label="Dismiss banner">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
