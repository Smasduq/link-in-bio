"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { PublicProfile } from "@/types/database";
import LinkButton from "@/components/public/LinkButton";
import { apiFetch } from "@/lib/api";
import { getSocialLinks } from "@/lib/social";

export default function ProfileView({ profile }: { profile: PublicProfile }) {
  const theme = profile.theme_settings;
  const socialLinks = getSocialLinks(profile.links).slice(0, 8);

  useEffect(() => {
    apiFetch(`/api/public/${profile.username}/view`, {
      method: "POST",
      body: JSON.stringify({ referrer: document.referrer || null, user_agent: navigator.userAgent }),
    }).catch(() => {});
  }, [profile.username]);

  return (
    <div className="profile-theme-root min-h-screen px-4 py-12 text-white" style={{ background: theme.background }}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-lg"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div
              className="absolute -inset-1 rounded-full opacity-70 blur-sm"
              style={{ background: `linear-gradient(135deg, ${theme.accentColor}, transparent)` }}
            />
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white/10 bg-white/5 shadow-soft">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold" style={{ color: theme.accentColor }}>
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold" style={{ color: theme.accentColor }}>
              @{profile.username}
            </h1>
            <BadgeCheck className="h-5 w-5" style={{ color: theme.accentColor }} aria-label="Verified" />
          </div>
          {profile.full_name && <p className="mt-1 text-lg font-semibold text-white/90">{profile.full_name}</p>}
          {profile.bio && <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">{profile.bio}</p>}

          {socialLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {socialLinks.map((item) => {
                const Icon = item.platform.icon;
                return (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.platform.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {profile.links.map((link, i) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <LinkButton link={link} theme={theme} />
            </motion.div>
          ))}
        </div>

        <footer className="mt-12 text-center">
          <a href="/" className="text-xs text-white/40 transition-colors hover:text-white/70">
            Powered by LinkBio
          </a>
        </footer>
      </motion.div>
    </div>
  );
}
