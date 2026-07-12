import Link from "next/link";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProUpgradeCtaProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function ProUpgradeCta({
  title = "Unlock with Pro",
  description = "Upgrade to access this feature on your page.",
  className,
}: ProUpgradeCtaProps) {
  return (
    <div className={className ?? "rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <Crown className="h-4 w-4" />
            {title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href="/upgrade">
          <Button size="sm">Upgrade to Pro</Button>
        </Link>
      </div>
    </div>
  );
}
