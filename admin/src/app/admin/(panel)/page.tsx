"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminOverviewResponse } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminOverviewResponse>("/api/admin/overview")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-sm text-muted-foreground">Could not load overview.</p>;

  const { metrics, activity } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Platform metrics and recent activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={metrics.total_users} icon={Users} hint={`${metrics.pro_users} Pro · ${metrics.free_users} free`} />
        <StatCard label="MRR" value={formatCurrency(metrics.mrr_ngn)} icon={TrendingUp} hint="Active subscriptions" />
        <StatCard label="Signups this week" value={metrics.signups_this_week} icon={Activity} hint={`${metrics.signups_today} today`} />
        <StatCard
          label="Engagement (30d)"
          value={metrics.page_views_30d.toLocaleString()}
          icon={MousePointerClick}
          hint={`${metrics.link_clicks_30d.toLocaleString()} link clicks`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent signups</CardTitle>
            <CardDescription>Last 20 new accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.recent_signups.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/admin/users/${item.id}`} className="font-medium hover:text-emerald-700">
                    {item.username || item.email}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cancellations</CardTitle>
            <CardDescription>{metrics.cancellations_this_week} this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.recent_cancellations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent cancellations.</p>
            ) : (
              activity.recent_cancellations.map((item, index) => (
                <div key={`${item.user_id}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    {item.user_id ? (
                      <Link href={`/admin/users/${item.user_id}`} className="font-medium hover:text-emerald-700">
                        {item.username || item.email || "Unknown user"}
                      </Link>
                    ) : (
                      <span className="font-medium">Unknown user</span>
                    )}
                    <Badge variant="warning" className="mt-1">
                      {item.event_type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.cancelled_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Product sales</CardTitle>
            <CardDescription>Last 10 purchases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.recent_product_sales.map((sale) => (
              <div key={sale.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{sale.product_title || "Product"}</span>
                  <span>{formatCurrency(sale.amount_paid)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sale.seller_username ? `@${sale.seller_username}` : "Unknown seller"} · {sale.buyer_email}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
