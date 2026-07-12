import type { ThemeSettings } from "@/types/database";
import { Pin } from "lucide-react";
import { getThemeAnnouncementStyle, getThemeIconColor, normalizeTheme } from "@/lib/profile-theme";

type ProfileAnnouncementBannerProps = {
  text?: string | null;
  theme: ThemeSettings;
};

export function ProfileAnnouncementBanner({ text, theme }: ProfileAnnouncementBannerProps) {
  const message = text?.trim();
  if (!message) {
    return null;
  }

  const normalized = normalizeTheme(theme);
  const announcementStyle = getThemeAnnouncementStyle(normalized);

  return (
    <div
      role="status"
      aria-label="Announcement"
      className="profile-surface mt-4 flex w-full max-w-sm items-start gap-2.5 px-4 py-2.5 text-left text-sm leading-snug"
      style={announcementStyle}
    >
      <Pin
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: getThemeIconColor(normalized) }}
        aria-hidden
      />
      <p className="min-w-0 flex-1 font-medium opacity-95">{message}</p>
    </div>
  );
}
