"use client";

import { motion } from "framer-motion";
import { ExternalLink, MousePointerClick } from "lucide-react";
import { Link as LinkType, ThemeSettings } from "@/types/database";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { detectPlatform } from "@/lib/social";

function getRadius(style: ThemeSettings["buttonStyle"]) {
  if (style === "rounded") return "rounded-full";
  if (style === "sharp") return "rounded-none";
  return "rounded-xl";
}

export default function LinkButton({ link, theme }: { link: LinkType; theme: ThemeSettings }) {
  const PlatformIcon = detectPlatform(link.url).icon;
  const isOutline = theme.buttonStyle === "outline";

  const handleClick = () => {
    apiFetch(`/api/public/links/${link.id}/click`, {
      method: "POST",
      body: JSON.stringify({
        referrer: typeof document !== "undefined" ? document.referrer : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    }).catch(() => {});
  };

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden border px-5 py-4 shadow-soft transition-all duration-300",
        getRadius(theme.buttonStyle),
        isOutline ? "bg-transparent" : "bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20"
      )}
      style={{
        borderColor: isOutline ? theme.accentColor : undefined,
        color: isOutline ? theme.accentColor : "#ffffff",
      }}
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(135deg, ${theme.accentColor}15, transparent)` }}
      />
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
        {link.icon ? (
          <img src={link.icon} alt="" className="h-5 w-5 object-contain" />
        ) : (
          <PlatformIcon className="h-5 w-5" style={{ color: theme.accentColor }} />
        )}
      </span>
      <span className="relative flex-1 text-left">
        <span className="block font-semibold">{link.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs opacity-60">
          <MousePointerClick className="h-3 w-3" /> {link.click_count} clicks
        </span>
      </span>
      <ExternalLink className="relative h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
    </motion.a>
  );
}
