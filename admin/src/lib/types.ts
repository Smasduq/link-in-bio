export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "support" | "admin";
};

export type AdminOverviewMetrics = {
  total_users: number;
  free_users: number;
  pro_users: number;
  mrr_ngn: number;
  signups_today: number;
  signups_this_week: number;
  cancellations_this_week: number;
  page_views_30d: number;
  link_clicks_30d: number;
  recent_product_sales_count: number;
};

export type AdminOverviewResponse = {
  metrics: AdminOverviewMetrics;
  activity: {
    recent_signups: Array<{
      id: string;
      email: string;
      username: string | null;
      created_at: string;
    }>;
    recent_cancellations: Array<{
      user_id: string | null;
      email: string | null;
      username: string | null;
      event_type: string;
      cancelled_at: string;
    }>;
    recent_product_sales: Array<{
      id: string;
      product_title: string | null;
      seller_username: string | null;
      buyer_email: string;
      amount_paid: number;
      created_at: string;
    }>;
  };
};

export type AdminUserListItem = {
  id: string;
  email: string;
  username: string | null;
  plan_status: string;
  is_suspended: boolean;
  role: string;
  signup_date: string;
  last_active: string | null;
};

export type AdminUserListResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminUserDetail = {
  user: Record<string, unknown>;
  profile: Record<string, unknown>;
  premium: Record<string, unknown>;
  billing_history: Array<Record<string, unknown>>;
  stats: Record<string, unknown>;
  links: Array<Record<string, unknown>>;
  embeds: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  billing_events: Array<Record<string, unknown>>;
  admin_activity: Array<Record<string, unknown>>;
};

export function isStaffRole(role: string | undefined | null): boolean {
  return role === "support" || role === "admin";
}
