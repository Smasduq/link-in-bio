"use client";

import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function PurchaseResultPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 font-display text-xl font-bold">Payment received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your email for a download link. It may take a minute to arrive.
        </p>
        {reference ? (
          <p className="mt-3 text-xs text-muted-foreground">Reference: {reference}</p>
        ) : null}
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-600">
          Back to home
        </Link>
      </div>
    </div>
  );
}
