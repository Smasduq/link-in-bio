"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { type BillingStatus, type CancelBillingResponse, formatNgn } from "@/lib/plans";
import { CancelSubscriptionModal, formatBillingDate } from "@/components/billing/cancel-subscription-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type BillingViewState = "free" | "active_auto" | "cancelled" | "manual_active" | "past_due";

function getBillingViewState(billing: BillingStatus | null): BillingViewState {
  if (!billing?.is_premium) return "free";
  if (billing.is_cancelled_pending_expiry || billing.subscription_status === "cancelled") return "cancelled";
  if (billing.subscription_status === "past_due") return "past_due";
  if (billing.renewal_type === "manual") return "manual_active";
  return "active_auto";
}

export function BillingSection() {
  const { showToast } = useToast();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const loadBilling = () =>
    apiFetch<BillingStatus>("/api/billing/status")
      .then(setBilling)
      .catch(() => undefined);

  useEffect(() => {
    loadBilling().finally(() => setLoading(false));
  }, []);

  const viewState = getBillingViewState(billing);
  const periodEnd = billing?.premium_until ?? null;
  const formattedPeriodEnd = periodEnd ? formatBillingDate(periodEnd) : null;

  const handleCancelSuccess = (result: CancelBillingResponse) => {
    const until = result.premium_until ? formatBillingDate(result.premium_until) : formattedPeriodEnd;
    const message = `Subscription cancelled — Pro features active until ${until ?? "your billing period ends"}`;
    showToast(message, "success");
    void loadBilling();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-emerald-600" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading billing details…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-emerald-600" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {viewState === "free" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Free Plan</p>
                <p className="text-sm text-muted-foreground">
                  Pro from {formatNgn(billing?.monthly_base_amount_ngn ?? 500)}/mo
                </p>
              </div>
              <Link href="/upgrade">
                <Button>Upgrade to Pro</Button>
              </Link>
            </div>
          ) : null}

          {viewState === "active_auto" ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pro Plan — Renews on {formattedPeriodEnd}</p>
              {billing?.can_cancel ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel subscription
                </button>
              ) : null}
            </div>
          ) : null}

          {viewState === "cancelled" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Pro Plan — Cancelled, access ends {formattedPeriodEnd}
              </p>
              <Link href="/upgrade">
                <Button>Resubscribe</Button>
              </Link>
            </div>
          ) : null}

          {viewState === "manual_active" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">Pro Plan — Expires on {formattedPeriodEnd}</p>
              <Link href="/upgrade?renew=manual">
                <Button>Renew now</Button>
              </Link>
            </div>
          ) : null}

          {viewState === "past_due" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Pro Plan</p>
                <p className="text-sm text-muted-foreground">
                  Payment issue — update billing before {formattedPeriodEnd}
                </p>
              </div>
              <Link href="/upgrade">
                <Button>Update billing</Button>
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {periodEnd ? (
        <CancelSubscriptionModal
          open={cancelModalOpen}
          periodEnd={periodEnd}
          onClose={() => setCancelModalOpen(false)}
          onSuccess={handleCancelSuccess}
        />
      ) : null}
    </>
  );
}
