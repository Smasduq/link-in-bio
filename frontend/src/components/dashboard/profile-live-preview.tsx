"use client";

import type { ThemeSettings } from "@/types/database";
import {
  getBackgroundStyle,
  getLinkButtonStyle,
  getPreviewLinkStyle,
  getUsernameStyle,
  normalizeTheme,
  usesLightShellOverlay,
} from "@/lib/profile-theme";
import { ProfileThemeShell } from "@/components/public/profile-theme-shell";
import { ThemeBlockPreviews } from "@/components/dashboard/theme-block-previews";
import { cn } from "@/lib/utils";

type ProfileLivePreviewProps = {
  theme: ThemeSettings;
  username?: string;
  className?: string;
  compact?: boolean;
};

export function ProfileLivePreview({
  theme: rawTheme,
  username = "username",
  className,
  compact = false,
}: ProfileLivePreviewProps) {
  const theme = normalizeTheme(rawTheme);

  return (
    <ProfileThemeShell theme={theme} className={cn(compact ? "min-h-[520px] px-4 py-6" : "min-h-[620px] px-6 py-8", className)}>
      <div className="mx-auto flex w-full max-w-[280px] flex-col items-center text-center">
        <div
          className="profile-avatar-ring mb-4 h-16 w-16 rounded-full border-4 bg-white/10"
          style={{ borderColor: theme.accentColor }}
        />
        <p className="profile-username text-lg font-bold" style={getUsernameStyle(theme)}>
          @{username}
        </p>
        <p className="profile-bio mt-1 text-sm opacity-70" style={{ color: theme.textColor }}>
          Your bio appears here
        </p>
        <div className="mt-6 w-full space-y-2">
          <div className="profile-link" style={getPreviewLinkStyle(theme, true)}>
            Featured link
          </div>
          <div className="profile-link" style={getPreviewLinkStyle(theme, false)}>
            Example link
          </div>
        </div>
        <ThemeBlockPreviews theme={theme} compact={compact} />
      </div>
    </ProfileThemeShell>
  );
}

export function ThemePresetSwatch({ theme: rawTheme }: { theme: ThemeSettings }) {
  const theme = normalizeTheme(rawTheme);
  const buttonStyle = getLinkButtonStyle(theme, { featured: false });

  return (
    <div
      className="relative h-full min-h-[72px] w-full overflow-hidden rounded-lg"
      style={getBackgroundStyle(theme)}
    >
      {usesLightShellOverlay(theme) ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
      ) : null}
      {theme.signatureEffect === "grid-overlay" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
      ) : null}
      <div className="relative flex h-full flex-col justify-end gap-1.5 p-2">
        <div className="mx-auto h-1.5 w-8 rounded-full opacity-80" style={{ background: theme.textColor }} />
        <div className="h-4 w-full rounded-md" style={{ ...buttonStyle, fontSize: "0.5rem" }} />
      </div>
    </div>
  );
}
