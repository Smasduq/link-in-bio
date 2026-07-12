"use client";

import { Crown, LayoutGrid, Lock, Rows3 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isPremiumFromProfile } from "@/lib/premium-features";
import type { LayoutMode, Profile } from "@/types/database";
import { useUpgradeAfterSave } from "@/components/billing/upgrade-prompt-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LayoutSettingsProps = {
  profile: Profile;
  onUpdated: (profile: Profile) => void;
};

const OPTIONS: { id: LayoutMode; title: string; description: string; icon: typeof Rows3 }[] = [
  {
    id: "grouped",
    title: "Grouped sections",
    description: "Links, products, embeds, and newsletter in separate sections.",
    icon: Rows3,
  },
  {
    id: "freeform",
    title: "Freeform mixed ordering",
    description: "Drag all block types into one custom order on your page.",
    icon: LayoutGrid,
  },
];

export function LayoutSettings({ profile, onUpdated }: LayoutSettingsProps) {
  const isPremium = isPremiumFromProfile(profile);
  const promptUpgrade = useUpgradeAfterSave(isPremium);
  const storedMode = profile.layout_mode ?? "grouped";
  const currentMode = isPremium ? storedMode : "grouped";

  const selectMode = async (mode: LayoutMode) => {
    if (mode === "freeform" && !isPremium) {
      promptUpgrade("layout");
      return;
    }
    if (mode === currentMode) return;

    const updated = await apiFetch<Profile>("/api/content/layout", {
      method: "PATCH",
      body: JSON.stringify({ layout_mode: mode }),
    });
    onUpdated(updated);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-bold">Page layout</h2>
          <p className="text-sm text-muted-foreground">Choose how content blocks appear on your public profile.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isPro = option.id === "freeform";
            const selected = currentMode === option.id;
            const locked = isPro && !isPremium;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectMode(option.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition hover:border-emerald-500/50",
                  selected ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold">{option.title}</span>
                  </div>
                  {isPro ? (
                    locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        <Lock className="h-3 w-3" />
                        Pro
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        <Crown className="h-3 w-3" />
                        Pro
                      </span>
                    )
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>
        {!isPremium ? (
          <Button variant="outline" size="sm" onClick={() => promptUpgrade("layout")}>
            Upgrade to unlock freeform layout
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
