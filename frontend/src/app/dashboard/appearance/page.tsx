"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Palette, Save, Type } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  ACCENT_PRESETS,
  FONT_PRESETS,
  GRADIENT_PRESETS,
  SOLID_PRESETS,
  getPreviewLinkStyle,
  getThemeShellStyle,
  normalizeTheme,
} from "@/lib/profile-theme";
import type { BackgroundType, FontPreset, Profile, ThemeSettings } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const BUTTON_STYLES: { label: string; value: ThemeSettings["buttonStyle"] }[] = [
  { label: "Filled", value: "filled" },
  { label: "Outline", value: "outline" },
  { label: "Rounded", value: "rounded" },
  { label: "Square", value: "square" },
];

const BG_TABS: { label: string; value: BackgroundType }[] = [
  { label: "Solid", value: "solid" },
  { label: "Gradient", value: "gradient" },
  { label: "Image", value: "image" },
];

export default function AppearancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState<ThemeSettings>(normalizeTheme(undefined));

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then((d) => setTheme(normalizeTheme(d.theme_settings)))
      .finally(() => setLoading(false));
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

  const setBackgroundType = (backgroundType: BackgroundType) => {
    let background = theme.background;
    if (backgroundType === "solid") background = SOLID_PRESETS[0].value;
    if (backgroundType === "gradient") background = GRADIENT_PRESETS[0].value;
    if (backgroundType === "image") background = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200";
    setTheme({ ...theme, backgroundType, background });
  };

  if (loading) return <PageLoader />;

  const previewStyle = getThemeShellStyle(theme);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Appearance</h1>
        <p className="text-sm text-muted-foreground">
          Customize your public page theme — stored as JSON on your profile record.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-emerald-600" /> Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Background type */}
            <div>
              <p className="mb-3 text-sm font-medium">Background</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {BG_TABS.map((tab) => (
                  <Button
                    key={tab.value}
                    size="sm"
                    variant={theme.backgroundType === tab.value ? "primary" : "outline"}
                    onClick={() => setBackgroundType(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              {theme.backgroundType === "solid" && (
                <div className="flex flex-wrap gap-2">
                  {SOLID_PRESETS.map((bg) => (
                    <button
                      key={bg.value}
                      title={bg.label}
                      type="button"
                      onClick={() => setTheme({ ...theme, background: bg.value })}
                      className={cn(
                        "h-10 w-10 rounded-xl border-2 transition-all hover:scale-105",
                        theme.background === bg.value ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-transparent"
                      )}
                      style={{ background: bg.value }}
                    />
                  ))}
                  <Input
                    type="color"
                    value={theme.background.startsWith("#") ? theme.background : "#0a0a0f"}
                    onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                    className="h-10 w-14 cursor-pointer p-1"
                    aria-label="Custom solid color"
                  />
                </div>
              )}

              {theme.backgroundType === "gradient" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {GRADIENT_PRESETS.map((g) => (
                      <button
                        key={g.label}
                        type="button"
                        title={g.label}
                        onClick={() => setTheme({ ...theme, background: g.value })}
                        className={cn(
                          "h-10 min-w-[4rem] flex-1 rounded-xl border-2 transition-all hover:scale-[1.02]",
                          theme.background === g.value ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-transparent"
                        )}
                        style={{ background: g.value }}
                      />
                    ))}
                  </div>
                  <Input
                    label="Custom gradient CSS"
                    value={theme.background}
                    onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                    placeholder="linear-gradient(135deg, #667eea, #764ba2)"
                  />
                </div>
              )}

              {theme.backgroundType === "image" && (
                <Input
                  label="Background image URL"
                  value={theme.background}
                  onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                  placeholder="https://example.com/your-photo.jpg"
                />
              )}
            </div>

            {/* Accent */}
            <div>
              <p className="mb-3 text-sm font-medium">Accent color</p>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTheme({ ...theme, accentColor: color })}
                    className={cn(
                      "h-8 w-8 rounded-xl border-2 transition-all hover:scale-105 md:h-10 md:w-10",
                      theme.accentColor === color ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-border"
                    )}
                    style={{ background: color }}
                  />
                ))}
                <Input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                  className="h-10 w-14 cursor-pointer p-1"
                  aria-label="Custom accent color"
                />
              </div>
            </div>

            {/* Button style */}
            <div>
              <p className="mb-3 text-sm font-medium">Button style</p>
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

            {/* Font */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Type className="h-4 w-4" /> Font
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.entries(FONT_PRESETS) as [FontPreset, (typeof FONT_PRESETS)[FontPreset]][]).map(
                  ([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTheme({ ...theme, fontFamily: key })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                        theme.fontFamily === key
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/30"
                          : "border-border hover:border-emerald-400/50"
                      )}
                      style={{ fontFamily: preset.family }}
                    >
                      {preset.label}
                    </button>
                  )
                )}
              </div>
            </div>

            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" /> Save theme
            </Button>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
          </CardContent>
        </Card>

        {/* Live preview — inline styles, not dynamic Tailwind */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" /> Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[280px] px-4 py-6 text-white md:min-h-[420px] md:px-6 md:py-8" style={previewStyle}>
              <div className="mx-auto flex w-full max-w-[280px] flex-col items-center text-center">
                <div
                  className="mb-4 h-16 w-16 rounded-full border-4 bg-white/10"
                  style={{ borderColor: theme.accentColor }}
                />
                <p className="text-lg font-bold" style={{ color: theme.accentColor }}>
                  @username
                </p>
                <p className="mt-1 text-sm text-white/60">Your bio appears here</p>
                <div className="mt-6 w-full space-y-2">
                  <div style={getPreviewLinkStyle(theme)}>Featured link</div>
                  <div style={getPreviewLinkStyle({ ...theme, buttonStyle: theme.buttonStyle })}>Example link</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
