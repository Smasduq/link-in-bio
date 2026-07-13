"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProCta } from "@/lib/use-pro-cta";

type ProUpgradeCtaProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function ProUpgradeCta({
  title,
  description,
  className,
}: ProUpgradeCtaProps) {
  const { label, description: defaultDescription } = useProCta();

  return (
    <div className={className ?? "rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <Crown className="h-4 w-4" />
            {title ?? "Try Pro for free"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{description ?? defaultDescription}</p>
        </div>
        <Link href="/upgrade">
          <Button size="sm">{label}</Button>
        </Link>
      </div>
    </div>
  );
}
