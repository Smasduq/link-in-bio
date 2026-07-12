"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Link from "next/link";
import { apiFetch, API_URL } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth-token";
import type { BillingStatus } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

type Subscriber = {
  id: string;
  email: string;
  subscribed_at: string;
};

export default function SubscribersPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<BillingStatus>("/api/billing/status")
      .then((status) => {
        setBilling(status);
        if (!status.is_premium) return [];
        return apiFetch<Subscriber[]>("/api/subscribers");
      })
      .then((rows) => {
        if (rows) setSubscribers(rows);
      })
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = async () => {
    const token = getStoredAuthToken();
    const res = await fetch(`${API_URL}/api/subscribers/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "subscribers.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageLoader />;

  if (!billing?.is_premium) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Subscribers</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Email capture and subscriber export are Pro features.</p>
            <Link href="/upgrade" className="mt-4 inline-flex">
              <Button>Upgrade to Pro</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-sm text-muted-foreground">{subscribers.length} collected emails</p>
        </div>
        <Button variant="secondary" type="button" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {subscribers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No subscribers yet. Enable email capture in Settings.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(row.subscribed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
