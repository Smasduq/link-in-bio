"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Palette, Save, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  ACCENT_PRESETS,
  GOOGLE_FONT_REGISTRY,
  GRADIENT_PRESETS,
  SOLID_PRESETS,
  normalizeTheme,
} from "@/lib/profile-theme";
import type { BackgroundType, Profile, ThemeSettings } from "@/types/database";
import { ProfileLivePreview } from "@/components/dashboard/profile-live-preview";
import { ThemePresetPicker } from "@/components/dashboard/theme-preset-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const BUTTON_STYLES: { label: string; value: ThemeSettings["buttonStyle"] }[] = [
  { label: "Filled", value: "filled" },
  { label: "Outline", value: "outline" },
  { label: "Glass", value: "glass" },
  { label: "Pill", value: "rounded" },
  { label: "Square", value: "square" },
];

const BG_TABS: { label: string; value: BackgroundType }[] = [
  { label: "Solid", value: "solid" },
  { label: "Gradient", value: "gradient" },
  { label: "Pattern", value: "pattern" },
  { label: "Image", value: "image" },
];

const FONT_OPTIONS = Object.keys(GOOGLE_FONT_REGISTRY);

export default function AppearancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("username");
  const [theme, setTheme] = useState<ThemeSettings>(normalizeTheme(undefined));

  useEffect(() => {
    apiFetch<Profile>("/api/profile")
      .then((d) => {
        setTheme(normalizeTheme(d.theme_settings));
        setUsername(d.username);
      })
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
    if (backgroundType === "pattern") background = "#150E27";
    if (backgroundType === "image") background = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200";
    setTheme({ ...theme, backgroundType, background, presetId: undefined });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Appearance</h1>
        <p className="text-sm text-muted-foreground">
          Pick a preset theme or fine-tune colors, fonts, and buttons. Changes preview instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-emerald-600" /> Theme presets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThemePresetPicker theme={theme} onSelect={setTheme} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" /> Customize
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        onClick={() => setTheme({ ...theme, background: bg.value, presetId: undefined })}
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
                      onChange={(e) => setTheme({ ...theme, background: e.target.value, presetId: undefined })}
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
                          onClick={() => setTheme({ ...theme, background: g.value, presetId: undefined })}
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
                      onChange={(e) => setTheme({ ...theme, background: e.target.value, presetId: undefined })}
                      placeholder="linear-gradient(135deg, #667eea, #764ba2)"
                    />
                  </div>
                )}

                {theme.backgroundType === "pattern" && (
                  <Input
                    label="Pattern base color"
                    value={theme.background}
                    onChange={(e) => setTheme({ ...theme, background: e.target.value, presetId: undefined })}
                    placeholder="#150E27"
                  />
                )}

                {theme.backgroundType === "image" && (
                  <Input
                    label="Background image URL"
                    value={theme.background}
                    onChange={(e) => setTheme({ ...theme, background: e.target.value, presetId: undefined })}
                    placeholder="https://example.com/your-photo.jpg"
                  />
                )}
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Text color</p>
                <Input
                  type="color"
                  value={theme.textColor.startsWith("#") ? theme.textColor : "#ffffff"}
                  onChange={(e) => setTheme({ ...theme, textColor: e.target.value, presetId: undefined })}
                  className="h-10 w-14 cursor-pointer p-1"
                  aria-label="Text color"
                />
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Accent color</p>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTheme({ ...theme, accentColor: color, presetId: undefined })}
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
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value, presetId: undefined })}
                    className="h-10 w-14 cursor-pointer p-1"
                    aria-label="Custom accent color"
                  />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Button style</p>
                <div className="flex flex-wrap gap-2">
                  {BUTTON_STYLES.map((s) => (
                    <Button
                      key={s.value}
                      variant={theme.buttonStyle === s.value ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setTheme({ ...theme, buttonStyle: s.value, presetId: undefined })}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Display font</p>
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    value={theme.fontDisplay}
                    onChange={(e) => setTheme({ ...theme, fontDisplay: e.target.value, presetId: undefined })}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Body font</p>
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    value={theme.fontBody}
                    onChange={(e) => setTheme({ ...theme, fontBody: e.target.value, presetId: undefined })}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button onClick={handleSave} loading={saving}>
                <Save className="h-4 w-4" /> Save theme
              </Button>
              {message && <p className="text-sm text-emerald-600">{message}</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden md:sticky md:top-20 md:self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" /> Live preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ProfileLivePreview theme={theme} username={username} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
