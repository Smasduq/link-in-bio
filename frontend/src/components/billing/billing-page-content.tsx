"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Crown, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getBillingViewState } from "@/lib/billing-utils";
import {
  type BillingHistoryResponse,
  type BillingStatus,
  type CancelBillingResponse,
  type PlanPricingItem,
  type PlanPricingResponse,
  formatNgn,
  PRO_UPGRADE_HIGHLIGHT,
} from "@/lib/plans";
import { CancelSubscriptionModal, formatBillingDate } from "@/components/billing/cancel-subscription-modal";
import { PlanFeaturesList } from "@/components/billing/plan-features-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function BillingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-32 rounded-lg bg-secondary" />
        <div className="h-4 w-64 rounded bg-secondary" />
      </div>
      <div className="h-40 rounded-xl bg-secondary" />
      <div className="h-72 rounded-xl bg-secondary" />
    </div>
  );
}

function resolveRenewalAmount(
  billing: BillingStatus,
  planPricing: PlanPricingItem[]
): number | null {
  if (billing.plan === "free") return null;
  const match = planPricing.find((item) => item.slug === billing.plan);
  if (match) return match.total_charge;
  return billing.plan === "yearly" ? billing.yearly_base_amount_ngn : billing.monthly_base_amount_ngn;
}

export function BillingPageContent() {
  const { showToast } = useToast();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [history, setHistory] = useState<BillingHistoryResponse["items"]>([]);
  const [planPricing, setPlanPricing] = useState<PlanPricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const loadBilling = () =>
    apiFetch<BillingStatus>("/api/billing/status")
      .then(setBilling)
      .catch(() => {
        setError("Could not load billing details. Please refresh and try again.");
      });

  useEffect(() => {
    Promise.all([
      loadBilling(),
      apiFetch<PlanPricingResponse>("/api/billing/plan-pricing")
        .then((data) => setPlanPricing(data.plans))
        .catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  const viewState = getBillingViewState(billing);
  const isPremium = viewState !== "free";
  const periodEnd = billing?.premium_until ?? null;
  const formattedPeriodEnd = periodEnd ? formatBillingDate(periodEnd) : null;
  const monthlyPlan = planPricing.find((item) => item.slug === "monthly");
  const monthlyTotal = monthlyPlan?.total_charge ?? billing?.monthly_base_amount_ngn ?? 500;
  const renewalAmount = billing ? resolveRenewalAmount(billing, planPricing) : null;

  useEffect(() => {
    if (!isPremium) {
      setHistory([]);
      return;
    }
    apiFetch<BillingHistoryResponse>("/api/billing/history")
      .then((data) => setHistory(data.items))
      .catch(() => undefined);
  }, [isPremium]);

  const handleCancelSuccess = (result: CancelBillingResponse) => {
    const until = result.premium_until ? formatBillingDate(result.premium_until) : formattedPeriodEnd;
    showToast(
      `Subscription cancelled — Pro features active until ${until ?? "your billing period ends"}`,
      "success"
    );
    void loadBilling();
  };

  if (loading) return <BillingSkeleton />;

  if (error && !billing) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-emerald-600" />
                {isPremium ? "Pro Plan" : "Free Plan"}
              </CardTitle>
              <Badge variant={isPremium ? "default" : "secondary"}>{isPremium ? "Pro" : "Free"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewState === "free" ? (
              <>
                <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm leading-relaxed text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <Sparkles className="mb-1 inline h-4 w-4 text-emerald-600" aria-hidden /> {PRO_UPGRADE_HIGHLIGHT}
                </p>
                <Link href="/upgrade">
                  <Button className="w-full sm:w-auto">
                    Upgrade to Pro — {formatNgn(monthlyTotal, 2)}/month
                  </Button>
                </Link>
              </>
            ) : null}

            {viewState === "active_auto" ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Renews on {formattedPeriodEnd}
                  {renewalAmount != null ? ` for ${formatNgn(renewalAmount, 2)}` : ""}
                </p>
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
                <p className="text-sm font-medium">
                  Cancelled — Pro features active until {formattedPeriodEnd}
                </p>
                <Link href="/upgrade">
                  <Button variant="outline">Resubscribe</Button>
                </Link>
              </div>
            ) : null}

            {viewState === "manual_active" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium">Expires on {formattedPeriodEnd}</p>
                <Link href="/upgrade?renew=manual">
                  <Button variant="outline">Renew now</Button>
                </Link>
              </div>
            ) : null}

            {viewState === "past_due" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Payment issue — update billing before {formattedPeriodEnd}
                </p>
                <Link href="/upgrade">
                  <Button>Update billing</Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanFeaturesList mode={isPremium ? "premium" : "free"} />
          </CardContent>
        </Card>

        {isPremium ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {history.map((item) => (
                    <li
                      key={item.reference}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{formatBillingDate(item.paid_at)}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.plan ? `Pro ${item.plan}` : "Pro"} · {item.reference}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatNgn(item.amount_ngn, 2)}</p>
                        <p
                          className={cn(
                            "text-xs capitalize",
                            item.status === "success" ? "text-emerald-600" : "text-muted-foreground"
                          )}
                        >
                          {item.status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

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

function PageHeader() {
  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Settings
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight">Billing</h1>
      <p className="text-sm text-muted-foreground">Your plan, benefits, and payment history</p>
    </div>
  );
}
