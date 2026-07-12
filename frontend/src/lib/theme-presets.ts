import type { ThemeSettings } from "@/types/database";

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  settings: ThemeSettings;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "midnight-glass",
    name: "Midnight Glass",
    description: "Dark frosted glass with cool blue accents",
    settings: {
      presetId: "midnight-glass",
      backgroundType: "solid",
      background: "#0D0F14",
      textColor: "#E8EAEF",
      accentColor: "#7C9CFF",
      buttonStyle: "glass",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      signatureEffect: "frosted-blur",
    },
  },
  {
    id: "paper-ink",
    name: "Paper & Ink",
    description: "Warm paper tone with serif headlines",
    settings: {
      presetId: "paper-ink",
      backgroundType: "solid",
      background: "#FAF8F3",
      textColor: "#1A1815",
      accentColor: "#2D4A3E",
      buttonStyle: "outline",
      fontDisplay: "Fraunces",
      fontBody: "Inter",
    },
  },
  {
    id: "sunset-pop",
    name: "Sunset Pop",
    description: "Bold gradient with playful rounded links",
    settings: {
      presetId: "sunset-pop",
      backgroundType: "gradient",
      background: "linear-gradient(135deg, #FF6B6B 0%, #FFD93D 100%)",
      textColor: "#FFFFFF",
      accentColor: "#FF3B7A",
      buttonStyle: "rounded",
      fontDisplay: "Fredoka",
      fontBody: "Inter",
    },
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Retro monospace with phosphor green text",
    settings: {
      presetId: "terminal",
      backgroundType: "solid",
      background: "#0A0E0A",
      textColor: "#3FE070",
      accentColor: "#3FE070",
      buttonStyle: "outline",
      fontDisplay: "JetBrains Mono",
      fontBody: "JetBrains Mono",
      signatureEffect: "blinking-cursor",
    },
  },
  {
    id: "botanical",
    name: "Botanical",
    description: "Soft sage with terracotta accents",
    settings: {
      presetId: "botanical",
      backgroundType: "solid",
      background: "#DDE5D8",
      textColor: "#2C3328",
      accentColor: "#C97B5A",
      buttonStyle: "rounded",
      fontDisplay: "Lora",
      fontBody: "Nunito Sans",
    },
  },
  {
    id: "neon-grid",
    name: "Neon Grid",
    description: "Dark grid with cyan-magenta hover glow",
    settings: {
      presetId: "neon-grid",
      backgroundType: "pattern",
      background: "#150E27",
      textColor: "#F0E6FF",
      accentColor: "#00F0FF",
      accentSecondary: "#FF00E5",
      buttonStyle: "outline",
      fontDisplay: "Oswald",
      fontBody: "Inter",
      signatureEffect: "grid-overlay",
    },
  },
];

export function getThemePresetById(id: string | undefined): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}
