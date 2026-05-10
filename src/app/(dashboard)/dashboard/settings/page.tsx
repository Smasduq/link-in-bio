"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { Profile, ThemeSettings } from "@/types/database";
import { Save, User, FileText, Palette, Type } from "lucide-react";
import { motion } from "framer-motion";

const BACKGROUNDS = [
  { name: "Slate", value: "bg-slate-50" },
  { name: "Dark", value: "bg-slate-900 text-white" },
  { name: "Ocean", value: "bg-blue-500 text-white" },
  { name: "Sunset", value: "bg-gradient-to-r from-orange-400 to-rose-400 text-white" },
  { name: "Indigo", value: "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white" },
  { name: "Glass", value: "bg-slate-100 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" },
];

const BUTTON_STYLES = [
  { name: "Rounded", value: "rounded-lg" },
  { name: "Full", value: "rounded-full" },
  { name: "Sharp", value: "rounded-none" },
  { name: "Outline", value: "outline" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user?.id,
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        theme_settings: profile.theme_settings,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize your public presence</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b pb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold mb-1 block text-slate-700">Username</label>
              <input
                type="text"
                value={profile?.username || ""}
                onChange={(e) => setProfile(p => p ? { ...p, username: e.target.value } : null)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-slate-700">Display Name</label>
              <input
                type="text"
                value={profile?.full_name || ""}
                onChange={(e) => setProfile(p => p ? { ...p, full_name: e.target.value } : null)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold mb-1 block text-slate-700">Bio</label>
              <textarea
                rows={3}
                value={profile?.bio || ""}
                onChange={(e) => setProfile(p => p ? { ...p, bio: e.target.value } : null)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b pb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Theme & Appearance</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold mb-3 block text-slate-700">Background Style</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.value}
                    type="button"
                    onClick={() => setProfile(p => p ? { ...p, theme_settings: { ...p.theme_settings, background: bg.value } } : null)}
                    className={`
                      h-20 rounded-xl border-2 transition-all text-xs font-medium flex items-center justify-center p-2
                      ${bg.value}
                      ${profile?.theme_settings.background === bg.value ? 'border-primary ring-2 ring-primary/20' : 'border-slate-100'}
                    `}
                  >
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block text-slate-700">Button Style</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BUTTON_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setProfile(p => p ? { ...p, theme_settings: { ...p.theme_settings, buttonStyle: style.value as any } } : null)}
                    className={`
                      py-2 rounded-lg border-2 transition-all text-sm font-medium
                      ${profile?.theme_settings.buttonStyle === style.value ? 'border-primary bg-primary/5' : 'border-slate-100'}
                    `}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
