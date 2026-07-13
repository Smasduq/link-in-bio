"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

type FeatureFlag = {
  key: string;
  value: unknown;
  description: string | null;
};

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    apiFetch<{ items: FeatureFlag[] }>("/api/admin/settings/feature-flags")
      .then((data) => setFlags(data.items))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggleListFlag = async (flag: FeatureFlag, item: string) => {
    if (!Array.isArray(flag.value)) return;
    const next = flag.value.includes(item) ? flag.value.filter((v) => v !== item) : [...flag.value, item];
    await saveFlag(flag.key, next);
  };

  const saveFlag = async (key: string, value: unknown) => {
    setSavingKey(key);
    setError("");
    try {
      await apiFetch(`/api/admin/settings/feature-flags/${key}`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  const renderFlagEditor = (flag: FeatureFlag) => {
    if (flag.key === "free_product_limit" || flag.key === "premium_analytics_days") {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="h-10 w-24 rounded-xl border border-input px-3 text-sm"
            defaultValue={Number(flag.value)}
            onBlur={(e) => saveFlag(flag.key, Number(e.target.value))}
          />
          {savingKey === flag.key ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
        </div>
      );
    }

    if (Array.isArray(flag.value)) {
      const presets: Record<string, string[]> = {
        pro_button_styles: ["glass", "rounded", "square", "filled", "outline"],
        pro_background_types: ["gradient", "pattern", "image", "solid"],
        pro_preset_ids: [
          "midnight-glass",
          "paper-ink",
          "sunset-pop",
          "terminal",
          "botanical",
          "neon-grid",
        ],
      };
      const options = presets[flag.key] || flag.value;
      const active = new Set(flag.value as string[]);
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={active.has(item) ? "primary" : "secondary"}
              loading={savingKey === flag.key}
              onClick={() => toggleListFlag(flag, item)}
            >
              {item}
            </Button>
          ))}
        </div>
      );
    }

    return <pre className="text-xs">{JSON.stringify(flag.value, null, 2)}</pre>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Feature flags control premium gating without redeploying code.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <Card key={flag.key}>
              <CardHeader>
                <CardTitle className="font-mono text-base">{flag.key}</CardTitle>
                {flag.description ? <CardDescription>{flag.description}</CardDescription> : null}
              </CardHeader>
              <CardContent>{renderFlagEditor(flag)}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
