"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ANNOUNCEMENT_MAX_LENGTH = 150;

type AnnouncementSectionProps = {
  enabled: boolean;
  text: string;
  onChange: (next: { enabled: boolean; text: string }) => void;
};

export function AnnouncementSection({ enabled, text, onChange }: AnnouncementSectionProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async (nextEnabled: boolean, nextText: string) => {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/api/profile/announcement", {
        method: "PATCH",
        body: JSON.stringify({
          announcement_enabled: nextEnabled,
          announcement_text: nextText.trim() || null,
        }),
      });
      onChange({ enabled: nextEnabled, text: nextText.trim() });
      setMessage("Announcement saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const remaining = ANNOUNCEMENT_MAX_LENGTH - text.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-600" />
          Announcement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pin a short update at the top of your profile — new release, event, or promo.
        </p>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
          <span className="text-sm font-medium">Show announcement on profile</span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={(event) => {
              const nextEnabled = event.target.checked;
              onChange({ enabled: nextEnabled, text });
              void save(nextEnabled, text);
            }}
            className="h-4 w-4 accent-emerald-600"
          />
        </label>
        <div className="space-y-2">
          <label htmlFor="announcement-text" className="text-sm font-medium">
            Message
          </label>
          <textarea
            id="announcement-text"
            value={text}
            maxLength={ANNOUNCEMENT_MAX_LENGTH}
            disabled={!enabled || saving}
            rows={3}
            placeholder="e.g. New single out now — link below!"
            onChange={(event) => onChange({ enabled, text: event.target.value })}
            onBlur={() => {
              if (enabled) void save(enabled, text);
            }}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className={`text-xs ${remaining < 20 ? "text-amber-600" : "text-muted-foreground"}`}>
            {remaining} characters remaining
          </p>
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
