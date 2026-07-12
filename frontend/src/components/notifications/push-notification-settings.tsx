"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/web-push";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationPreferences = {
  email_billing_enabled: boolean;
  email_engagement_enabled: boolean;
  push_billing_enabled: boolean;
  push_engagement_enabled: boolean;
  has_push_subscription: boolean;
};

export function PushNotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = () =>
    apiFetch<NotificationPreferences>("/api/push/preferences")
      .then(setPrefs)
      .catch(() => setPrefs(null));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs || key === "has_push_subscription") return;
    setBusy(true);
    setMessage("");
    try {
      const updated = await apiFetch<NotificationPreferences>("/api/push/preferences", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
      setPrefs(updated);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setBusy(false);
    }
  };

  const enablePush = async () => {
    setBusy(true);
    setMessage("");
    try {
      const ok = await subscribeToPush();
      if (!ok) {
        setMessage("Notification permission was denied.");
      } else {
        setMessage("Browser notifications enabled.");
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    setMessage("");
    try {
      await unsubscribeFromPush();
      setMessage("Browser notifications disabled.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  const pushSupported = isPushSupported();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-600" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pushSupported ? (
          <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Browser notifications</p>
              <p className="text-xs text-muted-foreground">
                {prefs?.has_push_subscription
                  ? "You will receive alerts even when this tab is closed."
                  : "Enable to get morning/evening stats and billing alerts on this device."}
              </p>
            </div>
            {prefs?.has_push_subscription ? (
              <Button variant="outline" size="sm" loading={busy} onClick={() => void disablePush()}>
                <BellOff className="h-4 w-4" />
                Disable
              </Button>
            ) : (
              <Button size="sm" loading={busy} onClick={() => void enablePush()}>
                <Bell className="h-4 w-4" />
                Enable
              </Button>
            )}
          </div>
        )}

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
          <PrefToggle
            label="Billing & subscription"
            checked={prefs?.email_billing_enabled ?? true}
            disabled={busy}
            onChange={(value) => void updatePref("email_billing_enabled", value)}
          />
          <PrefToggle
            label="Activity & insights"
            checked={prefs?.email_engagement_enabled ?? true}
            disabled={busy}
            onChange={(value) => void updatePref("email_engagement_enabled", value)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Push</p>
          <PrefToggle
            label="Billing & subscription"
            checked={prefs?.push_billing_enabled ?? true}
            disabled={busy || !prefs?.has_push_subscription}
            onChange={(value) => void updatePref("push_billing_enabled", value)}
          />
          <PrefToggle
            label="Activity & insights"
            checked={prefs?.push_engagement_enabled ?? true}
            disabled={busy || !prefs?.has_push_subscription}
            onChange={(value) => void updatePref("push_engagement_enabled", value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PrefToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
      />
    </label>
  );
}
