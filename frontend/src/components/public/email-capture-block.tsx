"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  getThemeBodyFontStyle,
  getThemeBlockBorderRadius,
  getThemeMutedTextColor,
  getThemeSurfaceStyle,
  normalizeTheme,
} from "@/lib/profile-theme";
import { ThemedProfileButton } from "@/components/public/themed-profile-button";
import type { ThemeSettings } from "@/types/database";

type EmailCaptureBlockProps = {
  username: string;
  heading: string;
  theme: ThemeSettings;
};

export function EmailCaptureBlock({ username, heading, theme }: EmailCaptureBlockProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const normalized = normalizeTheme(theme);
  const surfaceStyle = getThemeSurfaceStyle(normalized);
  const inputRadius = getThemeBlockBorderRadius(normalized);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch(
        `/api/profiles/${encodeURIComponent(username)}/subscribe`,
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        },
        null
      );
      setDone(true);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not subscribe right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-6" aria-label="Email signup" style={getThemeBodyFontStyle(normalized)}>
      <form
        onSubmit={handleSubmit}
        className="profile-surface space-y-3 p-4"
        style={surfaceStyle}
      >
        <h2 className="text-center text-sm font-semibold" style={{ color: normalized.textColor }}>
          {heading}
        </h2>
        {done ? (
          <p className="text-center text-sm" style={{ color: getThemeMutedTextColor(normalized) }}>
            Thanks for subscribing!
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full border px-4 py-3 text-sm outline-none"
              style={{
                borderRadius: inputRadius,
                borderColor: `${normalized.textColor}22`,
                backgroundColor: `${normalized.textColor}10`,
                color: normalized.textColor,
              }}
            />
            <ThemedProfileButton type="submit" theme={normalized} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Subscribe
            </ThemedProfileButton>
          </>
        )}
        {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
      </form>
    </section>
  );
}
