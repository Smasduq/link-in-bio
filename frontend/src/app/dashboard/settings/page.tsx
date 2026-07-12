"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Profile } from "@/types/database";
import { isPremiumFromProfile } from "@/lib/premium-features";
import { SettingsBillingLink } from "@/components/billing/settings-billing-link";
import { useUpgradeAfterSave } from "@/components/billing/upgrade-prompt-provider";
import { EmailCaptureSection } from "@/components/dashboard/email-capture-section";
import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isPremium, setIsPremium] = useState(false);
  const promptUpgrade = useUpgradeAfterSave(isPremium);
  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    avatar_url: "",
    avatar_public_id: "",
    full_name: "",
    email_capture_enabled: false,
    email_capture_heading: "Join my newsletter",
  });

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then((data) => {
        setProfile({
          username: data.username,
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          avatar_public_id: data.avatar_public_id || "",
          full_name: data.full_name || "",
          email_capture_enabled: data.email_capture_enabled ?? false,
          email_capture_heading: data.email_capture_heading || "Join my newsletter",
        });
        setIsPremium(isPremiumFromProfile(data));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          username: profile.username,
          bio: profile.bio,
          full_name: profile.full_name,
        }),
      });
      setMessage({ type: "success", text: "Profile updated successfully!" });
      promptUpgrade("profile");
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
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

      <SettingsBillingLink />

      <PushNotificationSettings />

      <EmailCaptureSection
        enabled={profile.email_capture_enabled}
        heading={profile.email_capture_heading}
        onChange={({ enabled, heading }) =>
          setProfile((current) => ({
            ...current,
            email_capture_enabled: enabled,
            email_capture_heading: heading,
          }))
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            {message.text ? (
              <p className={message.type === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
                {message.text}
              </p>
            ) : null}
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
            <AvatarUpload
              avatarUrl={profile.avatar_url || null}
              avatarPublicId={profile.avatar_public_id || null}
              onUploaded={({ avatarUrl, avatarPublicId }) => {
                setProfile((current) => ({
                  ...current,
                  avatar_url: avatarUrl,
                  avatar_public_id: avatarPublicId,
                }));
                promptUpgrade("avatar");
              }}
            />
            <Input label="Display Name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Your name" />
            <Textarea label="Bio" rows={4} placeholder="Tell your story..." value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
