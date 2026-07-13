"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

type AuditEntry = {
  id: string;
  action: string;
  admin_email?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
};

function AuditTrail({ items, emptyLabel }: { items: AuditEntry[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium capitalize">{item.action.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
          </div>
          {item.details?.reason ? (
            <p className="mt-1 text-muted-foreground">{String(item.details.reason)}</p>
          ) : null}
          {item.details?.disable_public_profile ? (
            <p className="mt-1 text-xs text-amber-700">Public profile was disabled</p>
          ) : null}
          {item.admin_email ? (
            <p className="mt-1 text-xs text-muted-foreground">By {item.admin_email}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [reason, setReason] = useState("");
  const [disablePublicProfile, setDisablePublicProfile] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

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
    setDisablePublicProfile(false);
  };

  const adminActivity = useMemo(
    () => (data?.admin_activity as AuditEntry[] | undefined) ?? [],
    [data?.admin_activity]
  );

  const proAudit = useMemo(
    () => adminActivity.filter((item) => item.action === "grant_pro" || item.action === "revoke_pro"),
    [adminActivity]
  );

  const accountAudit = useMemo(
    () => adminActivity.filter((item) => item.action === "suspend_user" || item.action === "reactivate_user"),
    [adminActivity]
  );

  const runAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!actionModal) return;

    setSubmitting(true);
    setError("");
    setActionNotice("");

    try {
      const paths: Record<Exclude<ActionModal, null>, string> = {
        grant: `/api/admin/users/${params.id}/grant-pro`,
        revoke: `/api/admin/users/${params.id}/revoke-pro`,
        suspend: `/api/admin/users/${params.id}/suspend`,
        reactivate: `/api/admin/users/${params.id}/reactivate`,
        delete: `/api/admin/users/${params.id}/delete`,
      };

      const body =
        actionModal === "delete"
          ? { reason, confirm_username: confirmUsername }
          : actionModal === "suspend"
            ? { reason, disable_public_profile: disablePublicProfile }
            : { reason };

      const response = await apiFetch<{ message?: string; data?: { warning?: string } }>(paths[actionModal], {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (response.data?.warning) {
        setActionNotice(response.data.warning);
      } else if (response.message) {
        setActionNotice(response.message);
      }

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
  const profileDisabled = Boolean(data.profile.profile_disabled);
  const proStatus = String(data.premium.pro_status_label || "Free");
  const proStatusKey = String(data.premium.pro_status || "free");
  const isPremium = proStatusKey !== "free";

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
          <Button variant="danger" onClick={() => setActionModal("delete")}>
            Delete account
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionNotice ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{actionNotice}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Pro status</CardTitle>
              <CardDescription>Manual grants are excluded from MRR reporting</CardDescription>
            </div>
            {isPremium ? (
              <Button variant="outline" size="sm" onClick={() => setActionModal("revoke")}>
                Revoke Pro
              </Button>
            ) : (
              <Button size="sm" onClick={() => setActionModal("grant")}>
                Grant Pro
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={proStatusKey === "pro_paid" ? "success" : proStatusKey === "pro_manual" ? "warning" : "default"}>
                {proStatus}
              </Badge>
              {data.user.manual_pro_reason ? (
                <span className="text-xs text-muted-foreground">Reason: {String(data.user.manual_pro_reason)}</span>
              ) : null}
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Premium until:</span>{" "}
                {formatDateTime(data.premium.premium_until as string | null)}
              </p>
              <p>
                <span className="text-muted-foreground">Paystack subscription:</span>{" "}
                {data.user.paystack_subscription_code ? String(data.user.paystack_subscription_code) : "None"}
              </p>
              <p>
                <span className="text-muted-foreground">Subscription status:</span>{" "}
                {String(data.user.subscription_status || data.premium.subscription_status || "—")}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pro audit trail</p>
              <AuditTrail items={proAudit} emptyLabel="No Pro grant/revoke actions yet." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Account status</CardTitle>
              <CardDescription>Suspension blocks dashboard login, not the public page by default</CardDescription>
            </div>
            {isSuspended ? (
              <Button variant="secondary" size="sm" onClick={() => setActionModal("reactivate")}>
                Reactivate
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setActionModal("suspend")}>
                Suspend
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {isSuspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="success">Active</Badge>}
              {profileDisabled ? <Badge variant="warning">Public page disabled</Badge> : null}
            </div>
            <div className="space-y-1 text-sm">
              {data.user.suspended_reason ? (
                <p>
                  <span className="text-muted-foreground">Suspension reason:</span> {String(data.user.suspended_reason)}
                </p>
              ) : null}
              {data.user.suspended_at ? (
                <p>
                  <span className="text-muted-foreground">Suspended at:</span> {formatDateTime(String(data.user.suspended_at))}
                </p>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account audit trail</p>
              <AuditTrail items={accountAudit} emptyLabel="No suspend/reactivate actions yet." />
            </div>
          </CardContent>
        </Card>
      </div>

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
              <span className="text-muted-foreground">Joined:</span> {formatDateTime(String(data.user.created_at))}
            </p>
            <p>
              <span className="text-muted-foreground">Last login:</span> {formatDateTime(data.user.last_login_at as string | null)}
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
              <span className="text-muted-foreground">Products:</span> {String(data.stats.products_count)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.billing_history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid billing history.</p>
            ) : (
              data.billing_history.slice(0, 4).map((item) => (
                <div key={String(item.reference)} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{String(item.reference)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{String(item.plan || "—")}</p>
                  </div>
                  <div className="text-right">
                    <p>{formatCurrency(Number(item.amount_ngn || 0))}</p>
                  </div>
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
          {actionModal === "delete" ? (
            <Input
              label={`Type "${username}" to confirm`}
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              required
            />
          ) : null}

          {actionModal === "suspend" ? (
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={disablePublicProfile}
                onChange={(e) => setDisablePublicProfile(e.target.checked)}
              />
              <span>
                Also disable their public profile page
                <span className="mt-1 block text-xs text-muted-foreground">
                  Suspension alone blocks dashboard login. Check this to hide their /username page too.
                </span>
              </span>
            </label>
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
