"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Crown, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Profile } from "@/types/database";
import { type BillingStatus, type CancelBillingResponse, formatNgn } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [profile, setProfile] = useState({ username: "", bio: "", avatar_url: "", full_name: "" });

  const loadBilling = () =>
    apiFetch<BillingStatus>("/api/billing/status")
      .then(setBilling)
      .catch(() => undefined);

  useEffect(() => {
    Promise.all([apiFetch<Profile>("/api/profile"), loadBilling()])
      .then(([data]) => {
        setProfile({
          username: data.username,
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          full_name: data.full_name || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel your Pro subscription? You'll keep access until the end of your current billing period.")) {
      return;
    }
    setCancelling(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await apiFetch<CancelBillingResponse>("/api/billing/cancel", { method: "POST" });
      setMessage({ type: "success", text: result.message });
      await loadBilling();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Could not cancel subscription" });
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await apiFetch("/api/profile", { method: "PATCH", body: JSON.stringify(profile) });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const premiumUntil = billing?.premium_until ? new Date(billing.premium_until).toLocaleDateString() : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and public information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-emerald-600" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message.text ? (
            <p className={message.type === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{message.text}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold capitalize">
                {billing?.is_premium ? `${billing.plan} · Pro` : "Free plan"}
              </p>
              {billing?.is_premium && premiumUntil ? (
                <p className="text-sm text-muted-foreground">
                  {billing.is_cancelled_pending_expiry
                    ? `Subscription cancelled — Pro access continues until ${premiumUntil}`
                    : billing.subscription_status === "past_due"
                      ? `Payment issue — update billing before ${premiumUntil}`
                      : `Your Pro access continues until ${premiumUntil}`}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pro from {formatNgn(billing?.monthly_base_amount_ngn ?? 500)}/mo
                </p>
              )}
            </div>
            {!billing?.is_premium ? (
              <Link href="/upgrade">
                <Button>Upgrade to Pro</Button>
              </Link>
            ) : null}
            {billing?.is_cancelled_pending_expiry ? (
              <Link href="/upgrade">
                <Button>Resubscribe</Button>
              </Link>
            ) : null}
          </div>

          {billing?.can_cancel ? (
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-sm font-medium">Cancel subscription</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stop auto-renewal anytime. Your Pro features stay active until {premiumUntil ?? "the end of your billing period"}.
              </p>
              <Button variant="outline" className="mt-3" loading={cancelling} onClick={handleCancelSubscription}>
                Cancel subscription
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="flex overflow-hidden rounded-xl border border-input bg-background transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30">
                <span className="flex items-center bg-secondary px-3 text-sm text-muted-foreground">link.smasduq.xyz/</span>
                <input
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  required
                />
              </div>
            </div>
            <Input label="Display Name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Your name" />
            <Textarea label="Bio" rows={4} placeholder="Tell your story..." value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            <Input label="Avatar URL" type="url" placeholder="https://..." value={profile.avatar_url} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
            <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
