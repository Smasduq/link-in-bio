export type BillingPlan = "monthly" | "yearly";

export type PlanFeature = {
  label: string;
  free: boolean | string;
  pro: boolean | string;
};

/**
 * Single source of truth for Free vs Pro — used on /upgrade and /dashboard/settings/billing.
 * `free` / `pro`: true = included; false = not included; string = partial access note.
 */
export const PLAN_FEATURES: PlanFeature[] = [
  { label: "Unlimited links", free: true, pro: true },
  { label: "Basic solid theme", free: true, pro: true },
  { label: "Sell digital products", free: true, pro: true },
  { label: "6 premium theme presets", free: false, pro: true },
  { label: "Glass & signature effects", free: false, pro: true },
  { label: "Gradient, pattern & image backgrounds", free: false, pro: true },
  { label: "All button styles (outline, glass, pill)", free: "Filled & outline only", pro: true },
  { label: "Full Google Fonts library", free: "Inter & DM Sans", pro: true },
  { label: 'Remove "Powered by" badge', free: false, pro: true },
  { label: "Page views & link click totals", free: true, pro: true },
  { label: "Unique visitors & 7-day trends", free: false, pro: true },
  { label: "Visitor insights (regions, devices, active time)", free: false, pro: true },
  { label: "Featured link styling", free: false, pro: true },
  { label: "Email capture / newsletter block", free: false, pro: true },
];

/** Alias for billing page docs — same array, do not duplicate. */
export const FEATURES = PLAN_FEATURES;

/** Highlight line on the free-plan billing view and upgrade page hero. */
export const PRO_UPGRADE_HIGHLIGHT =
  "See exactly where your visitors come from and when they're most active — unlock with Pro";

export const FREE_THEME_PRESET_IDS = new Set<string>();
export const PRO_ONLY_BUTTON_STYLES = new Set(["glass", "rounded", "square"]);
export const PRO_ONLY_BACKGROUND_TYPES = new Set(["gradient", "pattern", "image"]);

export function formatNgn(amount: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export type FeeBreakdown = {
  base_amount: number;
  service_fee: number;
  vat_on_fee: number;
  total_charge: number;
  total_charge_kobo: number;
};

export type PlanPricingItem = FeeBreakdown & {
  slug: BillingPlan;
  name: string;
  interval: string;
  paystack_plan_code: string | null;
  yearly_savings_percent?: number | null;
  yearly_savings_amount?: number | null;
};

export type PlanPricingResponse = {
  plans: PlanPricingItem[];
};

export type BillingStatus = {
  plan: string;
  is_premium: boolean;
  premium_until: string | null;
  renewal_type: "auto" | "manual" | null;
  subscription_status: string | null;
  can_cancel: boolean;
  is_cancelled_pending_expiry: boolean;
  monthly_base_amount_ngn: number | null;
  yearly_base_amount_ngn: number | null;
  yearly_savings_percent: number | null;
  yearly_savings_amount: number | null;
  paystack_public_key: string | null;
};

export type VerifyTransactionResponse = {
  status: "success" | "failed" | "abandoned";
  reference: string;
  gateway_response: string | null;
  is_premium: boolean;
  premium_until: string | null;
};

export type CancelBillingResponse = {
  subscription_status: "cancelled";
  premium_until: string | null;
  message: string;
};

export type BillingHistoryItem = {
  reference: string;
  paid_at: string;
  amount_ngn: number;
  status: string;
  plan: string | null;
};

export type BillingHistoryResponse = {
  items: BillingHistoryItem[];
};

export type InitializeBillingResponse = {
  access_code: string;
  reference: string;
  authorization_url: string;
  plan: BillingPlan;
  public_key: string;
  pricing: FeeBreakdown;
};
