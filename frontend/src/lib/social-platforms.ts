import {
  siFacebook,
  siInstagram,
  siTelegram,
  siTiktok,
  siWhatsapp,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";
import { Mail, type LucideIcon } from "lucide-react";

/** LinkedIn was removed from simple-icons v14+ (trademark). Keep a local path. */
const linkedInIcon: Pick<SimpleIcon, "path"> = {
  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
};

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "whatsapp"
  | "telegram"
  | "email";

export type SocialPlatformConfig = {
  id: SocialPlatform;
  label: string;
  icon: Pick<SimpleIcon, "path"> | null;
  lucideIcon?: LucideIcon;
  placeholder: string;
  inputLabel: string;
  hint?: string;
  prefix?: string;
};

export const MAX_SOCIAL_LINKS = 6;

export const SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: siInstagram,
    inputLabel: "Username",
    placeholder: "yourname",
    prefix: "@",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: siTiktok,
    inputLabel: "Username",
    placeholder: "yourname",
    prefix: "@",
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    icon: siX,
    inputLabel: "Username",
    placeholder: "yourname",
    prefix: "@",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: siYoutube,
    inputLabel: "Channel handle",
    placeholder: "yourchannel",
    prefix: "@",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: siFacebook,
    inputLabel: "Username",
    placeholder: "yourname",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: linkedInIcon,
    inputLabel: "Profile username",
    placeholder: "your-name",
    hint: "The part after linkedin.com/in/",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: siWhatsapp,
    inputLabel: "Phone number",
    placeholder: "2348012345678",
    hint: "Country code + number, no spaces",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: siTelegram,
    inputLabel: "Username",
    placeholder: "yourname",
    prefix: "@",
  },
  {
    id: "email",
    label: "Email",
    icon: null,
    lucideIcon: Mail,
    inputLabel: "Email address",
    placeholder: "hello@example.com",
  },
];

export function getSocialPlatform(platform: SocialPlatform): SocialPlatformConfig {
  return SOCIAL_PLATFORMS.find((item) => item.id === platform) ?? SOCIAL_PLATFORMS[0];
}

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
  position: number;
};

export function sortSocialLinks(links: SocialLink[]): SocialLink[] {
  return [...links].sort((a, b) => a.position - b.position);
}

export function formatSocialDisplayValue(platform: SocialPlatform, url: string): string {
  const config = getSocialPlatform(platform);

  if (platform === "email") {
    return url.replace(/^mailto:/i, "");
  }

  if (platform === "whatsapp") {
    const match = url.match(/wa\.me\/(\+?\d+)/i);
    return match?.[1] ? `+${match[1].replace(/^\+/, "")}` : url;
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (platform === "linkedin" && segments[0] === "in" && segments[1]) {
      return segments[1];
    }
    const handle = (segments.at(-1) || "").replace(/^@/, "");
    if (!handle) return url;
    return config.prefix ? `${config.prefix}${handle}` : handle;
  } catch {
    return url;
  }
}
