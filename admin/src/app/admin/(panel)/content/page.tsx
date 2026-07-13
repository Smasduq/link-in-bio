"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Product = {
  id: string;
  title: string;
  price: number;
  is_active: boolean;
  username: string | null;
  created_at: string;
};

type Report = {
  id: string;
  reporter_email: string;
  target_type: string;
  target_label: string | null;
  reason: string;
  status: string;
  created_at: string;
};

export default function AdminContentPage() {
  const [tab, setTab] = useState<"products" | "reports">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [disableId, setDisableId] = useState<string | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [reportAction, setReportAction] = useState<{ id: string; action: "resolve" | "dismiss" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "products") {
        const params = new URLSearchParams({ page_size: "50" });
        if (search) params.set("search", search);
        const data = await apiFetch<{ items: Product[] }>(`/api/admin/content/products?${params}`);
        setProducts(data.items);
      } else {
        const data = await apiFetch<{ items: Report[] }>("/api/admin/content/reports?status_filter=open&page_size=50");
        setReports(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  const disableProduct = async () => {
    if (!disableId) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/api/admin/content/products/${disableId}/disable`, {
        method: "POST",
        body: JSON.stringify({ reason: disableReason }),
      });
      setDisableId(null);
      setDisableReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportAction = async () => {
    if (!reportAction) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/api/admin/content/reports/${reportAction.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: reportAction.action, reason: actionReason }),
      });
      setReportAction(null);
      setActionReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Content moderation</h1>
        <p className="text-sm text-muted-foreground">Manage products and review user reports.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "products" ? "primary" : "secondary"} size="sm" onClick={() => setTab("products")}>Products</Button>
        <Button variant={tab === "reports" ? "primary" : "secondary"} size="sm" onClick={() => setTab("reports")}>Reports queue</Button>
      </div>

      {tab === "products" ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <Input className="max-w-md" placeholder="Search products or usernames" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button type="submit">Search</Button>
        </form>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{tab === "products" ? "All products" : "Open reports"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoader />
          ) : tab === "products" ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{product.title}</td>
                      <td className="px-4 py-3">{product.username ? `@${product.username}` : "—"}</td>
                      <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={product.is_active ? "success" : "destructive"}>
                          {product.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {product.is_active ? (
                          <Button size="sm" variant="outline" onClick={() => setDisableId(product.id)}>Disable</Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open reports.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium capitalize">{report.target_type}: {report.target_label || report.target_type}</p>
                      <p className="text-xs text-muted-foreground">From {report.reporter_email} · {formatDateTime(report.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setReportAction({ id: report.id, action: "resolve" })}>Resolve</Button>
                      <Button size="sm" variant="ghost" onClick={() => setReportAction({ id: report.id, action: "dismiss" })}>Dismiss</Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">{report.reason}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={disableId !== null} onClose={() => setDisableId(null)} title="Disable product">
        <div className="space-y-4">
          <Textarea label="Reason (required)" value={disableReason} onChange={(e) => setDisableReason(e.target.value)} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDisableId(null)}>Cancel</Button>
            <Button variant="danger" loading={submitting} onClick={disableProduct}>Disable</Button>
          </div>
        </div>
      </Modal>

      <Modal open={reportAction !== null} onClose={() => setReportAction(null)} title={reportAction?.action === "resolve" ? "Resolve report" : "Dismiss report"}>
        <div className="space-y-4">
          <Textarea label="Reason (required)" value={actionReason} onChange={(e) => setActionReason(e.target.value)} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReportAction(null)}>Cancel</Button>
            <Button loading={submitting} onClick={handleReportAction}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
