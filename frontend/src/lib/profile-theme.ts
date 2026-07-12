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

function parseHexColor(input: string): [number, number, number] | null {
  const hex = input.trim();
  if (!hex.startsWith("#")) return null;
  const raw = hex.slice(1);
  if (raw.length === 3) {
    return raw.split("").map((channel) => parseInt(channel + channel, 16)) as [number, number, number];
  }
  if (raw.length === 6) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  return null;
}

function mixChannel(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}

function rgbaFromRgb([r, g, b]: [number, number, number], alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return 4.5;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Border radius for link/button elements only (includes pill when buttonStyle is rounded). */
export function getLinkButtonBorderRadius(theme: ThemeSettings): string {
  const normalized = normalizeTheme(theme);
  return linkButtonBorderRadius(normalized.buttonStyle, normalized.presetId);
}

/** Border radius for cards, embeds, and containers — not affected by pill button style. */
export function getThemeBlockBorderRadius(theme: ThemeSettings): string {
  const normalized = normalizeTheme(theme);
  return blockBorderRadius(normalized.buttonStyle);
}

/** @deprecated Use getThemeBlockBorderRadius for containers or getLinkButtonBorderRadius for buttons. */
export function getThemeBorderRadius(theme: ThemeSettings): string {
  return getThemeBlockBorderRadius(theme);
}

/**
 * Derives a card/container background from the page background — lighter tint on dark
 * themes, slightly lifted surface on light themes. Preset-aware where link buttons already
 * use bespoke surfaces (botanical, sunset-pop, neon-grid).
 */
export function getThemeSurfaceColor(theme: ThemeSettings): string {
  const normalized = normalizeTheme(theme);
  const light = isLightBackground(normalized);

  if (normalized.presetId === "sunset-pop") {
    return "rgba(255, 255, 255, 0.92)";
  }
  if (normalized.presetId === "botanical") {
    return "rgba(255, 255, 255, 0.55)";
  }
  if (normalized.presetId === "neon-grid") {
    return "rgba(21, 14, 39, 0.72)";
  }
  if (normalized.presetId === "terminal") {
    return "rgba(63, 224, 112, 0.06)";
  }
  if (normalized.presetId === "midnight-glass" || normalized.buttonStyle === "glass") {
    return "rgba(255, 255, 255, 0.1)";
  }

  const base =
    normalized.backgroundType === "solid" ? parseHexColor(normalized.background) : null;

  if (light) {
    if (base) {
      return rgbaFromRgb(
        [
          mixChannel(base[0], 255, 0.4),
          mixChannel(base[1], 255, 0.4),
          mixChannel(base[2], 255, 0.4),
        ],
        0.94
      );
    }
    return "rgba(255, 255, 255, 0.88)";
  }

  if (base) {
    return rgbaFromRgb(
      [
        mixChannel(base[0], 255, 0.14),
        mixChannel(base[1], 255, 0.14),
        mixChannel(base[2], 255, 0.14),
      ],
      0.5
    );
  }

  return "rgba(255, 255, 255, 0.08)";
}

/** Full surface treatment for product cards, embeds, email capture, social chips. */
export function getThemeSurfaceStyle(theme: ThemeSettings): CSSProperties {
  const normalized = normalizeTheme(theme);
  const radius = getThemeBlockBorderRadius(normalized);
  const accent = normalized.accentColor;
  const text = normalized.textColor;
  const light = isLightBackground(normalized);

  let border = `1px solid ${accent}33`;
  let boxShadow: string | undefined;

  if (normalized.presetId === "neon-grid") {
    border = "1px solid rgba(255, 255, 255, 0.14)";
  } else if (normalized.presetId === "botanical") {
    border = `2px solid ${accent}55`;
  } else if (normalized.presetId === "paper-ink") {
    border = `1px solid ${text}18`;
    boxShadow = "0 4px 14px rgba(26, 24, 21, 0.06)";
  } else if (normalized.buttonStyle === "glass" || normalized.signatureEffect === "frosted-blur") {
    border = "1px solid rgba(255, 255, 255, 0.18)";
  } else if (light) {
    border = `1px solid ${text}14`;
    boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
  }

  const style: CSSProperties = {
    backgroundColor: getThemeSurfaceColor(normalized),
    borderRadius: radius,
    border,
    boxShadow,
  };

  if (normalized.buttonStyle === "glass" || normalized.signatureEffect === "frosted-blur") {
    style.backdropFilter = "blur(12px)";
    style.WebkitBackdropFilter = "blur(12px)";
  }

  return style;
}

const SPOTIFY_BRAND = "#1DB954";
const YOUTUBE_BRAND = "#FF0033";

/** Shoppable product card — accent stripe, elevated surface, commerce shadow. */
export function getThemeProductCardStyle(theme: ThemeSettings): CSSProperties {
  const normalized = normalizeTheme(theme);
  const radius = getThemeBlockBorderRadius(normalized);
  const accent = normalized.accentColor;
  const light = isLightBackground(normalized);
  const surface = getThemeSurfaceColor(normalized);

  const style: CSSProperties = {
    backgroundColor: surface,
    borderRadius: radius,
    border: `1px solid ${accent}28`,
    borderTop: `3px solid ${accent}`,
    boxShadow: light
      ? `0 10px 28px rgba(0, 0, 0, 0.1), 0 2px 8px ${accent}18`
      : `0 14px 36px rgba(0, 0, 0, 0.35), 0 0 0 1px ${accent}15`,
    overflow: "hidden",
  };

  if (normalized.presetId === "paper-ink") {
    style.border = `2px solid ${accent}`;
    style.borderTop = `3px solid ${accent}`;
    style.boxShadow = "0 6px 20px rgba(26, 24, 21, 0.08)";
  }

  if (normalized.buttonStyle === "glass" || normalized.signatureEffect === "frosted-blur") {
    style.backdropFilter = "blur(12px)";
    style.WebkitBackdropFilter = "blur(12px)";
    style.border = `1px solid rgba(255, 255, 255, 0.2)`;
    style.borderTop = `3px solid ${accent}`;
  }

  if (normalized.presetId === "neon-grid") {
    style.backgroundColor = "rgba(21, 14, 39, 0.78)";
    style.border = "1px solid rgba(255, 255, 255, 0.12)";
    style.borderTop = `3px solid ${accent}`;
    style.boxShadow = `0 0 20px ${accent}22`;
  }

  return style;
}

/** YouTube embed — dark letterbox frame that blends with the player chrome. */
export function getThemeYoutubeEmbedStyle(theme: ThemeSettings): CSSProperties {
  const normalized = normalizeTheme(theme);
  const radius = getThemeBlockBorderRadius(normalized);
  const accent = normalized.accentColor;
  const light = isLightBackground(normalized);

  return {
    backgroundColor: light ? "rgba(18, 18, 22, 0.94)" : "rgba(0, 0, 0, 0.62)",
    borderRadius: radius,
    border: `1px solid ${light ? "rgba(255,255,255,0.08)" : `${accent}30`}`,
    boxShadow: light
      ? "0 16px 40px rgba(0, 0, 0, 0.2)"
      : `0 16px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.06)`,
    padding: "10px 10px 12px",
  };
}

/** Spotify embed — green-tinted compact player shell. */
export function getThemeSpotifyEmbedStyle(theme: ThemeSettings): CSSProperties {
  const normalized = normalizeTheme(theme);
  const radius = getThemeBlockBorderRadius(normalized);
  const light = isLightBackground(normalized);

  return {
    backgroundColor: light
      ? "rgba(29, 185, 84, 0.08)"
      : "rgba(18, 18, 18, 0.72)",
    borderRadius: radius,
    border: `1px solid ${SPOTIFY_BRAND}${light ? "44" : "55"}`,
    boxShadow: light
      ? `0 8px 24px rgba(29, 185, 84, 0.12)`
      : `0 10px 28px rgba(0, 0, 0, 0.4), 0 0 0 1px ${SPOTIFY_BRAND}22`,
    padding: "10px 12px 12px",
  };
}

export function getThemeEmbedLabelColor(
  type: "youtube_embed" | "spotify_embed",
  theme: ThemeSettings
): string {
  const normalized = normalizeTheme(theme);
  if (type === "spotify_embed") return SPOTIFY_BRAND;
  if (normalized.presetId === "terminal") return normalized.accentColor;
  return contrastRatio(YOUTUBE_BRAND, normalized.backgroundType === "solid" ? normalized.background : "#0a0a0f") >= 2.5
    ? YOUTUBE_BRAND
    : normalized.accentColor;
}

export function getThemeEmbedLabelTextColor(theme: ThemeSettings): string {
  const normalized = normalizeTheme(theme);
  return isLightBackground(normalized) ? "rgba(255, 255, 255, 0.85)" : getThemeMutedTextColor(normalized, 0.75);
}

/** Accent-tinted pill/banner background for announcements. */
export function getThemeAnnouncementStyle(theme: ThemeSettings): CSSProperties {
  const normalized = normalizeTheme(theme);
  const light = isLightBackground(normalized);
  const accent = normalized.accentColor;

  return {
    color: normalized.textColor,
    fontFamily: resolveFontFamily(normalized.fontBody),
    backgroundColor: light ? `${accent}18` : `${accent}24`,
    borderColor: `${accent}44`,
    borderRadius: normalized.buttonStyle === "rounded"
      ? "9999px"
      : getThemeBlockBorderRadius(normalized),
    borderWidth: 1,
    borderStyle: "solid",
  };
}

/** Icon color with basic contrast guard against the page background. */
export function getThemeIconColor(theme: ThemeSettings): string {
  const normalized = normalizeTheme(theme);
  const sampleBackground =
    normalized.backgroundType === "solid" ? normalized.background : normalized.textColor === "#FFFFFF" ? "#333333" : "#f5f5f5";

  if (contrastRatio(normalized.accentColor, sampleBackground) >= 2.8) {
    return normalized.accentColor;
  }
  return normalized.textColor;
}

export function getThemeMutedTextColor(theme: ThemeSettings, opacity = 0.7): string {
  const normalized = normalizeTheme(theme);
  if (normalized.textColor.startsWith("#") && normalized.textColor.length === 7) {
    const alpha = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0");
    return `${normalized.textColor}${alpha}`;
  }
  return normalized.textColor;
}

export function getThemeBodyFontStyle(theme: ThemeSettings): CSSProperties {
  return { fontFamily: resolveFontFamily(normalizeTheme(theme).fontBody) };
}

export function getThemeDisplayFontStyle(theme: ThemeSettings): CSSProperties {
  return { fontFamily: resolveFontFamily(normalizeTheme(theme).fontDisplay) };
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
  const normalized = normalizeTheme(theme);
  return {
    ...getBackgroundStyle(normalized),
    color: normalized.textColor,
    fontFamily: resolveFontFamily(normalized.fontBody),
    ["--profile-text" as string]: normalized.textColor,
    ["--profile-font-display" as string]: resolveFontFamily(normalized.fontDisplay),
    ["--profile-font-body" as string]: resolveFontFamily(normalized.fontBody),
    ["--profile-accent" as string]: normalized.accentColor,
    ["--profile-accent-soft" as string]: `${normalized.accentColor}26`,
    ["--profile-accent-secondary" as string]: normalized.accentSecondary ?? normalized.accentColor,
    ["--profile-surface" as string]: getThemeSurfaceColor(normalized),
    ["--profile-radius" as string]: getThemeBlockBorderRadius(normalized),
    ["--profile-button-radius" as string]: getLinkButtonBorderRadius(normalized),
  };
}

export function usesLightShellOverlay(theme: ThemeSettings): boolean {
  if (theme.presetId === "paper-ink" || theme.presetId === "botanical") return false;
  return !isLightBackground(theme);
}

function linkButtonBorderRadius(style: ThemeSettings["buttonStyle"], presetId?: string): string {
  if (style === "square") return "4px";
  if (style === "rounded" || presetId === "sunset-pop" || presetId === "botanical") return "9999px";
  return "12px";
}

function blockBorderRadius(style: ThemeSettings["buttonStyle"]): string {
  if (style === "square") return "4px";
  return "12px";
}

export function getLinkButtonStyle(
  theme: ThemeSettings,
  options: { featured?: boolean } = {}
): CSSProperties {
  const { featured = false } = options;
  const normalized = normalizeTheme(theme);
  const radius = linkButtonBorderRadius(normalized.buttonStyle, normalized.presetId);
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
