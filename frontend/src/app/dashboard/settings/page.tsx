"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Crown, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Profile } from "@/types/database";
import { type BillingStatus, formatNgn } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [profile, setProfile] = useState({ username: "", bio: "", avatar_url: "", full_name: "" });

  useEffect(() => {
    Promise.all([
      apiFetch<Profile>("/api/profile"),
      apiFetch<BillingStatus>("/api/billing/status").catch(() => null),
    ])
      .then(([data, billingStatus]) => {
        setProfile({
          username: data.username,
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          full_name: data.full_name || "",
        });
        setBilling(billingStatus);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await apiFetch("/api/profile", { method: "PATCH", body: JSON.stringify(profile) });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

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
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold capitalize">{billing?.is_premium ? `${billing.plan} · Pro` : "Free plan"}</p>
              {billing?.is_premium && billing.premium_until ? (
                <p className="text-sm text-muted-foreground">
                  Active until {new Date(billing.premium_until).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pro from {formatNgn(billing?.monthly_amount_ngn ?? 2500)}/mo
                </p>
              )}
            </div>
            {!billing?.is_premium ? (
              <Link href="/upgrade">
                <Button>Upgrade to Pro</Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            {message.text && (
              <p className={message.type === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{message.text}</p>
            )}
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
