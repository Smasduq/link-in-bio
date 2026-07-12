import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type InsightStatCardProps = {
  icon: LucideIcon;
  value: string | number;
  label: string;
  hint?: string;
  className?: string;
};

/** Compact horizontal stat on mobile; stacked on md+. */
export function InsightStatCard({ icon: Icon, value, label, hint, className }: InsightStatCardProps) {
  return (
    <Card className={cn("w-full max-w-full min-w-0", className)}>
      <CardContent className="flex items-start gap-3 p-4 md:block md:p-6 lg:p-8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 md:mb-3 md:h-10 md:w-10 lg:h-12 lg:w-12">
          <Icon className="h-4 w-4 text-emerald-600 md:h-5 md:w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold tracking-tight md:text-3xl">{value}</p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {hint ? <p className="mt-1 truncate text-xs text-emerald-600">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
