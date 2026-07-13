"use client";

import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import type { ThemeSettings } from "@/types/database";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { normalizeTheme } from "@/lib/profile-theme";
import { ThemePresetSwatch } from "@/components/dashboard/profile-live-preview";
import { Button } from "@/components/ui/button";
import { getProCtaLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

type ThemePresetPickerProps = {
  theme: ThemeSettings;
  onSelect: (theme: ThemeSettings) => void;
  isPremium?: boolean;
};

export function ThemePresetPicker({ theme, onSelect, isPremium = false }: ThemePresetPickerProps) {
  const activeId = theme.presetId;

  return (
    <div className="space-y-3">
      {!isPremium ? (
        <p className="text-xs text-muted-foreground">
          All theme presets are included with Pro. Free accounts can customize solid backgrounds, filled & outline buttons, and Inter / DM Sans fonts below.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_PRESETS.map((preset) => {
          const selected = activeId === preset.id;
          const locked = !isPremium;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={locked}
              onClick={() => {
                if (!locked) onSelect(normalizeTheme({ ...preset.settings }));
              }}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
                locked
                  ? "cursor-not-allowed opacity-75"
                  : "hover:scale-[1.02]",
                selected && !locked
                  ? "border-emerald-500 ring-2 ring-emerald-500/25"
                  : "border-border hover:border-emerald-400/50"
              )}
            >
              {locked ? (
                <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
                  <Crown className="h-3 w-3" /> Pro
                </span>
              ) : null}
              <ThemePresetSwatch theme={preset.settings} />
              <div className="space-y-0.5 bg-card p-2.5">
                <p className="truncate text-xs font-semibold text-foreground">{preset.name}</p>
                <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{preset.description}</p>
              </div>
              {locked ? (
                <span className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {!isPremium ? (
        <Link href="/upgrade">
          <Button size="sm" variant="outline" className="w-full sm:w-auto">
            {getProCtaLabel()} — unlock presets
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
