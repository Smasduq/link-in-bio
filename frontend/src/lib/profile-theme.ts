import type { CSSProperties } from "react";
import type { ThemeSettings } from "@/types/database";
import { getThemePresetById } from "@/lib/theme-presets";

/** Google Fonts registry — keyed by display name. */
export const GOOGLE_FONT_REGISTRY: Record<string, { google: string; family: string }> = {
  Inter: {
    google: "Inter:wght@400;500;600;700",
    family: "'Inter', system-ui, sans-serif",
  },
  "DM Sans": {
    google: "DM+Sans:wght@400;500;600;700",
    family: "'DM Sans', system-ui, sans-serif",
  },
  "Playfair Display": {
    google: "Playfair+Display:wght@400;600;700",
    family: "'Playfair Display', Georgia, serif",
  },
  "Space Grotesk": {
    google: "Space+Grotesk:wght@400;500;600;700",
    family: "'Space Grotesk', system-ui, sans-serif",
  },
  Outfit: {
    google: "Outfit:wght@400;500;600;700",
    family: "'Outfit', system-ui, sans-serif",
  },
  Fraunces: {
    google: "Fraunces:opsz,wght@9..144,400;600;700",
    family: "'Fraunces', Georgia, serif",
  },
  Fredoka: {
    google: "Fredoka:wght@400;500;600;700",
    family: "'Fredoka', system-ui, sans-serif",
  },
  "JetBrains Mono": {
    google: "JetBrains+Mono:wght@400;500;600;700",
    family: "'JetBrains Mono', ui-monospace, monospace",
  },
  Lora: {
    google: "Lora:wght@400;500;600;700",
    family: "'Lora', Georgia, serif",
  },
  "Nunito Sans": {
    google: "Nunito+Sans:wght@400;500;600;700",
    family: "'Nunito Sans', system-ui, sans-serif",
  },
  Oswald: {
    google: "Oswald:wght@400;500;600;700",
    family: "'Oswald', system-ui, sans-serif",
  },
};

/** @deprecated Legacy preset keys — mapped during normalizeTheme. */
export const FONT_PRESETS = {
  inter: GOOGLE_FONT_REGISTRY.Inter,
  "dm-sans": GOOGLE_FONT_REGISTRY["DM Sans"],
  playfair: GOOGLE_FONT_REGISTRY["Playfair Display"],
  "space-grotesk": GOOGLE_FONT_REGISTRY["Space Grotesk"],
  outfit: GOOGLE_FONT_REGISTRY.Outfit,
} as const;

export type FontPreset = keyof typeof FONT_PRESETS;

export const GRADIENT_PRESETS = [
  { label: "Aurora", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { label: "Ocean", value: "linear-gradient(160deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)" },
  { label: "Forest", value: "linear-gradient(145deg, #134e4a 0%, #064e3b 50%, #022c22 100%)" },
  { label: "Midnight", value: "linear-gradient(180deg, #0f172a 0%, #020617 100%)" },
] as const;

export const SOLID_PRESETS = [
  { label: "Midnight", value: "#0a0a0f" },
  { label: "Deep Purple", value: "#1a0a2e" },
  { label: "Dark Navy", value: "#0f172a" },
  { label: "Charcoal", value: "#18181b" },
  { label: "Forest", value: "#0a1f0a" },
] as const;

export const ACCENT_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#ffffff",
] as const;

const LEGACY_FONT_LABELS: Record<FontPreset, { display: string; body: string }> = {
  inter: { display: "Inter", body: "Inter" },
  "dm-sans": { display: "DM Sans", body: "DM Sans" },
  playfair: { display: "Playfair Display", body: "Playfair Display" },
  "space-grotesk": { display: "Space Grotesk", body: "Space Grotesk" },
  outfit: { display: "Outfit", body: "Outfit" },
};

const DEFAULT_THEME: ThemeSettings = {
  backgroundType: "solid",
  background: "#0a0a0f",
  textColor: "#ffffff",
  buttonStyle: "filled",
  fontDisplay: "DM Sans",
  fontBody: "DM Sans",
  accentColor: "#6366f1",
};

function resolveFontFamily(name: string): string {
  return GOOGLE_FONT_REGISTRY[name]?.family ?? `'${name}', system-ui, sans-serif`;
}

/** Normalize legacy theme objects from older saves. */
export function normalizeTheme(raw: Partial<ThemeSettings> | Record<string, unknown> | null | undefined): ThemeSettings {
  const input = { ...(raw as Partial<ThemeSettings>) };
  const theme: ThemeSettings = { ...DEFAULT_THEME, ...input };

  const legacyStyle = raw && typeof raw === "object" ? (raw as Record<string, unknown>).buttonStyle : undefined;
  if (legacyStyle === "sharp") theme.buttonStyle = "square";
  if (legacyStyle === "rounded-lg") theme.buttonStyle = "rounded";

  if (!(raw as Partial<ThemeSettings>)?.backgroundType) {
    const bg = theme.background ?? "";
    if (/^https?:\/\//i.test(bg)) theme.backgroundType = "image";
    else if (/gradient\s*\(/i.test(bg)) theme.backgroundType = "gradient";
    else theme.backgroundType = "solid";
  }

  const legacyFont = (raw as Partial<ThemeSettings> & { fontFamily?: FontPreset })?.fontFamily;
  if (!theme.fontDisplay && legacyFont && legacyFont in LEGACY_FONT_LABELS) {
    theme.fontDisplay = LEGACY_FONT_LABELS[legacyFont].display;
    theme.fontBody = LEGACY_FONT_LABELS[legacyFont].body;
  }
  if (!theme.fontBody) theme.fontBody = theme.fontDisplay || "Inter";
  if (!theme.fontDisplay) theme.fontDisplay = theme.fontBody;
  if (!theme.textColor) theme.textColor = isLightBackground(theme) ? "#1A1815" : "#ffffff";

  return theme;
}

function isLightBackground(theme: ThemeSettings): boolean {
  if (theme.backgroundType === "gradient") return false;
  if (theme.backgroundType === "image" || theme.backgroundType === "pattern") return false;
  const hex = theme.background.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export function getFontPreset(fontFamily: string) {
  return FONT_PRESETS[fontFamily as FontPreset] ?? GOOGLE_FONT_REGISTRY["DM Sans"];
}

export function getGoogleFontsUrl(theme: ThemeSettings): string {
  const names = [...new Set([theme.fontDisplay, theme.fontBody].filter(Boolean))];
  const families = names
    .map((name) => GOOGLE_FONT_REGISTRY[name]?.google ?? `${name.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&family=");
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}

export function getBackgroundStyle(theme: ThemeSettings): CSSProperties {
  if (theme.backgroundType === "image") {
    return {
      backgroundColor: theme.background.startsWith("#") ? theme.background : "#0a0a0f",
      backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${theme.background.replace(/"/g, "")}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
    };
  }

  if (theme.backgroundType === "pattern") {
    return { backgroundColor: theme.background };
  }

  return { background: theme.background };
}

export function getThemeShellStyle(theme: ThemeSettings): CSSProperties {
  return {
    ...getBackgroundStyle(theme),
    color: theme.textColor,
    fontFamily: resolveFontFamily(theme.fontBody),
    ["--profile-text" as string]: theme.textColor,
    ["--profile-font-display" as string]: resolveFontFamily(theme.fontDisplay),
    ["--profile-font-body" as string]: resolveFontFamily(theme.fontBody),
    ["--profile-accent" as string]: theme.accentColor,
    ["--profile-accent-soft" as string]: `${theme.accentColor}26`,
    ["--profile-accent-secondary" as string]: theme.accentSecondary ?? theme.accentColor,
  };
}

export function usesLightShellOverlay(theme: ThemeSettings): boolean {
  if (theme.presetId === "paper-ink" || theme.presetId === "botanical") return false;
  return !isLightBackground(theme);
}

function buttonBorderRadius(style: ThemeSettings["buttonStyle"], presetId?: string): string {
  if (style === "square") return "4px";
  if (style === "rounded" || presetId === "sunset-pop" || presetId === "botanical") return "9999px";
  return "12px";
}

export function getLinkButtonStyle(
  theme: ThemeSettings,
  options: { featured?: boolean } = {}
): CSSProperties {
  const { featured = false } = options;
  const normalized = normalizeTheme(theme);
  const radius = buttonBorderRadius(normalized.buttonStyle, normalized.presetId);
  const accent = normalized.accentColor;
  const text = normalized.textColor;

  const base: CSSProperties = {
    borderRadius: radius,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease",
  };

  if (normalized.presetId === "sunset-pop") {
    if (featured) {
      return {
        ...base,
        background: accent,
        border: "1px solid transparent",
        color: "#ffffff",
        boxShadow: `0 10px 28px ${accent}55`,
      };
    }
    return {
      ...base,
      background: "#ffffff",
      border: "1px solid rgba(255,255,255,0.85)",
      color: "#1A1815",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    };
  }

  if (normalized.presetId === "botanical") {
    return {
      ...base,
      background: "rgba(255,255,255,0.55)",
      border: `2px solid ${accent}`,
      color: text,
      boxShadow: featured ? `0 8px 20px ${accent}33` : undefined,
    };
  }

  if (normalized.presetId === "neon-grid") {
    return {
      ...base,
      background: "rgba(21, 14, 39, 0.72)",
      border: `1px solid rgba(255,255,255,0.14)`,
      color: text,
      boxShadow: featured ? `0 0 16px ${accent}44` : undefined,
    };
  }

  if (normalized.buttonStyle === "glass") {
    return {
      ...base,
      background: "rgba(255,255,255,0.12)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.18)",
      color: text,
      boxShadow: featured ? `0 10px 28px ${accent}40` : undefined,
    };
  }

  if (normalized.buttonStyle === "outline") {
    return {
      ...base,
      background: "transparent",
      border: `2px solid ${accent}`,
      color: normalized.presetId === "terminal" ? accent : accent,
      boxShadow: featured ? `0 8px 24px ${accent}33` : undefined,
    };
  }

  if (normalized.buttonStyle === "filled" || featured) {
    const useAccentFill = normalized.presetId !== "paper-ink";
    return {
      ...base,
      background: featured || useAccentFill
        ? featured
          ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
          : accent
        : "transparent",
      border: normalized.presetId === "paper-ink" ? `2px solid ${accent}` : "1px solid transparent",
      color: normalized.presetId === "paper-ink" ? accent : "#ffffff",
      boxShadow: featured ? `0 12px 32px ${accent}40` : `0 4px 16px ${accent}30`,
    };
  }

  return {
    ...base,
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: `1px solid ${accent}44`,
    color: text,
    boxShadow: featured ? `0 10px 28px ${accent}35` : undefined,
  };
}

export function getUsernameStyle(theme: ThemeSettings): CSSProperties {
  const normalized = normalizeTheme(theme);
  if (normalized.presetId === "paper-ink" || normalized.presetId === "botanical") {
    return { color: normalized.textColor, fontFamily: resolveFontFamily(normalized.fontDisplay) };
  }
  if (normalized.presetId === "terminal") {
    return { color: normalized.accentColor, fontFamily: resolveFontFamily(normalized.fontDisplay) };
  }
  return {
    color: normalized.accentColor,
    fontFamily: resolveFontFamily(normalized.fontDisplay),
  };
}

export function getBioStyle(theme: ThemeSettings): CSSProperties {
  const normalized = normalizeTheme(theme);
  return {
    color: `${normalized.textColor}${normalized.textColor.startsWith("#") ? "b3" : ""}`,
  };
}

export function getLinkIconColor(theme: ThemeSettings, featured: boolean): string {
  const normalized = normalizeTheme(theme);
  if (normalized.presetId === "sunset-pop") {
    return featured ? "#ffffff" : normalized.accentColor;
  }
  if (normalized.presetId === "botanical") {
    return normalized.accentColor;
  }
  if (normalized.buttonStyle === "outline" || normalized.presetId === "terminal") {
    return normalized.accentColor;
  }
  if (normalized.presetId === "paper-ink") {
    return normalized.accentColor;
  }
  return featured ? "#ffffff" : normalized.textColor;
}

export function getPreviewLinkStyle(theme: ThemeSettings, featured = false): CSSProperties {
  return {
    ...getLinkButtonStyle(theme, { featured }),
    padding: "12px 16px",
    fontWeight: 600,
    textAlign: "center" as const,
    fontFamily: resolveFontFamily(theme.fontBody),
  };
}

export function getThemeLabelFromSettings(theme: ThemeSettings): string {
  const preset = getThemePresetById(theme.presetId);
  if (preset) return preset.name;
  return `${theme.fontDisplay} · Custom`;
}
