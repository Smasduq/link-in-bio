import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import UpgradePageClient from "./upgrade-client";

function UpgradePageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<UpgradePageFallback />}>
      <UpgradePageClient />
    </Suspense>
  );
}
