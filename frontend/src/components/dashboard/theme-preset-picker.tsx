"use client";

import type { ThemeSettings } from "@/types/database";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { normalizeTheme } from "@/lib/profile-theme";
import { ThemePresetSwatch } from "@/components/dashboard/profile-live-preview";
import { cn } from "@/lib/utils";

type ThemePresetPickerProps = {
  theme: ThemeSettings;
  onSelect: (theme: ThemeSettings) => void;
};

export function ThemePresetPicker({ theme, onSelect }: ThemePresetPickerProps) {
  const activeId = theme.presetId;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {THEME_PRESETS.map((preset) => {
        const selected = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(normalizeTheme({ ...preset.settings }))}
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
              selected
                ? "border-emerald-500 ring-2 ring-emerald-500/25"
                : "border-border hover:border-emerald-400/50"
            )}
          >
            <ThemePresetSwatch theme={preset.settings} />
            <div className="space-y-0.5 bg-card p-2.5">
              <p className="truncate text-xs font-semibold text-foreground">{preset.name}</p>
              <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{preset.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
