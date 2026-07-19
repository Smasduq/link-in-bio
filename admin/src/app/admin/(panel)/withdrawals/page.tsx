"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminWithdrawalItem, AdminWithdrawalListResponse } from "@/lib/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";

// Highlight threshold: 2 working days = 48 hours worth of business hours.
// We use the server-computed working_days_elapsed for accuracy.
const WARN_DAYS = 2;

function WorkingDaysBadge({ days }: { days: number }) {
  if (days >= WARN_DAYS) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" />
        {days}d elapsed
      </span>
    );
  }
  if (days === WARN_DAYS - 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        <Clock className="h-3 w-3" />
        {days}d elapsed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {days}d elapsed
    </span>
  );
}

type MarkPaidState = {
  withdrawal: AdminWithdrawalItem;
  adminNote: string;
  submitting: boolean;
  error: string | null;
};

export default function AdminWithdrawalsPage() {
  const [data, setData] = useState<AdminWithdrawalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "paid">("");
  const [page, setPage] = useState(1);
  const [markPaid, setMarkPaid] = useState<MarkPaidState | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (statusFilter) params.set("status_filter", statusFilter);
      const result = await apiFetch<AdminWithdrawalListResponse>(
        `/api/admin/withdrawals?${params}`
      );
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  function openMarkPaid(w: AdminWithdrawalItem) {
    setMarkPaid({ withdrawal: w, adminNote: "", submitting: false, error: null });
    setSuccessMsg(null);
  }

  async function confirmMarkPaid() {
    if (!markPaid) return;
    setMarkPaid((s) => s && { ...s, submitting: true, error: null });
    try {
      await apiFetch(`/api/admin/withdrawals/${markPaid.withdrawal.id}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ admin_note: markPaid.adminNote || null }),
      });
      setSuccessMsg(
        `Marked ₦${markPaid.withdrawal.amount.toLocaleString()} withdrawal for @${
          markPaid.withdrawal.username ?? markPaid.withdrawal.user_email
        } as paid.`
      );
      setMarkPaid(null);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMarkPaid((s) => s && { ...s, submitting: false, error: msg });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Withdrawals</h1>
        <p className="text-sm text-muted-foreground">
          Review and pay out manual referral wallet withdrawal requests.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["", "pending", "paid"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setStatusFilter(f);
              setPage(1);
            }}
            className={cn(
              "rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors",
              statusFilter === f
                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            )}
          >
            {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {data ? `${data.total.toLocaleString()} request${data.total !== 1 ? "s" : ""}` : "Requests"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoader />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Bank details</th>
                    <th className="px-4 py-3 font-medium">Requested</th>
                    <th className="px-4 py-3 font-medium">Elapsed</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No withdrawal requests found.
                      </td>
                    </tr>
                  )}
                  {data?.items.map((w) => (
                    <tr
                      key={w.id}
                      className={cn(
                        "border-t border-border",
                        w.status === "pending" && w.working_days_elapsed >= WARN_DAYS
                          ? "bg-red-50/50 dark:bg-red-950/10"
                          : "hover:bg-secondary/30"
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{w.username ? `@${w.username}` : "—"}</p>
                        <p className="text-xs text-muted-foreground">{w.user_email}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {formatCurrency(w.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{w.bank_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.account_number} · {w.account_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(w.requested_at)}
                      </td>
                      <td className="px-4 py-3">
                        {w.status === "pending" ? (
                          <WorkingDaysBadge days={w.working_days_elapsed} />
                        ) : w.paid_at ? (
                          <span className="text-xs text-muted-foreground">
                            Paid {formatDateTime(w.paid_at)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.status === "pending" ? (
                          <Badge variant="warning">Pending</Badge>
                        ) : (
                          <Badge variant="success">
                            Paid
                          </Badge>
                        )}
                        {w.admin_note && (
                          <p className="mt-1 max-w-[160px] truncate text-xs text-muted-foreground" title={w.admin_note}>
                            {w.admin_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.status === "pending" && (
                          <Button size="sm" onClick={() => openMarkPaid(w)}>
                            Mark as Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mark as Paid confirmation modal */}
      <Modal
        open={markPaid !== null}
        onClose={() => !markPaid?.submitting && setMarkPaid(null)}
        title="Mark withdrawal as paid"
      >
        {markPaid && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
              <p>
                <span className="font-medium">User:</span>{" "}
                {markPaid.withdrawal.username
                  ? `@${markPaid.withdrawal.username}`
                  : markPaid.withdrawal.user_email}
              </p>
              <p>
                <span className="font-medium">Amount:</span>{" "}
                {formatCurrency(markPaid.withdrawal.amount)}
              </p>
              <p>
                <span className="font-medium">Bank:</span> {markPaid.withdrawal.bank_name}
              </p>
              <p>
                <span className="font-medium">Account:</span>{" "}
                {markPaid.withdrawal.account_number} — {markPaid.withdrawal.account_name}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Confirm you have paid this user outside the system (e.g. via your Paystack
              dashboard or bank app). This action cannot be undone.
            </p>

            <div className="space-y-1">
              <label htmlFor="admin-note" className="text-sm font-medium">
                Transaction reference{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="admin-note"
                placeholder="e.g. Paystack transfer ref or bank ref"
                value={markPaid.adminNote}
                onChange={(e) =>
                  setMarkPaid((s) => s && { ...s, adminNote: e.target.value })
                }
                disabled={markPaid.submitting}
              />
            </div>

            {markPaid.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {markPaid.error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setMarkPaid(null)}
                disabled={markPaid.submitting}
              >
                Cancel
              </Button>
              <Button onClick={confirmMarkPaid} disabled={markPaid.submitting}>
                {markPaid.submitting ? "Saving…" : "Confirm — mark as paid"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
