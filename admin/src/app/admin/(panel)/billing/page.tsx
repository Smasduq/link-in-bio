"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Transaction = {
  id: string;
  reference: string;
  user_email: string | null;
  username: string | null;
  amount_ngn: number;
  status: string;
  type: string;
  date: string;
};

type Subscription = {
  user_id: string;
  email: string;
  username: string | null;
  plan: string;
  subscription_status: string | null;
  premium_until: string | null;
  is_trial: boolean;
};

type WebhookEvent = {
  id: string;
  event_type: string;
  paystack_reference: string | null;
  processing_status: string;
  processing_error: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
};

export default function AdminBillingPage() {
  const [tab, setTab] = useState<"transactions" | "subscriptions" | "webhooks">("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [subFilter, setSubFilter] = useState("");
  const [refundRef, setRefundRef] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "transactions") {
        const data = await apiFetch<{ items: Transaction[] }>("/api/admin/billing/transactions?page_size=50");
        setTransactions(data.items);
      } else if (tab === "subscriptions") {
        const params = new URLSearchParams({ page_size: "50" });
        if (subFilter) params.set("status_filter", subFilter);
        const data = await apiFetch<{ items: Subscription[] }>(`/api/admin/billing/subscriptions?${params}`);
        setSubscriptions(data.items);
      } else {
        const data = await apiFetch<{ items: WebhookEvent[] }>("/api/admin/billing/webhooks?page_size=50");
        setWebhooks(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, subFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefund = async () => {
    if (!refundRef) return;
    setRefunding(true);
    setError("");
    try {
      await apiFetch("/api/admin/billing/refund", {
        method: "POST",
        body: JSON.stringify({ reference: refundRef, reason: refundReason }),
      });
      setRefundRef(null);
      setRefundReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Transactions, subscriptions, and webhook debugging.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["transactions", "subscriptions", "webhooks"] as const).map((key) => (
          <Button key={key} variant={tab === key ? "primary" : "secondary"} size="sm" onClick={() => setTab(key)}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </Button>
        ))}
      </div>

      {tab === "subscriptions" ? (
        <div className="flex flex-wrap gap-2">
          {["", "active", "cancelled", "trial", "past_due"].map((value) => (
            <Button
              key={value || "all"}
              size="sm"
              variant={subFilter === value ? "primary" : "ghost"}
              onClick={() => setSubFilter(value)}
            >
              {value || "All"}
            </Button>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{tab.charAt(0).toUpperCase() + tab.slice(1)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoader />
          ) : tab === "transactions" ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={`${tx.type}-${tx.id}`} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
                      <td className="px-4 py-3">
                        {tx.username ? `@${tx.username}` : tx.user_email || "—"}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(tx.amount_ngn)}</td>
                      <td className="px-4 py-3 capitalize">{tx.type}</td>
                      <td className="px-4 py-3">
                        <Badge variant={tx.status === "refunded" ? "warning" : "success"}>{tx.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{formatDateTime(tx.date)}</td>
                      <td className="px-4 py-3">
                        {tx.status !== "refunded" ? (
                          <Button size="sm" variant="outline" onClick={() => setRefundRef(tx.reference)}>
                            Refund
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tab === "subscriptions" ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Until</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.user_id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${sub.user_id}`} className="font-medium hover:text-emerald-700">
                          {sub.username || sub.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize">{sub.plan}</td>
                      <td className="px-4 py-3">{sub.subscription_status || (sub.is_trial ? "trial" : "—")}</td>
                      <td className="px-4 py-3">{formatDateTime(sub.premium_until)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((event) => (
                <div key={event.id} className="rounded-xl border border-border p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{event.event_type}</p>
                      <p className="text-xs text-muted-foreground">{event.paystack_reference || "No reference"}</p>
                    </div>
                    <Badge variant={event.processing_status === "success" ? "success" : event.processing_status === "failed" ? "destructive" : "warning"}>
                      {event.processing_status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(event.created_at)}</p>
                  {event.processing_error ? <p className="mt-2 text-xs text-destructive">{event.processing_error}</p> : null}
                  {event.payload ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-emerald-700">Raw payload</summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-secondary/60 p-3 text-xs">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={refundRef !== null} onClose={() => setRefundRef(null)} title="Refund transaction">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Reference: {refundRef}</p>
          <Textarea label="Reason (required)" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} required minLength={3} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRefundRef(null)}>Cancel</Button>
            <Button loading={refunding} onClick={handleRefund}>Process refund</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
