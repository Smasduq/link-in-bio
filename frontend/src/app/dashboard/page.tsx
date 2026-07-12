"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DashboardLoading, DashboardOverview } from "@/components/dashboard/overview/dashboard-overview";
import type { AnalyticsResponse, Link, Profile } from "@/types/database";
import "@/styles/dashboard-overview.css";

export default function DashboardOverviewPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Profile>("/api/profile"),
      apiFetch<Link[]>("/api/links"),
      apiFetch<AnalyticsResponse>("/api/analytics"),
    ])
      .then(([p, l, a]) => {
        setProfile(p);
        setLinks(l);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLoading />;
  if (!profile || !analytics) return <DashboardLoading />;

  return <DashboardOverview profile={profile} links={links} analytics={analytics} />;
}
