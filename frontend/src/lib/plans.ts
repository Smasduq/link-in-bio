export type BillingPlan = "monthly" | "yearly";

export type PlanFeature = {
  label: string;
  free: boolean | string;
  pro: boolean | string;
};

/** Free vs Pro split aligned with themes, button styles, and analytics. */
export const PLAN_FEATURES: PlanFeature[] = [
  { label: "Unlimited links", free: true, pro: true },
  { label: "Basic solid theme", free: true, pro: true },
  { label: "6 premium theme presets", free: false, pro: true },
  { label: "Glass & signature effects", free: false, pro: true },
  { label: "Gradient, pattern & image backgrounds", free: false, pro: true },
  { label: "All button styles (outline, glass, pill)", free: "Filled & outline only", pro: true },
  { label: "Full Google Fonts library", free: "Inter & DM Sans", pro: true },
  { label: "Page views & link click totals", free: true, pro: true },
  { label: "Unique visitors & 7-day trends", free: false, pro: true },
  { label: "Visitor insights (regions, devices, active time)", free: false, pro: true },
  { label: "Featured link styling", free: false, pro: true },
];

export const FREE_THEME_PRESET_IDS = new Set<string>();
export const PRO_ONLY_BUTTON_STYLES = new Set(["glass"]);
export const PRO_ONLY_BACKGROUND_TYPES = new Set(["gradient", "pattern", "image"]);

export function formatNgn(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type BillingStatus = {
  plan: string;
  is_premium: boolean;
  premium_until: string | null;
  monthly_amount_ngn: number;
  yearly_amount_ngn: number;
  paystack_public_key: string | null;
};

export type InitializeBillingResponse = {
  access_code: string;
  reference: string;
  authorization_url: string;
  amount_ngn: number;
  plan: BillingPlan;
  public_key: string;
};
