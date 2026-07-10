"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [profile, setProfile] = useState({ username: "", bio: "", avatar_url: "", full_name: "" });

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then((data) => setProfile({
        username: data.username,
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        full_name: data.full_name || "",
      }))
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
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            {message.text && (
              <p className={message.type === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{message.text}</p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="flex overflow-hidden rounded-xl border border-input bg-white transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30">
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
