import { Globe, Mail, MessageCircle, Share2 } from "lucide-react";
import { LucideIcon } from "lucide-react";

const PLATFORMS: { match: RegExp; icon: LucideIcon; label: string }[] = [
  { match: /github\.com/i, icon: Share2, label: "GitHub" },
  { match: /linkedin\.com/i, icon: Share2, label: "LinkedIn" },
  { match: /twitter\.com|x\.com/i, icon: Share2, label: "X" },
  { match: /instagram\.com/i, icon: Share2, label: "Instagram" },
  { match: /tiktok\.com/i, icon: Share2, label: "TikTok" },
  { match: /youtube\.com/i, icon: Share2, label: "YouTube" },
  { match: /facebook\.com/i, icon: Share2, label: "Facebook" },
  { match: /discord\.(gg|com)/i, icon: MessageCircle, label: "Discord" },
  { match: /^mailto:/i, icon: Mail, label: "Email" },
];

export function detectPlatform(url: string) {
  for (const p of PLATFORMS) {
    if (p.match.test(url)) return p;
  }
  return { match: /.*/, icon: Globe, label: "Website" };
}

export function getSocialLinks(links: { url: string; title: string }[]) {
  return links.map((link) => ({ ...link, platform: detectPlatform(link.url) }));
}
