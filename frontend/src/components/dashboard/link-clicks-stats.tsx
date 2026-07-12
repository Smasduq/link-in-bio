"use client";

import Link from "next/link";
import { BarChart2, MousePointerClick } from "lucide-react";
import type { LinkAnalytics } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LinkClicksStatsProps = {
  links: LinkAnalytics[];
};

/** Owner-only dashboard: total clicks per link, highest first. */
export function LinkClicksStats({ links }: LinkClicksStatsProps) {
  const sorted = [...links].sort((a, b) => b.click_count - a.click_count);
  const maxClicks = sorted[0]?.click_count ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <BarChart2 className="h-4 w-4 shrink-0 text-emerald-600 md:h-5 md:w-5" />
          <span className="truncate">Clicks by link</span>
        </CardTitle>
        <Link href="/dashboard/analytics" className="shrink-0 text-sm font-medium text-emerald-600 hover:underline">
          Full insights
        </Link>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No links to track yet.</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((link) => {
              const widthPct = maxClicks > 0 ? Math.round((link.click_count / maxClicks) * 100) : 0;
              return (
                <li key={link.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{link.title}</span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-emerald-600">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      {link.click_count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${widthPct}%`, minWidth: link.click_count > 0 ? "4px" : 0 }}
                    />
                  </div>
                  {!link.is_active && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Hidden on profile</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
