"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Link2, MousePointer, Palette, Plus, Settings } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AnalyticsResponse, Link as LinkType, Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

export default function DashboardOverviewPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Profile>("/api/profile"),
      apiFetch<LinkType[]>("/api/links"),
      apiFetch<AnalyticsResponse>("/api/analytics"),
    ])
      .then(([p, l, a]) => {
        setProfile(p);
        setLinks(l);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const quickActions = [
    { label: "Add Link", href: "/dashboard/links", icon: Plus },
    { label: "Customize", href: "/dashboard/appearance", icon: Palette },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s how your page is performing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <Eye className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-3xl font-bold">{analytics?.overview.total_page_views ?? 0}</p>
            <p className="text-sm text-muted-foreground">Page views</p>
            <p className="mt-1 text-xs text-emerald-600">+{analytics?.overview.views_last_7_days ?? 0} this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MousePointer className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-3xl font-bold">{analytics?.overview.total_link_clicks ?? 0}</p>
            <p className="text-sm text-muted-foreground">Link clicks</p>
            <p className="mt-1 text-xs text-emerald-600">+{analytics?.overview.clicks_last_7_days ?? 0} this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Link2 className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-3xl font-bold">{links.length}</p>
            <p className="text-sm text-muted-foreground">Active links</p>
            <p className="mt-1 text-xs text-muted-foreground">{links.filter((l) => l.is_active).length} visible</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm font-medium transition-all hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
              >
                <span className="flex items-center gap-3">
                  <action.icon className="h-4 w-4 text-emerald-600" />
                  {action.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent links</CardTitle>
            <Link href="/dashboard/links" className="text-sm font-medium text-emerald-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No links yet</p>
                <Link href="/dashboard/links">
                  <Button size="sm" className="mt-4">
                    <Plus className="h-4 w-4" /> Add your first link
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {links.slice(0, 4).map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:border-emerald-400/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{link.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{link.click_count} clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {profile?.username && (
        <Card className="border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Your public page</p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">link.smasduq.xyz/{profile.username}</p>
            </div>
            <a href={`/${profile.username}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View page <ArrowRight className="h-4 w-4" /></Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
