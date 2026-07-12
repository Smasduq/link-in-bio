import type { ReactNode } from "react";
import type { ThemeSettings } from "@/types/database";
import { getGoogleFontsUrl, getThemeShellStyle, normalizeTheme } from "@/lib/profile-theme";

type ProfileThemeShellProps = {
  theme: ThemeSettings;
  children: ReactNode;
  className?: string;
};

/**
 * Applies user theme via inline styles + CSS variables (not dynamic Tailwind classes).
 * Loads the selected Google Font with a <link> tag — fonts are user-specific at runtime.
 */
export function ProfileThemeShell({ theme: rawTheme, children, className = "" }: ProfileThemeShellProps) {
  const theme = normalizeTheme(rawTheme);
  const fontUrl = getGoogleFontsUrl(theme.fontFamily);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontUrl} />
      <div
        className={`profile-theme-root relative min-h-screen text-white ${className}`.trim()}
        style={getThemeShellStyle(theme)}
        data-theme-button={theme.buttonStyle}
        data-theme-bg={theme.backgroundType}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
        <div className="relative">{children}</div>
      </div>
    </>
  );
}
