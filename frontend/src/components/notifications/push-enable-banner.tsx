"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { isPushSupported, subscribeToPush } from "@/lib/web-push";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "push-banner-dismissed";

export function PushEnableBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (Notification.permission === "granted") return;

    apiFetch<{ has_push_subscription: boolean }>("/api/push/preferences")
      .then((prefs) => {
        if (!prefs.has_push_subscription) setVisible(true);
      })
      .catch(() => undefined);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await subscribeToPush();
      dismiss();
    } catch {
      // user can retry from settings
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Get activity updates in your browser</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Morning and evening stats, milestones, and billing alerts — even when Smasduq is closed.
          </p>
        </div>
      </div>
      <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto sm:self-auto">
        <Button size="sm" loading={busy} onClick={() => void enable()}>
          Enable notifications
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
