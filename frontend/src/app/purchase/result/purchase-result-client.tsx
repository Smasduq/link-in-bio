"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { type PurchaseVerifyResponse } from "@/lib/products";

export default function PurchaseResultPageClient() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [result, setResult] = useState<PurchaseVerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setState("failed");
      setErrorMessage("Missing payment reference.");
      return;
    }

    apiFetch<PurchaseVerifyResponse>(
      `/api/products/purchase/verify?reference=${encodeURIComponent(reference)}`,
      {},
      null
    )
      .then((data) => {
        setResult(data);
        if (data.status === "success") {
          setState("success");
        } else {
          setState("failed");
          setErrorMessage("Payment could not be confirmed. If you were charged, contact support with your reference.");
        }
      })
      .catch((err: unknown) => {
        setState("failed");
        setErrorMessage(err instanceof Error ? err.message : "Could not confirm your purchase.");
      });
  }, [reference]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
          <h1 className="mt-4 font-display text-xl font-bold">Confirming payment…</h1>
          <p className="mt-2 text-sm text-muted-foreground">Preparing your download link.</p>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 font-display text-xl font-bold">Purchase not confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          {reference ? <p className="mt-3 text-xs text-muted-foreground">Reference: {reference}</p> : null}
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-600">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 font-display text-xl font-bold">Payment received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result?.email_sent
            ? `We emailed your download link to ${result.buyer_email}.`
            : "Your download is ready below."}
        </p>
        {result?.download_url ? (
          <a
            href={result.download_url}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Download {result.product_title ?? "your file"}
          </a>
        ) : null}
        {reference ? <p className="mt-3 text-xs text-muted-foreground">Reference: {reference}</p> : null}
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-emerald-600">
          Back to home
        </Link>
      </div>
    </div>
  );
}
