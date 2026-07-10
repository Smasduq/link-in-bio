"use client";

import { useState, useEffect } from "react";
import { Palette, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Profile, ThemeSettings } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const BACKGROUNDS = [
  { label: "Midnight", value: "#0a0a0f" },
  { label: "Deep Purple", value: "#1a0a2e" },
  { label: "Dark Navy", value: "#0f172a" },
  { label: "Charcoal", value: "#18181b" },
  { label: "Forest", value: "#0a1f0a" },
];

const ACCENT_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

const BUTTON_STYLES: { label: string; value: ThemeSettings["buttonStyle"] }[] = [
  { label: "Rounded", value: "rounded-lg" },
  { label: "Pill", value: "rounded" },
  { label: "Sharp", value: "sharp" },
  { label: "Outline", value: "outline" },
];

export default function AppearancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState<ThemeSettings>({
    background: "#0a0a0f", buttonStyle: "rounded-lg", fontFamily: "dm-sans", accentColor: "#6366f1",
  });

  useEffect(() => {
    apiFetch<Profile>("/api/profile").then((d) => setTheme(d.theme_settings)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/api/profile", { method: "PATCH", body: JSON.stringify({ theme_settings: theme }) });
      setMessage("Theme saved!");
    } catch {
      setMessage("Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Appearance</h1>
        <p className="text-sm text-muted-foreground">Customize how your public page looks</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-emerald-600" /> Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium">Background</p>
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.value}
                    title={bg.label}
                    onClick={() => setTheme({ ...theme, background: bg.value })}
                    className={cn("h-10 w-10 rounded-xl border-2 transition-all hover:scale-105", theme.background === bg.value ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-transparent")}
                    style={{ background: bg.value }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium">Accent Color</p>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setTheme({ ...theme, accentColor: color })}
                    className={cn("h-10 w-10 rounded-xl border-2 transition-all hover:scale-105", theme.accentColor === color ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-transparent")}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium">Button Style</p>
              <div className="flex flex-wrap gap-2">
                {BUTTON_STYLES.map((s) => (
                  <Button
                    key={s.value}
                    variant={theme.buttonStyle === s.value ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setTheme({ ...theme, buttonStyle: s.value })}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4" /> Save Theme</Button>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
          </CardContent>
        </Card>

        <Card className="overflow-hidden" style={{ background: theme.background }}>
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="mb-4 h-16 w-16 rounded-full border-4 bg-white/10" style={{ borderColor: theme.accentColor }} />
            <p className="font-bold" style={{ color: theme.accentColor }}>@username</p>
            <p className="mt-1 text-sm text-white/60">Your bio appears here</p>
            <div
              className="mt-6 w-full px-4 py-3 text-sm font-semibold"
              style={{
                background: theme.buttonStyle === "outline" ? "transparent" : "rgba(255,255,255,0.08)",
                border: theme.buttonStyle === "outline" ? `2px solid ${theme.accentColor}` : "1px solid rgba(255,255,255,0.1)",
                borderRadius: theme.buttonStyle === "rounded" ? "999px" : theme.buttonStyle === "sharp" ? "0" : "12px",
                color: theme.buttonStyle === "outline" ? theme.accentColor : "#fff",
              }}
            >
              Example Link
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
