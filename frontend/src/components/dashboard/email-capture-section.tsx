"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getProCtaLabel, type BillingStatus } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type EmailCaptureSectionProps = {
  enabled: boolean;
  heading: string;
  onChange: (next: { enabled: boolean; heading: string }) => void;
};

export function EmailCaptureSection({ enabled, heading, onChange }: EmailCaptureSectionProps) {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch<BillingStatus>("/api/billing/status").then(setBilling).catch(() => setBilling(null));
  }, []);

  const isPremium = Boolean(billing?.is_premium);

  const save = async (nextEnabled: boolean, nextHeading: string) => {
    if (!isPremium) return;
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/api/profile/email-capture", {
        method: "PATCH",
        body: JSON.stringify({
          email_capture_enabled: nextEnabled,
          email_capture_heading: nextHeading.trim() || "Join my newsletter",
        }),
      });
      onChange({ enabled: nextEnabled, heading: nextHeading.trim() || "Join my newsletter" });
      setMessage("Email capture settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-emerald-600" />
          Email capture
          {!isPremium ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Crown className="h-3 w-3" /> Pro
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPremium ? (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm text-muted-foreground">
              Collect emails from visitors with a newsletter block on your profile.
            </p>
            <Link href="/upgrade" className="mt-3 inline-flex">
              <Button size="sm">{getProCtaLabel(billing?.trial_used)}</Button>
            </Link>
          </div>
        ) : (
          <>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Show email capture on profile</span>
              <input
                type="checkbox"
                checked={enabled}
                disabled={saving}
                onChange={(event) => {
                  const nextEnabled = event.target.checked;
                  onChange({ enabled: nextEnabled, heading });
                  void save(nextEnabled, heading);
                }}
                className="h-4 w-4 accent-emerald-600"
              />
            </label>
            <Input
              label="Heading"
              value={heading}
              disabled={!enabled || saving}
              placeholder="Join my newsletter"
              onChange={(event) => onChange({ enabled, heading: event.target.value })}
              onBlur={() => {
                if (enabled) void save(enabled, heading);
              }}
            />
          </>
        )}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
