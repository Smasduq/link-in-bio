import type { CSSProperties } from "react";
import type { ThemeSettings } from "@/types/database";

/** Preset Google Fonts — loaded via <link> at runtime (not Tailwind classes). */
export const FONT_PRESETS = {
  inter: {
    label: "Inter",
    google: "Inter:wght@400;500;600;700",
    family: "'Inter', system-ui, sans-serif",
  },
  "dm-sans": {
    label: "DM Sans",
    google: "DM+Sans:wght@400;500;600;700",
    family: "'DM Sans', system-ui, sans-serif",
  },
  playfair: {
    label: "Playfair Display",
    google: "Playfair+Display:wght@400;600;700",
    family: "'Playfair Display', Georgia, serif",
  },
  "space-grotesk": {
    label: "Space Grotesk",
    google: "Space+Grotesk:wght@400;500;600;700",
    family: "'Space Grotesk', system-ui, sans-serif",
  },
  outfit: {
    label: "Outfit",
    google: "Outfit:wght@400;500;600;700",
    family: "'Outfit', system-ui, sans-serif",
  },
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

const DEFAULT_THEME: ThemeSettings = {
  backgroundType: "solid",
  background: "#0a0a0f",
  buttonStyle: "filled",
  fontFamily: "dm-sans",
  accentColor: "#6366f1",
};

/** Normalize legacy theme objects from older saves. */
export function normalizeTheme(raw: Partial<ThemeSettings> | Record<string, unknown> | null | undefined): ThemeSettings {
  const theme = { ...DEFAULT_THEME, ...(raw as Partial<ThemeSettings>) };
  const legacyStyle = raw && typeof raw === "object" ? (raw as Record<string, unknown>).buttonStyle : undefined;

  if (legacyStyle === "sharp") theme.buttonStyle = "square";
  if (legacyStyle === "rounded-lg") theme.buttonStyle = "rounded";

  if (!(raw as Partial<ThemeSettings>)?.backgroundType) {
    const bg = theme.background ?? "";
    if (/^https?:\/\//i.test(bg)) theme.backgroundType = "image";
    else if (/gradient\s*\(/i.test(bg)) theme.backgroundType = "gradient";
    else theme.backgroundType = "solid";
  }

  if (!(theme.fontFamily in FONT_PRESETS)) {
    theme.fontFamily = "dm-sans";
  }

  return theme;
}

export function getFontPreset(fontFamily: string) {
  return FONT_PRESETS[fontFamily as FontPreset] ?? FONT_PRESETS["dm-sans"];
}

export function getGoogleFontsUrl(fontFamily: string): string {
  const preset = getFontPreset(fontFamily);
  return `https://fonts.googleapis.com/css2?family=${preset.google}&display=swap`;
}

/**
 * Background styles for the profile page shell.
 * Uses inline CSS — safe for dynamic user values (Tailwind would purge dynamic classes).
 */
export function getBackgroundStyle(theme: ThemeSettings): CSSProperties {
    if (theme.backgroundType === "image") {
    return {
      backgroundColor: "#0a0a0f",
      backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${theme.background.replace(/"/g, "")}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
    };
  }

  return { background: theme.background };
}

/** CSS variables + font for the themed profile root. */
export function getThemeShellStyle(theme: ThemeSettings): CSSProperties {
  return {
    ...getBackgroundStyle(theme),
    fontFamily: getFontPreset(theme.fontFamily).family,
    // CSS variables for accent — usable in inline styles without Tailwind dynamic classes
    ["--profile-accent" as string]: theme.accentColor,
    ["--profile-accent-soft" as string]: `${theme.accentColor}26`,
  };
}

function buttonBorderRadius(style: ThemeSettings["buttonStyle"]): string {
  if (style === "square") return "4px";
  if (style === "rounded") return "9999px";
  return "12px";
}

export function getLinkButtonStyle(
  theme: ThemeSettings,
  options: { featured?: boolean } = {}
): CSSProperties {
  const { featured = false } = options;
  const radius = buttonBorderRadius(theme.buttonStyle);
  const accent = theme.accentColor;

  const base: CSSProperties = {
    borderRadius: radius,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
  };

  if (theme.buttonStyle === "outline") {
    return {
      ...base,
      background: "transparent",
      border: `2px solid ${accent}`,
      color: accent,
      boxShadow: featured ? `0 8px 24px ${accent}33` : undefined,
    };
  }

  if (theme.buttonStyle === "filled" || featured) {
    return {
      ...base,
      background: featured
        ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
        : accent,
      border: "1px solid transparent",
      color: "#ffffff",
      boxShadow: featured ? `0 12px 32px ${accent}40` : `0 4px 16px ${accent}30`,
    };
  }

  // rounded / square — glass style with accent hints
  return {
    ...base,
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: `1px solid ${accent}44`,
    color: "#ffffff",
    boxShadow: featured ? `0 10px 28px ${accent}35` : undefined,
  };
}

export function getPreviewLinkStyle(theme: ThemeSettings): CSSProperties {
  return {
    ...getLinkButtonStyle(theme),
    padding: "12px 16px",
    fontWeight: 600,
    textAlign: "center" as const,
  };
}
