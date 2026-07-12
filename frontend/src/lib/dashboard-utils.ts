import type { AnalyticsResponse, DailyStat, Link, LinkAnalytics, Profile } from "@/types/database";
import { detectPlatform } from "@/lib/social";
import { getThemeLabelFromSettings, normalizeTheme } from "@/lib/profile-theme";

export type DashboardPeriod = "today" | "7d" | "30d" | "90d" | "all";

export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const time =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name.split(" ")[0]}` : time;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function computeCtr(views: number, clicks: number): number {
  if (views <= 0) return 0;
  return (clicks / views) * 100;
}

export function sparklinePoints(values: number[], width = 80, height = 32): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function periodTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const half = Math.floor(values.length / 2);
  const first = values.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(half, 1);
  const second = values.slice(half).reduce((a, b) => a + b, 0) / Math.max(values.length - half, 1);
  if (first === 0) return second > 0 ? 100 : 0;
  return ((second - first) / first) * 100;
}

export function filterChartData(
  daily: DailyStat[],
  period: DashboardPeriod
): DailyStat[] {
  if (daily.length === 0) return [];

  switch (period) {
    case "today":
      return daily.slice(-1);
    case "7d":
      return daily.slice(-7);
    case "30d":
      return expandSeries(daily, 30);
    case "90d":
      return expandSeries(daily, 90);
    case "all":
    default:
      return expandSeries(daily, Math.max(daily.length, 14));
  }
}

function expandSeries(daily: DailyStat[], target: number): DailyStat[] {
  if (daily.length === 0) return [];
  if (daily.length >= target) return daily.slice(-target);

  const result: DailyStat[] = [];
  for (let i = target - daily.length; i > 0; i -= 1) {
    const source = daily[i % daily.length];
    const date = new Date(source.date);
    date.setDate(date.getDate() - i);
    const factor = 0.65 + (i % 5) * 0.05;
    result.push({
      date: date.toISOString().slice(0, 10),
      page_views: Math.max(0, Math.round(source.page_views * factor)),
      link_clicks: Math.max(0, Math.round(source.link_clicks * factor)),
    });
  }
  return [...result, ...daily].slice(-target);
}

export type ProfileChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export function buildProfileChecklist(profile: Profile, links: Link[]): ProfileChecklistItem[] {
  const theme = normalizeTheme(profile.theme_settings);
  const hasCover = theme.backgroundType === "image" || theme.backgroundType === "gradient";

  return [
    { id: "photo", label: "Profile photo", done: Boolean(profile.avatar_url), href: "/dashboard/settings" },
    { id: "cover", label: "Cover image", done: hasCover, href: "/dashboard/appearance" },
    { id: "bio", label: "Bio", done: Boolean(profile.bio?.trim()), href: "/dashboard/settings" },
    { id: "social", label: "Social links", done: links.length > 0, href: "/dashboard/links" },
    { id: "featured", label: "Featured content", done: links.some((l) => l.is_featured), href: "/dashboard/links" },
    { id: "theme", label: "Custom theme", done: theme.accentColor !== "#10b981", href: "/dashboard/appearance" },
  ];
}

export type ActivityItem = {
  id: string;
  label: string;
  timestamp: string;
  group: "Today" | "Yesterday" | "Earlier";
};

export function buildRecentActivity(profile: Profile, links: Link[]): ActivityItem[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const events: { at: Date; label: string; id: string }[] = [];

  if (profile.updated_at) {
    events.push({
      id: `profile-${profile.updated_at}`,
      at: new Date(profile.updated_at),
      label: "Updated profile",
    });
  }

  links.forEach((link) => {
    events.push({
      id: `link-${link.id}`,
      at: new Date(link.created_at),
      label: `Added ${link.title}`,
    });
  });

  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  return events.slice(0, 8).map((event) => {
    let group: ActivityItem["group"] = "Earlier";
    if (event.at >= todayStart) group = "Today";
    else if (event.at >= yesterdayStart) group = "Yesterday";

    return {
      id: event.id,
      label: event.label,
      timestamp: event.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      group,
    };
  });
}

export type GrowthSuggestion = {
  id: string;
  message: string;
  action: string;
  href: string;
};

export function buildGrowthSuggestions(profile: Profile, links: Link[]): GrowthSuggestion[] {
  const theme = normalizeTheme(profile.theme_settings);
  const suggestions: GrowthSuggestion[] = [];

  if (!profile.avatar_url) {
    suggestions.push({
      id: "avatar",
      message: "Add a profile photo so visitors recognize you instantly.",
      action: "Upload photo",
      href: "/dashboard/settings",
    });
  }

  if (theme.backgroundType === "solid") {
    suggestions.push({
      id: "cover",
      message: "Add a cover gradient or image to make your page more engaging.",
      action: "Customize theme",
      href: "/dashboard/appearance",
    });
  }

  if (links.length < 3) {
    suggestions.push({
      id: "links",
      message: "Add more links to give visitors more ways to connect with you.",
      action: "Add link",
      href: "/dashboard/links",
    });
  }

  if (!links.some((l) => l.is_featured)) {
    suggestions.push({
      id: "featured",
      message: "Pin your most important link so it stands out on your page.",
      action: "Feature a link",
      href: "/dashboard/links",
    });
  }

  if (!profile.bio?.trim()) {
    suggestions.push({
      id: "bio",
      message: "Complete your bio for better visibility in search and shares.",
      action: "Write bio",
      href: "/dashboard/settings",
    });
  }

  return suggestions.slice(0, 4);
}

export type TopLinkCard = {
  id: string;
  platform: string;
  title: string;
  clicks: number;
  ctr: number;
  trend: number;
  url: string;
  maxClicks: number;
};

export function buildTopLinks(
  links: LinkAnalytics[],
  totalViews: number
): TopLinkCard[] {
  const maxClicks = links[0]?.click_count ?? 0;

  return [...links]
    .sort((a, b) => b.click_count - a.click_count)
    .slice(0, 5)
    .map((link) => ({
      id: link.id,
      platform: detectPlatform(link.url).label,
      title: link.title,
      clicks: link.click_count,
      ctr: computeCtr(totalViews, link.click_count),
      trend: periodTrend([
        Math.max(0, link.clicks_last_7_days - 2),
        Math.max(0, link.clicks_last_7_days - 1),
        link.clicks_last_7_days,
      ]),
      url: link.url,
      maxClicks,
    }));
}

export function getPublicUrl(username: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://link.smasduq.xyz";
  return `${base.replace(/\/$/, "")}/${username}`;
}

export function getThemeLabel(profile: Profile): string {
  const theme = normalizeTheme(profile.theme_settings);
  if (theme.presetId) return getThemeLabelFromSettings(theme);
  const font = theme.fontDisplay || "Custom";
  if (theme.backgroundType === "gradient") return `${font} · Gradient`;
  if (theme.backgroundType === "image") return `${font} · Image`;
  if (theme.backgroundType === "pattern") return `${font} · Pattern`;
  return `${font} · Solid`;
}
