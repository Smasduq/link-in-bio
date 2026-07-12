"use client";

import { Music2, Play, ShoppingBag, Tag } from "lucide-react";
import type { ThemeSettings } from "@/types/database";
import {
  getPreviewLinkStyle,
  getThemeBodyFontStyle,
  getThemeBlockBorderRadius,
  getThemeDisplayFontStyle,
  getThemeEmbedLabelColor,
  getThemeEmbedLabelTextColor,
  getThemeProductCardStyle,
  getThemeSpotifyEmbedStyle,
  getThemeYoutubeEmbedStyle,
  normalizeTheme,
} from "@/lib/profile-theme";

type ThemeBlockPreviewsProps = {
  theme: ThemeSettings;
  compact?: boolean;
};

export function ThemeBlockPreviews({ theme: rawTheme, compact = false }: ThemeBlockPreviewsProps) {
  const theme = normalizeTheme(rawTheme);
  const radius = getThemeBlockBorderRadius(theme);
  const productStyle = getThemeProductCardStyle(theme);
  const youtubeStyle = getThemeYoutubeEmbedStyle(theme);
  const spotifyStyle = getThemeSpotifyEmbedStyle(theme);
  const innerRadius = radius;

  return (
    <div className={compact ? "mt-5 w-full space-y-2.5" : "mt-6 w-full space-y-3"}>
      <p
        className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50"
        style={{ ...getThemeBodyFontStyle(theme), color: theme.textColor }}
      >
        Content blocks
      </p>

      {/* Product card */}
      <article className="profile-product-card profile-block w-full text-left" style={productStyle}>
        <div className={compact ? "space-y-2 p-2.5" : "space-y-2.5 p-3"}>
          <div className="flex items-center gap-1.5">
            <Tag className="h-3 w-3 shrink-0" style={{ color: theme.accentColor }} aria-hidden />
            <p
              className={compact ? "text-xs font-bold" : "text-sm font-bold"}
              style={{ ...getThemeDisplayFontStyle(theme), color: theme.textColor }}
            >
              Sample product
            </p>
          </div>
          <div
            className="flex items-center justify-between gap-2 border-t pt-2"
            style={{ borderColor: `${theme.accentColor}18` }}
          >
            <span className="text-sm font-bold tabular-nums" style={{ color: theme.accentColor }}>
              ₦2,500
            </span>
            <span
              className="profile-link inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold"
              style={getPreviewLinkStyle(theme, false)}
            >
              <ShoppingBag className="h-3 w-3" />
              Buy now
            </span>
          </div>
        </div>
      </article>

      {/* YouTube embed */}
      <article className="profile-youtube-embed profile-block w-full text-left" style={youtubeStyle}>
        <p
          className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ ...getThemeBodyFontStyle(theme), color: getThemeEmbedLabelTextColor(theme) }}
        >
          <Play className="h-3 w-3" style={{ color: getThemeEmbedLabelColor("youtube_embed", theme) }} aria-hidden />
          Watch
        </p>
        <div
          className="relative w-full bg-black"
          style={{ aspectRatio: "16 / 9", borderRadius: innerRadius }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Play
              className="h-6 w-6 opacity-40"
              style={{ color: getThemeEmbedLabelColor("youtube_embed", theme) }}
              aria-hidden
            />
          </div>
        </div>
      </article>

      {/* Spotify embed */}
      <article className="profile-spotify-embed profile-block w-full text-left" style={spotifyStyle}>
        <p
          className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold"
          style={{ ...getThemeBodyFontStyle(theme), color: theme.textColor }}
        >
          <Music2 className="h-3 w-3" style={{ color: getThemeEmbedLabelColor("spotify_embed", theme) }} aria-hidden />
          <span style={{ color: getThemeEmbedLabelColor("spotify_embed", theme) }}>Now playing</span>
        </p>
        <div
          className="flex items-center gap-2 px-2"
          style={{
            height: compact ? 48 : 56,
            borderRadius: innerRadius,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
          }}
        >
          <div
            className="h-8 w-8 shrink-0 rounded"
            style={{ backgroundColor: `${getThemeEmbedLabelColor("spotify_embed", theme)}33` }}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-1.5 w-3/4 rounded-full opacity-60" style={{ backgroundColor: theme.textColor }} />
            <div className="h-1 w-1/2 rounded-full opacity-35" style={{ backgroundColor: theme.textColor }} />
          </div>
        </div>
      </article>
    </div>
  );
}
