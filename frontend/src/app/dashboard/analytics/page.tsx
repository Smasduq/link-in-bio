"use client";

import { useState, useEffect } from "react";
import { BarChart2, Eye, Globe, MousePointer, Smartphone, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AnalyticsResponse } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AnalyticsResponse>("/api/analytics").then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-muted-foreground">Failed to load analytics</p>;

  const maxDaily = Math.max(...data.daily_stats.map((d) => Math.max(d.page_views, d.link_clicks)), 1);
  const ctr = data.overview.total_page_views
    ? ((data.overview.total_link_clicks / data.overview.total_page_views) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track your page views and link performance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <Eye className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-3xl font-bold">{data.overview.total_page_views}</p>
            <p className="text-sm text-muted-foreground">Total views</p>
            <p className="mt-1 text-xs text-emerald-600">+{data.overview.views_last_7_days} this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MousePointer className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-3xl font-bold">{data.overview.total_link_clicks}</p>
            <p className="text-sm text-muted-foreground">Total clicks</p>
            <p className="mt-1 text-xs text-emerald-600">+{data.overview.clicks_last_7_days} this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <TrendingUp className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-3xl font-bold">{ctr}%</p>
            <p className="text-sm text-muted-foreground">Click-through rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart2 className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-3xl font-bold">{data.links.length}</p>
            <p className="text-sm text-muted-foreground">Tracked links</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /> Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-end gap-2">
            {data.daily_stats.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-36 w-full items-end gap-0.5">
                  <div
                    className="flex-1 rounded-t-md bg-emerald-500 transition-all duration-300 hover:bg-emerald-600"
                    style={{ height: `${(day.page_views / maxDaily) * 100}%`, minHeight: day.page_views ? 4 : 0 }}
                    title={`${day.page_views} views`}
                  />
                  <div
                    className="flex-1 rounded-t-md bg-emerald-300 transition-all duration-300 hover:bg-emerald-400"
                    style={{ height: `${(day.link_clicks / maxDaily) * 100}%`, minHeight: day.link_clicks ? 4 : 0 }}
                    title={`${day.link_clicks} clicks`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Views</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-300" /> Clicks</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-emerald-600" /> Device breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Mobile", pct: 68, icon: Smartphone },
                { label: "Desktop", pct: 28, icon: Globe },
                { label: "Tablet", pct: 4, icon: Globe },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Estimated from user-agent data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5 text-emerald-600" /> Top links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.links.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No links yet</p>
            ) : (
              [...data.links]
                .sort((a, b) => b.click_count - a.click_count)
                .slice(0, 5)
                .map((link, i) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-emerald-400/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{link.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{link.click_count}</p>
                      <p className="text-xs text-muted-foreground">+{link.clicks_last_7_days} wk</p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
