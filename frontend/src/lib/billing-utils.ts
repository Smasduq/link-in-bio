import type { BillingStatus } from "@/lib/plans";

export type BillingViewState = "free" | "active_auto" | "cancelled" | "manual_active" | "past_due" | "trial_active";

export function getBillingViewState(billing: BillingStatus | null): BillingViewState {
  if (!billing?.is_premium) return "free";
  if (billing.is_trial) return "trial_active";
  if (billing.is_cancelled_pending_expiry || billing.subscription_status === "cancelled") return "cancelled";
  if (billing.subscription_status === "past_due") return "past_due";
  if (billing.renewal_type === "manual") return "manual_active";
  return "active_auto";
}

export function isProAccess(billing: BillingStatus | null): boolean {
  return Boolean(billing?.is_premium);
}
