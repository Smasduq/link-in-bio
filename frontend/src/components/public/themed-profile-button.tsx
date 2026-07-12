"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import type { ThemeSettings } from "@/types/database";
import { getLinkButtonStyle, getThemeBodyFontStyle, normalizeTheme } from "@/lib/profile-theme";
import { cn } from "@/lib/utils";

type ThemedProfileButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme: ThemeSettings;
  featured?: boolean;
  children: ReactNode;
};

/** Reuses link button styling for any profile CTA (products, email capture, etc.). */
export function ThemedProfileButton({
  theme,
  featured = false,
  className,
  style,
  children,
  ...props
}: ThemedProfileButtonProps) {
  const normalized = normalizeTheme(theme);
  const buttonStyle: CSSProperties = {
    ...getLinkButtonStyle(normalized, { featured }),
    ...getThemeBodyFontStyle(normalized),
    ...style,
  };

  return (
    <button
      type="button"
      className={cn(
        "profile-link inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.99] disabled:opacity-70",
        className
      )}
      style={buttonStyle}
      {...props}
    >
      {children}
    </button>
  );
}
