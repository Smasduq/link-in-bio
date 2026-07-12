import { getSocialPlatform, sortSocialLinks, type SocialLink } from "@/lib/social-platforms";
import { SocialPlatformIcon } from "@/components/social/social-platform-icon";
import type { ThemeSettings } from "@/types/database";
import {
  getThemeIconColor,
  getThemeSurfaceStyle,
  normalizeTheme,
} from "@/lib/profile-theme";

type SocialIconsRowProps = {
  links: SocialLink[];
  theme: ThemeSettings;
  className?: string;
};

export function SocialIconsRow({ links, theme, className }: SocialIconsRowProps) {
  const items = sortSocialLinks(links);
  if (items.length === 0) return null;

  const normalized = normalizeTheme(theme);
  const iconColor = getThemeIconColor(normalized);
  const chipStyle = getThemeSurfaceStyle(normalized);

  return (
    <div className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-3" aria-label="Social links">
        {items.map((link) => {
          const platform = getSocialPlatform(link.platform);
          return (
            <li key={link.platform}>
              <a
                href={link.url}
                target={link.platform === "email" ? undefined : "_blank"}
                rel={link.platform === "email" ? undefined : "noopener noreferrer"}
                aria-label={platform.label}
                className="profile-surface flex h-10 w-10 items-center justify-center transition-transform hover:scale-105 active:scale-95"
                style={{
                  ...chipStyle,
                  borderRadius: "9999px",
                  color: iconColor,
                }}
              >
                <SocialPlatformIcon platform={link.platform} size={18} />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
