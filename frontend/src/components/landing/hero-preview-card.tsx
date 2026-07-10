"use client";

import {
  BarChart3,
  Camera,
  ExternalLink,
  Music2,
  Play,
  TrendingUp,
} from "lucide-react";

const links = [
  { label: "Featured Work", featured: true },
  { label: "Book a Session", featured: false },
  { label: "Latest Release", featured: false },
];

export function HeroPreviewCard() {
  return (
    <div className="hero-enter hero-enter-5 relative mx-auto mt-16 w-full max-w-2xl sm:mt-20">
      <div className="relative flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="hero-glass hero-preview-card w-full max-w-sm rounded-[24px] p-6 sm:p-7">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl font-bold text-white shadow-lg shadow-emerald-500/30">
              J
            </div>
            <p className="mt-4 font-display text-xl font-bold text-[#111827]">@jadecreates</p>
            <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-[#6b7280]">
              Music · Design · One link for everything I share with my community.
            </p>

            <div className="mt-4 flex items-center gap-3" aria-label="Social links">
              {[Camera, Music2, Play].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.06] bg-white/80 text-[#6b7280] shadow-sm"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              ))}
            </div>

            <div className="mt-6 w-full space-y-2.5">
              {links.map((link) => (
                <div
                  key={link.label}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 transition-transform duration-300 hover:-translate-y-0.5 ${
                    link.featured
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)]"
                      : "border border-black/[0.06] bg-white/80 text-[#111827] shadow-sm"
                  }`}
                >
                  <span className="text-sm font-semibold">{link.label}</span>
                  {!link.featured && <ExternalLink className="h-3.5 w-3.5 text-[#9ca3af]" aria-hidden />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-float-chip hero-analytics-card w-full max-w-[200px] rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:absolute lg:-right-4 lg:top-8">
          <div className="flex items-center gap-2 text-emerald-600">
            <BarChart3 className="h-4 w-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wide">Analytics</span>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-[#111827]">2.4k</p>
          <p className="text-xs text-[#6b7280]">views this week</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            +38% growth
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-[#9ca3af]">link.smasduq.xyz/jadecreates</p>
    </div>
  );
}
