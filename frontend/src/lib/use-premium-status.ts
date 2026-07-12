"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { BillingStatus } from "@/lib/plans";
import { isPremiumActive } from "@/lib/premium-features";

export function usePremiumStatus() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<BillingStatus>("/api/billing/status")
      .then(setBilling)
      .catch(() => setBilling(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    billing,
    loading,
    isPremium: isPremiumActive(billing),
  };
}
