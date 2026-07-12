import type { ReactNode } from "react";
import type { ThemeSettings } from "@/types/database";
import { getGoogleFontsUrl, getThemeShellStyle, normalizeTheme, usesLightShellOverlay } from "@/lib/profile-theme";
import "@/styles/profile-theme-effects.css";

type ProfileThemeShellProps = {
  theme: ThemeSettings;
  children: ReactNode;
  className?: string;
};

/**
 * Applies user theme via inline styles + CSS variables (not dynamic Tailwind classes).
 * Loads display + body Google Fonts at runtime.
 */
export function ProfileThemeShell({ theme: rawTheme, children, className = "" }: ProfileThemeShellProps) {
  const theme = normalizeTheme(rawTheme);
  const fontUrl = getGoogleFontsUrl(theme);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontUrl} />
      <div
        className={`profile-theme-root relative min-h-screen ${className}`.trim()}
        style={getThemeShellStyle(theme)}
        data-theme-button={theme.buttonStyle}
        data-theme-bg={theme.backgroundType}
        data-signature-effect={theme.signatureEffect || undefined}
        data-preset-id={theme.presetId || undefined}
      >
        {usesLightShellOverlay(theme) ? (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
        ) : null}
        <div className="relative">{children}</div>
      </div>
    </>
  );
}
