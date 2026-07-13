"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { AdminUserDetail } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";

const USER_APP_URL = process.env.NEXT_PUBLIC_USER_APP_URL || "http://localhost:3000";

type ActionModal = "grant" | "revoke" | "suspend" | "reactivate" | "delete" | null;

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<AdminUserDetail>(`/api/admin/users/${params.id}`);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = () => {
    setActionModal(null);
    setReason("");
    setConfirmUsername("");
    setPlan("monthly");
  };

  const runAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!actionModal) return;

    setSubmitting(true);
    setError("");

    try {
      const paths: Record<Exclude<ActionModal, null>, string> = {
        grant: `/api/admin/users/${params.id}/grant-pro`,
        revoke: `/api/admin/users/${params.id}/revoke-pro`,
        suspend: `/api/admin/users/${params.id}/suspend`,
        reactivate: `/api/admin/users/${params.id}/reactivate`,
        delete: `/api/admin/users/${params.id}/delete`,
      };

      const body =
        actionModal === "grant"
          ? { reason, plan }
          : actionModal === "delete"
            ? { reason, confirm_username: confirmUsername }
            : { reason };

      await apiFetch(paths[actionModal], {
        method: "POST",
        body: JSON.stringify(body),
      });

      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-sm text-destructive">{error || "User not found"}</p>;

  const username = String(data.profile.public_url_username || data.profile.username || "");
  const isSuspended = Boolean(data.user.is_suspended);
  const isPremium = Boolean(data.premium.is_premium);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-emerald-700">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">{username || String(data.user.email)}</h1>
          <p className="text-sm text-muted-foreground">{String(data.user.email)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {username ? (
            <a
              href={`${USER_APP_URL}/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold shadow-sm hover:bg-secondary"
            >
              <ExternalLink className="h-4 w-4" />
              View public profile
            </a>
          ) : null}
          {isPremium ? (
            <Button variant="outline" onClick={() => setActionModal("revoke")}>
              Revoke Pro
            </Button>
          ) : (
            <Button onClick={() => setActionModal("grant")}>Grant Pro</Button>
          )}
          {isSuspended ? (
            <Button variant="secondary" onClick={() => setActionModal("reactivate")}>
              Reactivate
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setActionModal("suspend")}>
              Suspend
            </Button>
          )}
          <Button variant="danger" onClick={() => setActionModal("delete")}>
            Delete account
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {String(data.profile.full_name || "—")}
            </p>
            <p>
              <span className="text-muted-foreground">Role:</span> {String(data.user.role)}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {isSuspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="success">Active</Badge>}
            </p>
            <p>
              <span className="text-muted-foreground">Joined:</span> {formatDateTime(String(data.user.created_at))}
            </p>
            <p>
              <span className="text-muted-foreground">Last login:</span> {formatDateTime(data.user.last_login_at as string | null)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Plan:</span> {String(data.premium.plan || "free")}
            </p>
            <p>
              <span className="text-muted-foreground">Premium until:</span>{" "}
              {formatDateTime(data.premium.premium_until as string | null)}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span> {String(data.premium.subscription_status || "—")}
            </p>
            <p>
              <span className="text-muted-foreground">Trial:</span> {data.premium.is_trial ? "Yes" : "No"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Page views:</span> {String(data.stats.page_views)}
            </p>
            <p>
              <span className="text-muted-foreground">Link clicks:</span> {String(data.stats.link_clicks)}
            </p>
            <p>
              <span className="text-muted-foreground">Links:</span> {String(data.stats.links_count)}
            </p>
            <p>
              <span className="text-muted-foreground">Embeds:</span> {String(data.stats.embeds_count)}
            </p>
            <p>
              <span className="text-muted-foreground">Products:</span> {String(data.stats.products_count)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing history</CardTitle>
            <CardDescription>Successful Pro charges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.billing_history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No billing history.</p>
            ) : (
              data.billing_history.map((item) => (
                <div key={String(item.reference)} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{String(item.reference)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{String(item.plan || "—")}</p>
                  </div>
                  <div className="text-right">
                    <p>{formatCurrency(Number(item.amount_ngn || 0))}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(String(item.paid_at))}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin activity</CardTitle>
            <CardDescription>Actions taken on this account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.admin_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin actions yet.</p>
            ) : (
              data.admin_activity.map((item) => (
                <div key={String(item.id)} className="text-sm">
                  <p className="font-medium">{String(item.action)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(String(item.created_at))}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Links ({data.links.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.links.slice(0, 8).map((link) => (
              <div key={String(link.id)} className="text-sm">
                <p className="font-medium">{String(link.title)}</p>
                <p className="truncate text-xs text-muted-foreground">{String(link.url)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embeds ({data.embeds.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.embeds.slice(0, 8).map((embed) => (
              <div key={String(embed.id)} className="text-sm">
                <p className="font-medium">{String(embed.title)}</p>
                <Badge>{String(embed.type)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products ({data.products.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.products.slice(0, 8).map((product) => (
              <div key={String(product.id)} className="flex justify-between text-sm">
                <span>{String(product.title)}</span>
                <span>{formatCurrency(Number(product.price))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={actionModal !== null}
        onClose={closeModal}
        title={
          actionModal === "grant"
            ? "Grant Pro access"
            : actionModal === "revoke"
              ? "Revoke Pro access"
              : actionModal === "suspend"
                ? "Suspend account"
                : actionModal === "reactivate"
                  ? "Reactivate account"
                  : "Delete account"
        }
      >
        <form onSubmit={runAction} className="space-y-4">
          {actionModal === "grant" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <select
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
                value={plan}
                onChange={(e) => setPlan(e.target.value as "monthly" | "yearly")}
              >
                <option value="monthly">Monthly (30 days)</option>
                <option value="yearly">Yearly (365 days)</option>
              </select>
            </div>
          ) : null}

          {actionModal === "delete" ? (
            <Input
              label={`Type "${username}" to confirm`}
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              required
            />
          ) : null}

          <Textarea
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you taking this action?"
            required
            minLength={3}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant={actionModal === "delete" ? "danger" : "primary"} loading={submitting}>
              Confirm
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
