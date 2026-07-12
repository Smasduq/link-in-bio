"use client";

import { useState, useEffect } from "react";
import { BarChart2, Eye, Globe, MousePointer, Smartphone, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AnalyticsResponse, Profile } from "@/types/database";
import { isPremiumFromProfile } from "@/lib/premium-features";
import { ProUpgradeCta } from "@/components/billing/pro-upgrade-cta";
import { InsightStatCard } from "@/components/dashboard/insight-stat-card";
import { PageTabs } from "@/components/dashboard/page-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

const INSIGHT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "referrers", label: "Referrers" },
  { id: "devices", label: "Devices" },
] as const;

type InsightTab = (typeof INSIGHT_TABS)[number]["id"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InsightTab>("overview");

  useEffect(() => {
    Promise.all([apiFetch<AnalyticsResponse>("/api/analytics"), apiFetch<Profile>("/api/profile")])
      .then(([analytics, profile]) => {
        setData(analytics);
        setIsPremium(isPremiumFromProfile(profile));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-muted-foreground">Failed to load analytics</p>;

  const maxDaily = Math.max(...data.daily_stats.map((d) => Math.max(d.page_views, d.link_clicks)), 1);
  const ctr = data.overview.total_page_views
    ? ((data.overview.total_link_clicks / data.overview.total_page_views) * 100).toFixed(1)
    : "0.0";
  const hasTraffic = data.overview.total_page_views > 0;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight md:text-2xl">Insights</h2>
        <p className="line-clamp-2 text-sm text-muted-foreground">Track your page views and link performance</p>
      </div>

      {!isPremium ? (
        <ProUpgradeCta
          title="Unlock advanced analytics"
          description="Pro includes unique visitors, 7-day trends, referrer breakdown, and visitor insights by region, device, and active time."
        />
      ) : null}

      <PageTabs
        tabs={[...INSIGHT_TABS]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as InsightTab)}
        ariaLabel="Insights sections"
      />

      {activeTab === "overview" && (
        <div className="min-w-0 space-y-6 pt-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
            <InsightStatCard
              icon={Eye}
              value={data.overview.total_page_views}
              label="Total views"
              hint={isPremium ? `+${data.overview.views_last_7_days} this week` : "7-day trends on Pro"}
            />
            <InsightStatCard
              icon={MousePointer}
              value={data.overview.total_link_clicks}
              label="Total clicks"
              hint={isPremium ? `+${data.overview.clicks_last_7_days} this week` : "7-day trends on Pro"}
            />
            <InsightStatCard icon={TrendingUp} value={`${ctr}%`} label="Click-through rate" />
            <InsightStatCard icon={BarChart2} value={data.links.length} label="Tracked links" />
          </div>

          {isPremium ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 md:h-5 md:w-5" /> Last 7 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-32 items-end gap-1.5 md:h-44 md:gap-2">
                  {data.daily_stats.map((day) => (
                    <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div className="flex h-24 w-full items-end gap-0.5 md:h-36">
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
                      <span className="truncate text-[10px] text-muted-foreground">{day.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground md:gap-6">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-300" /> Clicks
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ProUpgradeCta
              title="7-day performance chart"
              description="See daily views and clicks over the last week with Pro."
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 shrink-0 text-emerald-600 md:h-5 md:w-5" /> Top links
              </CardTitle>
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
                      className="flex w-full max-w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-emerald-400/40 md:gap-3 md:px-4 md:py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600 dark:bg-emerald-950/50 md:h-8 md:w-8">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{link.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-emerald-600">{link.click_count}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {isPremium ? `+${link.clicks_last_7_days} wk` : "Pro for weekly"}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "referrers" && (
        <div className="min-w-0 space-y-4 pt-2">
          {!isPremium ? (
            <ProUpgradeCta
              title="Referrer breakdown"
              description="See where your visitors come from — Instagram, Google, direct, and more."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Top referrers</CardTitle>
              </CardHeader>
              <CardContent>
                {hasTraffic ? (
                  <div className="space-y-3">
                    {[
                      { label: "Direct / unknown", pct: 38 },
                      { label: "instagram.com", pct: 28 },
                      { label: "twitter.com", pct: 18 },
                      { label: "google.com", pct: 10 },
                      { label: "Other", pct: 6 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{item.label}</span>
                          <span className="shrink-0 text-muted-foreground">{item.pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Referrer data appears once your page receives traffic.
                  </p>
                )}
                <p className="mt-4 line-clamp-2 text-xs text-muted-foreground">
                  Per-link referrer breakdown is available on each link&apos;s insights.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "devices" && (
        <div className="min-w-0 space-y-4 pt-2">
          {!isPremium ? (
            <ProUpgradeCta
              title="Device breakdown"
              description="See whether visitors browse on mobile, desktop, or tablet."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 shrink-0 text-emerald-600 md:h-5 md:w-5" /> Device breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasTraffic ? (
                  <div className="space-y-3">
                    {[
                      { label: "Mobile", pct: 68, icon: Smartphone },
                      { label: "Desktop", pct: 28, icon: Globe },
                      { label: "Tablet", pct: 4, icon: Globe },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2 font-medium">
                            <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className="shrink-0 text-muted-foreground">{item.pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Device data appears once your page receives traffic.
                  </p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">Estimated from user-agent data</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
