"use client";

import { Check, Lock } from "lucide-react";
import { FEATURES, type PlanFeature } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlanFeaturesListProps = {
  mode: "premium" | "free";
  className?: string;
};

function isFreeIncluded(feature: PlanFeature): boolean {
  return feature.free === true;
}

function freeAccessNote(feature: PlanFeature): string | null {
  return typeof feature.free === "string" ? feature.free : null;
}

export function PlanFeaturesList({ mode, className }: PlanFeaturesListProps) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {FEATURES.map((feature) => {
        if (mode === "premium") {
          return (
            <li key={feature.label} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{feature.label}</span>
            </li>
          );
        }

        const included = isFreeIncluded(feature);
        const partial = freeAccessNote(feature);

        if (included) {
          return (
            <li key={feature.label} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{feature.label}</span>
            </li>
          );
        }

        if (partial) {
          return (
            <li key={feature.label} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
              <span>
                {feature.label}
                <span className="mt-0.5 block text-xs text-muted-foreground/80">Free: {partial}</span>
              </span>
            </li>
          );
        }

        return (
          <li key={feature.label} className="flex items-start gap-2.5 text-sm text-muted-foreground/70">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 opacity-50" aria-hidden />
            <span className="flex flex-wrap items-center gap-2">
              <span>{feature.label}</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wide">
                Pro
              </Badge>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
