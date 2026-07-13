export type UpgradeSaveContext =
  | "profile"
  | "avatar"
  | "theme"
  | "layout"
  | "link"
  | "embed"
  | "product"
  | "social";

export type UpgradePromptContent = {
  savedLabel: string;
  title: string;
  description: string;
  benefits: string[];
};

export const UPGRADE_PROMPTS: Record<UpgradeSaveContext, UpgradePromptContent> = {
  profile: {
    savedLabel: "Profile saved!",
    title: "Your page is coming together",
    description:
      "Nice work — a complete profile builds trust. Pro helps you look polished and grow faster.",
    benefits: [
      "Remove the Powered by badge",
      "Premium themes & glass button styles",
      "Visitor insights — regions, devices & peak times",
    ],
  },
  avatar: {
    savedLabel: "Photo updated!",
    title: "First impressions matter",
    description:
      "Your avatar is live. Pro gives you the design tools to match that professional look across your whole page.",
    benefits: [
      "6 premium theme presets",
      "Gradient, pattern & image backgrounds",
      'Remove the "Powered by" badge',
    ],
  },
  theme: {
    savedLabel: "Theme saved!",
    title: "Ready to stand out?",
    description:
      "You've customized your look. Pro unlocks the themes and styles creators use to make their pages unforgettable.",
    benefits: [
      "Glass, pill & square button styles",
      "Gradient, pattern & image backgrounds",
      "Full Google Fonts library",
    ],
  },
  layout: {
    savedLabel: "Layout updated!",
    title: "Arrange your page your way",
    description:
      "Freeform mixed ordering lets you drag links, products, embeds, and newsletter blocks into one custom sequence.",
    benefits: [
      "Mix all block types in any order",
      "Highlight your best content first",
      "Premium themes & button styles to match",
    ],
  },
  link: {
    savedLabel: "Link saved!",
    title: "Track what actually converts",
    description:
      "Your link is live. Pro shows you which links perform best and where your clicks come from.",
    benefits: [
      "Featured link styling to highlight top offers",
      "Per-link click insights & referrers",
      "7-day views & clicks chart",
    ],
  },
  embed: {
    savedLabel: "Embed saved!",
    title: "Your content is front and center",
    description:
      "YouTube and Spotify blocks are live. Pro helps you understand who's watching and clicking through.",
    benefits: [
      "Unique visitor tracking",
      "Visitor insights by region & device",
      "Premium themes to match your brand",
    ],
  },
  product: {
    savedLabel: "Product saved!",
    title: "You're open for business",
    description:
      "Your product is set up. Pro lets you scale your shop and understand your buyers.",
    benefits: [
      "Sell unlimited digital products",
      "Advanced sales analytics",
      "Email capture to build your list",
    ],
  },
  social: {
    savedLabel: "Social links saved!",
    title: "Grow your audience everywhere",
    description:
      "Your social icons are live. Pro helps you see traffic patterns and convert visitors into followers and buyers.",
    benefits: [
      "Referrer breakdown — see where visitors come from",
      "Most active times for posting",
      "Remove the Powered by badge",
    ],
  },
};

const SESSION_PREFIX = "upgrade_prompt_shown_";

/** Show at most once per save context per browser session. */
export function shouldShowUpgradePrompt(context: UpgradeSaveContext): boolean {
  if (typeof window === "undefined") return false;
  const key = `${SESSION_PREFIX}${context}`;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "1");
  return true;
}
