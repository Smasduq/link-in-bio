"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  type BillingPlan,
  type BillingStatus,
  type InitializeBillingResponse,
  type PlanPricingItem,
  type PlanPricingResponse,
  type StartTrialResponse,
  formatNgn,
  FEATURES,
  PRO_UPGRADE_HIGHLIGHT,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

type PaymentState = "idle" | "loading" | "success" | "error";

export default function UpgradePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [planPricing, setPlanPricing] = useState<PlanPricingItem[]>([]);
  const [plan, setPlan] = useState<BillingPlan>("monthly");
  const [autoRenew, setAutoRenew] = useState(searchParams.get("renew") !== "manual");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [trialLoading, setTrialLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    apiFetch<PlanPricingResponse>("/api/billing/plan-pricing")
      .then((data) => setPlanPricing(data.plans))
      .catch(() => setErrorMessage("Could not load plan pricing"));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiFetch<BillingStatus>("/api/billing/status")
      .then(setBilling)
      .catch(() => setErrorMessage("Could not load billing details"));
  }, [user]);

  const openPaystack = useCallback(async () => {
    if (!user) return;
    setPaymentState("loading");
    setErrorMessage("");

    try {
      const init = await apiFetch<InitializeBillingResponse>("/api/billing/initialize", {
        method: "POST",
        body: JSON.stringify({ plan, auto_renew: autoRenew }),
      });

      const PaystackPop = (await import("@paystack/inline-js")).default;
      const popup = new PaystackPop();

      popup.newTransaction({
        key: init.public_key,
        email: user.email,
        amount: init.pricing.total_charge_kobo,
        reference: init.reference,
        access_code: init.access_code,
        onSuccess: (response?: { reference?: string }) => {
          const ref = response?.reference ?? init.reference;
          router.push(`/billing/result?reference=${encodeURIComponent(ref)}`);
        },
        onCancel: () => {
          setPaymentState("idle");
        },
      });
    } catch (err: unknown) {
      setPaymentState("error");
      setErrorMessage(err instanceof Error ? err.message : "Payment could not be started");
    }
  }, [autoRenew, plan, router, user]);

  const openTrial = useCallback(async () => {
    if (!user) return;
    setTrialLoading(true);
    setErrorMessage("");

    try {
      const init = await apiFetch<StartTrialResponse>("/api/billing/start-trial", {
        method: "POST",
        body: JSON.stringify({ plan: "monthly" }),
      });

      const PaystackPop = (await import("@paystack/inline-js")).default;
      const popup = new PaystackPop();

      popup.newTransaction({
        key: init.public_key,
        email: user.email,
        amount: init.tokenization_amount_kobo,
        reference: init.reference,
        access_code: init.access_code,
        onSuccess: (response?: { reference?: string }) => {
          const ref = response?.reference ?? init.reference;
          router.push(`/billing/result?reference=${encodeURIComponent(ref)}&trial=1`);
        },
        onCancel: () => {
          setTrialLoading(false);
        },
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Could not start free trial");
    } finally {
      setTrialLoading(false);
    }
  }, [router, user]);

  const selectedPlan = planPricing.find((item) => item.slug === plan);
  const yearlyPlan = planPricing.find((item) => item.slug === "yearly");
  const yearlySavingsPercent = yearlyPlan?.yearly_savings_percent ?? billing?.yearly_savings_percent ?? 15;
  const yearlySavingsAmount = yearlyPlan?.yearly_savings_amount ?? billing?.yearly_savings_amount ?? null;
  const isOnTrial = Boolean(billing?.is_trial && billing.is_premium);
  const isPro = Boolean(billing?.is_premium && billing.subscription_status !== "cancelled" && !isOnTrial);
  const canStartTrial = Boolean(billing && !billing.trial_used && !billing.is_premium);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Pro
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Upgrade to Pro</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {PRO_UPGRADE_HIGHLIGHT}
          </p>
        </div>

        {isOnTrial ? (
          <Card className="mx-auto max-w-lg border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CardContent className="p-6 text-center">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">You&apos;re on a free trial</p>
              {billing?.trial_ends_at ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Trial ends {new Date(billing.trial_ends_at).toLocaleDateString()}
                </p>
              ) : null}
              <Button className="mt-4" variant="outline" onClick={() => router.push("/dashboard/settings/billing")}>
                Manage billing
              </Button>
            </CardContent>
          </Card>
        ) : isPro ? (
          <Card className="mx-auto max-w-lg border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CardContent className="p-6 text-center">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">You&apos;re on Pro</p>
              {billing?.premium_until ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Renews / expires on {new Date(billing.premium_until).toLocaleDateString()}
                </p>
              ) : null}
              <Button className="mt-4" variant="outline" onClick={() => router.push("/dashboard")}>
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8 flex justify-center">
              <div className="inline-flex rounded-xl border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setPlan("monthly")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                    plan === "monthly" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPlan("yearly")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                    plan === "yearly" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Yearly
                  <span className="ml-1.5 text-xs opacity-80">Save {yearlySavingsPercent}%</span>
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <PlanCard
                title="Free"
                price={formatNgn(0)}
                subtitle="Forever"
                cta="Current plan"
                disabled
                features={FEATURES.map((f) => ({ label: f.label, included: Boolean(f.free) }))}
              />
              <PlanCard
                title="Pro"
                price={selectedPlan ? formatNgn(selectedPlan.total_charge, 2) : "—"}
                subtitle={
                  selectedPlan
                    ? plan === "yearly" && yearlySavingsAmount
                      ? `${formatNgn(selectedPlan.base_amount, 0)}/year · save ${formatNgn(yearlySavingsAmount, 0)} vs monthly`
                      : `${formatNgn(selectedPlan.base_amount, 0)} plan · ${plan === "monthly" ? "per month" : "per year"}`
                    : plan === "monthly"
                      ? "per month"
                      : "per year"
                }
                highlight
                cta={paymentState === "loading" ? "Opening Paystack…" : "Upgrade Now"}
                loading={paymentState === "loading"}
                onCta={openPaystack}
                features={FEATURES.map((f) => ({ label: f.label, included: true }))}
              />
            </div>

            {canStartTrial && plan === "monthly" ? (
              <div className="mx-auto mt-6 max-w-md text-center">
                <Button
                  variant="outline"
                  className="w-full"
                  loading={trialLoading}
                  onClick={() => void openTrial()}
                >
                  Start free trial — 1 month on us
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Verify your card with a small refundable charge. You won&apos;t be billed for Pro until the trial ends.
                </p>
              </div>
            ) : null}

            {selectedPlan ? (
              <Card className="mx-auto mt-6 max-w-md border-dashed">
                <CardContent className="space-y-4 p-4 text-sm">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                    />
                    <span>
                      <span className="font-semibold text-foreground">Auto-renew my subscription</span>
                      <span className="mt-1 block text-muted-foreground">
                        {autoRenew
                          ? `On: we'll automatically charge you every ${plan === "monthly" ? "month" : "year"} until you cancel.`
                          : "Off: you'll pay once and need to manually renew before it expires."}
                      </span>
                    </span>
                  </label>

                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="font-semibold text-foreground">Fee breakdown (computed by server)</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Plan price</span>
                    <span>{formatNgn(selectedPlan.base_amount, 2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paystack fee (1.5%)</span>
                    <span>{formatNgn(selectedPlan.service_fee, 2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT on fee (7.5%)</span>
                    <span>{formatNgn(selectedPlan.vat_on_fee, 2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                    <span>You pay</span>
                    <span>{formatNgn(selectedPlan.total_charge, 2)}</span>
                  </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {paymentState === "success" ? (
              <p className="mt-6 text-center text-sm font-medium text-emerald-600">
                Payment successful — your Pro features are now active.
              </p>
            ) : null}
            {paymentState === "error" || errorMessage ? (
              <p className="mt-6 text-center text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Secure payment via Paystack
              </span>
              <span>{autoRenew ? "Cancel anytime" : "One-time payment — renew manually before expiry"}</span>
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Cards, bank transfer &amp; USSD
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PlanCard({
  title,
  price,
  subtitle,
  features,
  cta,
  highlight = false,
  disabled = false,
  loading = false,
  onCta,
}: {
  title: string;
  price: string;
  subtitle: string;
  features: { label: string; included: boolean }[];
  cta: string;
  highlight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onCta?: () => void;
}) {
  return (
    <Card className={cn(highlight && "border-emerald-500 ring-2 ring-emerald-500/20")}>
      <CardContent className="flex h-full flex-col p-6">
        <div className="mb-6">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="mt-2 font-display text-3xl font-black tracking-tight">{price}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ul className="mb-6 flex-1 space-y-2.5">
          {features.map((feature) => (
            <li key={feature.label} className="flex items-start gap-2 text-sm">
              {feature.included ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>{feature.label}</span>
            </li>
          ))}
        </ul>
        <Button
          variant={highlight ? "primary" : "outline"}
          className="w-full"
          disabled={disabled || loading}
          loading={loading}
          onClick={onCta}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
