import {
  BarChart3,
  Bell,
  DollarSign,
  Moon,
  PartyPopper,
  Sun,
  type LucideIcon,
} from "lucide-react";

export type NotificationCategory = "billing" | "activity";

export type NotificationItem = {
  id: string;
  type: string;
  category?: NotificationCategory;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
};

export type NotificationFilter = "all" | "billing" | "activity";

export const BANNER_NOTIFICATION_TYPES = new Set([
  "renewal_upcoming",
  "renewal_failed",
  "access_expiring",
]);

const ENGAGEMENT_TYPES = new Set([
  "good_morning",
  "good_evening",
  "weekly_summary",
  "milestone_clicks",
  "inactivity_nudge",
]);

export function resolveNotificationCategory(item: NotificationItem): NotificationCategory {
  if (item.category) return item.category;
  return ENGAGEMENT_TYPES.has(item.type) ? "activity" : "billing";
}

export function getNotificationPresentation(type: string, category: NotificationCategory): {
  icon: LucideIcon;
  label: string;
  iconClassName: string;
} {
  if (category === "billing") {
    return {
      icon: DollarSign,
      label: type.replaceAll("_", " "),
      iconClassName: "text-amber-600 dark:text-amber-400",
    };
  }

  const engagementMap: Record<string, { icon: LucideIcon; label: string; iconClassName: string }> = {
    good_morning: { icon: Sun, label: "Good morning", iconClassName: "text-orange-500" },
    good_evening: { icon: Moon, label: "Good evening", iconClassName: "text-indigo-500" },
    weekly_summary: { icon: BarChart3, label: "Weekly summary", iconClassName: "text-emerald-600" },
    milestone_clicks: { icon: PartyPopper, label: "Milestone", iconClassName: "text-violet-600" },
    inactivity_nudge: { icon: Bell, label: "Activity reminder", iconClassName: "text-sky-600" },
  };

  return (
    engagementMap[type] ?? {
      icon: BarChart3,
      label: type.replaceAll("_", " "),
      iconClassName: "text-emerald-600",
    }
  );
}
