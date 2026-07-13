"use client";

import { usePremiumStatus } from "@/lib/use-premium-status";
import {
  getProCtaDescription,
  getProCtaLabel,
  getProUpgradeHighlight,
} from "@/lib/plans";

/** Trial-aware Pro CTA copy for free users. Defaults to trial messaging while billing loads. */
export function useProCta() {
  const { billing, loading, isPremium } = usePremiumStatus();
  const trialUsed = billing?.trial_used ?? false;

  return {
    loading,
    isPremium,
    trialUsed,
    canStartTrial: Boolean(billing && !billing.trial_used && !billing.is_premium),
    label: getProCtaLabel(loading ? false : trialUsed),
    description: getProCtaDescription(loading ? false : trialUsed),
    highlight: getProUpgradeHighlight(loading ? false : trialUsed),
  };
}
