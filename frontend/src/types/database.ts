export type BackgroundType = "solid" | "gradient" | "image" | "pattern";

export type ButtonStyle = "rounded" | "square" | "outline" | "filled" | "glass";

export type SignatureEffect = "blinking-cursor" | "frosted-blur" | "grid-overlay" | "";

/** @deprecated Use fontDisplay / fontBody instead. */
export type FontPreset = "inter" | "dm-sans" | "playfair" | "space-grotesk" | "outfit";

/** Stored as `theme_settings` JSON on the profile record in the API/DB. */
export type ThemeSettings = {
  backgroundType: BackgroundType;
  background: string;
  textColor: string;
  accentColor: string;
  accentSecondary?: string;
  buttonStyle: ButtonStyle;
  fontDisplay: string;
  fontBody: string;
  /** @deprecated Legacy single-font field. */
  fontFamily?: FontPreset;
  signatureEffect?: SignatureEffect;
  presetId?: string;
};

export type Profile = {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  theme_settings: ThemeSettings;
  created_at: string;
  updated_at: string;
};

export type Link = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  icon: string | null;
  position: number;
  is_featured: boolean;
  click_count: number;
  is_active: boolean;
  created_at: string;
};

export type AnalyticsOverview = {
  total_page_views: number;
  total_link_clicks: number;
  views_last_7_days: number;
  clicks_last_7_days: number;
  unique_visitors_total: number;
  unique_visitors_by_day: UniqueVisitorsByDay[];
};

export type UniqueVisitorsByDay = {
  date: string;
  unique_visitors: number;
};

export type LinkAnalytics = {
  id: string;
  title: string;
  url: string;
  click_count: number;
  clicks_last_7_days: number;
  is_active: boolean;
};

export type DailyStat = {
  date: string;
  page_views: number;
  link_clicks: number;
};

export type InsightBucket = {
  label: string;
  count: number;
  pct: number;
};

export type VisitorInsights = {
  top_regions: InsightBucket[];
  top_devices: InsightBucket[];
  most_active_time: InsightBucket[];
};

export type AnalyticsResponse = {
  overview: AnalyticsOverview;
  links: LinkAnalytics[];
  daily_stats: DailyStat[];
  visitor_insights: VisitorInsights;
};

export type PublicProfile = {
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme_settings: ThemeSettings;
  links: Link[];
};
