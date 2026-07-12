import { THEME_PRESETS } from "@/lib/theme-presets";
import type { BillingStatus } from "@/lib/plans";
import type { BackgroundType, ThemeSettings } from "@/types/database";

/** Mirrors backend/app/services/premium_access.py */

export const FREE_BACKGROUND_TYPES = new Set<BackgroundType>(["solid"]);
export const PRO_ONLY_BACKGROUND_TYPES = new Set<BackgroundType>(["gradient", "pattern", "image"]);

export const FREE_BUTTON_STYLES = new Set<ThemeSettings["buttonStyle"]>(["filled", "outline"]);
export const PRO_ONLY_BUTTON_STYLES = new Set<ThemeSettings["buttonStyle"]>(["glass", "rounded", "square"]);

export const FREE_FONTS = new Set(["Inter", "DM Sans"]);
export const FREE_PRODUCT_LIMIT = 1;
export const PREMIUM_PRESET_IDS = new Set(THEME_PRESETS.map((preset) => preset.id));

export function isPremiumActive(billing: BillingStatus | null | undefined): boolean {
  return Boolean(billing?.is_premium);
}

export function isPremiumFromProfile(profile: { is_premium?: boolean } | null | undefined): boolean {
  return Boolean(profile?.is_premium);
}

export function canAddProduct(isPremium: boolean, productCount: number): boolean {
  return isPremium || productCount < FREE_PRODUCT_LIMIT;
}

export function isPresetPro(presetId: string | undefined | null): boolean {
  return Boolean(presetId && PREMIUM_PRESET_IDS.has(presetId));
}

export function isBackgroundTypePro(type: BackgroundType): boolean {
  return PRO_ONLY_BACKGROUND_TYPES.has(type);
}

export function isButtonStylePro(style: ThemeSettings["buttonStyle"]): boolean {
  return PRO_ONLY_BUTTON_STYLES.has(style);
}

export function isFontPro(font: string | undefined | null): boolean {
  return Boolean(font && !FREE_FONTS.has(font));
}

export function themeUsesProFeatures(theme: ThemeSettings): boolean {
  if (isPresetPro(theme.presetId)) return true;
  if (isBackgroundTypePro(theme.backgroundType)) return true;
  if (isButtonStylePro(theme.buttonStyle)) return true;
  if (theme.signatureEffect) return true;
  if (isFontPro(theme.fontDisplay) || isFontPro(theme.fontBody)) return true;
  return false;
}
