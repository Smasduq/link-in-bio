"use client";

import { useRouter } from "next/navigation";
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
  formatNgn,
  PLAN_FEATURES,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

type PaymentState = "idle" | "loading" | "success" | "error";

export default function UpgradePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [plan, setPlan] = useState<BillingPlan>("monthly");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/sign-in?next=/upgrade");
    }
  }, [authLoading, user, router]);

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
        body: JSON.stringify({ plan }),
      });

      const PaystackPop = (await import("@paystack/inline-js")).default;
      const popup = new PaystackPop();

      popup.newTransaction({
        key: init.public_key,
        email: user.email,
        amount: init.amount_ngn * 100,
        reference: init.reference,
        access_code: init.access_code,
        onSuccess: () => {
          setPaymentState("success");
          apiFetch<BillingStatus>("/api/billing/status").then(setBilling).catch(() => undefined);
        },
        onCancel: () => {
          setPaymentState("idle");
        },
      });
    } catch (err: unknown) {
      setPaymentState("error");
      setErrorMessage(err instanceof Error ? err.message : "Payment could not be started");
    }
  }, [plan, user]);

  const monthlyPrice = billing?.monthly_amount_ngn ?? 2500;
  const yearlyPrice = billing?.yearly_amount_ngn ?? 24000;
  const selectedPrice = plan === "monthly" ? monthlyPrice : yearlyPrice;
  const isPro = billing?.is_premium ?? false;

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
            Unlock premium themes, advanced analytics, and every customization tool — built for creators who want more from their page.
          </p>
        </div>

        {isPro ? (
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
                  <span className="ml-1.5 text-xs opacity-80">Save more</span>
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
                features={PLAN_FEATURES.map((f) => ({ label: f.label, included: Boolean(f.free) }))}
              />
              <PlanCard
                title="Pro"
                price={formatNgn(selectedPrice)}
                subtitle={plan === "monthly" ? "per month" : "per year"}
                highlight
                cta={paymentState === "loading" ? "Opening Paystack…" : "Upgrade Now"}
                loading={paymentState === "loading"}
                onCta={openPaystack}
                features={PLAN_FEATURES.map((f) => ({ label: f.label, included: true }))}
              />
            </div>

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
              <span>Cancel anytime</span>
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
