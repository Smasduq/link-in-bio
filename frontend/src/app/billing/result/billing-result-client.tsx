"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { type VerifyTransactionResponse } from "@/lib/plans";
import { useToast } from "@/components/ui/toast";

type VerifyState = "loading" | "success" | "failed" | "abandoned" | "error";

export default function BillingResultPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [state, setState] = useState<VerifyState>("loading");
  const [result, setResult] = useState<VerifyTransactionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    if (!reference) {
      setState("error");
      setErrorMessage("Missing payment reference.");
      return;
    }

    apiFetch<VerifyTransactionResponse>(`/api/billing/verify?reference=${encodeURIComponent(reference)}`)
      .then((data) => {
        setResult(data);
        if (data.status === "success") {
          setState("success");
          showToast("Payment successful — you're now Pro!", "success");
        } else if (data.status === "abandoned") {
          setState("abandoned");
          showToast("Payment was cancelled before completion.", "error");
        } else {
          setState("failed");
          showToast(data.gateway_response || "Payment didn't go through.", "error");
        }
      })
      .catch((err: unknown) => {
        setState("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not verify payment");
      });
  }, [authLoading, reference, showToast, user]);

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
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 sm:py-24">
        {state === "loading" ? (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="font-semibold">Confirming your payment…</p>
              <p className="text-sm text-muted-foreground">Verifying with Paystack — this usually takes a few seconds.</p>
            </CardContent>
          </Card>
        ) : null}

        {state === "success" ? (
          <Card className="w-full border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <h1 className="font-display text-2xl font-bold">You&apos;re now Pro!</h1>
              <p className="text-sm text-muted-foreground">
                Payment confirmed. Your Pro features are active
                {result?.premium_until ? ` until ${new Date(result.premium_until).toLocaleDateString()}` : ""}.
              </p>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Go to dashboard
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {state === "failed" || state === "abandoned" ? (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="font-display text-2xl font-bold">Payment didn&apos;t go through</h1>
              <p className="text-sm text-muted-foreground">
                {result?.gateway_response ||
                  (state === "abandoned"
                    ? "You closed the payment window before completing checkout."
                    : "Paystack could not confirm this payment.")}
              </p>
              <Button className="w-full" onClick={() => router.push("/upgrade")}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {state === "error" ? (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="font-display text-2xl font-bold">Could not verify payment</h1>
              <p className="text-sm text-destructive">{errorMessage}</p>
              <div className="flex w-full flex-col gap-2">
                <Button onClick={() => router.push("/upgrade")}>Back to upgrade</Button>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                  Go to dashboard
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
