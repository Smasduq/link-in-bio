"use client";

import Link from "next/link";
import { ChevronRight, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsBillingLink() {
  return (
    <Card>
      <CardContent className="p-0">
        <Link
          href="/dashboard/settings/billing"
          className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-secondary/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Crown className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Billing</span>
            <span className="block text-xs text-muted-foreground">Plan, benefits, and payment history</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
