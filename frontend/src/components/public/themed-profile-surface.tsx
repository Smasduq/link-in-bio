"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { ThemeSettings } from "@/types/database";
import { getThemeSurfaceStyle, normalizeTheme } from "@/lib/profile-theme";
import { cn } from "@/lib/utils";

type ThemedProfileSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  theme: ThemeSettings;
  children: ReactNode;
  style?: CSSProperties;
};

/** Card/container wrapper sharing the same surface tokens as link buttons. */
export function ThemedProfileSurface({
  theme,
  className,
  style,
  children,
  ...props
}: ThemedProfileSurfaceProps) {
  const normalized = normalizeTheme(theme);

  return (
    <div
      className={cn("profile-surface", className)}
      style={{ ...getThemeSurfaceStyle(normalized), ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
