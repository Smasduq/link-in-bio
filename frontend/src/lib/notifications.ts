export type NotificationItem = {
  id: string;
  type: string;
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

export const BANNER_NOTIFICATION_TYPES = new Set([
  "renewal_upcoming",
  "renewal_failed",
  "access_expiring",
]);
