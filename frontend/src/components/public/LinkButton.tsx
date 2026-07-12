"use client";

import { ExternalLink, MousePointerClick } from "lucide-react";
import { Link as LinkType, ThemeSettings } from "@/types/database";
import { trackLinkClick } from "@/lib/track-click";
import { getLinkButtonStyle, normalizeTheme } from "@/lib/profile-theme";
import { cn } from "@/lib/utils";
import { detectPlatform } from "@/lib/social";

export default function LinkButton({ link, theme: rawTheme }: { link: LinkType; theme: ThemeSettings }) {
  const theme = normalizeTheme(rawTheme);
  const PlatformIcon = detectPlatform(link.url).icon;
  const buttonStyle = getLinkButtonStyle(theme);

  const handleClick = () => {
    trackLinkClick(link.id);
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn("group relative flex w-full items-center gap-4 overflow-hidden border px-5 py-4 transition-all duration-300 hover:scale-[1.02]")}
      style={buttonStyle}
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
        {link.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.icon} alt="" className="h-5 w-5 object-contain" />
        ) : (
          <PlatformIcon className="h-5 w-5" style={{ color: theme.buttonStyle === "outline" ? theme.accentColor : "#fff" }} />
        )}
      </span>
      <span className="relative flex-1 text-left">
        <span className="block font-semibold">{link.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs opacity-60">
          <MousePointerClick className="h-3 w-3" /> {link.click_count} clicks
        </span>
      </span>
      <ExternalLink className="relative h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
    </a>
  );
}
