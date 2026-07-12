import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BillingResultPageClient from "./billing-result-client";

function BillingResultFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}

export default function BillingResultPage() {
  return (
    <Suspense fallback={<BillingResultFallback />}>
      <BillingResultPageClient />
    </Suspense>
  );
}
