import { Music2, Play } from "lucide-react";
import type { LinkType, ThemeSettings } from "@/types/database";
import {
  getThemeBodyFontStyle,
  getThemeBlockBorderRadius,
  getThemeEmbedLabelColor,
  getThemeEmbedLabelTextColor,
  getThemeSpotifyEmbedStyle,
  getThemeYoutubeEmbedStyle,
  normalizeTheme,
} from "@/lib/profile-theme";

type ProfileEmbedBlockProps = {
  title: string;
  type: LinkType;
  embedSrc: string;
  embedHeight?: number | null;
  theme: ThemeSettings;
};

function embedLabel(type: LinkType): string {
  if (type === "youtube_embed") return "Watch";
  if (type === "spotify_embed") return "Now playing";
  return "Embed";
}

export function ProfileEmbedBlock({ title, type, embedSrc, embedHeight, theme }: ProfileEmbedBlockProps) {
  const normalized = normalizeTheme(theme);
  const innerRadius = getThemeBlockBorderRadius(normalized);
  const label = title.trim() || embedLabel(type);

  if (type === "youtube_embed") {
    const frameStyle = getThemeYoutubeEmbedStyle(normalized);
    const labelColor = getThemeEmbedLabelColor("youtube_embed", normalized);

    return (
      <article className="profile-youtube-embed profile-block w-full overflow-hidden" style={frameStyle}>
        <p
          className="mb-2 flex items-center gap-1.5 px-0.5 text-xs font-semibold uppercase tracking-wide"
          style={{ ...getThemeBodyFontStyle(normalized), color: getThemeEmbedLabelTextColor(normalized) }}
        >
          <Play className="h-3.5 w-3.5 shrink-0" style={{ color: labelColor }} aria-hidden />
          {label}
        </p>
        <div
          className="relative w-full overflow-hidden bg-black"
          style={{ aspectRatio: "16 / 9", borderRadius: innerRadius }}
        >
          <iframe
            src={embedSrc}
            title={title || "YouTube video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full max-w-full border-0"
          />
        </div>
      </article>
    );
  }

  if (type === "spotify_embed") {
    const height = embedHeight ?? 152;
    const frameStyle = getThemeSpotifyEmbedStyle(normalized);
    const labelColor = getThemeEmbedLabelColor("spotify_embed", normalized);

    return (
      <article className="profile-spotify-embed profile-block w-full overflow-hidden" style={frameStyle}>
        <p
          className="mb-2 flex items-center gap-1.5 px-0.5 text-xs font-semibold"
          style={{ ...getThemeBodyFontStyle(normalized), color: normalized.textColor }}
        >
          <Music2 className="h-3.5 w-3.5 shrink-0" style={{ color: labelColor }} aria-hidden />
          <span style={{ color: labelColor }}>{label}</span>
        </p>
        <iframe
          src={embedSrc}
          title={title || "Spotify embed"}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="w-full max-w-full border-0"
          style={{ height, borderRadius: innerRadius }}
        />
      </article>
    );
  }

  return null;
}
